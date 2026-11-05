#!/usr/bin/env node
// Firebase CD: preflight + `firebase deploy --only <targets>`.
//
// Preflight (functions only): every secret the functions code references
// (defineSecret('X') / secrets: ['X']) must exist in Secret Manager with an
// enabled version. If any is missing, nothing is deployed.
//
// No automatic rollback: on failure this fails loudly. Redeploy a previous
// commit with workflow_dispatch + ref (docs/ops/rollback.md).
//
// Final line: "RESULT: FIREBASE DEPLOYED <targets> commit <sha>",
//             "RESULT: Nothing to deploy" or "RESULT: FIREBASE FAILED".
//
// Overridable for tests: SECRET_MANAGER_API_URL, FIREBASE_BIN (script run with node).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { request } from "./http.mjs";
import { repoRoot } from "../lib/repo.mjs";

// tools/ci of the checkout running this script (main), which holds the pinned
// firebase-tools. The code being deployed may be an older commit (REPO_ROOT).
const CI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const RESULT = {
  deployed: (targets, sha) => `RESULT: FIREBASE DEPLOYED ${targets} commit ${sha}`,
  nothing: "RESULT: Nothing to deploy",
  failed: "RESULT: FIREBASE FAILED",
};

function sourceFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(c|m)?[jt]s$/.test(ent.name)) out.push(p);
  }
  return out;
}

// Secret names referenced by the functions source.
export function referencedSecrets(functionsDir) {
  const names = new Set();
  for (const file of sourceFiles(functionsDir)) {
    const code = fs.readFileSync(file, "utf8");
    for (const m of code.matchAll(/defineSecret\(\s*['"`]([A-Za-z0-9_-]+)['"`]\s*\)/g)) names.add(m[1]);
    for (const m of code.matchAll(/secrets\s*:\s*\[([^\]]*)\]/g)) {
      for (const s of m[1].matchAll(/['"`]([A-Za-z0-9_-]+)['"`]/g)) names.add(s[1]);
    }
  }
  return [...names].sort();
}

// Returns the names that are missing or have no enabled version.
export async function missingSecrets({ names, project, token, apiUrl = "https://secretmanager.googleapis.com/v1" }) {
  const missing = [];
  for (const name of names) {
    const url = `${apiUrl}/projects/${project}/secrets/${name}/versions?filter=state%3AENABLED&pageSize=1`;
    const res = await request(url, { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 20000 });
    if (res.status === 404) {
      missing.push(name);
    } else if (!res.ok) {
      throw new Error(`Secret Manager returned HTTP ${res.status} for ${name} (does the deployer have roles/secretmanager.viewer?)`);
    } else if (!res.json?.versions?.length) {
      missing.push(name);
    }
  }
  return missing;
}

function runFirebase(args, cwd) {
  const bin = process.env.FIREBASE_BIN;
  const [cmd, argv] = bin ? [process.execPath, [bin, ...args]] : ["npx", ["--no-install", "firebase", ...args]];
  return new Promise((resolve) => {
    const child = spawn(cmd, argv, { cwd, stdio: "inherit", env: process.env });
    child.on("close", (code) => resolve(code));
    child.on("error", () => resolve(-1));
  });
}

export async function firebaseDeploy({ root, sha, targets, project, token, apiUrl, log = console.log }) {
  if (!targets.length) {
    log("No functions or rules changes in this push.");
    return RESULT.nothing;
  }
  const bad = targets.filter((t) => !["firestore:rules", "functions"].includes(t));
  if (bad.length) {
    log(`::error::refusing to deploy unexpected targets: ${bad.join(", ")}`);
    return RESULT.failed;
  }
  if (!project) {
    log("::error::FIREBASE_PROJECT is not set");
    return RESULT.failed;
  }
  if (targets.includes("functions")) {
    const names = referencedSecrets(path.join(root, "functions"));
    log(`Functions reference secrets: ${names.join(", ") || "(none)"}`);
    let missing;
    try {
      missing = names.length ? await missingSecrets({ names, project, token, apiUrl }) : [];
    } catch (err) {
      log(`::error::Secret preflight failed: ${err.message}`);
      return RESULT.failed;
    }
    if (missing.length) {
      log(`::error::Missing in Secret Manager (or no enabled version): ${missing.join(", ")}`);
      log("Nothing was deployed. Create them with `firebase functions:secrets:set <NAME>` (docs/ops/cd-setup.md).");
      return RESULT.failed;
    }
    log("All referenced secrets exist.");
  }
  const only = targets.join(",");
  log(`firebase deploy --only ${only} --project ${project} (commit ${sha})`);
  // Run from tools/ci so the pinned firebase-tools is used; --config points at the deployed commit's firebase.json.
  const code = await runFirebase(
    ["deploy", "--only", only, "--project", project, "--config", path.join(root, "firebase.json"), "--non-interactive"],
    CI_DIR,
  );
  if (code !== 0) {
    log(`::error::firebase deploy exited with ${code}. Nothing is rolled back automatically; see docs/ops/rollback.md.`);
    return RESULT.failed;
  }
  return RESULT.deployed(only, sha);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  let result;
  try {
    result = await firebaseDeploy({
      root: repoRoot(),
      sha: process.env.DEPLOY_SHA,
      targets: (process.env.DEPLOY_TARGETS || "").split(",").map((t) => t.trim()).filter(Boolean),
      project: process.env.FIREBASE_PROJECT,
      token: process.env.GCP_ACCESS_TOKEN,
      apiUrl: process.env.SECRET_MANAGER_API_URL,
    });
  } catch (err) {
    console.log(`::error::unexpected error: ${err.message}`);
    result = RESULT.failed;
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Firebase CD\n\nCommit \`${process.env.DEPLOY_SHA}\`\n\n${result}\n`);
  }
  console.log(result);
  process.exitCode = result === RESULT.failed ? 1 : 0;
}

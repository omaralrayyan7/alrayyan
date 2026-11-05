#!/usr/bin/env node
// Site CD: deploy an assembled publish dir to Netlify production from the
// runner, health-check it, and roll back to the previous deploy on failure.
//
// The final log line is always one of:
//   RESULT: DEPLOYED commit <sha>
//   RESULT: Nothing to deploy
//   RESULT: FAILED and ROLLED BACK
//   RESULT: FAILED and ROLLBACK FAILED      (only if the rollback itself fails)
// Failures before anything is published also end in "FAILED and ROLLED BACK",
// preceded by a line saying the live site was not touched.
//
// Every endpoint is overridable through env so tests can run against a mock:
// NETLIFY_API_URL (also honoured by netlify-cli), GITHUB_API_URL, SITE_URL,
// WWW_URL and NETLIFY_CLI_BIN (a script run with node instead of npx netlify-cli).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { request, retry } from "./http.mjs";
import { waitForCheck } from "./wait-for-check.mjs";

export const RESULT = {
  deployed: (sha) => `RESULT: DEPLOYED commit ${sha}`,
  nothing: "RESULT: Nothing to deploy",
  rolledBack: "RESULT: FAILED and ROLLED BACK",
  rollbackFailed: "RESULT: FAILED and ROLLBACK FAILED",
};

export function config(env = process.env) {
  const siteUrl = (env.SITE_URL || "https://alrayyanjo.com").replace(/\/$/, "");
  return {
    sha: env.COMMIT_SHA || env.GITHUB_SHA,
    ref: env.GITHUB_REF,
    repo: env.GITHUB_REPOSITORY,
    githubToken: env.GITHUB_TOKEN,
    githubApi: env.GITHUB_API_URL || "https://api.github.com",
    netlifyToken: env.NETLIFY_AUTH_TOKEN,
    siteId: env.NETLIFY_SITE_ID,
    netlifyApi: (env.NETLIFY_API_URL || "https://api.netlify.com/api/v1").replace(/\/$/, ""),
    siteUrl,
    wwwUrl: (env.WWW_URL || "https://www.alrayyanjo.com").replace(/\/$/, ""),
    // Fashion, Arts and Lands are paths on this same Netlify site; the admin panel too.
    healthPaths: (env.HEALTH_PATHS || "/fashion,/arts,/land,/mgmt-panel").split(",").map((p) => p.trim()).filter(Boolean),
    publishDir: env.PUBLISH_DIR,
    cliVersion: env.NETLIFY_CLI_VERSION,
    cliBin: env.NETLIFY_CLI_BIN,
    attempts: Number(env.HEALTH_ATTEMPTS || 6),
    intervalMs: Number(env.HEALTH_INTERVAL_MS || 10000),
    timeoutMs: Number(env.HEALTH_TIMEOUT_MS || 15000),
    ciIntervalMs: Number(env.CI_WAIT_INTERVAL_MS || 20000),
    ciTimeoutMs: Number(env.CI_WAIT_TIMEOUT_MS || 45 * 60 * 1000),
    summaryFile: env.GITHUB_STEP_SUMMARY,
  };
}

function netlifyHeaders(cfg) {
  return { Authorization: `Bearer ${cfg.netlifyToken}`, "User-Agent": "alrayyan-cd" };
}

async function liveVersion(cfg) {
  const res = await request(`${cfg.siteUrl}/version.json?cb=${Date.now()}`, { timeoutMs: cfg.timeoutMs });
  return res.ok && res.json && typeof res.json.sha === "string" ? res.json.sha : null;
}

async function getSite(cfg) {
  const res = await request(`${cfg.netlifyApi}/sites/${encodeURIComponent(cfg.siteId)}`, {
    headers: netlifyHeaders(cfg),
    timeoutMs: cfg.timeoutMs,
  });
  if (!res.ok || !res.json) throw new Error(`getSite returned HTTP ${res.status}`);
  return res.json;
}

async function restoreDeploy(cfg, deployId) {
  const url = `${cfg.netlifyApi}/sites/${encodeURIComponent(cfg.siteId)}/deploys/${encodeURIComponent(deployId)}/restore`;
  const res = await request(url, { method: "POST", headers: netlifyHeaders(cfg), timeoutMs: 60000 });
  if (!res.ok) throw new Error(`restoreSiteDeploy returned HTTP ${res.status}`);
  return res.json;
}

export function cliArgs(cfg) {
  return [
    "deploy", "--prod", "--no-build",
    "--dir", cfg.publishDir,
    "--message", cfg.sha,
    "--json",
    "--site", cfg.siteId,
  ];
}

function runCli(cfg, log) {
  const args = cliArgs(cfg);
  const [cmd, argv] = cfg.cliBin
    ? [process.execPath, [cfg.cliBin, ...args]]
    : ["npx", ["--yes", `netlify-cli@${cfg.cliVersion}`, ...args]];
  // Empty cwd so the CLI never picks up a netlify.toml or build config from the repo.
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "netlify-cwd-"));
  log(`Running: ${cfg.cliBin ? "node <NETLIFY_CLI_BIN>" : `npx netlify-cli@${cfg.cliVersion}`} ${args.join(" ")}`);
  return new Promise((resolve) => {
    const child = spawn(cmd, argv, { cwd, env: process.env, shell: process.platform === "win32" && !cfg.cliBin });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => process.stderr.write(d));
    const timer = setTimeout(() => child.kill("SIGTERM"), 15 * 60 * 1000);
    child.on("close", (code) => {
      clearTimeout(timer);
      let json;
      const start = out.indexOf("{");
      if (start >= 0) {
        try {
          json = JSON.parse(out.slice(start));
        } catch {
          json = undefined;
        }
      }
      resolve({ code, json });
    });
    child.on("error", () => resolve({ code: -1 }));
  });
}

async function checkUrls(cfg, expectSha) {
  const urls = [`${cfg.siteUrl}/`, `${cfg.wwwUrl}/`, ...cfg.healthPaths.map((p) => `${cfg.siteUrl}${p}`)];
  const rows = [];
  for (const url of urls) {
    const r = await retry(() => request(url, { timeoutMs: cfg.timeoutMs }), {
      attempts: cfg.attempts,
      intervalMs: cfg.intervalMs,
      check: (res) => res.status === 200,
    });
    const via = r.redirected ? ` (via redirect to ${r.url})` : "";
    rows.push({ url, ok: r.status === 200, status: `${r.status || "no response"}${via}` });
  }
  if (expectSha) {
    const url = `${cfg.siteUrl}/version.json`;
    let seen = null;
    const r = await retry(async () => {
      seen = await liveVersion(cfg);
      return { ok: seen === expectSha };
    }, { attempts: cfg.attempts, intervalMs: cfg.intervalMs });
    rows.push({ url, ok: r.ok, status: r.ok ? `sha ${expectSha}` : `sha ${seen ?? "missing"}, expected ${expectSha}` });
  }
  return rows;
}

function writeSummary(cfg, s) {
  const lines = [
    "## Site CD (Netlify)",
    "",
    `| | |`,
    `|---|---|`,
    `| Commit | \`${cfg.sha}\` |`,
    `| Outcome | ${s.result} |`,
    `| New deploy ID | ${s.deployId ? `\`${s.deployId}\`` : "-"} |`,
    `| Deploy URL | ${s.deployUrl || "-"} |`,
    `| Previous deploy ID | ${s.previousId ? `\`${s.previousId}\`` : "-"} |`,
  ];
  if (s.rows?.length) {
    lines.push("", "| URL | Status |", "|---|---|");
    for (const r of s.rows) lines.push(`| ${r.url} | ${r.ok ? "✅" : "❌"} ${r.status} |`);
  }
  if (s.rollbackRows?.length) {
    lines.push("", "After rollback:", "", "| URL | Status |", "|---|---|");
    for (const r of s.rollbackRows) lines.push(`| ${r.url} | ${r.ok ? "✅" : "❌"} ${r.status} |`);
  }
  if (cfg.summaryFile) fs.appendFileSync(cfg.summaryFile, lines.join("\n") + "\n");
}

export async function deploy(cfg, log = console.log) {
  const s = { rows: [] };
  const untouched = (why) => {
    log(`::error::${why}`);
    log("Nothing was published; the live site was not touched.");
    s.result = RESULT.rolledBack;
    return s;
  };

  // Guards that must hold before anything else happens.
  if (cfg.ref !== "refs/heads/main") return untouched(`--prod deploys run only from refs/heads/main (got ${cfg.ref}).`);
  const missing = ["NETLIFY_AUTH_TOKEN", "NETLIFY_SITE_ID", "GITHUB_TOKEN"].filter((k) => !{
    NETLIFY_AUTH_TOKEN: cfg.netlifyToken, NETLIFY_SITE_ID: cfg.siteId, GITHUB_TOKEN: cfg.githubToken,
  }[k]);
  if (missing.length) return untouched(`missing secrets: ${missing.join(", ")}`);
  if (!cfg.sha || !/^[0-9a-f]{40}$/.test(cfg.sha)) return untouched("COMMIT_SHA is not a full commit SHA");
  if (!cfg.cliBin && !/^\d+\.\d+\.\d+$/.test(cfg.cliVersion || "")) {
    return untouched("NETLIFY_CLI_VERSION must be an exact x.y.z version");
  }
  let builtSha;
  try {
    builtSha = JSON.parse(fs.readFileSync(path.join(cfg.publishDir, "version.json"), "utf8")).sha;
  } catch {
    return untouched(`publish dir ${cfg.publishDir} has no readable version.json`);
  }
  if (builtSha !== cfg.sha) return untouched(`publish dir was built from ${builtSha}, not ${cfg.sha}`);

  // Gate: "CI passed" must have succeeded for this exact commit.
  try {
    await waitForCheck({
      apiUrl: cfg.githubApi, repo: cfg.repo, sha: cfg.sha, token: cfg.githubToken,
      intervalMs: cfg.ciIntervalMs, timeoutMs: cfg.ciTimeoutMs, log,
    });
  } catch (err) {
    return untouched(`CI gate: ${err.message}`);
  }

  // 1. Already live?
  let live = null;
  try {
    live = await liveVersion(cfg);
  } catch (err) {
    log(`Could not read live version.json (${err.message}); continuing.`);
  }
  if (live === cfg.sha) {
    log(`Live site already serves ${cfg.sha}.`);
    log("Nothing to deploy");
    s.result = RESULT.nothing;
    return s;
  }
  log(live ? `Live site serves ${live}; deploying ${cfg.sha}.` : `Live site has no version.json yet (first CD deploy); deploying ${cfg.sha}.`);

  // 2. Record what is published now, so we can restore it.
  try {
    const site = await getSite(cfg);
    s.previousId = site.published_deploy?.id;
    if (!s.previousId) return untouched("getSite returned no published_deploy.id; refusing to deploy without a rollback target");
    log(`Currently published deploy: ${s.previousId}`);
  } catch (err) {
    return untouched(`could not record the published deploy ID: ${err.message}`);
  }

  // 3. Deploy.
  const cli = await runCli(cfg, log);
  s.deployId = cli.json?.deploy_id;
  s.deployUrl = cli.json?.deploy_url;
  let failure = null;
  if (cli.code !== 0 || !s.deployId) {
    failure = `netlify deploy failed (exit ${cli.code}${s.deployId ? "" : ", no deploy_id in output"})`;
  } else {
    log(`Published deploy ${s.deployId} (${s.deployUrl})`);
    // 4. Health check.
    s.rows = await checkUrls(cfg, cfg.sha);
    for (const r of s.rows) log(`${r.ok ? "OK  " : "FAIL"} ${r.url} -> ${r.status}`);
    const bad = s.rows.filter((r) => !r.ok);
    if (bad.length) failure = `health check failed for ${bad.map((r) => r.url).join(", ")}`;
  }
  if (!failure) {
    s.result = RESULT.deployed(cfg.sha);
    return s;
  }

  // 5. Roll back.
  log(`::error::${failure}`);
  log(`Rolling back to deploy ${s.previousId}...`);
  try {
    await restoreDeploy(cfg, s.previousId);
    const back = await retry(async () => {
      const site = await getSite(cfg);
      return { ok: site.published_deploy?.id === s.previousId };
    }, { attempts: cfg.attempts, intervalMs: cfg.intervalMs });
    if (!back.ok) throw new Error(`published deploy is not ${s.previousId} after restore`);
    s.rollbackRows = await checkUrls(cfg, live);
    for (const r of s.rollbackRows) log(`${r.ok ? "OK  " : "FAIL"} ${r.url} -> ${r.status} (after rollback)`);
    const apex = s.rollbackRows[0];
    if (!apex.ok) throw new Error(`apex returns ${apex.status} after restore`);
    log(`Rolled back: deploy ${s.previousId} is live again.`);
    s.result = RESULT.rolledBack;
  } catch (err) {
    log(`::error::ROLLBACK FAILED: ${err.message}. Restore manually: see docs/ops/rollback.md`);
    s.result = RESULT.rollbackFailed;
  }
  return s;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = config();
  let s;
  try {
    s = await deploy(cfg);
  } catch (err) {
    console.log(`::error::unexpected error: ${err.message}`);
    s = { result: RESULT.rollbackFailed };
  }
  writeSummary(cfg, s);
  console.log(s.result);
  process.exitCode = s.result.startsWith("RESULT: FAILED") ? 1 : 0;
}

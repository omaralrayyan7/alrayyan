#!/usr/bin/env node
// Which areas did this event change? Looks at ALL commits in a push
// (before..after), the whole PR diff (base...head), and treats manual
// dispatch, a branch's first push and unreachable bases as "everything".
//
// Writes site/functions/rules/deploy/firebase_functions/firebase_rules=true|false
// to $GITHUB_OUTPUT when set, and prints them.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { git, repoRoot } from "../lib/repo.mjs";
import { isExcluded } from "../lib/publish.mjs";

export const AREAS = ["site", "functions", "rules", "deploy", "firebase_functions", "firebase_rules"];
const ZERO = /^0+$/;

export function classify(files) {
  const a = Object.fromEntries(AREAS.map((k) => [k, false]));
  for (const f of files) {
    const ci = f.startsWith("tools/ci/");
    const workflows = f.startsWith(".github/");
    // Site: anything that ends up in the publish dir, plus the tooling that checks it.
    if (!isExcluded(f) || ci) a.site = true;
    if (f.startsWith("functions/") || f === "firebase.json" || f === ".firebaserc") a.functions = true;
    if (f === "firestore.rules" || f === "firestore.indexes.json" || f === "firebase.json" || f === ".firebaserc" ||
        f.startsWith("tools/ci/test/rules/")) {
      a.rules = true;
    }
    if (workflows || ci) a.deploy = true;
    // What Firebase CD would redeploy.
    if (f.startsWith("functions/") || f === "firebase.json") a.firebase_functions = true;
    if (f === "firestore.rules" || f === "firestore.indexes.json" || f === "firebase.json") a.firebase_rules = true;
  }
  return a;
}

function all() {
  return Object.fromEntries(AREAS.map((k) => [k, true]));
}

function commitExists(root, sha) {
  try {
    git(["cat-file", "-e", `${sha}^{commit}`], root);
    return true;
  } catch {
    return false;
  }
}

function diffNames(root, range) {
  return git(["diff", "--name-only", "-z", range], root).split("\0").filter(Boolean);
}

// event: { name, before, after, base, head }
export function changedAreas(root, event) {
  if (event.name === "workflow_dispatch") return { reason: "manual dispatch: run everything", areas: all() };
  let base;
  let head;
  let range;
  if (event.name === "push") {
    [base, head] = [event.before, event.after];
    if (!base || ZERO.test(base)) return { reason: "first push of this ref: run everything", areas: all() };
    range = `${base}..${head}`;
  } else if (event.name === "pull_request") {
    [base, head] = [event.base, event.head];
    range = `${base}...${head}`;
  } else {
    return { reason: `event ${event.name}: run everything`, areas: all() };
  }
  if (!commitExists(root, base) || !commitExists(root, head)) {
    return { reason: `cannot find ${base} or ${head} (force-push or shallow clone): run everything`, areas: all() };
  }
  const files = diffNames(root, range);
  return { reason: `${files.length} file(s) changed in ${range}`, files, areas: classify(files) };
}

export function eventFromEnv(env = process.env) {
  const name = env.GITHUB_EVENT_NAME;
  const payload = env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8")) : {};
  return {
    name,
    before: payload.before,
    after: payload.after || env.GITHUB_SHA,
    base: payload.pull_request?.base?.sha,
    head: payload.pull_request?.head?.sha,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { reason, files, areas } = changedAreas(repoRoot(), eventFromEnv());
  console.log(reason);
  if (files) for (const f of files) console.log(`  ${f}`);
  const lines = AREAS.map((k) => `${k}=${areas[k]}`);
  console.log(lines.join("\n"));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
}

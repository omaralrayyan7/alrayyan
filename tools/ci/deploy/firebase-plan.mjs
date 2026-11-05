#!/usr/bin/env node
// Firebase CD plan: which commit and which targets to deploy.
//
// push:              targets from what changed across ALL commits in the push.
// workflow_dispatch: INPUT_REF (optional, default: the main commit that
//                    triggered the run) and INPUT_TARGETS (rules|functions|both).
//                    A dispatched ref must be an ancestor of main, so only
//                    commits that were on main can be (re)deployed.
//
// Writes sha=<sha> and targets=<firestore:rules,functions or empty> to $GITHUB_OUTPUT.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { git, repoRoot, resolveCommit } from "../lib/repo.mjs";
import { changedAreas, eventFromEnv } from "../scripts/changed-areas.mjs";

const TARGETS = { rules: ["firestore:rules"], functions: ["functions"], both: ["firestore:rules", "functions"] };

export function plan(root, env = process.env) {
  const event = eventFromEnv(env);
  const mainSha = env.GITHUB_SHA;
  if (event.name === "workflow_dispatch") {
    const wanted = (env.INPUT_TARGETS || "both").trim();
    if (!TARGETS[wanted]) throw new Error(`INPUT_TARGETS must be rules, functions or both (got "${wanted}")`);
    const ref = (env.INPUT_REF || "").trim() || mainSha;
    if (!/^[\w./-]+$/.test(ref)) throw new Error(`invalid ref "${ref}"`);
    const sha = resolveCommit(root, ref);
    try {
      git(["merge-base", "--is-ancestor", sha, mainSha], root);
    } catch {
      throw new Error(`${ref} (${sha}) is not on main; only commits from main can be deployed`);
    }
    return { sha, targets: TARGETS[wanted], reason: `manual dispatch of ${ref}` };
  }
  if (event.name === "push") {
    const { reason, areas } = changedAreas(root, event);
    const targets = [];
    if (areas.firebase_rules) targets.push("firestore:rules");
    if (areas.firebase_functions) targets.push("functions");
    return { sha: mainSha, targets, reason };
  }
  throw new Error(`unsupported event ${event.name}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { sha, targets, reason } = plan(repoRoot());
    console.log(reason);
    console.log(`sha=${sha}\ntargets=${targets.join(",")}`);
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `sha=${sha}\ntargets=${targets.join(",")}\n`);
    }
  } catch (err) {
    console.log(`::error::${err.message}`);
    console.log("RESULT: FIREBASE FAILED");
    process.exit(1);
  }
}

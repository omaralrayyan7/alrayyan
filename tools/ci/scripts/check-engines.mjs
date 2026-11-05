#!/usr/bin/env node
// Fail if functions/package.json targets a Node.js runtime Cloud Functions no
// longer deploys. Node 18 was decommissioned 2025-10-30 and Node 20 on
// 2026-10-30 (https://cloud.google.com/functions/docs/runtime-support), so
// the floor is 22.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../lib/repo.mjs";

export const MIN_NODE = 22;

export function checkEngines(pkg) {
  const spec = pkg?.engines?.node;
  if (!spec) return { ok: false, message: "functions/package.json has no engines.node" };
  const major = Number(String(spec).match(/\d+/)?.[0]);
  if (!Number.isFinite(major)) return { ok: false, message: `cannot parse engines.node "${spec}"` };
  if (major < MIN_NODE) {
    return { ok: false, message: `engines.node is "${spec}"; Cloud Functions needs Node ${MIN_NODE}+` };
  }
  return { ok: true, message: `engines.node "${spec}" is supported (>= ${MIN_NODE})` };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = path.join(repoRoot(), "functions", "package.json");
  const { ok, message } = checkEngines(JSON.parse(fs.readFileSync(file, "utf8")));
  console.log(ok ? message : `::error file=functions/package.json::${message}`);
  process.exit(ok ? 0 : 1);
}

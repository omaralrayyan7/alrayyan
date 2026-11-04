#!/usr/bin/env node
// Assemble the Netlify publish dir from a commit.
//
//   node assemble-publish.mjs --out <dir> [--rev <sha>] [--version-sha <sha>]
//
// With --version-sha, writes /version.json = {"sha","deployedAt"} so CD and
// the health check can tell which commit is live.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { listFiles, readBlobs, repoRoot, resolveCommit } from "../lib/repo.mjs";
import { forbiddenInPublish, isExcluded } from "../lib/publish.mjs";

export async function assemble({ root, rev = "HEAD", out, versionSha, deployedAt }) {
  const outDir = path.resolve(out);
  const rootDir = path.resolve(root);
  const rel = path.relative(outDir, rootDir);
  if (!rel || !rel.startsWith("..") && !path.isAbsolute(rel)) {
    throw new Error(`refusing to assemble into ${outDir}: it is or contains the repo root`);
  }
  const commit = resolveCommit(rootDir, rev);
  const files = listFiles(rootDir, commit).filter((f) => !isExcluded(f));
  for (const required of ["index.html", "_redirects"]) {
    if (!files.includes(required)) throw new Error(`publish dir would be missing ${required}`);
  }
  const blobs = await readBlobs(rootDir, commit, files);

  fs.rmSync(outDir, { recursive: true, force: true });
  for (const f of files) {
    const dest = path.join(outDir, ...f.split("/"));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, blobs.get(f));
  }
  if (versionSha) {
    const body = { sha: versionSha, deployedAt: deployedAt || new Date().toISOString() };
    fs.writeFileSync(path.join(outDir, "version.json"), JSON.stringify(body) + "\n");
  }

  const published = walk(outDir);
  const bad = published.map((f) => [f, forbiddenInPublish(f)]).filter(([, why]) => why);
  if (bad.length) {
    throw new Error("forbidden files in publish dir: " + bad.map(([f, w]) => `${f} (${w})`).join(", "));
  }
  return { commit, outDir, files: published };
}

export function walk(dir, prefix = "") {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...walk(path.join(dir, ent.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: {
      out: { type: "string" },
      rev: { type: "string", default: "HEAD" },
      "version-sha": { type: "string" },
      "deployed-at": { type: "string" },
    },
  });
  if (!values.out) {
    console.error("usage: assemble-publish.mjs --out <dir> [--rev <sha>] [--version-sha <sha>]");
    process.exit(2);
  }
  try {
    const res = await assemble({
      root: repoRoot(),
      rev: values.rev,
      out: values.out,
      versionSha: values["version-sha"],
      deployedAt: values["deployed-at"],
    });
    console.log(`Assembled ${res.files.length} files from ${res.commit} into ${res.outDir}`);
  } catch (err) {
    console.error(`assemble failed: ${err.message}`);
    process.exit(1);
  }
}

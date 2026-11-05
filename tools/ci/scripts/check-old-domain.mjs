#!/usr/bin/env node
// WARN-ONLY: report references to the dead alrayyangroup.online domain
// (canonical / OG / JSON-LD ...). Fixing them is a separate task, so this
// never fails CI.
import { pathToFileURL } from "node:url";
import { listFiles, readBlobs, repoRoot } from "../lib/repo.mjs";
import { isExcluded } from "../lib/publish.mjs";

const OLD_DOMAIN = "alrayyangroup.online";
const TEXT = /\.(html|css|js|json|xml|txt|webmanifest)$|^_redirects$|^_headers$/;

export async function findOldDomain(root, rev = "HEAD") {
  const files = listFiles(root, rev).filter((f) => !isExcluded(f) && TEXT.test(f));
  const blobs = await readBlobs(root, rev, files);
  const hits = [];
  for (const f of files) {
    blobs.get(f).toString("utf8").split("\n").forEach((line, i) => {
      if (line.includes(OLD_DOMAIN)) hits.push({ file: f, line: i + 1 });
    });
  }
  return hits;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const hits = await findOldDomain(repoRoot());
  for (const h of hits) {
    console.log(`::warning file=${h.file},line=${h.line}::Reference to old domain ${OLD_DOMAIN}`);
  }
  console.log(`${hits.length} reference(s) to ${OLD_DOMAIN} in published files (warning only).`);
}

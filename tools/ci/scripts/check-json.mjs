#!/usr/bin/env node
// Every tracked .json file and every <script type="application/ld+json">
// block in tracked HTML must parse.
import { pathToFileURL } from "node:url";
import { listFiles, readBlobs, repoRoot } from "../lib/repo.mjs";

export async function checkJson(root, rev = "HEAD") {
  const files = listFiles(root, rev).filter((f) => f.endsWith(".json") || f.endsWith(".html"));
  const blobs = await readBlobs(root, rev, files);
  const errors = [];
  let blocks = 0;
  for (const f of files) {
    const text = blobs.get(f).toString("utf8").replace(/^﻿/, "");
    if (f.endsWith(".json")) {
      blocks++;
      try {
        JSON.parse(text);
      } catch (err) {
        errors.push({ file: f, line: 1, message: err.message });
      }
      continue;
    }
    const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    for (const m of text.matchAll(re)) {
      blocks++;
      try {
        JSON.parse(m[1]);
      } catch (err) {
        const line = text.slice(0, m.index).split("\n").length;
        errors.push({ file: f, line, message: `JSON-LD: ${err.message}` });
      }
    }
  }
  return { blocks, errors };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { blocks, errors } = await checkJson(repoRoot());
  for (const e of errors) console.log(`::error file=${e.file},line=${e.line}::${e.message}`);
  console.log(`Parsed ${blocks} JSON files/JSON-LD blocks: ${errors.length} invalid.`);
  process.exit(errors.length ? 1 : 0);
}

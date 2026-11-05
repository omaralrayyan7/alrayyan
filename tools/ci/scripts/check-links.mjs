#!/usr/bin/env node
// Offline internal link + asset check on the assembled publish dir.
// Every href/src/srcset/poster in HTML and every url() in CSS that points at a
// local path must resolve to a file the site will actually serve (including
// Netlify pretty URLs and the 200 rewrites in _redirects).
//
//   node check-links.mjs [--dir <publish dir>]   (default: assemble HEAD to a temp dir)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assemble, walk } from "./assemble-publish.mjs";
import { repoRoot } from "../lib/repo.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

// Broken references that already exist on the live site and are reported,
// not fixed (site content is off-limits for CI changes). Only NEW broken
// references fail CI; these print as warnings.
export function loadBaseline(file = path.join(here, "..", "known-broken-links.json")) {
  const entries = JSON.parse(fs.readFileSync(file, "utf8")).known;
  return new Set(entries.map((e) => `${e.file} ${e.ref}`));
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\$\{|\{\{)/i;

export function parseRedirects(text) {
  const rewrites = [];
  const blocked = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [from, to, status] = line.split(/\s+/);
    if (!from || !to) continue;
    const rule = { from, to, status: status || "301" };
    if (rule.status.startsWith("404")) blocked.push(rule);
    else if (rule.status.startsWith("200")) rewrites.push(rule);
  }
  return { rewrites, blocked };
}

function matchRule(from, urlPath) {
  if (from.endsWith("/*")) {
    const prefix = from.slice(0, -1);
    return urlPath.startsWith(prefix) || urlPath === from.slice(0, -2);
  }
  return urlPath === from || urlPath === from.replace(/\/$/, "");
}

// Returns the publish-relative file a site path resolves to, or null.
export function resolvePath(urlPath, files, redirects) {
  if (redirects.blocked.some((r) => matchRule(r.from, urlPath))) return null;
  const clean = urlPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const candidates = clean === "" ? ["index.html"] : [clean, `${clean}.html`, `${clean}/index.html`];
  for (const c of candidates) if (files.has(c)) return c;
  for (const r of redirects.rewrites) {
    if (matchRule(r.from, urlPath)) {
      const target = r.to.replace(/^\/+/, "");
      if (files.has(target)) return target;
    }
  }
  return null;
}

// Blank out comments and <script>/<style> bodies, keeping newlines so the
// reported line numbers still match the source.
function blank(text) {
  return text.replace(/[^\n]/g, " ");
}

function stripNonMarkup(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (m, open, body, close) => open + blank(body) + close)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, open, body, close) => open + blank(body) + close);
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

export function extractRefs(file, text) {
  const refs = [];
  if (file.endsWith(".html")) {
    const html = stripNonMarkup(text);
    const attr = /\s(href|src|poster|data-src)\s*=\s*("([^"]*)"|'([^']*)')/gi;
    for (const m of html.matchAll(attr)) {
      refs.push({ ref: (m[3] ?? m[4]).trim(), line: lineOf(html, m.index) });
    }
    const srcset = /\ssrcset\s*=\s*("([^"]*)"|'([^']*)')/gi;
    for (const m of html.matchAll(srcset)) {
      for (const part of (m[2] ?? m[3]).split(",")) {
        const url = part.trim().split(/\s+/)[0];
        if (url) refs.push({ ref: url, line: lineOf(html, m.index) });
      }
    }
  } else if (file.endsWith(".css")) {
    const css = text.replace(/\/\*[\s\S]*?\*\//g, blank);
    for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
      refs.push({ ref: m[2].trim(), line: lineOf(css, m.index) });
    }
  }
  return refs.filter((r) => r.ref !== "" && !EXTERNAL.test(r.ref));
}

export function checkLinks(dir) {
  const fileList = walk(dir);
  const files = new Set(fileList);
  const redirectsFile = path.join(dir, "_redirects");
  const redirects = parseRedirects(fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile, "utf8") : "");
  const broken = [];
  let checked = 0;
  for (const file of fileList.filter((f) => f.endsWith(".html") || f.endsWith(".css"))) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const { ref, line } of extractRefs(file, text)) {
      checked++;
      let target = ref.split("#")[0].split("?")[0];
      if (target === "") continue;
      try {
        target = decodeURI(target);
      } catch {
        // keep the raw value; it will be reported if it does not resolve
      }
      const base = "/" + path.posix.dirname(file);
      const urlPath = target.startsWith("/") ? target : path.posix.join(base, target);
      if (!resolvePath(urlPath, files, redirects)) broken.push({ file, line, ref });
    }
  }
  return { checked, broken };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { dir: { type: "string" } } });
  let dir = values.dir;
  if (!dir) {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "alrayyan-publish-"));
    await assemble({ root: repoRoot(), out: dir });
  }
  const { checked, broken } = checkLinks(dir);
  const baseline = loadBaseline();
  const known = broken.filter((b) => baseline.has(`${b.file} ${b.ref}`));
  const fresh = broken.filter((b) => !baseline.has(`${b.file} ${b.ref}`));
  for (const b of known) {
    console.log(`::warning file=${b.file},line=${b.line}::Known broken reference (baseline): ${b.ref}`);
  }
  for (const b of fresh) {
    console.log(`::error file=${b.file},line=${b.line}::Broken internal link/asset: ${b.ref}`);
  }
  console.log(
    `Checked ${checked} internal references: ${fresh.length} new broken, ${known.length} known (baseline).`,
  );
  process.exit(fresh.length ? 1 : 0);
}

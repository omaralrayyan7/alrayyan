// Shared test helpers: throwaway git repos and running scripts as child processes.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_DIR = path.resolve(CI_DIR, "..", "..");

export function tmpDir(prefix = "alrayyan-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, ...rel.split("/"));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
}

export function gitIn(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

// Create a git repo; returns { root, commit(files, msg) -> sha }.
export function makeRepo(files = {}) {
  const root = tmpDir("alrayyan-repo-");
  gitIn(root, "init", "-q", "-b", "main");
  gitIn(root, "config", "user.email", "test@example.com");
  gitIn(root, "config", "user.name", "Test");
  gitIn(root, "config", "core.autocrlf", "false");
  const commit = (more, msg = "commit") => {
    writeFiles(root, more);
    gitIn(root, "add", "-A", "-f");
    gitIn(root, "commit", "-q", "--allow-empty", "-m", msg);
    return gitIn(root, "rev-parse", "HEAD");
  };
  const first = commit(files, "initial");
  return { root, first, commit };
}

// Run a node script; resolves { code, stdout, stderr, lastLine }.
export function runNode(script, { env = {}, cwd = CI_DIR, args = [] } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd,
      // A clean env: nothing from the real CI job (tokens, GITHUB_*) leaks into the scripts under test.
      env: {
        ...Object.fromEntries(
          ["PATH", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE"]
            .filter((k) => process.env[k] !== undefined)
            .map((k) => [k, process.env[k]]),
        ),
        ...env,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      const lines = stdout.trim().split(/\r?\n/);
      resolve({ code, stdout, stderr, lastLine: lines[lines.length - 1] });
    });
  });
}

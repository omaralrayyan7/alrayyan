// Git helpers shared by the CI/CD scripts. Everything works from the git
// object store (not the working tree), so untracked or modified local files
// never leak into checks or deploys.
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// Repo root: REPO_ROOT env wins (tests point it at fixture repos).
export function repoRoot() {
  if (process.env.REPO_ROOT) return path.resolve(process.env.REPO_ROOT);
  return git(["rev-parse", "--show-toplevel"], here).trim();
}

export function resolveCommit(root, rev = "HEAD") {
  return git(["rev-parse", "--verify", `${rev}^{commit}`], root).trim();
}

// All tracked file paths at a commit (forward slashes, repo-relative).
export function listFiles(root, rev = "HEAD") {
  return git(["ls-tree", "-r", "-z", "--name-only", rev], root).split("\0").filter(Boolean);
}

// Read many blobs at a commit with a single `git cat-file --batch` process.
export function readBlobs(root, rev, paths) {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", ["cat-file", "--batch"], { cwd: root });
    const chunks = [];
    proc.stdout.on("data", (c) => chunks.push(c));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`git cat-file exited ${code}`));
      const buf = Buffer.concat(chunks);
      const out = new Map();
      let pos = 0;
      for (const p of paths) {
        const nl = buf.indexOf(10, pos);
        const header = buf.subarray(pos, nl).toString("utf8");
        const [, type, sizeStr] = header.split(" ");
        if (type !== "blob") return reject(new Error(`not a blob: ${p} (${header})`));
        const size = Number(sizeStr);
        out.set(p, buf.subarray(nl + 1, nl + 1 + size));
        pos = nl + 1 + size + 1;
      }
      resolve(out);
    });
    for (const p of paths) proc.stdin.write(`${rev}:${p}\n`);
    proc.stdin.end();
  });
}

// Guard tests: fail CI if the pipeline loses a safety property.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { REPO_DIR, makeRepo, tmpDir } from "../helpers.mjs";
import { assemble, walk } from "../../scripts/assemble-publish.mjs";

const WF_DIR = path.join(REPO_DIR, ".github", "workflows");
const workflows = Object.fromEntries(
  fs.readdirSync(WF_DIR)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => [f, { text: fs.readFileSync(path.join(WF_DIR, f), "utf8"), doc: parse(fs.readFileSync(path.join(WF_DIR, f), "utf8")) }]),
);

function* jobs() {
  for (const [file, { doc }] of Object.entries(workflows)) {
    for (const [id, job] of Object.entries(doc.jobs || {})) yield { file, id, job };
  }
}

function* steps() {
  for (const { file, id, job } of jobs()) for (const step of job.steps || []) yield { file, id, step };
}

describe("workflow guards", () => {
  test("the three workflows exist", () => {
    for (const f of ["ci.yml", "cd.yml", "firebase-cd.yml"]) assert.ok(workflows[f], `${f} missing`);
  });

  test("every runner is pinned to ubuntu-24.04", () => {
    for (const { file, id, job } of jobs()) {
      assert.equal(job["runs-on"], "ubuntu-24.04", `${file} job ${id} runs on ${job["runs-on"]}`);
    }
    for (const [file, { text }] of Object.entries(workflows)) assert.ok(!/-latest\b/.test(text), `${file} uses a -latest runner`);
  });

  test("every action is pinned to a version, never a branch", () => {
    for (const { file, id, step } of steps()) {
      if (!step.uses) continue;
      const [, ref] = step.uses.split("@");
      assert.ok(ref && !/^(main|master|HEAD|latest)$/.test(ref), `${file} job ${id}: ${step.uses}`);
      assert.match(ref, /^(v\d+(\.\d+){0,2}|[0-9a-f]{40})$/, `${file} job ${id}: ${step.uses}`);
    }
  });

  test("every workflow sets least-privilege permissions", () => {
    for (const [file, { doc }] of Object.entries(workflows)) {
      assert.ok(doc.permissions !== undefined, `${file} has no top-level permissions`);
      assert.ok(doc.permissions === "read-all" || typeof doc.permissions === "object", file);
      if (typeof doc.permissions === "object") {
        for (const [k, v] of Object.entries(doc.permissions)) assert.notEqual(v, "write", `${file}: top-level ${k}: write`);
      }
    }
  });

  test('CI has an aggregate "CI passed" job that needs every other job', () => {
    const ci = workflows["ci.yml"].doc;
    const agg = Object.entries(ci.jobs).find(([, j]) => j.name === "CI passed");
    assert.ok(agg, 'no job named exactly "CI passed"');
    const [aggId, job] = agg;
    const others = Object.keys(ci.jobs).filter((k) => k !== aggId);
    assert.deepEqual([...job.needs].sort(), others.sort());
    assert.equal(job.if, "always()");
  });

  const SITE_GATES = [
    "github.repository == 'omaralrayyan7/alrayyan'",
    "github.ref == 'refs/heads/main'",
    "vars.CD_ENABLED == 'true'",
  ];
  const FIREBASE_GATES = [
    "github.repository == 'omaralrayyan7/alrayyan'",
    "github.ref == 'refs/heads/main'",
    "vars.FIREBASE_CD_ENABLED == 'true'",
  ];

  function gateJobs(file) {
    return Object.entries(workflows[file].doc.jobs);
  }

  test("site CD keeps every gate (repo, main, CD_ENABLED, CI passed)", () => {
    for (const [id, job] of gateJobs("cd.yml")) {
      for (const g of SITE_GATES) assert.ok(String(job.if).includes(g), `cd.yml job ${id} lost gate: ${g}`);
      assert.ok(String(job.if).split("&&").length >= 3, "gates must be AND-ed");
      assert.ok(!/\|\|/.test(String(job.if)), "gates must not be OR-ed");
    }
    const run = (workflows["cd.yml"].doc.jobs.deploy.steps || []).map((s) => s.run || "").join("\n");
    assert.match(run, /netlify-deploy\.mjs/);
    const script = fs.readFileSync(path.join(REPO_DIR, "tools/ci/deploy/netlify-deploy.mjs"), "utf8");
    assert.match(script, /await waitForCheck\(/, "netlify-deploy.mjs must wait for CI passed");
    assert.match(fs.readFileSync(path.join(REPO_DIR, "tools/ci/deploy/wait-for-check.mjs"), "utf8"), /checkName = "CI passed"/);
  });

  test("Firebase CD keeps every gate (repo, main, FIREBASE_CD_ENABLED, CI passed)", () => {
    for (const [id, job] of gateJobs("firebase-cd.yml")) {
      for (const g of FIREBASE_GATES) assert.ok(String(job.if).includes(g), `firebase-cd.yml job ${id} lost gate: ${g}`);
      assert.ok(!/\|\|/.test(String(job.if)), "gates must not be OR-ed");
      const runs = job.steps.map((s) => s.run || "");
      const waitIdx = runs.findIndex((r) => r.includes("wait-for-check.mjs"));
      const deployIdx = runs.findIndex((r) => r.includes("firebase-deploy.mjs"));
      assert.ok(waitIdx >= 0 && deployIdx > waitIdx, "CI passed wait must run before the deploy");
    }
  });

  test("Firebase CD authenticates with WIF, never a key", () => {
    const text = workflows["firebase-cd.yml"].text;
    assert.match(text, /workload_identity_provider:/);
    assert.ok(!/credentials_json|GOOGLE_APPLICATION_CREDENTIALS_JSON|FIREBASE_TOKEN/.test(text));
  });

  test("Firebase deploys always use --only and never hosting", () => {
    const script = fs.readFileSync(path.join(REPO_DIR, "tools/ci/deploy/firebase-deploy.mjs"), "utf8");
    assert.match(script, /\["deploy", "--only", only/);
    for (const { file, id, step } of steps()) {
      assert.ok(!/firebase(-tools)?(@\S+)?\s+deploy/.test(step.run || ""), `${file} job ${id} calls firebase deploy directly`);
    }
  });

  test("--prod only appears in the gated site CD path", () => {
    for (const { file, id, step } of steps()) {
      assert.ok(!(step.run || "").includes("--prod"), `${file} job ${id} must not call --prod directly`);
    }
    const script = fs.readFileSync(path.join(REPO_DIR, "tools/ci/deploy/netlify-deploy.mjs"), "utf8");
    assert.match(script, /if \(cfg\.ref !== "refs\/heads\/main"\) return untouched/);
  });

  test("no step echoes or inlines a secret", () => {
    for (const { file, id, step } of steps()) {
      const run = step.run || "";
      assert.ok(!/\$\{\{\s*secrets\./.test(run), `${file} job ${id}: secrets.* inlined in a run script`);
      for (const line of run.split("\n")) {
        if (/\b(echo|printf|cat)\b/.test(line)) {
          assert.ok(
            !/\$\{?[A-Z_]*(TOKEN|SECRET|PASSWORD|KEY)\b/.test(line),
            `${file} job ${id}: prints a secret-looking variable: ${line.trim()}`,
          );
        }
      }
      assert.ok(!/set -x|--verbose|--debug/.test(run), `${file} job ${id}: debug tracing can leak secrets`);
    }
  });

  test("CD concurrency never cancels a running deploy", () => {
    for (const f of ["cd.yml", "firebase-cd.yml"]) {
      assert.equal(workflows[f].doc.concurrency["cancel-in-progress"], false, f);
    }
  });

  test("netlify-cli and firebase-tools versions are pinned exactly", () => {
    assert.match(workflows["cd.yml"].doc.env.NETLIFY_CLI_VERSION, /^\d+\.\d+\.\d+$/);
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_DIR, "tools/ci/package.json"), "utf8"));
    for (const [name, v] of Object.entries(pkg.devDependencies)) assert.match(v, /^\d+\.\d+\.\d+$/, name);
  });
});

describe("publish dir guards", () => {
  test("the publish dir never contains .env, functions/, tools/, node_modules, .github/ or docs/", async () => {
    const repo = makeRepo({
      "index.html": "<!doctype html><title>x</title>",
      "_redirects": "/a /b 301\n",
      ".env": "SECRET=1",
      "functions/.env": "SECRET=1",
      "functions/index.js": "x",
      "tools/ci/package.json": "{}",
      "node_modules/x/index.js": "x",
      "css/node_modules/y.js": "x",
      ".github/workflows/ci.yml": "x",
      "docs/ops/x.md": "x",
      "test/a.js": "x",
      "js/app.test.js": "x",
      "README.md": "x",
      "js/app.js": "x",
    });
    const out = tmpDir("alrayyan-publish-");
    const { files } = await assemble({ root: repo.root, out, versionSha: repo.first });
    assert.deepEqual(files, ["_redirects", "index.html", "js/app.js", "version.json"]);
  });

  test("the real repo's publish dir is clean and has version.json", async () => {
    const out = tmpDir("alrayyan-publish-");
    await assemble({ root: REPO_DIR, out, versionSha: "f".repeat(40) });
    const files = walk(out);
    for (const f of files) {
      assert.ok(!/(^|\/)(\.env|node_modules|functions|tools|\.github|docs)(\/|$)/.test(f), f);
    }
    assert.ok(files.includes("index.html") && files.includes("_redirects") && files.includes("version.json"));
    assert.equal(JSON.parse(fs.readFileSync(path.join(out, "version.json"), "utf8")).sha, "f".repeat(40));
  });
});

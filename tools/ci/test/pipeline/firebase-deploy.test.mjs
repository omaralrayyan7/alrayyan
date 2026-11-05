// Firebase CD: secret preflight, target planning and the deploy call, against
// the local mock Secret Manager and a fake firebase CLI.
import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startMock } from "./mock-server.mjs";
import { CI_DIR, makeRepo, runNode, tmpDir, writeFiles } from "../helpers.mjs";
import { referencedSecrets } from "../../deploy/firebase-deploy.mjs";
import { plan } from "../../deploy/firebase-plan.mjs";

const SCRIPT = path.join(CI_DIR, "deploy", "firebase-deploy.mjs");
const FUNCTIONS_SRC = `
const {defineSecret} = require('firebase-functions/params');
const A = defineSecret('SMTP_EMAIL');
const B = defineSecret("SMTP_PASSWORD");
const C = defineSecret('ADMIN_EMAIL');
exports.x = onCall({secrets: ['META_TOKEN', A]}, () => {});
`;

let mock;
let work;

beforeEach(async () => {
  mock = await startMock();
  work = tmpDir("alrayyan-fb-");
});

afterEach(async () => {
  await mock.close();
});

function fixtureRepo() {
  const { root } = makeRepo({ "functions/index.js": FUNCTIONS_SRC, "firebase.json": "{}" });
  return root;
}

function fakeFirebase() {
  const marker = path.join(work, "firebase-args.json");
  const bin = path.join(work, "fake-firebase.mjs");
  fs.writeFileSync(bin, `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify(process.argv.slice(2)));`);
  return { bin, marker };
}

function run(root, env) {
  const { bin, marker } = fakeFirebase();
  return runNode(SCRIPT, {
    env: {
      REPO_ROOT: root,
      DEPLOY_SHA: "c".repeat(40),
      FIREBASE_PROJECT: "alrayyan-group",
      GCP_ACCESS_TOKEN: "test-gcp-token",
      SECRET_MANAGER_API_URL: `${mock.base}/sm/v1`,
      FIREBASE_BIN: bin,
      ...env,
    },
  }).then((r) => ({ ...r, firebaseArgs: fs.existsSync(marker) ? JSON.parse(fs.readFileSync(marker, "utf8")) : null }));
}

describe("firebase secret preflight", () => {
  test("finds defineSecret() and secrets: [...] names", () => {
    const dir = tmpDir();
    writeFiles(dir, { "index.js": FUNCTIONS_SRC, "node_modules/x/index.js": "defineSecret('IGNORED')" });
    assert.deepEqual(referencedSecrets(dir), ["ADMIN_EMAIL", "META_TOKEN", "SMTP_EMAIL", "SMTP_PASSWORD"]);
  });

  test("missing secrets -> fails with their names and deploys nothing", async () => {
    mock.state.secrets = new Set(["SMTP_EMAIL", "META_TOKEN"]);
    const r = await run(fixtureRepo(), { DEPLOY_TARGETS: "functions" });
    assert.equal(r.lastLine, "RESULT: FIREBASE FAILED", r.stdout);
    assert.equal(r.code, 1);
    assert.match(r.stdout, /Missing in Secret Manager.*ADMIN_EMAIL, SMTP_PASSWORD/);
    assert.equal(r.firebaseArgs, null, "firebase must not be invoked");
  });

  test("missing secrets also block a combined rules+functions deploy", async () => {
    const r = await run(fixtureRepo(), { DEPLOY_TARGETS: "firestore:rules,functions" });
    assert.equal(r.lastLine, "RESULT: FIREBASE FAILED");
    assert.equal(r.firebaseArgs, null);
  });

  test("all secrets present -> deploys only functions", async () => {
    mock.state.secrets = new Set(["SMTP_EMAIL", "SMTP_PASSWORD", "ADMIN_EMAIL", "META_TOKEN"]);
    const r = await run(fixtureRepo(), { DEPLOY_TARGETS: "functions" });
    assert.equal(r.lastLine, `RESULT: FIREBASE DEPLOYED functions commit ${"c".repeat(40)}`, r.stdout);
    assert.deepEqual(r.firebaseArgs.slice(0, 5), ["deploy", "--only", "functions", "--project", "alrayyan-group"]);
    assert.ok(r.firebaseArgs.includes("--non-interactive"));
  });

  test("rules-only deploy skips the secret preflight", async () => {
    const r = await run(fixtureRepo(), { DEPLOY_TARGETS: "firestore:rules" });
    assert.equal(r.lastLine, `RESULT: FIREBASE DEPLOYED firestore:rules commit ${"c".repeat(40)}`, r.stdout);
    assert.ok(!mock.state.calls.some((c) => c.includes("/sm/")));
  });

  test("no targets -> Nothing to deploy", async () => {
    const r = await run(fixtureRepo(), { DEPLOY_TARGETS: "" });
    assert.equal(r.lastLine, "RESULT: Nothing to deploy");
    assert.equal(r.code, 0);
    assert.equal(r.firebaseArgs, null);
  });

  test("hosting (or anything else) is never deployed", async () => {
    const r = await run(fixtureRepo(), { DEPLOY_TARGETS: "hosting" });
    assert.equal(r.lastLine, "RESULT: FIREBASE FAILED");
    assert.equal(r.firebaseArgs, null);
  });
});

describe("firebase target planning", () => {
  function pushEnv(root, before, after) {
    const ev = path.join(work, "event.json");
    fs.writeFileSync(ev, JSON.stringify({ before, after }));
    return { GITHUB_EVENT_NAME: "push", GITHUB_EVENT_PATH: ev, GITHUB_SHA: after };
  }

  test("push: a functions change in an EARLIER commit of the push is still deployed", () => {
    const repo = makeRepo({ "index.html": "x", "functions/index.js": "a", "firestore.rules": "r" });
    repo.commit({ "functions/index.js": "b" }, "functions change");
    const last = repo.commit({ "index.html": "y" }, "site change");
    const p = plan(repo.root, pushEnv(repo.root, repo.first, last));
    assert.deepEqual(p.targets, ["functions"]);
    assert.equal(p.sha, last);
  });

  test("push: rules-only change", () => {
    const repo = makeRepo({ "index.html": "x", "functions/index.js": "a", "firestore.rules": "r" });
    const last = repo.commit({ "firestore.rules": "r2" });
    assert.deepEqual(plan(repo.root, pushEnv(repo.root, repo.first, last)).targets, ["firestore:rules"]);
  });

  test("push: site-only change -> nothing for Firebase", () => {
    const repo = makeRepo({ "index.html": "x", "functions/index.js": "a" });
    const last = repo.commit({ "index.html": "y" });
    assert.deepEqual(plan(repo.root, pushEnv(repo.root, repo.first, last)).targets, []);
  });

  test("dispatch: redeploy an older main commit", () => {
    const repo = makeRepo({ "functions/index.js": "a" });
    const last = repo.commit({ "functions/index.js": "b" });
    const p = plan(repo.root, {
      GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_SHA: last, INPUT_REF: repo.first, INPUT_TARGETS: "rules",
    });
    assert.equal(p.sha, repo.first);
    assert.deepEqual(p.targets, ["firestore:rules"]);
  });

  test("dispatch: a ref that is not on main is refused", () => {
    const repo = makeRepo({ "functions/index.js": "a" });
    const mainSha = repo.commit({ "functions/index.js": "b" });
    repo.commit({ "functions/index.js": "c" }); // ahead of mainSha, so not its ancestor
    const ahead = repo.commit({ "functions/index.js": "d" });
    assert.throws(
      () => plan(repo.root, { GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_SHA: mainSha, INPUT_REF: ahead }),
      /not on main/,
    );
  });
});

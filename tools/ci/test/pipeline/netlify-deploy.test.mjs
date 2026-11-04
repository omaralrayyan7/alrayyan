// Site CD scenarios against the local mock (no network, no real Netlify).
import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startMock } from "./mock-server.mjs";
import { CI_DIR, runNode, tmpDir } from "../helpers.mjs";

const SCRIPT = path.join(CI_DIR, "deploy", "netlify-deploy.mjs");
const FAKE_CLI = path.join(CI_DIR, "test", "pipeline", "fake-netlify-cli.mjs");
const SHA = "a".repeat(40);
const OLD = "b".repeat(40);

let mock;
let work;

beforeEach(async () => {
  mock = await startMock();
  mock.state.checks[SHA] = { status: "completed", conclusion: "success" };
  work = tmpDir("alrayyan-cd-");
});

afterEach(async () => {
  await mock.close();
});

function publishDir(sha = SHA, name = "publish") {
  const dir = path.join(work, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>x</title>");
  fs.writeFileSync(path.join(dir, "version.json"), JSON.stringify({ sha, deployedAt: "2026-11-04T00:00:00Z" }));
  return dir;
}

function run(overrides = {}) {
  const cliLog = path.join(work, "cli-args.json");
  const summary = path.join(work, "summary.md");
  return runNode(SCRIPT, {
    env: {
      COMMIT_SHA: SHA,
      GITHUB_REF: "refs/heads/main",
      GITHUB_REPOSITORY: "omaralrayyan7/alrayyan",
      GITHUB_TOKEN: "test-github-token",
      GITHUB_API_URL: `${mock.base}/github`,
      NETLIFY_AUTH_TOKEN: mock.state.token,
      NETLIFY_SITE_ID: "site-1",
      NETLIFY_API_URL: `${mock.base}/netlify/api/v1`,
      SITE_URL: `${mock.base}/site`,
      WWW_URL: `${mock.base}/www`,
      PUBLISH_DIR: publishDir(),
      NETLIFY_CLI_BIN: FAKE_CLI,
      MOCK_CONTROL_URL: mock.base,
      MOCK_CLI_LOG: cliLog,
      HEALTH_ATTEMPTS: "2",
      HEALTH_INTERVAL_MS: "10",
      CI_WAIT_INTERVAL_MS: "10",
      CI_WAIT_TIMEOUT_MS: "200",
      GITHUB_STEP_SUMMARY: summary,
      ...overrides,
    },
  }).then((r) => ({
    ...r,
    cliArgs: fs.existsSync(cliLog) ? JSON.parse(fs.readFileSync(cliLog, "utf8")) : null,
    summary: fs.existsSync(summary) ? fs.readFileSync(summary, "utf8") : "",
  }));
}

describe("site CD (netlify-deploy.mjs)", () => {
  test("first deploy: no version.json live yet -> deploys and verifies", async () => {
    const r = await run();
    assert.equal(r.lastLine, `RESULT: DEPLOYED commit ${SHA}`, r.stdout);
    assert.equal(r.code, 0);
    assert.equal(mock.state.deploys[mock.state.published].sha, SHA);
    assert.deepEqual(r.cliArgs.slice(0, 3), ["deploy", "--prod", "--no-build"]);
    assert.ok(r.cliArgs.includes("--json"));
    assert.equal(r.cliArgs[r.cliArgs.indexOf("--message") + 1], SHA);
    assert.match(r.summary, /d1/);
    assert.match(r.summary, /\/www\//);
  });

  test("nothing to deploy: live version.json already has this commit", async () => {
    mock.state.deploys.d0.sha = SHA;
    const r = await run();
    assert.equal(r.lastLine, "RESULT: Nothing to deploy", r.stdout);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /^Nothing to deploy$/m);
    assert.equal(r.cliArgs, null, "CLI must not run");
    assert.ok(!mock.state.calls.some((c) => c.startsWith("GET /netlify/")), "getSite must not be called");
  });

  test("new deploy: replaces an older commit", async () => {
    mock.state.deploys.d0.sha = OLD;
    const r = await run();
    assert.equal(r.lastLine, `RESULT: DEPLOYED commit ${SHA}`, r.stdout);
    assert.equal(mock.state.published, "d1");
    assert.equal(mock.state.restored, undefined);
  });

  test("failing health check -> restores the recorded deploy", async () => {
    mock.state.deploys.d0.sha = OLD;
    mock.state.nextDeployBroken = true;
    const r = await run();
    assert.equal(r.lastLine, "RESULT: FAILED and ROLLED BACK", r.stdout);
    assert.equal(r.code, 1);
    assert.equal(mock.state.restored, "d0");
    assert.equal(mock.state.published, "d0");
    assert.match(r.stdout, /health check failed for .*\/fashion/);
  });

  test("failing CLI deploy -> restores the recorded deploy", async () => {
    mock.state.deploys.d0.sha = OLD;
    const r = await run({ MOCK_CLI_FAIL: "1" });
    assert.equal(r.lastLine, "RESULT: FAILED and ROLLED BACK", r.stdout);
    assert.equal(r.code, 1);
    assert.equal(mock.state.published, "d0");
  });

  test("failing deployId capture -> aborts with nothing changed", async () => {
    mock.state.deploys.d0.sha = OLD;
    mock.state.failGetSite = true;
    const r = await run();
    assert.equal(r.lastLine, "RESULT: FAILED and ROLLED BACK", r.stdout);
    assert.equal(r.code, 1);
    assert.match(r.stdout, /live site was not touched/);
    assert.equal(r.cliArgs, null, "CLI must not run");
    assert.equal(mock.state.published, "d0");
    assert.ok(!mock.state.calls.some((c) => c.includes("/restore")));
  });

  test("CI passed did not succeed -> aborts with nothing changed", async () => {
    mock.state.checks[SHA] = { status: "completed", conclusion: "failure" };
    const r = await run();
    assert.equal(r.code, 1);
    assert.match(r.stdout, /CI gate/);
    assert.equal(r.cliArgs, null);
    assert.equal(mock.state.published, "d0");
  });

  test("CI passed missing for this commit -> waits, then aborts", async () => {
    delete mock.state.checks[SHA];
    const r = await run();
    assert.equal(r.code, 1);
    assert.match(r.stdout, /timed out waiting for "CI passed"/);
    assert.equal(r.cliArgs, null);
  });

  test("--prod never runs from a non-main ref", async () => {
    const r = await run({ GITHUB_REF: "refs/heads/feature" });
    assert.equal(r.code, 1);
    assert.match(r.stdout, /only from refs\/heads\/main/);
    assert.equal(r.cliArgs, null);
    assert.equal(mock.state.calls.length, 0, "no HTTP calls at all");
  });

  test("missing secrets -> aborts without calling anything", async () => {
    const r = await run({ NETLIFY_AUTH_TOKEN: "" });
    assert.equal(r.code, 1);
    assert.match(r.stdout, /missing secrets: NETLIFY_AUTH_TOKEN/);
    assert.equal(mock.state.calls.length, 0);
  });

  test("publish dir built from another commit -> refuses", async () => {
    const dir = publishDir(OLD, "publish-old");
    const r = await run({ PUBLISH_DIR: dir });
    assert.equal(r.code, 1);
    assert.match(r.stdout, /built from b+, not a+/);
    assert.equal(r.cliArgs, null);
  });

  test("never prints the Netlify token", async () => {
    mock.state.nextDeployBroken = true;
    const r = await run();
    assert.ok(!r.stdout.includes(mock.state.token) && !r.stderr.includes(mock.state.token));
    assert.ok(!r.summary.includes(mock.state.token));
  });
});

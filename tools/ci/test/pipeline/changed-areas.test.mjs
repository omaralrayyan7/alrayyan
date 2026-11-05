// Change detection must look at every commit in a push, not just the last.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { changedAreas, classify } from "../../scripts/changed-areas.mjs";
import { makeRepo } from "../helpers.mjs";

describe("changed areas", () => {
  test("classifies paths", () => {
    assert.equal(classify(["css/style.css"]).site, true);
    assert.equal(classify(["functions/index.js"]).functions, true);
    assert.equal(classify(["functions/index.js"]).site, false);
    assert.equal(classify(["firestore.rules"]).rules, true);
    assert.equal(classify(["firestore.rules"]).site, false);
    assert.equal(classify([".github/workflows/ci.yml"]).deploy, true);
    assert.equal(classify(["tools/ci/package.json"]).deploy, true);
    assert.equal(classify(["tools/ci/package.json"]).site, true);
    const docs = classify(["docs/ops/rollback.md", "README.md"]);
    assert.ok(Object.values(docs).every((v) => v === false));
  });

  test("push: union of ALL commits, not just the last", () => {
    const repo = makeRepo({ "index.html": "a", "functions/index.js": "a", "firestore.rules": "a" });
    repo.commit({ "functions/index.js": "b" });
    repo.commit({ "firestore.rules": "b" });
    const last = repo.commit({ "README.md": "docs" });
    const { areas } = changedAreas(repo.root, { name: "push", before: repo.first, after: last });
    assert.equal(areas.functions, true);
    assert.equal(areas.rules, true);
    assert.equal(areas.site, false);
  });

  test("first push of a branch (before = zeros) runs everything", () => {
    const repo = makeRepo({ "README.md": "x" });
    const { areas } = changedAreas(repo.root, { name: "push", before: "0".repeat(40), after: repo.first });
    assert.ok(Object.values(areas).every(Boolean));
  });

  test("unknown before (force-push) runs everything", () => {
    const repo = makeRepo({ "README.md": "x" });
    const { areas } = changedAreas(repo.root, { name: "push", before: "1".repeat(40), after: repo.first });
    assert.ok(Object.values(areas).every(Boolean));
  });

  test("manual dispatch runs everything", () => {
    const repo = makeRepo({ "README.md": "x" });
    const { areas } = changedAreas(repo.root, { name: "workflow_dispatch" });
    assert.ok(Object.values(areas).every(Boolean));
  });

  test("pull request: diff against the merge base", () => {
    const repo = makeRepo({ "index.html": "a", "functions/index.js": "a" });
    const head = repo.commit({ "css/x.css": "b" });
    const { areas } = changedAreas(repo.root, { name: "pull_request", base: repo.first, head });
    assert.equal(areas.site, true);
    assert.equal(areas.functions, false);
  });
});

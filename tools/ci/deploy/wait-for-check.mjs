// Gate: the "CI passed" check run must have SUCCEEDED for this exact commit.
// Polls the GitHub checks API (a `needs:` across workflows is not possible),
// waiting while CI is still queued or running.
//
// CLI: CHECK_SHA=<sha> GITHUB_REPOSITORY=... GITHUB_TOKEN=... node wait-for-check.mjs
import { pathToFileURL } from "node:url";
import { request, sleep } from "./http.mjs";

export async function waitForCheck({
  apiUrl = "https://api.github.com",
  repo,
  sha,
  token,
  checkName = "CI passed",
  timeoutMs = 45 * 60 * 1000,
  intervalMs = 20000,
  log = console.log,
}) {
  const url = `${apiUrl}/repos/${repo}/commits/${sha}/check-runs?check_name=${encodeURIComponent(checkName)}&filter=latest`;
  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "alrayyan-cd" };
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = await request(url, { headers });
    if (!res.ok) throw new Error(`checks API returned HTTP ${res.status}`);
    const runs = (res.json?.check_runs || []).filter((r) => r.name === checkName);
    // filter=latest returns the newest run per name; take the highest id to be safe.
    const run = runs.sort((a, b) => b.id - a.id)[0];
    if (run && run.status === "completed") {
      if (run.conclusion === "success") {
        log(`"${checkName}" succeeded for ${sha}.`);
        return run;
      }
      throw new Error(`"${checkName}" concluded "${run.conclusion}" for ${sha}`);
    }
    if (Date.now() > deadline) throw new Error(`timed out waiting for "${checkName}" on ${sha}`);
    log(run ? `"${checkName}" is ${run.status}; waiting...` : `"${checkName}" has not started yet; waiting...`);
    await sleep(intervalMs);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await waitForCheck({
      apiUrl: process.env.GITHUB_API_URL || undefined,
      repo: process.env.GITHUB_REPOSITORY,
      sha: process.env.CHECK_SHA,
      token: process.env.GITHUB_TOKEN,
    });
  } catch (err) {
    console.log(`::error::CI gate: ${err.message}`);
    process.exitCode = 1;
  }
}

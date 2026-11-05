// One local HTTP server that stands in for everything the deploy scripts
// talk to:
//   /github/...    GitHub checks API          (GITHUB_API_URL)
//   /netlify/...   Netlify API                (NETLIFY_API_URL)
//   /site/...      the live site (apex)       (SITE_URL)
//   /www/...       www, 301 -> /site          (WWW_URL)
//   /sm/...        Secret Manager API         (SECRET_MANAGER_API_URL)
//   /control/...   test-only hooks used by the fake netlify CLI
import http from "node:http";

export async function startMock(initial = {}) {
  const state = {
    token: "test-netlify-token",
    checks: {}, // sha -> { status, conclusion }
    deploys: { d0: { sha: null, broken: false } }, // sha null = pre-CD deploy, no version.json
    published: "d0",
    failGetSite: false,
    nextDeployBroken: false,
    secrets: new Set(),
    calls: [],
    seq: 0,
    ...initial,
  };

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://mock");
      const p = url.pathname;
      state.calls.push(`${req.method} ${p}`);
      const send = (status, data, headers = {}) => {
        const isJson = typeof data !== "string";
        res.writeHead(status, { "content-type": isJson ? "application/json" : "text/html", ...headers });
        res.end(isJson ? JSON.stringify(data) : data);
      };

      let m;
      if ((m = p.match(/^\/github\/repos\/[^/]+\/[^/]+\/commits\/([0-9a-f]+)\/check-runs$/))) {
        const c = state.checks[m[1]];
        const runs = c ? [{ id: 1, name: url.searchParams.get("check_name"), ...c }] : [];
        return send(200, { total_count: runs.length, check_runs: runs });
      }

      if (p.startsWith("/netlify/")) {
        if (req.headers.authorization !== `Bearer ${state.token}`) return send(401, { message: "unauthorized" });
        if ((m = p.match(/^\/netlify\/api\/v1\/sites\/([^/]+)$/)) && req.method === "GET") {
          if (state.failGetSite) return send(500, { message: "boom" });
          return send(200, { id: m[1], published_deploy: state.published ? { id: state.published } : null });
        }
        if ((m = p.match(/^\/netlify\/api\/v1\/sites\/[^/]+\/deploys\/([^/]+)\/restore$/)) && req.method === "POST") {
          if (!state.deploys[m[1]]) return send(404, { message: "no such deploy" });
          state.published = m[1];
          state.restored = m[1];
          return send(200, { id: m[1], state: "ready" });
        }
        return send(404, { message: "not mocked" });
      }

      if (p === "/control/deploy" && req.method === "POST") {
        const { sha } = JSON.parse(body);
        const id = `d${++state.seq}`;
        state.deploys[id] = { sha, broken: state.nextDeployBroken };
        state.published = id;
        return send(200, { id });
      }

      if (p.startsWith("/www")) {
        return send(301, "moved", { location: `http://${req.headers.host}/site${p.slice(4) || "/"}` });
      }

      if (p.startsWith("/site")) {
        const live = state.deploys[state.published];
        const sub = p.slice(5) || "/";
        if (sub === "/version.json") return live.sha ? send(200, { sha: live.sha }) : send(404, "not found");
        if (live.broken && sub === "/fashion") return send(500, "broken");
        return send(200, "<!doctype html><title>ok</title>");
      }

      if ((m = p.match(/^\/sm\/v1\/projects\/[^/]+\/secrets\/([^/]+)\/versions$/))) {
        if (req.headers.authorization !== "Bearer test-gcp-token") return send(401, { error: "unauthorized" });
        if (!state.secrets.has(m[1])) return send(404, { error: { code: 404 } });
        return send(200, { versions: [{ name: `${m[1]}/versions/1`, state: "ENABLED" }] });
      }

      send(404, "not mocked");
    });
  });

  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { state, base, close: () => new Promise((r) => server.close(r)) };
}

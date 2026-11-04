// Stand-in for `netlify deploy` used by the pipeline tests (NETLIFY_CLI_BIN).
// Records its argv, "publishes" the dir's version.json SHA on the mock, and
// prints the same JSON shape as `netlify deploy --json`.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
if (process.env.MOCK_CLI_LOG) fs.writeFileSync(process.env.MOCK_CLI_LOG, JSON.stringify(args));
if (process.env.MOCK_CLI_FAIL === "1") {
  console.error("fake netlify: simulated upload failure");
  process.exit(1);
}
const dir = args[args.indexOf("--dir") + 1];
const { sha } = JSON.parse(fs.readFileSync(path.join(dir, "version.json"), "utf8"));
const res = await fetch(`${process.env.MOCK_CONTROL_URL}/control/deploy`, {
  method: "POST",
  body: JSON.stringify({ sha }),
});
const { id } = await res.json();
console.log(JSON.stringify({ site_id: "site-1", deploy_id: id, deploy_url: `https://${id}--mock.netlify.app` }, null, 2));

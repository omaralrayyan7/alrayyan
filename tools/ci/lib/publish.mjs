// What goes into the Netlify publish dir. CI and CD both use this, so the
// artifact CI builds is exactly what CD deploys.
//
// Everything tracked is published EXCEPT the paths below. The repo-meta list
// mirrors the files _redirects already 404s (and firebase.json hosting.ignore),
// so leaving them out changes nothing visitors can reach.

const EXCLUDED_TOP_DIRS = ["tools/", "functions/", "docs/"];

const EXCLUDED_ROOT_FILES = new Set([
  "README.md",
  "CLAUDE.md",
  "DEPLOY_COMMANDS.md",
  "LICENSE",
  "firebase.json",
  "firestore.rules",
  "firestore.indexes.json",
  "package.json",
  "package-lock.json",
  "netlify.toml",
  "seed.html",
  // Only seed.html loads it, and it holds admin seed data.
  "js/seed-data.js",
]);

export function isExcluded(file) {
  const segments = file.split("/");
  // Dotfiles and dot-dirs anywhere: .github/, .claude/, .firebase/, .env*, .gitignore ...
  if (segments.some((s) => s.startsWith("."))) return true;
  if (segments.includes("node_modules")) return true;
  if (EXCLUDED_TOP_DIRS.some((d) => file.startsWith(d))) return true;
  // Tests, wherever they live.
  if (segments.some((s) => s === "test" || s === "tests" || s === "__tests__")) return true;
  if (/\.(test|spec)\.[cm]?[jt]s$/.test(file)) return true;
  if (EXCLUDED_ROOT_FILES.has(file)) return true;
  const base = segments[segments.length - 1];
  if (base.toLowerCase() === "desktop.ini" || base === "Thumbs.db") return true;
  if (base.endsWith(".md")) return true;
  return false;
}

// Never allowed in a publish dir, whatever the exclusion list says. Checked
// after assembly as a second line of defence.
export function forbiddenInPublish(file) {
  const segments = file.split("/");
  if (segments.some((s) => s.startsWith(".env"))) return ".env file";
  if (segments.includes("node_modules")) return "node_modules";
  if (segments[0] === "functions") return "functions/";
  if (segments[0] === "tools") return "tools/";
  if (segments[0] === ".github") return ".github/";
  return null;
}

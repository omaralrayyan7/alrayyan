# Alrayyan Group / Alrayyan Tower website

Static site (vanilla HTML/CSS/JS, no framework, no bundler) served by Netlify at https://alrayyanjo.com. The admin panel (`/mgmt-panel`) uses Firebase (project `alrayyan-group`): Firestore, Auth, and Cloud Functions in `europe-west1` (`functions/`). Fashion, Arts and Lands are pages on the same site (`/fashion`, `/arts`, `/land`).

## Delivery rule B

- All work goes through a PR to `main`. No direct pushes; branch protection enforces this.
- The author merges their own PR once the **CI passed** check is green. No approval is required.
- No force-push, no history rewrites, and don't touch other people's branches.

## Deploying

- **Never deploy by hand once CD is on** (`CD_ENABLED=true`): no `netlify deploy`, no drag-and-drop. Merging to `main` deploys.
- **Never run `firebase deploy` locally for functions or rules once `FIREBASE_CD_ENABLED=true`.** Never run a bare `firebase deploy`: `firebase.json` still has a legacy hosting block.
- Setup, runbook and rollback: `docs/ops/cd-setup.md`, `docs/ops/deployment-runbook.md`, `docs/ops/rollback.md`.
- Dev-only tooling lives in `tools/ci/` (own `package.json` and lockfile). Never add a `package.json`, build command or bundler at the repo root: the site root must stay framework-free.

## Do not touch

- Site content, design, theme, copy, images and file names. No image renames or conversions. The logo stays PNG.
- Hardcoded old-domain references (canonical / OG / JSON-LD to `alrayyangroup.online`) are a separate task. CI only warns about them.
- DNS. `alrayyanjo.com` has Microsoft 365 records (MX, SPF, DMARC, SRV, autodiscover).
- Firestore data, Firebase secrets, Firebase Auth config and the admin auth logic. Report problems; don't fix them.
- Never create, print or commit a private key, password or token. Secrets go in GitHub environment secrets (Netlify) or Google Secret Manager (functions).

## Checks

From `tools/ci`: `npm ci`, then `npm run lint:html`, `lint:js`, `check:json`, `check:links`, `test:pipeline`, and `test:rules` (needs Java 21+). CI runs the same commands.

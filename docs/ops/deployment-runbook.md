# Deployment runbook

## Normal change (delivery rule B)

1. Branch from `main`, commit, push, and open a PR.
2. Wait for the **CI passed** check to go green. Fix and push if it's red.
3. Merge it yourself. No review is required.
4. With `CD_ENABLED=true`, **CD (site)** starts on the merge commit. It waits for **CI passed** on that commit, then deploys. If `functions/` or `firestore.rules` changed, **CD (Firebase)** does the same (with `FIREBASE_CD_ENABLED=true`).
5. Check the run's summary: commit, deploy ID, deploy URL and the status of each URL.

Once CD is on, **never deploy by hand**: no Netlify drag-and-drop, no `netlify deploy`, no `firebase deploy` for functions or rules.

## What CD (site) does

1. Assembles the publish dir from the commit with `tools/ci/scripts/assemble-publish.mjs`. That's every tracked file except `tools/`, `functions/`, `docs/`, `.github/`, tests, dotfiles, `.env*`, `node_modules`, and the repo docs/config that `_redirects` already 404s. It writes `/version.json` = `{"sha","deployedAt"}`.
2. Waits for **CI passed** on that commit through the GitHub API. If CI failed, it stops.
3. If `https://alrayyanjo.com/version.json` already has this SHA, it prints `Nothing to deploy` and ends.
4. Records the currently published deploy ID. If it can't, it aborts and nothing changes.
5. Runs `netlify deploy --prod --no-build --dir <publish> --message <sha> --json` with the pinned `netlify-cli`.
6. Health-checks the apex, `www` (following its redirect), `/fashion`, `/arts`, `/land` and `/mgmt-panel`. Each must return 200, and `/version.json` must show the commit. It retries 6 times, 10 s apart, with a 15 s timeout per request.
7. On any failure it restores the recorded deploy, confirms it's live again, and exits non-zero.

The last log line is one of:

| Line | Meaning |
|---|---|
| `RESULT: DEPLOYED commit <sha>` | live and healthy |
| `RESULT: Nothing to deploy` | that commit was already live |
| `RESULT: FAILED and ROLLED BACK` | the previous deploy is live again. If the line above says "the live site was not touched", it failed before publishing |
| `RESULT: FAILED and ROLLBACK FAILED` | **act now**: follow `rollback.md` |

## What CD (Firebase) does

1. Works out targets from **all** commits in the push: `functions/` or `firebase.json` → functions; `firestore.rules`, `firestore.indexes.json` or `firebase.json` → rules. A site-only push ends with `RESULT: Nothing to deploy`.
2. Waits for **CI passed** on the commit.
3. For functions, checks that every secret the code references exists in Secret Manager with an enabled version. If any is missing, it fails, lists the names and deploys nothing.
4. Runs `firebase deploy --only firestore:rules` and/or `--only functions` with the pinned firebase-tools. It never deploys hosting.
5. Ends with `RESULT: FIREBASE DEPLOYED <targets> commit <sha>`, `RESULT: Nothing to deploy` or `RESULT: FIREBASE FAILED`. There's no automatic rollback (see `rollback.md`).

## Manual runs

Redeploy the site's current main:

```powershell
gh workflow run cd.yml --repo omaralrayyan7/alrayyan --ref main
```

Deploy only the rules, only the functions, or both from current main:

```powershell
gh workflow run firebase-cd.yml --repo omaralrayyan7/alrayyan --ref main -f targets=rules
```

Always use `--ref main`. Runs from any other branch are skipped by the gate.

## When CI is red

- **Site / html-validate**: real HTML errors only (bad nesting, duplicate ids, parse errors). Fix the markup.
- **Site / Internal links**: a local href/src points at a file that isn't published. Known pre-existing breaks are listed in `tools/ci/known-broken-links.json` (warnings).
- **Functions**: lint errors, or `engines.node` below 22.
- **Firestore rules**: a baseline rules test broke. `todo` tests are known gaps and don't fail.
- **Security / gitleaks**: a secret is in the diff. **Rotate it first**, then remove it.
- **Deploy scripts**: a pipeline or guard test failed, for example a lost CD gate or an unpinned runner.

## Running checks locally

```powershell
cd tools/ci
npm ci
npm run lint:html
npm run lint:js
npm run check:json
npm run check:links
npm run test:pipeline
npm run test:rules
```

`test:rules` needs Java 21+ for the Firestore emulator.

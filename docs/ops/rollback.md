# Rollback

## Site: automatic

CD (site) records the published deploy ID before deploying. If the deploy or the health check fails, it calls Netlify's `restoreSiteDeploy` on that ID, confirms it's published again, and ends with `RESULT: FAILED and ROLLED BACK`. You don't need to do anything for the site. Fix the cause in a new PR.

If the log ends with `RESULT: FAILED and ROLLBACK FAILED`, restore by hand as below.

## Site: manual

### Netlify UI

1. https://app.netlify.com/projects/alrayyangroup/deploys
2. Open the last good deploy. Its message is the commit SHA.
3. Click **Publish deploy**.
4. Check https://alrayyanjo.com/version.json. It shows the SHA of the deploy now live (deploys from before CD have no version.json).

Then turn site CD off while you fix it, so the next merge doesn't redeploy the bad commit:

```powershell
gh variable set CD_ENABLED --repo omaralrayyan7/alrayyan --body false
```

### Netlify CLI (from your machine)

These use PowerShell 7 (`pwsh`) quoting. In Windows PowerShell 5.1, write each inner `"` as `\"`.

Log in. This opens the browser; no token is pasted:

```powershell
npx netlify-cli@27.16.2 login
```

```powershell
npx netlify-cli@27.16.2 api listSiteDeploys --data '{ "site_id": "90305dd7-b004-401c-ace8-c5edd4ae4f60", "per_page": 10 }'
```

```powershell
npx netlify-cli@27.16.2 api restoreSiteDeploy --data '{ "site_id": "90305dd7-b004-401c-ace8-c5edd4ae4f60", "deploy_id": "<DEPLOY_ID>" }'
```

### Better: revert in Git

Revert the bad commit in a PR and merge it once CI is green. CD deploys the revert, and `main` matches what's live again.

## Firebase: redeploy a previous commit

There is no automatic rollback for functions or rules. Redeploy a commit from `main` that was good. It must have a green **CI passed**:

```powershell
gh workflow run firebase-cd.yml --repo omaralrayyan7/alrayyan --ref main -f ref=<GOOD_SHA> -f targets=rules
```

Use `-f targets=functions` or `-f targets=both` as needed. The `ref` must be on `main`; other commits are refused. The workflow's own tools always come from current main; only `functions/`, `firestore.rules` and `firebase.json` come from `<GOOD_SHA>`.

Commits from before CI existed have no **CI passed** check and can't be redeployed this way. Revert in Git instead.

## Break-glass: hand deploys back to Netlify

Use this only if GitHub Actions itself is down and the site must change:

1. Turn CD off: `gh variable set CD_ENABLED --repo omaralrayyan7/alrayyan --body false`
2. Netlify → **Project configuration → Build & deploy → Continuous deployment → Build settings → Configure → Build status: Active builds** → Save. Netlify builds `main` from Git again (publish dir `.`, no build command). Note it then serves internal files that `_redirects` doesn't 404, and no `version.json`.
3. When Actions is back: set **Stopped builds** again, then `gh variable set CD_ENABLED --repo omaralrayyan7/alrayyan --body true` and run CD once on main.

# CI/CD setup (one-time)

How the pipeline is wired, and the one-time steps to switch it on. Commands
are for **Windows PowerShell**. Run each block on its own.

## What runs where

| Workflow | Trigger | Does | Kill switch |
|---|---|---|---|
| `.github/workflows/ci.yml` | push to main, every PR, manual | html-validate, ESLint, JSON/JSON-LD, internal links, functions lint, Node runtime check, Firestore rules tests, gitleaks, npm audit, pipeline tests. Ends in one check: **CI passed** | none |
| `.github/workflows/cd.yml` | push to main, manual | Netlify production deploy from the runner, health check, automatic rollback | repo variable `CD_ENABLED` |
| `.github/workflows/firebase-cd.yml` | push to main, manual | `firebase deploy --only firestore:rules` and/or `--only functions` | repo variable `FIREBASE_CD_ENABLED` |

Both CD workflows run only when **all** of these hold: the repo is
`omaralrayyan7/alrayyan`, the ref is `main`, the kill switch is `true`, and the
**CI passed** check succeeded for that exact commit. The last one is checked
through the GitHub API, waiting up to 45 minutes while CI is still running.

Repo facts used by the pipeline:

- Netlify site: `alrayyangroup`, Site ID `90305dd7-b004-401c-ace8-c5edd4ae4f60`. Live at https://alrayyanjo.com; `www` redirects to the apex.
- Fashion, Arts and Lands are paths on the same site (`/fashion`, `/arts`, `/land`), so the health check covers them, plus `/mgmt-panel`.
- Firebase project: `alrayyan-group` (project number `514669588220`). Functions region: `europe-west1`, set in `functions/index.js`.
- Pinned versions: `netlify-cli` in `cd.yml` (`NETLIFY_CLI_VERSION`); `firebase-tools` in `tools/ci/package.json`.

## 1. Netlify: token, Site ID, stop builds

### Personal access token

1. Go to https://app.netlify.com/user/applications#personal-access-tokens.
2. Click **New access token**. Description: `GitHub Actions CD alrayyan`. Set an expiry (for example 1 year) and add a calendar reminder to rotate it.
3. Click **Generate token** and copy it. You won't see it again. Don't save it anywhere else.

Store it as a secret in the `production` environment. gh asks for it with masked input; paste and press Enter:

```powershell
gh secret set NETLIFY_AUTH_TOKEN --env production --repo omaralrayyan7/alrayyan
```

### Site ID

It's under **Project configuration → General → Project details → Project ID**. For this site it is `90305dd7-b004-401c-ace8-c5edd4ae4f60`.

```powershell
gh secret set NETLIFY_SITE_ID --env production --repo omaralrayyan7/alrayyan --body 90305dd7-b004-401c-ace8-c5edd4ae4f60
```

### Stop Netlify's own builds

If Netlify keeps building from Git, it publishes `main` before CI has passed. Turn that off but keep the repo link:

1. https://app.netlify.com/projects/alrayyangroup → **Project configuration → Build & deploy → Continuous deployment**.
2. Under **Build settings**, click **Configure**.
3. Set **Build status** to **Stopped builds** and click **Save**.

The Git link stays, so you can switch builds back on in one click (break-glass, see `rollback.md`). With builds stopped, Netlify ignores pushes and PRs, but CLI and API deploys (what `cd.yml` does) keep working.

There is no `netlify.toml` and no build command. `_redirects` ships inside the publish dir, so the 404 rules and clean-URL rewrites apply the same way with a CLI deploy.

## 2. Turn on site CD

```powershell
gh variable set CD_ENABLED --repo omaralrayyan7/alrayyan --body true
```

First test: run CD by hand and watch it.

```powershell
gh workflow run cd.yml --repo omaralrayyan7/alrayyan --ref main
```

```powershell
gh run watch --repo omaralrayyan7/alrayyan --exit-status (gh run list --repo omaralrayyan7/alrayyan --workflow cd.yml --limit 1 --json databaseId --jq ".[0].databaseId")
```

Expected: `RESULT: DEPLOYED commit <sha>`. Run it a second time: it must end with `RESULT: Nothing to deploy`. Then https://alrayyanjo.com/version.json shows the commit.

Switch off: `gh variable set CD_ENABLED --repo omaralrayyan7/alrayyan --body false`. CD jobs are then skipped.

## 3. Firebase CD (Workload Identity Federation, no keys)

`gcloud` is needed **only for this one-time setup**. Either install it:

```powershell
winget install --id Google.CloudSDK -e
```

or skip the install and paste the same commands into **Cloud Shell** at https://console.cloud.google.com/?cloudshell=true (signed in as the project owner).

### 3a. Project and APIs

```powershell
gcloud auth login
```

```powershell
gcloud config set project alrayyan-group
```

```powershell
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com secretmanager.googleapis.com cloudfunctions.googleapis.com firebaserules.googleapis.com
```

### 3b. Deployer service account (no key is ever created)

```powershell
gcloud iam service-accounts create github-firebase-deployer --display-name "GitHub Actions Firebase deployer"
```

### 3c. Workload Identity pool and provider, restricted to this repo's main branch

```powershell
gcloud iam workload-identity-pools create github-pool --location=global --display-name="GitHub Actions"
```

```powershell
gcloud iam workload-identity-pools providers create-oidc github-provider --location=global --workload-identity-pool=github-pool --issuer-uri="https://token.actions.githubusercontent.com" --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" --attribute-condition="assertion.repository=='omaralrayyan7/alrayyan' && assertion.ref=='refs/heads/main'"
```

Let only this repo impersonate the deployer:

```powershell
gcloud iam service-accounts add-iam-policy-binding github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/514669588220/locations/global/workloadIdentityPools/github-pool/attribute.repository/omaralrayyan7/alrayyan"
```

### 3d. Minimum roles for the deployer

| Role | Why |
|---|---|
| `roles/cloudfunctions.developer` | create/update the 2nd-gen functions |
| `roles/iam.serviceAccountUser` **on the runtime SA only** | deploy functions that run as `514669588220-compute@developer.gserviceaccount.com` |
| `roles/firebaserules.admin` | publish `firestore.rules` |
| `roles/secretmanager.viewer` | secret preflight (metadata only, never values) and the secret-binding check during deploy |
| `roles/artifactregistry.reader` | read the build image cleanup policy firebase-tools checks |
| `roles/firebaseextensions.viewer` | firebase-tools lists extensions on every functions deploy |
| `roles/serviceusage.serviceUsageConsumer` | firebase-tools checks that the required APIs are on |
| custom `firebaseDeployReader` (`firebase.projects.get`, `resourcemanager.projects.get`) | read project metadata without the data access that `roles/firebase.viewer` would also grant |

```powershell
gcloud projects add-iam-policy-binding alrayyan-group --member="serviceAccount:github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com" --role=roles/cloudfunctions.developer --condition=None
```

```powershell
gcloud iam service-accounts add-iam-policy-binding 514669588220-compute@developer.gserviceaccount.com --member="serviceAccount:github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com" --role=roles/iam.serviceAccountUser
```

```powershell
gcloud projects add-iam-policy-binding alrayyan-group --member="serviceAccount:github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com" --role=roles/firebaserules.admin --condition=None
```

```powershell
gcloud projects add-iam-policy-binding alrayyan-group --member="serviceAccount:github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com" --role=roles/secretmanager.viewer --condition=None
```

```powershell
gcloud projects add-iam-policy-binding alrayyan-group --member="serviceAccount:github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com" --role=roles/artifactregistry.reader --condition=None
```

```powershell
gcloud projects add-iam-policy-binding alrayyan-group --member="serviceAccount:github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com" --role=roles/firebaseextensions.viewer --condition=None
```

```powershell
gcloud projects add-iam-policy-binding alrayyan-group --member="serviceAccount:github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com" --role=roles/serviceusage.serviceUsageConsumer --condition=None
```

```powershell
gcloud iam roles create firebaseDeployReader --project=alrayyan-group --title="Firebase deploy reader" --permissions=firebase.projects.get,resourcemanager.projects.get
```

```powershell
gcloud projects add-iam-policy-binding alrayyan-group --member="serviceAccount:github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com" --role=projects/alrayyan-group/roles/firebaseDeployReader --condition=None
```

There is no official minimal role list for `firebase deploy` from CI; this set was put together from what firebase-tools calls. If a deploy fails with `Permission 'x.y.z' denied`, grant only the predefined role that contains that permission. Don't fall back to Editor or Owner.

### 3e. One-time steps the deployer can't do itself

The deployer can't change IAM policies, so do these once from your machine.

Set the build-image cleanup policy. Without it, a non-interactive functions deploy fails:

```powershell
firebase functions:artifacts:setpolicy --location europe-west1 --project alrayyan-group
```

Create the missing secrets. **In cmd.exe the masked prompt does not accept Ctrl+V: right-click to paste**, then press Enter (PowerShell and Windows Terminal accept Ctrl+V).

```powershell
firebase functions:secrets:set SMTP_PASSWORD --project alrayyan-group
```

```powershell
firebase functions:secrets:set ADMIN_EMAIL --project alrayyan-group
```

Let the functions' runtime account read each secret. A local `firebase deploy` used to do this; the CI deployer can't:

```powershell
gcloud secrets add-iam-policy-binding SMTP_EMAIL --member="serviceAccount:514669588220-compute@developer.gserviceaccount.com" --role=roles/secretmanager.secretAccessor
```

```powershell
gcloud secrets add-iam-policy-binding SMTP_PASSWORD --member="serviceAccount:514669588220-compute@developer.gserviceaccount.com" --role=roles/secretmanager.secretAccessor
```

```powershell
gcloud secrets add-iam-policy-binding ADMIN_EMAIL --member="serviceAccount:514669588220-compute@developer.gserviceaccount.com" --role=roles/secretmanager.secretAccessor
```

Every new `defineSecret('NAME')` added to `functions/` later needs the same two steps. Until then, the CD preflight fails and names the missing secret.

### 3f. Tell GitHub where to authenticate (not secret, so they're variables)

```powershell
gh variable set GCP_WIF_PROVIDER --env production --repo omaralrayyan7/alrayyan --body projects/514669588220/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

```powershell
gh variable set GCP_DEPLOY_SA --env production --repo omaralrayyan7/alrayyan --body github-firebase-deployer@alrayyan-group.iam.gserviceaccount.com
```

### 3g. Switch on, then deploy rules first

```powershell
gh variable set FIREBASE_CD_ENABLED --repo omaralrayyan7/alrayyan --body true
```

```powershell
gh workflow run firebase-cd.yml --repo omaralrayyan7/alrayyan --ref main -f targets=rules
```

Expected: `RESULT: FIREBASE DEPLOYED firestore:rules commit <sha>`. Then try `-f targets=functions`.

Switch off: `gh variable set FIREBASE_CD_ENABLED --repo omaralrayyan7/alrayyan --body false`.

## Secrets and variables

| Name | Kind | Where | Value |
|---|---|---|---|
| `NETLIFY_AUTH_TOKEN` | secret | environment `production` | Netlify personal access token |
| `NETLIFY_SITE_ID` | secret | environment `production` | `90305dd7-b004-401c-ace8-c5edd4ae4f60` |
| `GCP_WIF_PROVIDER` | variable | environment `production` | WIF provider resource name |
| `GCP_DEPLOY_SA` | variable | environment `production` | deployer service account email |
| `CD_ENABLED` | variable | repository | `true` / `false` (unset = off) |
| `FIREBASE_CD_ENABLED` | variable | repository | `true` / `false` (unset = off) |

The `production` environment only accepts deployments from `main`. Firebase function secrets (`SMTP_EMAIL`, `SMTP_PASSWORD`, `ADMIN_EMAIL`) live in Google Secret Manager, never in GitHub.

## GitHub settings applied

- Environment `production`: deployments from `main` only.
- Branch protection on `main`: PR required, required check **CI passed** (from GitHub Actions), stale approvals dismissed, 0 approvals required (author self-merges), applies to admins (no bypass), no force-push, no deletion.

## Optional: PR preview deploys (not enabled)

A job could run `netlify deploy --no-build --dir <publish> --alias pr-<number>` on `pull_request` for same-repo PRs only (`github.event.pull_request.head.repo.full_name == github.repository`) and comment the `https://pr-<n>--alrayyangroup.netlify.app` URL. It would need `NETLIFY_AUTH_TOKEN` outside the `production` environment, so it stays off. To add it, use a separate environment `preview` with its own narrower token, and never pass `--prod`. The guard tests enforce that.

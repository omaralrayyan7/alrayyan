# Alrayyan Group — Deploy & Operations Guide

Run these in PowerShell from your project folder (alrayyan tower).

---

## STEP 1 — Create the admin Firebase Auth user
Do this ONCE in the Firebase Console:
1. Go to: https://console.firebase.google.com/project/alrayyan-group/authentication/users
2. Click **Add user**
3. Email:    alrayyantower@gmail.com
4. Password: tower@1969
5. Click **Add user**

---

## STEP 2 — Enable Email/Password sign-in
1. Go to: https://console.firebase.google.com/project/alrayyan-group/authentication/providers
2. Click **Email/Password**
3. Toggle **Enable** → Save

---

## STEP 3 — Set Firebase Function secrets
Open PowerShell in the project folder and run each line separately.
When prompted, paste the value and press Enter.

```powershell
firebase functions:secrets:set GMAIL_EMAIL
# Paste: omaralrayyan7@gmail.com

firebase functions:secrets:set GMAIL_APP_PASSWORD
# Paste: your 16-character App Password (from myaccount.google.com/apppasswords)
# DO NOT share this with anyone — paste it only in YOUR terminal

firebase functions:secrets:set ADMIN_EMAIL
# Paste: alrayyantower@gmail.com
```

---

## STEP 4 — Install ESLint (functions linter — one-time)
```powershell
cd functions
npm install
cd ..
```

---

## STEP 5 — Deploy everything
```powershell
firebase deploy
```

This deploys:
- Hosting (site + 404 page + sitemap.xml + security headers)
- Firestore security rules (hardened — admin email restricted, schema validated)
- Cloud Functions (email notifications — ESLint runs before deploy)

---

## STEP 6 — Verify
1. Open https://alrayyanjo.com/mgmt-panel.html
2. Sign in with: alrayyantower@gmail.com / tower@1969
3. Submit a test booking from the public site
4. Check alrayyantower@gmail.com inbox — you should get the notification email within ~10 seconds
5. Accept the booking in admin — customer gets confirmation email

---

## WhatsApp (when Meta approves)
Once Meta WhatsApp Business API is approved, open functions/index.js and uncomment the sendWhatsApp lines. Then run:
```powershell
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_ID
firebase deploy --only functions
```

---

## Firestore Backups (one-time Console setup)
Firestore does not back up automatically. Set it up once:
1. Go to: https://console.firebase.google.com/project/alrayyan-group/firestore/databases/-default-/backup-schedules
2. Click **Create backup schedule**
3. Set recurrence: **Daily**, retention: **7 days**
4. Click **Create**

Cost: ~$0.02/GB/month at this data volume — effectively free.

Alternatively, schedule an export via Cloud Scheduler:
```powershell
# Enable required APIs first
gcloud services enable cloudscheduler.googleapis.com --project=alrayyan-group

# Create a daily export job to GCS
gcloud scheduler jobs create http firestore-daily-backup \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/alrayyan-group/databases/(default):exportDocuments" \
  --message-body='{"outputUriPrefix":"gs://alrayyan-group.appspot.com/backups/firestore"}' \
  --oauth-service-account-email="alrayyan-group@appspot.gserviceaccount.com" \
  --time-zone="Asia/Amman"
```

---

## Firebase SDK v9 Modular Migration (Planned Sprint)
The site currently uses Firebase v8 compat API (deprecated). Migrating to v9 modular
reduces bundle size by ~50% and future-proofs the codebase. This is a **dedicated sprint**
because it touches every Firebase call in every HTML and JS file.

### Migration checklist (do in a staging branch):
1. `firebase use dev` — switch to staging project (alrayyan-group-dev)
2. Replace CDN tags: `firebase-app-compat.js` → `firebase-app.js` (ESM module type)
3. Rewrite `js/firebase-config.js` using `initializeApp`, `getFirestore`, `getAuth`
4. Rewrite `js/ar-data.js` using `collection`, `onSnapshot`, `doc`, `setDoc`, `serverTimestamp`
5. Rewrite all Firestore calls in `js/admin.js`: `collection(db,...)`, `addDoc`, `updateDoc`, `deleteDoc`
6. Rewrite auth calls: `signInWithEmailAndPassword(auth, email, pass)`, `onAuthStateChanged(auth, ...)`
7. Rewrite `functions/index.js` already uses firebase-admin (no change needed)
8. Test every page: login, booking submit, admin CRUD, availability toggles, bookings listener
9. `firebase use default` → `firebase deploy` to production

### Staging project setup:
1. Create project at console.firebase.google.com → name: `alrayyan-group-dev`
2. Enable Firestore, Authentication (Email/Password) in the dev project
3. Add dev project alias:
   ```powershell
   firebase use --add
   # Select alrayyan-group-dev, alias: dev
   ```
4. Switch between environments:
   ```powershell
   firebase use dev        # for staging
   firebase use default    # for production
   ```

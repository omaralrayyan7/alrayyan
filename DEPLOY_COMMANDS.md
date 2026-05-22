# Alrayyan Group — Final Deploy Steps

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

## STEP 4 — Deploy everything
```powershell
firebase deploy
```

This deploys:
- Hosting (site + 404 page + robots.txt + sitemap.xml)
- Firestore security rules (hardened)
- Cloud Functions (email notifications)

---

## STEP 5 — Verify
1. Open https://alrayyangroup.online/admin.html
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

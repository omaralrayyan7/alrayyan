# Booking Notifications — Setup & Deployment

This folder contains the Firebase Cloud Functions that send:
1. **Email to admin** when a visitor submits the booking form
2. **Email to customer** when the admin clicks **Accept** or **Reject** in the admin panel

WhatsApp is wired but disabled until Meta WhatsApp Business API approval comes through.

---

## ⏱  One-time setup (~15 minutes)

### Step 1 — Generate a Gmail App Password
The Cloud Function logs into Gmail via SMTP. Gmail no longer allows plain passwords — you need an **App Password**.

1. Sign into the Gmail account that will SEND emails (e.g. `omaralrayyan7@gmail.com`).
2. Go to https://myaccount.google.com/security and turn on **2-Step Verification** if not already.
3. Go to https://myaccount.google.com/apppasswords.
4. App name: `Alrayyan Functions`. Click **Create**.
5. Copy the 16-character password (e.g. `abcd efgh ijkl mnop`). Remove the spaces.
6. **Keep this somewhere safe — you cannot view it again.**

### Step 2 — Install the Firebase CLI (only first time)
Open PowerShell as Administrator:
```powershell
npm install -g firebase-tools
firebase login
```

### Step 3 — Enable the Blaze (pay-as-you-go) plan
Cloud Functions require the Blaze plan, BUT the free tier covers:
- 2 million function invocations / month
- 400,000 GB-seconds memory
- 5GB outbound bandwidth

For ~30 bookings/month, **expected cost = $0.00**.

Enable here: https://console.firebase.google.com/project/alrayyan-group/usage/details

### Step 4 — Install function dependencies
From the project root:
```powershell
cd functions
npm install
cd ..
```

### Step 5 — Set the secrets in Firebase
From the project root, run these one at a time and paste each value when prompted:
```powershell
firebase functions:secrets:set GMAIL_EMAIL
# Paste:  omaralrayyan7@gmail.com

firebase functions:secrets:set GMAIL_APP_PASSWORD
# Paste:  abcdefghijklmnop   (the 16-char App Password, no spaces)

firebase functions:secrets:set ADMIN_EMAIL
# Paste:  alrayyantower@gmail.com   (where you want to RECEIVE booking alerts)
```

### Step 6 — Deploy
```powershell
firebase deploy --only functions
```
First deploy takes 2–3 minutes. You'll see:
```
✔  functions[onBookingCreated(us-central1)] Successful create operation.
✔  functions[onBookingStatusChanged(us-central1)] Successful create operation.
```

---

## 🧪 How to test (end-to-end)

### Test 1 — Admin receives email when visitor submits form
1. Open the public site (any of `office-detail.html`, `floor-detail.html`, `land-detail.html`).
2. Fill the **Book a Site Visit** form with a real test email and submit.
3. Check inbox of `alrayyantower@gmail.com`. You should receive within ~10 seconds:
   > Subject: **🔔 New Visit Booking — \[Name\] (ARG-XXXXXX)**

4. Open `admin.html` → **Visit Bookings**. The new booking appears with status `pending`.

### Test 2 — Customer receives confirmation email on Accept
1. In the admin panel, click **✓ Accept** next to the pending booking.
2. Confirm the prompt.
3. The status flips to `confirmed`. The "Notified C:" cell shows ✉️ after a few seconds (refresh if needed).
4. Check the inbox of the email you used in the form. You should receive:
   > Subject: **✅ Your visit to Alrayyan Tower is confirmed — ARG-XXXXXX**

### Test 3 — Customer receives decline email on Reject
1. Submit another test booking.
2. In admin, click **✗ Reject**. Confirm.
3. Check the customer email — you should receive:
   > Subject: **Alrayyan Tower — Visit request update — ARG-XXXXXX**

### Test 4 — View function logs (debugging)
```powershell
firebase functions:log
```
or open https://console.firebase.google.com/project/alrayyan-group/functions/logs

---

## 🟢 Status indicators in the admin panel

Each booking row shows a small **Notified** column:
| Code | Meaning |
|------|---------|
| `A:✓` | Admin email sent successfully |
| `A:⚠️` | Admin email failed — check logs |
| `A:…` | Still in flight (or function not deployed yet) |
| `C:✉️` | Customer email sent (after Accept/Reject) |
| `C:⚠️` | Customer email failed |
| `C:—` | Not yet — booking still `pending` |

---

## 📱 WhatsApp (when Meta approves)

The code in `index.js` has a `sendWhatsApp()` stub with the call shape commented in. When Meta WhatsApp Business API approval lands:

1. Add two more secrets:
   ```powershell
   firebase functions:secrets:set WHATSAPP_TOKEN
   firebase functions:secrets:set WHATSAPP_PHONE_ID
   ```
2. Uncomment the `sendWhatsApp` calls inside both functions in `index.js`.
3. Add the secrets to each function's `secrets: [...]` array.
4. Redeploy: `firebase deploy --only functions`.

The customer's WhatsApp number is already captured (`booking.phone`) so no form changes needed.

---

## 💰 Cost estimate

| Component | Monthly cost (≤100 bookings) |
|-----------|------------------------------|
| Cloud Functions invocations | **$0** (free tier) |
| Gmail SMTP | **$0** (free, 500/day limit) |
| Firestore reads/writes | **$0** (already on free tier) |
| WhatsApp (after Meta approval) | **$0** (Meta API is free) |
| **Total** | **$0 / month** |

---

## ❌ Common errors

| Error | Fix |
|-------|-----|
| `Invalid login: 535-5.7.8 Username and Password not accepted` | App Password wrong, or 2FA not enabled. Regenerate. |
| `Function failed on loading user code` | Run `cd functions && npm install` again. |
| `Permission denied` on deploy | Run `firebase login --reauth` |
| No email arrives, no error | Check spam folder. Check `firebase functions:log`. |
| `Quota exceeded` | You sent more than 500 emails in 24h on Gmail free tier. Switch to SendGrid or Workspace. |

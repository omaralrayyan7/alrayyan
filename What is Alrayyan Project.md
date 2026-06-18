# What is Alrayyan Project

## Overview

Alrayyan is a **Firebase-hosted multi-section business website** for Alrayyan Tower — a commercial real estate complex in Amman, Jordan. It presents four business verticals: **office spaces** (floor listings), **arts** (paintings & sculptures), **fashion**, and **land** (investment plots). The site includes a public-facing storefront, a booking/visit-request system, and a protected admin panel for reviewing and approving bookings.

**Tech stack:** Vanilla HTML/CSS/JS · Firebase Hosting · Firestore (database) · Firebase Cloud Functions (Node.js) · Nodemailer (Gmail SMTP)

---

## Key Code Segments

### Firebase Initialisation (`js/firebase-config.js`)
Sets up the Firestore client and exposes `window.db` for all pages to use.

```js
firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
window.auth = firebase.auth();
window.ADMIN_WHATSAPP = '962799880066';
```

### Cloud Function — New Booking Notification (`functions/index.js`)
Triggered on every new Firestore booking document; sends an admin email with a link to the admin panel.

```js
exports.onBookingCreated = onDocumentCreated("bookings/{bookingId}", async (event) => {
  const b = event.data.data();
  const transporter = buildTransporter();
  await transporter.sendMail({
    from: GMAIL_EMAIL.value(),
    to: ADMIN_EMAIL.value(),
    subject: `New Booking – ${b.visitor_name}`,
    html: adminEmailHtml(b),
  });
});
```

### Cloud Function — Booking Status Change (`functions/index.js`)
Sends approval or rejection email to the customer when the admin updates a booking's status.

```js
exports.onBookingStatusChanged = onDocumentUpdated("bookings/{bookingId}", async (event) => {
  const after = event.data.after.data();
  if (after.status === "confirmed") {
    await transporter.sendMail({ to: after.email, html: customerApprovedHtml(after) });
  } else if (after.status === "rejected") {
    await transporter.sendMail({ to: after.email, html: customerRejectedHtml(after) });
  }
});
```


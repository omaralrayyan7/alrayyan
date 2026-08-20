/**
 * Alrayyan Tower — Cloud Functions for booking notifications.
 *
 * Two Firestore-triggered functions:
 *   1) onBookingCreated  — fires when a NEW booking is added.
 *                          Sends an email to the admin so they can review it
 *                          in the admin panel.
 *   2) onBookingStatusChanged — fires when a booking's `status` field changes.
 *                          If new status is 'confirmed' → sends approval email
 *                          to the customer. If 'rejected' → sends polite
 *                          decline email (with optional reason). If
 *                          'rescheduled' → sends new-slot proposal.
 *
 * Mail is relayed through zaid@alrayyanjo.com's Outlook/Microsoft 365
 * mailbox (info@alrayyanjo.com is a forwarding alias, not a real inbox, so
 * it can't authenticate SMTP on its own). Every message is sent with
 * `from: info@alrayyanjo.com` — for that to be accepted by Microsoft's
 * SMTP relay (rather than rejected as spoofing), info@alrayyanjo.com must
 * be added as a "Send As" alias on the zaid@alrayyanjo.com account. See
 * functions/SETUP.md for the exact steps.
 *
 * Secrets (set via `firebase functions:secrets:set`):
 *   - SMTP_EMAIL     The Outlook mailbox that authenticates (zaid@alrayyanjo.com).
 *   - SMTP_PASSWORD  App password for that mailbox (NOT the normal login password).
 *   - ADMIN_EMAIL    Where the "new booking" notification is sent (info@alrayyanjo.com).
 */

const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {defineSecret} = require('firebase-functions/params');
const {setGlobalOptions, logger} = require('firebase-functions/v2');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
setGlobalOptions({region: 'europe-west1', maxInstances: 10});

// Secrets — referenced by name, injected at runtime.
const SMTP_EMAIL = defineSecret('SMTP_EMAIL');
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD');
const ADMIN_EMAIL = defineSecret('ADMIN_EMAIL');

// The address every outgoing email shows as sender/reply-to. Requires
// SMTP_EMAIL's mailbox to have info@alrayyanjo.com set up as a "Send As"
// alias — otherwise Outlook will reject the send (see SETUP.md).
const FROM_EMAIL = 'info@alrayyanjo.com';

// Build a Nodemailer transporter using Outlook/Microsoft 365 SMTP + App Password.
function buildTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // STARTTLS, upgraded automatically on port 587
    auth: {
      user: SMTP_EMAIL.value(),
      pass: SMTP_PASSWORD.value(),
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// HTML escape — prevents XSS when embedding user-supplied text in HTML emails.
// ────────────────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ────────────────────────────────────────────────────────────────────────────
// Email templates
// ────────────────────────────────────────────────────────────────────────────

function fmtField(label, value) {
  if (!value) return '';
  return `<tr>
    <td style="padding:6px 14px;color:#888;font-size:13px;border-bottom:1px solid #eee">${label}</td>
    <td style="padding:6px 14px;color:#111;font-size:14px;font-weight:600;border-bottom:1px solid #eee">${esc(value)}</td>
  </tr>`;
}

function emailHeader(subtitle) {
  return `<div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0;text-align:center">
    <img src="https://alrayyanjo.com/images/logo/logo.png" alt="Al-Rayyan Group" width="64" height="64" style="display:block;margin:0 auto 12px;border-radius:4px" />
    <h2 style="margin:0;font-size:20px;letter-spacing:1px;color:#d4af37">ALRAYYAN GROUP</h2>
    <p style="margin:4px 0 0;color:#bbb;font-size:13px">${subtitle}</p>
  </div>`;
}

function adminEmailHtml(b) {
  const rows = [
    fmtField('Reference', b.ref),
    fmtField('Name', b.visitor_name),
    fmtField('Phone / WhatsApp', b.phone),
    fmtField('Email', b.email),
    fmtField('Company', b.company),
    fmtField('Floor / Office', b.floor_preference || b.office),
    fmtField('Preferred Date', b.preferred_date),
    fmtField('Preferred Time', b.preferred_time),
    fmtField('Purpose', b.purpose),
    fmtField('Notes', b.notes),
    fmtField('Source', b.source),
  ].filter(Boolean).join('');
  return `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fafafa;padding:24px">
    ${emailHeader('New Visit Booking Request')}
    <div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:20px 0">
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <div style="text-align:center;padding:24px">
        <a href="https://alrayyanjo.com/mgmt-panel#panel-bookings"
           style="background:#d4af37;color:#0a0a0a;text-decoration:none;font-weight:700;
                  padding:12px 28px;border-radius:6px;display:inline-block;font-size:14px">
          Review in Admin Panel →
        </a>
      </div>
      <p style="text-align:center;color:#999;font-size:12px;margin:0 24px">
        Approve or reject this request from the admin panel. The customer
        will receive an automatic email when you accept.
      </p>
    </div>
  </div>`;
}

function customerApprovedHtml(b) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fafafa;padding:24px">
    ${emailHeader('Your visit has been confirmed')}
    <div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:28px 28px">
      <p style="font-size:15px;color:#111">Dear ${esc(b.visitor_name || 'guest')},</p>
      <p style="font-size:14px;color:#444;line-height:1.6">
        Thank you for your interest in <strong>Alrayyan Tower</strong>.
        Your site visit request has been <strong style="color:#1a8a3a">confirmed</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#fafafa;border-radius:6px">
        ${fmtField('Reference', b.ref)}
        ${fmtField('Date', b.preferred_date)}
        ${fmtField('Time', b.preferred_time || 'To be confirmed')}
        ${fmtField('Location', b.floor_preference || b.office || 'Alrayyan Tower, Queen Alia St, Amman')}
      </table>
      <p style="font-size:14px;color:#444;line-height:1.6">
        Our team will meet you on the agreed date.
        If you need to reschedule, simply reply to this email or call us.
      </p>
      <p style="font-size:14px;color:#444;margin-top:20px">
        <strong>Address:</strong> Alrayyan Tower, Queen Alia Street, Amman, Jordan<br/>
        <strong>Hours:</strong> Saturday – Thursday, 9:00 AM – 6:00 PM
      </p>
      <div style="text-align:center;padding:18px 0">
        <a href="https://maps.google.com/?q=Alrayyan+Tower+Queen+Alia+Amman"
           style="background:#d4af37;color:#0a0a0a;text-decoration:none;font-weight:700;
                  padding:12px 28px;border-radius:6px;display:inline-block;font-size:14px">
          Open in Google Maps →
        </a>
      </div>
      <p style="color:#999;font-size:12px;text-align:center;margin-top:14px">
        Warm regards,<br/>The Al-Rayyan Group Team
      </p>
    </div>
  </div>`;
}

function customerRescheduledHtml(b) {
  const note = b.reschedule_note ?
    `<p style="font-size:14px;color:#444;line-height:1.6;background:#fffaf0;border-left:3px solid #d4af37;padding:10px 14px;border-radius:4px">${esc(b.reschedule_note)}</p>` :
    '';
  return `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fafafa;padding:24px">
    ${emailHeader('Visit reschedule — new proposed time')}
    <div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:28px">
      <p style="font-size:15px;color:#111">Dear ${esc(b.visitor_name || 'guest')},</p>
      <p style="font-size:14px;color:#444;line-height:1.6">
        Thank you for your interest in <strong>Alrayyan Tower</strong>.
        Unfortunately your originally requested slot is not available, and we
        would like to propose a new time for your site visit:
      </p>
      <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#fafafa;border-radius:6px">
        ${fmtField('Reference', b.ref)}
        ${fmtField('Originally requested', (b.preferred_date||'—') + ' ' + (b.preferred_time||''))}
        ${fmtField('New proposed date', b.proposed_date)}
        ${fmtField('New proposed time', b.proposed_time || 'To be confirmed')}
        ${fmtField('Location', b.floor_preference || b.office || 'Alrayyan Tower, Queen Alia St, Amman')}
      </table>
      ${note}
      <p style="font-size:14px;color:#444;line-height:1.6">
        Please reply to this email to confirm the new slot, or suggest another
        time that works for you. You may also call us directly.
      </p>
      <p style="color:#999;font-size:12px;text-align:center;margin-top:24px">
        Warm regards,<br/>The Al-Rayyan Group Team
      </p>
    </div>
  </div>`;
}

function customerRejectedHtml(b) {
  const reasonBlock = b.rejection_note ?
    `<p style="font-size:14px;color:#444;line-height:1.6;background:#fff8f8;border-left:3px solid #c0392b;padding:10px 14px;border-radius:4px;margin-top:12px">${esc(b.rejection_note)}</p>` :
    '';
  return `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fafafa;padding:24px">
    ${emailHeader('Visit Request Update')}
    <div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:28px">
      <p style="font-size:15px;color:#111">Dear ${esc(b.visitor_name || 'guest')},</p>
      <p style="font-size:14px;color:#444;line-height:1.6">
        Thank you for your interest in Alrayyan Tower. Unfortunately we are
        unable to accommodate your requested time slot.
      </p>
      ${reasonBlock}
      <p style="font-size:14px;color:#444;line-height:1.6;margin-top:12px">
        Please reply to this email or call us to arrange an alternative visit.
      </p>
      <p style="font-size:14px;color:#444;line-height:1.6">
        Reference: <strong>${esc(b.ref || '—')}</strong>
      </p>
      <p style="color:#999;font-size:12px;text-align:center;margin-top:24px">
        Warm regards,<br/>The Al-Rayyan Group Team
      </p>
    </div>
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// WhatsApp hook (placeholder until Meta approval)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp message. Currently a no-op stub.
 *
 * Once Meta WhatsApp Business API is approved:
 *   - Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID as Firebase secrets.
 *   - Implement the real call here (graph.facebook.com endpoint).
 *
 * TODO (activation checklist):
 *   1. firebase functions:secrets:set WHATSAPP_TOKEN
 *   2. firebase functions:secrets:set WHATSAPP_PHONE_ID
 *   3. Uncomment the implementation below.
 *   4. firebase deploy --only functions
 */
async function sendWhatsApp(toPhone, templateName, params) {
  // NOT YET ACTIVE — Meta Business API approval pending.
  // const token   = process.env.WHATSAPP_TOKEN;
  // const phoneId = process.env.WHATSAPP_PHONE_ID;
  // const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  // await fetch(url, { method:'POST',
  //   headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
  //   body: JSON.stringify({ messaging_product:'whatsapp', to: toPhone, type:'template',
  //     template:{ name: templateName, language:{code:'en'},
  //       components:[{ type:'body', parameters: params.map(p=>({type:'text',text:String(p)})) }] }
  //   })
  // });
  logger.warn('[whatsapp] NOT CONFIGURED — Meta approval pending. Would send:', {toPhone, templateName, params});
  return {ok: false, reason: 'whatsapp_not_configured_yet'};
}

// ────────────────────────────────────────────────────────────────────────────
// FUNCTION 1 — New booking created  →  email admin
// ────────────────────────────────────────────────────────────────────────────

exports.onBookingCreated = onDocumentCreated(
  {
    document: 'bookings/{bookingId}',
    secrets: [SMTP_EMAIL, SMTP_PASSWORD, ADMIN_EMAIL],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn('no snapshot'); return;
    }
    const booking = snap.data();
    const id = event.params.bookingId;
    logger.info('[booking:created]', {id, ref: booking.ref, name: booking.visitor_name});

    try {
      const transporter = buildTransporter();
      await transporter.sendMail({
        from: `"Al-Rayyan Group Bookings" <${FROM_EMAIL}>`,
        to: ADMIN_EMAIL.value(),
        subject: `🔔 New Visit Booking — ${booking.visitor_name || 'Unknown'} (${booking.ref || id})`,
        html: adminEmailHtml(booking),
        replyTo: booking.email || FROM_EMAIL,
      });
      logger.info('[booking:created] admin email sent', {id});

      await snap.ref.update({
        admin_notified_at: admin.firestore.FieldValue.serverTimestamp(),
        admin_notified_via: 'email',
      });
    } catch (err) {
      logger.error('[booking:created] admin notify failed', err);
      await snap.ref.update({
        admin_notify_error: String(err && err.message || err),
        admin_notify_error_at: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(()=>{});
    }
  },
);

// ────────────────────────────────────────────────────────────────────────────
// FUNCTION 2 — Booking status changed  →  email customer
// ────────────────────────────────────────────────────────────────────────────

exports.onBookingStatusChanged = onDocumentUpdated(
  {
    document: 'bookings/{bookingId}',
    secrets: [SMTP_EMAIL, SMTP_PASSWORD],
  },
  async (event) => {
    const before = event.data.before.data() || {};
    const after = event.data.after.data() || {};
    const statusChanged = before.status !== after.status;
    const rescheduleEdited = after.status === 'rescheduled' &&
      (before.proposed_date !== after.proposed_date || before.proposed_time !== after.proposed_time);
    if (!statusChanged && !rescheduleEdited) return;
    if (!['confirmed', 'rejected', 'rescheduled'].includes(after.status)) return;
    if (!after.email) {
      logger.warn('[booking:status] no customer email on record', {id: event.params.bookingId});
      return;
    }

    const id = event.params.bookingId;
    logger.info('[booking:status]', {id, status: after.status});

    try {
      const transporter = buildTransporter();
      let subject; let html;
      if (after.status === 'confirmed') {
        subject = `✅ Your visit to Alrayyan Tower is confirmed — ${after.ref || id}`;
        html = customerApprovedHtml(after);
      } else if (after.status === 'rescheduled') {
        subject = `🗓 Alrayyan Tower — Proposed new visit time — ${after.ref || id}`;
        html = customerRescheduledHtml(after);
      } else {
        subject = `Alrayyan Tower — Visit request update — ${after.ref || id}`;
        html = customerRejectedHtml(after);
      }
      await transporter.sendMail({
        from: `"Al-Rayyan Group" <${FROM_EMAIL}>`,
        to: after.email,
        replyTo: FROM_EMAIL,
        subject,
        html,
      });
      logger.info('[booking:status] customer email sent', {id, status: after.status});

      await event.data.after.ref.update({
        customer_notified_at: admin.firestore.FieldValue.serverTimestamp(),
        customer_notified_via: 'email',
      });
    } catch (err) {
      logger.error('[booking:status] customer notify failed', err);
      await event.data.after.ref.update({
        customer_notify_error: String(err && err.message || err),
        customer_notify_error_at: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(()=>{});
    }
  },
);

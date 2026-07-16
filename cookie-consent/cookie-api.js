/* ============================================================================
   Cookie Consent — API
   Writes one immutable audit record per consent decision to Firestore
   (`cookie_acceptances` — kept as the existing collection name so the
   Firestore rules and admin panel wiring didn't need renaming). Never
   updates/overwrites a previous record — every decision (including a later
   change of mind) is its own new document, preserving full history.

   Requires window.db (set up by js/firebase-config.js, loaded before this
   file) and window.CookieConsentUtils (cookie-utils.js, loaded before this).
   Fails silently (console.warn only) — logging must never block the visitor
   from using the site.
   ========================================================================== */
(function (global) {
  'use strict';

  function logConsent(status, categories) {
    if (!global.db) return Promise.resolve(null);
    var utils = global.CookieConsentUtils;
    var ua = navigator.userAgent || '';
    var record = {
      // Identity — anonymous only, never tied to a real user account on the
      // public site (there is no visitor login).
      visitor_id: utils.getVisitorId().slice(0, 64),
      // Consent decision
      status: String(status).slice(0, 20),
      categories: {
        necessary: true,
        analytics: !!(categories && categories.analytics),
        marketing: !!(categories && categories.marketing),
        preferences: !!(categories && categories.preferences)
      },
      policy_version: utils.POLICY_VERSION.slice(0, 20),
      // Context — best-effort, client-reported (no server to verify against)
      lang: (global.currentLang || document.documentElement.lang || 'en').slice(0, 10),
      device: utils.detectDevice(ua).slice(0, 60),
      browser: utils.detectBrowser(ua).slice(0, 80),
      os: utils.detectOS(ua).slice(0, 60),
      user_agent: ua.slice(0, 300),
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 60),
      referrer: (document.referrer || '').slice(0, 200),
      path: (location.pathname || '').slice(0, 200),
      url: (location.href || '').slice(0, 300),
      // IP / country intentionally omitted — this is a static site with no
      // backend to read the real request IP, and calling a third-party geo
      // API from the client would ship visitor IPs to an external vendor
      // that isn't already part of this site's data flow. Add server-side
      // (Cloud Function) if that's wanted later.
      accepted_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    return global.db.collection('cookie_acceptances').add(record)
      .catch(function (e) { console.warn('[cookie-consent] log write failed', e && e.code); return null; });
  }

  global.CookieConsentApi = { logConsent: logConsent };
})(window);

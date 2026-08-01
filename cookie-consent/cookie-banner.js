/* ============================================================================
   Cookie Consent — banner UI
   Pure behavior — the banner markup itself lives in index.html (unchanged
   pattern from before) so it keeps working with the site's existing i18n
   snapshot system (js/app.js reads data-i18n text straight out of the DOM
   at boot). This file only wires show/hide + button handlers, and reads /
   writes consent via CookieConsentUtils — stored locally (localStorage)
   only, never logged to a server.

   Two decisions only — no separate category-picker panel:
     Accept All            -> every category on
     Reject Non-Essential  -> only 'necessary' on

   Requires cookie-utils.js loaded first.
   ========================================================================== */
(function (global, document) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function showBanner() {
    var el = $('cookie');
    if (el) el.classList.add('show');
  }
  function hideBanner() {
    var el = $('cookie');
    if (el) el.classList.remove('show');
  }

  function decide(status, categories) {
    global.CookieConsentUtils.saveConsent(status, categories);
    hideBanner();
  }

  function wireEvents() {
    var acceptBtn = $('cookieAcceptBtn'), rejectBtn = $('cookieRejectBtn');

    if (acceptBtn) acceptBtn.addEventListener('click', function () {
      decide('accepted', { analytics: true, marketing: true, preferences: true });
    });

    // Reject non-essential keeps this site's existing published policy
    // (see privacy.html §4): declining means the site can't run, so the
    // visitor is sent away rather than left on a half-consented page.
    if (rejectBtn) rejectBtn.addEventListener('click', function () {
      decide('rejected', { analytics: false, marketing: false, preferences: false });
      window.open('', '_self'); window.close();
      setTimeout(function () { window.location.href = 'https://www.google.com'; }, 120);
    });
  }

  // Public reset hook — wired to the "Cookie Settings" footer link so a
  // visitor can change their mind at any time without clearing localStorage
  // themselves. Just reopens the same Accept All / Reject choice.
  global.openCookiePrefs = function () { showBanner(); };

  function init() {
    wireEvents();
    var consent = global.CookieConsentUtils.getConsent();
    if (!consent) setTimeout(showBanner, 1400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);

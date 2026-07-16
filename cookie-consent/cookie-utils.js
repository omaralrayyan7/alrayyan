/* ============================================================================
   Cookie Consent — utils
   Pure helpers: policy version, secure UUID, storage read/write, device/browser
   detection. No DOM, no Firestore — kept dependency-free so it can be unit
   tested or reused on its own.
   ========================================================================== */
(function (global) {
  'use strict';

  // Bump this whenever the cookie policy itself changes (new category, new
  // third-party tool, etc.) — CookieConsent.getConsent() treats a stored
  // consent whose policyVersion doesn't match this as stale and re-prompts.
  var POLICY_VERSION = '1.0';

  var LS_VISITOR_ID = 'arg_visitor_id';
  var LS_CONSENT = 'arg_cookie_consent';
  // Legacy flag from the pre-categories banner — still read (never written)
  // so a returning visitor's old accept/reject choice degrades gracefully
  // into the new schema until the version bump below re-prompts them.
  var LS_LEGACY_OK = 'arg_cookie_ok';

  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function safeRemove(key) { try { localStorage.removeItem(key); } catch (e) {} }

  // Secure UUID v4 — prefers the native CSPRNG-backed generator, falls back
  // to crypto.getRandomValues (still CSPRNG) for older browsers, and only
  // falls back to Math.random if the Crypto API is entirely unavailable.
  function generateUuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      var buf = new Uint8Array(16);
      global.crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
      buf[8] = (buf[8] & 0x3f) | 0x80; // variant 10
      var hex = Array.prototype.map.call(buf, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    }
    // Last-resort fallback — not cryptographically secure, but this is only
    // an anonymous analytics identifier, never a security token.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getVisitorId() {
    var id = safeGet(LS_VISITOR_ID);
    if (!id) { id = generateUuid(); safeSet(LS_VISITOR_ID, id); }
    return id;
  }

  // Returns the stored consent record, or null if none / stale (policy
  // version mismatch) / legacy pre-categories flag — all three cases mean
  // "the banner must be shown again".
  function getConsent() {
    var raw = safeGet(LS_CONSENT);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.policyVersion === POLICY_VERSION && parsed.status) return parsed;
      } catch (e) {}
      return null; // corrupt or stale JSON → re-prompt
    }
    // No new-schema record — a legacy '1'/'rejected' flag doesn't count as
    // consent under the new policy version (no category granularity existed
    // yet), so it intentionally falls through to null → banner shows again.
    return null;
  }

  function saveConsent(status, categories) {
    var record = {
      status: status, // 'accepted' | 'rejected' | 'customized'
      categories: {
        necessary: true,
        analytics: !!(categories && categories.analytics),
        marketing: !!(categories && categories.marketing),
        preferences: !!(categories && categories.preferences)
      },
      policyVersion: POLICY_VERSION,
      timestamp: new Date().toISOString(),
      visitorUuid: getVisitorId()
    };
    safeSet(LS_CONSENT, JSON.stringify(record));
    safeRemove(LS_LEGACY_OK);
    return record;
  }

  function resetConsent() {
    safeRemove(LS_CONSENT);
    safeRemove(LS_LEGACY_OK);
  }

  function detectDevice(ua) { return /Mobi|Android/i.test(ua) ? 'Mobile' : (/iPad|Tablet/i.test(ua) ? 'Tablet' : 'Desktop'); }
  function detectBrowser(ua) {
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua)) return 'Safari';
    return 'Other';
  }
  function detectOS(ua) {
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS X/i.test(ua)) return 'macOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iOS/i.test(ua)) return 'iOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Other';
  }

  global.CookieConsentUtils = {
    POLICY_VERSION: POLICY_VERSION,
    generateUuid: generateUuid,
    getVisitorId: getVisitorId,
    getConsent: getConsent,
    saveConsent: saveConsent,
    resetConsent: resetConsent,
    detectDevice: detectDevice,
    detectBrowser: detectBrowser,
    detectOS: detectOS
  };
})(window);

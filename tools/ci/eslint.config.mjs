// ESLint flat config for the site's browser JS (js/, cookie-consent/).
// Only correctness rules that indicate real bugs are errors; all style rules
// are off. Pages load these as classic <script>s that share globals, so the
// cross-file globals are declared below.
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["js/**/*.js", "cookie-consent/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        // Firebase compat SDK, loaded from the gstatic CDN.
        firebase: "readonly",
        // Set by js/firebase-config.js.
        db: "writable",
        auth: "writable",
        // Assigned as window.closeBooking in js/app.js.
        closeBooking: "readonly",
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "off",
      "no-empty": "off",
      "no-useless-escape": "off",
      "no-prototype-builtins": "off",
      "no-inner-declarations": "off",
      "no-cond-assign": "off",
      "no-control-regex": "off",
      "no-misleading-character-class": "off",
      "no-useless-assignment": "off",
      "preserve-caught-error": "off",
    },
  },
];

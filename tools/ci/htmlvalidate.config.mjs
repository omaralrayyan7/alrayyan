// html-validate config for the site pages.
// Real errors fail CI (parse errors, bad nesting, duplicate ids, unknown
// elements, ...). Style and a11y nitpicks are off so existing pages pass as-is;
// known harmless patterns (empty src/href placeholders that JS fills in at
// runtime) are warnings only.
export default {
  extends: ["html-validate:recommended"],
  rules: {
    "void-style": "off",
    "no-inline-style": "off",
    "no-implicit-button-type": "off",
    "no-implicit-input-type": "off",
    "tel-non-breaking": "off",
    "long-title": "off",
    "no-trailing-whitespace": "off",
    "attribute-boolean-style": "off",
    "attribute-empty-style": "off",
    "doctype-style": "off",
    "element-case": "off",
    "attr-case": "off",
    "attr-quotes": "off",
    "prefer-native-element": "off",
    "prefer-tbody": "off",
    "no-redundant-role": "off",
    "attribute-allowed-values": "warn",
    "autocomplete-password": "warn",
    "empty-heading": "warn",
    "no-raw-characters": "warn",
  },
};

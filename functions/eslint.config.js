// ESLint flat config (ESLint 9+). Same rules as the old .eslintrc.json:
// eslint:recommended + google, plus the local overrides below.
const js = require('@eslint/js');
const globals = require('globals');
const google = require('eslint-config-google');

// eslint-config-google still lists require-jsdoc and valid-jsdoc, which
// ESLint 9 removed (the old config had them off anyway).
const googleRules = {...google.rules};
delete googleRules['require-jsdoc'];
delete googleRules['valid-jsdoc'];

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {...globals.node},
    },
    rules: {
      ...googleRules,
      'max-len': ['warn', {code: 120}],
      'no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
    },
  },
];

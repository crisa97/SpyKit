module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    browser: true,
    es2020: true,
    webextensions: true
  },
  globals: {
    chrome: 'readonly',
    $: 'readonly',
    jQuery: 'readonly',
    Split: 'readonly',
    autosize: 'readonly',
    pd: 'readonly'
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-var': 'off'
  }
};

module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: ['vue', '@typescript-eslint'],
  ignorePatterns: [
    'node_modules/',
    '.bun/',
    'dist/',
    'dist-ssr/',
    '*.local',
    'bun.lockb',
  ],
  rules: {
    // Vue rules - more lenient for development
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    'vue/return-in-computed-property': 'warn',

    // TypeScript rules - warnings instead of errors for common issues
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-empty-object-type': 'warn',
    '@typescript-eslint/ban-types': 'warn',
  },
};

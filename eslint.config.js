
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/acceptance/**/*.tsx'],
    rules: {
      'import/no-unresolved': [
        'error',
        {
          ignore: ['^@testing-library/react-native$'],
        },
      ],
    },
  },
]);

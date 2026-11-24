const { jest: baseConfig } = require('../../package.json');

module.exports = {
  ...baseConfig,
  rootDir: '../..',
  displayName: 'aceptacion-simulada',
  // This suffix keeps acceptance out of the existing Jest and Reassure discovery.
  testMatch: ['<rootDir>/tests/acceptance/**/*.acceptance.tsx'],
  setupFilesAfterEnv: [...baseConfig.setupFilesAfterEnv, '<rootDir>/tests/acceptance/setup.ts'],
};

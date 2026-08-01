const packageConfig = require('./package.json').jest;

module.exports = {
  ...packageConfig,
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  roots: ['<rootDir>/tests'],
  testPathIgnorePatterns: [],
  modulePathIgnorePatterns: [],
};

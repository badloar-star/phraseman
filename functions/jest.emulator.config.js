/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testPathIgnorePatterns: [],
  testMatch: ['**/*.emulator.test.ts'],
};

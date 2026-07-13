'use strict';

const base = require('./jest.rntl.config.cjs');

module.exports = {
  ...base,
  testMatch: ['<rootDir>/tests/soft_contextual_upsell_card_rntl.test.tsx'],
};

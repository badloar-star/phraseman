'use strict';

// These are runtime/render and source-contract checks. Use the same Babel
// transform as the app, avoiding ts-jest constructing a whole-repository
// TypeScript program for each tiny suite. Global type-check gates are unchanged.
const runtime = require('./jest.rntl.config.cjs');

module.exports = {
  ...runtime,
  displayName: 'sunday-sheet',
  // зачем (03.10): запись про удалённый tests/boon_activation_modal_contract.test.ts убрана — файла нет.
  testMatch: [
    '<rootDir>/tests/hybrid_sheet_shell_observer_runtime.test.tsx',
    '<rootDir>/tests/super_sunday_runes.test.ts',
    '<rootDir>/tests/super_sunday_rune_sources_contract.test.ts',
  ],
};

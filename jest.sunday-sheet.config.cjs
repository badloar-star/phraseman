'use strict';

// These are runtime/render and source-contract checks. Use the same Babel
// transform as the app, avoiding ts-jest constructing a whole-repository
// TypeScript program for each tiny suite. Global type-check gates are unchanged.
const runtime = require('./jest.rntl.config.cjs');

module.exports = {
  ...runtime,
  displayName: 'sunday-sheet',
  testMatch: [
    '<rootDir>/tests/double_reward_sheet.test.tsx',
    '<rootDir>/tests/hybrid_sheet_shell_observer_runtime.test.tsx',
    '<rootDir>/tests/boon_activation_modal_contract.test.ts',
    '<rootDir>/tests/super_sunday_runes.test.ts',
    '<rootDir>/tests/super_sunday_rune_sources_contract.test.ts',
    '<rootDir>/tests/use_video_watch_energy_boost_super_sunday.test.ts',
  ],
};

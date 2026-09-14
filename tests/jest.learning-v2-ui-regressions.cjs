const path = require('node:path');
const rootDir = path.resolve(__dirname, '..');
const base = require(path.join(rootDir, 'package.json')).jest;

// Bounded component gates; acquire the repository semaphore before running Jest.
module.exports = {
  ...base,
  rootDir,
  testMatch: [
    '<rootDir>/tests/learning_v2_owner_selection.test.tsx',
    '<rootDir>/tests/session_attempt_gift_rescue_entry.test.tsx',
    '<rootDir>/tests/learning_v2_rune_flight_lifecycle.test.tsx',
    '<rootDir>/tests/learning_v2_intro_reader_a.test.tsx',
    '<rootDir>/tests/learning_v2_rune_flight_sound_contract.test.ts',
    '<rootDir>/tests/session_attempt_gift_rescue_presentation.test.ts',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: { isolatedModules: true, jsx: 'react', esModuleInterop: true },
    }],
  },
};

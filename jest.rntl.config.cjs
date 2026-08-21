'use strict';

module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>/tests', '<rootDir>/components', '<rootDir>/app'],
  testMatch: [
    '<rootDir>/tests/text_integrity_primitives.test.tsx',
    '<rootDir>/tests/survey_offer_render.test.tsx',
    '<rootDir>/tests/survey_screen_submission_behavior.test.tsx',
    '<rootDir>/tests/registration_prompt_modal_lifecycle.test.ts',
    '<rootDir>/tests/nickname_edit_modal_availability.test.tsx',
    '<rootDir>/tests/level_exam_intro.test.tsx',
    '<rootDir>/tests/friends_together_dev_bots_sheet.test.tsx',
    '<rootDir>/tests/learning_v2_intro_reader_a.test.tsx',
    '<rootDir>/tests/avatar_dna_stage_contract.test.tsx',
    '<rootDir>/tests/avatar_view_v2_fallback.test.tsx',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup_jest_write_guard.js'],
  transformIgnorePatterns: [
    '<rootDir>/tests/setup_jest_write_guard.js',
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(png|jpg|jpeg|gif|svg|webp|avif|mp3|wav|m4a|ogg|aac|ttf|otf)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^expo-constants$': '<rootDir>/tests/__mocks__/expo-constants.js',
    '^expo-secure-store$': '<rootDir>/tests/__mocks__/expo-secure-store.js',
    '^expo-crypto$': '<rootDir>/tests/__mocks__/expo-crypto.js',
  },
  forceExit: true,
  maxWorkers: 1,
};

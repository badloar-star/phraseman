module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  moduleDirectories: ['node_modules'],
  moduleNameMapper: {
    '^@frozen-c/(.*)$':
      'C:/Users/badlo/Documents/Codex/2026-11-02/x20/work/offline-l1-c-controller-09/modules/classic-course-v1/$1',
    '^@frozen-c-test/(.*)$':
      'C:/Users/badlo/Documents/Codex/2026-11-02/x20/work/offline-l1-c-controller-09/tests/fixtures/$1',
  },
  roots: ['<rootDir>/tests'],
  modulePathIgnorePatterns: ['<rootDir>/.codex-tmp', '<rootDir>/.worktrees', '<rootDir>/content'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.offline-l1-native-ports.json' }],
  },
  testMatch: ['<rootDir>/tests/classic_starter_native_ports.test.ts'],
};

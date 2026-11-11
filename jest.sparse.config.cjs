module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', 'C:/appsprojects/phraseman/node_modules'],
  moduleNameMapper: { '\\.(m4a)$': '<rootDir>/tests/asset_mock.cjs' },
  transform: {
    '^.+\\.tsx?$': ['C:/appsprojects/phraseman/node_modules/ts-jest', { isolatedModules: true, tsconfig: '<rootDir>/tsconfig.sparse-jest.json' }],
  },
};

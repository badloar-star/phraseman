const path = require('node:path');
const rootDir = path.resolve(__dirname, '../..');
module.exports = {
  ...require(path.join(rootDir, 'package.json')).jest,
  rootDir,
  maxWorkers: 1,
  transform: { '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true, diagnostics: false, tsconfig: { esModuleInterop: true, jsx: 'react', target: 'ES2020' } }] },
};

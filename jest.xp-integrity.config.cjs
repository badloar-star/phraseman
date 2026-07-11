const base = require("./package.json").jest;

module.exports = {
  ...base,
  rootDir: __dirname,
  testMatch: ["**/tests/xp_integrity_*.test.ts"],
};

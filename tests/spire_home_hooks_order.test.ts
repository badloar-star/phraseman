import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

// Regression for the build 147 SpireHomeScreen crash: loading/locked branches
// must preserve the same hook order as the fully rendered screen.
async function main(): Promise<void> {
  // Load the existing rules directly so Jest does not need VM dynamic imports.
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: require('../eslint.config.js') });
  const results = await eslint.lintFiles(['components/spire/SpireHomeScreen.tsx']);
  const failures = results.flatMap((result) => result.messages
    .filter((message) => message.ruleId === 'react-hooks/rules-of-hooks' || message.fatal)
    .map((message) => `${result.filePath}:${message.line}: ${message.message}`));
  assert.deepEqual(failures, [], 'SpireHomeScreen must call hooks on every render, before any early return');
  console.log('PASS: SpireHomeScreen hook order');
}
if (typeof test === 'function') {
  test('SpireHomeScreen preserves hook order across loading and locked branches', main, 30_000);
} else {
  void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}

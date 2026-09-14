import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('technical debt register is complete and machine-validated', () => {
  const output = execFileSync(process.execPath, ['scripts/verify_technical_debt.mjs'], { encoding: 'utf8' });
  assert.match(output, /technical_debt_ok items=5/);
  assert.match(output, /dispositions=contain,pay/);
});

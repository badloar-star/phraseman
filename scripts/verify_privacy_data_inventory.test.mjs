import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('privacy data inventory is complete but remains draft', () => {
  const output = execFileSync(process.execPath, ['scripts/verify_privacy_data_inventory.mjs'], { encoding: 'utf8' });
  assert.match(output, /privacy_data_inventory_ok records=8 status=Draft/);
});

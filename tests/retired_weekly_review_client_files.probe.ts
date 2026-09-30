import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
for (const file of ['app/weekly_review_analytics.ts', 'app/weekly_review_category_labels.ts']) {
  assert.equal(fs.existsSync(path.join(root, file)), false, `${file} is an unused legacy route shim`);
}
assert.equal(fs.existsSync(path.join(root, 'app/weekly_review_copy.ts')), true, 'Product copy contract must remain');
assert.equal(fs.existsSync(path.join(root, 'app/weekly_review_types.ts')), true, 'Active analytics type import must remain');

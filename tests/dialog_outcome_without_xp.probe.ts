import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const outcome = fs.readFileSync(path.join(root, 'app', 'dialog_outcome.ts'), 'utf8');
const test = fs.readFileSync(path.join(root, 'tests', 'dialog_outcome.test.ts'), 'utf8');

assert.equal(outcome.includes('outcomeXpMultiplier'), false);
assert.equal(test.includes('outcomeXpMultiplier'), false);
assert.equal(outcome.includes('export function outcomeTitle'), true);
assert.equal(test.includes("expect(outcomeTitle('success', 'ru'))"), true);

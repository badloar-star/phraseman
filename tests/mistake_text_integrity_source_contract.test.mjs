import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hub = readFileSync(new URL('../app/mistakes_hub.tsx', import.meta.url), 'utf8');
const finale = readFileSync(new URL('../components/mistake-practice/MistakeSessionFinale.tsx', import.meta.url), 'utf8');

test('active mistake surfaces never cut learner-visible text', () => {
  assert.doesNotMatch(hub, /numberOfLines/);
  assert.doesNotMatch(finale, /numberOfLines/);
});

test('mistake tiles are allowed to grow around complete translations', () => {
  assert.match(finale, /fixedRow: \{ flexDirection: 'row', alignItems: 'flex-start'/);
  assert.match(hub, /sourceLabel: \{ fontWeight: '800', textAlign: 'center', flexShrink: 1 \}/);
});

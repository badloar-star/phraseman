// зачем (владелец 04.10): гейт «готов» не пускает без свежего снимка с эмулятора рядом с макетом.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkRows } from '../scripts/port_ready_gate.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prg-'));
fs.writeFileSync(path.join(dir, 'screen.tsx'), 'x');
fs.writeFileSync(path.join(dir, 'shot.png'), 'png');
const sha = crypto.createHash('sha256').update('png').digest('hex');
const row = (o) => ({ rows: [{ id: 'r-001', code: ['screen.tsx'], ...o }] });
const future = () => new Date(Date.now() + 1e5).toISOString();

test('без снимка — запрещено', () => {
  assert.equal(checkRows(dir, row({}), ['r-001']).ok, false);
});
test('без привязки к коду — запрещено', () => {
  assert.equal(checkRows(dir, row({ code: [] }), ['r-001']).violations[0].code, 'code_unmapped');
});
test('подменённый снимок (хэш) — запрещено', () => {
  assert.equal(checkRows(dir, row({ evidence: 'shot.png', evidence_sha256: 'bad', evidence_at: future() }), ['r-001']).ok, false);
});
test('свежий снимок с верным хэшем — можно', () => {
  assert.equal(checkRows(dir, row({ evidence: 'shot.png', evidence_sha256: sha, evidence_at: future() }), ['r-001']).ok, true);
});
test('снимок старше правки кода — запрещено', () => {
  const res = checkRows(dir, row({ evidence: 'shot.png', evidence_sha256: sha, evidence_at: '2000-01-01T00:00:00Z' }), ['r-001']);
  assert.equal(res.violations.some((v) => v.code === 'evidence_stale'), true);
});

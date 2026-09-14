import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('native accessibility matrix keeps required evidence dimensions visible', () => {
  const source = fs.readFileSync('docs/quality/NATIVE_ACCESSIBILITY_MATRIX.md', 'utf8');
  for (const field of ['VoiceOver', 'TalkBack', 'Font scaling', 'Contrast', 'Target size', 'Focus/order', 'Reduced motion', 'Reachability', 'Evidence owner']) {
    assert.match(source, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(source, /PENDING_DEVICE/);
  assert.match(source, /PENDING_OWNER/);
});

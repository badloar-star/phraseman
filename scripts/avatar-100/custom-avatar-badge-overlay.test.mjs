import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const badgePath = path.resolve('components', 'CustomAvatarBadge.tsx');

test('custom avatar badge explicitly allows upper artwork to overflow the hex frame', () => {
  const source = fs.readFileSync(badgePath, 'utf8');

  assert.match(
    source,
    /width:\s*size,\s*height:\s*size,[^}]*overflow:\s*'visible'/s,
  );
});

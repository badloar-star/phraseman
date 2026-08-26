import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { BIOMYTHICAL_AVATARS } from './biomythical-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('custom avatar catalog exposes the approved biomythical names without changing roles or prices', () => {
  const source = fs.readFileSync(path.join(ROOT, 'constants', 'custom_avatars.ts'), 'utf8');
  for (const entry of BIOMYTHICAL_AVATARS) {
    const pattern = new RegExp(
      `id: 'custom-gen-${entry.id}', name: '([^']+)', labels: \\{ ru: '([^']+)' \\}, price: (\\d+)`,
    );
    const match = source.match(pattern);
    assert.ok(match, `missing custom-gen-${entry.id}`);
    assert.equal(match[1], entry.name, `ID ${entry.id} name`);
    assert.equal(match[2], entry.labelRu, `ID ${entry.id} Russian role`);
    assert.equal(Number(match[3]), entry.price, `ID ${entry.id} price`);
  }
});

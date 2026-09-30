import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
for (const relative of [
  'components/BoonActivatedModal.tsx',
  'components/BoonActivatedSheet.tsx',
  'components/BoonChestModal.tsx',
  'components/BoonHeroSheet.tsx',
  'components/boon_hero/BoonHeroEmblem.tsx',
  'components/celebration/BoonActivatedHybrid.tsx',
  'components/celebration/BoonChestHybrid.tsx',
]) {
  assert.equal(existsSync(path.join(root, relative)), false, `${relative} still bundled`);
}

const showcase = readFileSync(path.join(root, 'components/dev/motion_showcase/sections/celebrations.tsx'), 'utf8');
assert.equal(showcase.includes('BoonChestModal'), false, 'boon chest still in showcase');
assert.equal(showcase.includes('BoonActivatedModal'), false, 'boon modal still in showcase');
assert.equal(showcase.includes('BoonActivatedSheet'), false, 'boon sheet still in showcase');
console.log('weekly boon DEV UI retired');

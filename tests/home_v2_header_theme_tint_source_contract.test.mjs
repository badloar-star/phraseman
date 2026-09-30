import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('app/(tabs)/home.tsx', 'utf8');

test('Home V2 header derives the streak icon from the active V2 palette', () => {
  assert.match(source, /import \{ getV2Palette, V2 \} from '..\/..\/constants\/v2Style';/);
  assert.match(source, /const homeV2Palette = getV2Palette\(t, themeMode\);/);
  assert.match(source, /<Ionicons name="flame" size=\{20\} color=\{homeV2Palette\.iconTint\} \/>/);
  assert.doesNotMatch(source, /<Ionicons name="flame" size=\{20\} color="#FF8A3D" \/>/);
});

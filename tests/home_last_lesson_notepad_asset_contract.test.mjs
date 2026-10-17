import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const sourcePath = resolve('app/home_last_lesson_assets.ts');
const source = readFileSync(sourcePath, 'utf8');
const assetPath = resolve('assets/images/home_last_lesson/home-last-lesson-notepad.png');
const home = readFileSync(resolve('app/(tabs)/home.tsx'), 'utf8');
const continueCard = readFileSync(resolve('components/home/v2/HomeV2ContinueCard.tsx'), 'utf8');

test('continue-learning card uses the supplied notepad asset for every selectable tint', () => {
  assert.ok(existsSync(assetPath));
  assert.match(source, /const HOME_LAST_LESSON_ART = require\("\.\.\/assets\/images\/home_last_lesson\/home-last-lesson-notepad\.png"\);/);
  assert.equal((source.match(/HOME_LAST_LESSON_ART/g) ?? []).length, 10);
  assert.doesNotMatch(source, /home-last-lesson-(?:aurora|ember|forest|gold|indigo|midnight|olive|sagePorcelain|volt)\.webp/);
  assert.match(home, /<HomeV2ContinueCard[\s\S]{0,900}art=\{priorityCardImage\}/);
  assert.match(continueCard, /art: ImageSourcePropType/);
  // зачем (17.10): карточка рисует тот же переданный арт через ThemedArtLayers (основа + слой акцента темы), а не голым <Image>
  assert.match(continueCard, /<(?:Image|ThemedArtLayers) source=\{art\}/);
  assert.doesNotMatch(continueCard, /spiral_notepad\.png/);
  assert.doesNotMatch(continueCard, /numberOfLines=/);
});

/* global __dirname: readonly */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const tiles = fs.readFileSync(path.join(root, 'components/home/v2/HomeV2FeatureTiles.tsx'), 'utf8');
const continueCard = fs.readFileSync(path.join(root, 'components/home/v2/HomeV2ContinueCard.tsx'), 'utf8');
const dailyPhrase = fs.readFileSync(path.join(root, 'components/DailyPhraseCard.tsx'), 'utf8');
const home = fs.readFileSync(path.join(root, 'app/(tabs)/home.tsx'), 'utf8');
const v2Home = home.slice(home.indexOf('const renderHomeV2 = () =>'), home.indexOf('const renderHomeV2 = () =>') + 10500);

test('all three feature illustrations sit at the left on one uninterrupted glass surface', () => {
  assert.match(tiles, /style=\{s\.art\}/);
  assert.doesNotMatch(tiles, /s\.art, \{ backgroundColor: p\.glassRaised \}/);
  assert.match(tiles, /art: \{[^}]*alignItems: 'flex-start'/);
  assert.match(tiles, /style=\{\[s\.tile, glass\]\}/);
});

test('V2 home identity and balance use one real coin-rank asset, never the hex avatar or rune', () => {
  assert.match(home, /useMyCoinRank\(\)/);
  assert.match(home, /coinRankRowForDisplay\(/);
  assert.match(v2Home, /testID="home-hero-avatar-button"/);
  assert.match(v2Home, /source=\{homeCoinRankSource\}/);
  assert.doesNotMatch(v2Home, /<AvatarView|source=\{homeHeaderRuneIconSource\}/);
  assert.match(v2Home, /homeCoinRankSource \?/);
});

test('continue-learning card has no differently colored half-panel', () => {
  assert.match(continueCard, /<View pointerEvents="none" style=\{s\.art\}>/);
  assert.doesNotMatch(continueCard, /s\.art, \{ backgroundColor: p\.glassRaised \}/);
  assert.match(continueCard, /style=\{\[s\.card, glass\]\}/);
});

test('continue-learning card receives the approved notepad art from the real producer chain', () => {
  const assetProducer = fs.readFileSync(path.join(root, 'app/home_last_lesson_assets.ts'), 'utf8');
  const assetPath = path.join(root, 'assets/images/home_last_lesson/home-last-lesson-notepad.png');
  assert.ok(fs.existsSync(assetPath));
  assert.match(assetProducer, /const HOME_LAST_LESSON_ART = require\("\.\.\/assets\/images\/home_last_lesson\/home-last-lesson-notepad\.png"\);/);
  assert.equal((assetProducer.match(/HOME_LAST_LESSON_ART/g) ?? []).length, 10);
  assert.match(home, /const lastLessonImage = getHomeLastLessonImage\(themeMode\);/);
  assert.match(home, /const priorityCardImage = priorityCardShowsMistakes[\s\S]*?: lastLessonImage;/);
  assert.match(home, /<HomeV2ContinueCard[\s\S]{0,900}art=\{priorityCardImage\}/);
  assert.match(continueCard, /<Image source=\{art\}/);
  assert.match(continueCard, /style=\{s\.artImage\}/);
  assert.match(continueCard, /art: \{[^}]*right: 0/);
});

test('phrase-of-day illustration is large and placed to the right of the copy', () => {
  assert.match(dailyPhrase, /v2Art: \{[^}]*position: 'absolute'[^}]*right:/);
  assert.match(dailyPhrase, /v2Art: \{[^}]*width: 1(?:1|2|3|4)\d/);
  assert.match(dailyPhrase, /v2Copy: \{[^}]*paddingRight:/);
});

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
  // зачем (17.10, шапка Главной перестроена: HomeV2Header со StoryAvatarSlot и строкой монет): тот же смысл — и аватар, и баланс берут ОДИН ассет ранга монет
  assert.match(v2Home, /testID: 'home-v2-coins'/);
  assert.match(v2Home, /<StoryAvatarSlot[\s\S]{0,400}coinSource=\{homeCoinRankSource\}/);
  assert.match(v2Home, /source=\{homeCoinRankSource\}/);
  assert.doesNotMatch(v2Home, /<AvatarView|source=\{homeHeaderRuneIconSource\}/);
  assert.match(v2Home, /homeCoinRankSource \?/);
});

test('continue-learning card has no differently colored half-panel', () => {
  // зачем (01.10): заготовка первого кадра лишь приглушает арт (artPending), заливки-половинки нет.
  // зачем (владелец 18.10 «вариант Г»): колонки арта больше нет — иконка в кольце прогресса справа; журнал геометрии [HOME-CONTINUE-ART] на кольце, заготовка лишь приглушает
  assert.match(continueCard, /<View pointerEvents="none" onLayout=\{logLayout\('ring'\)\} style=\{\[s\.ring, pending \? s\.artPending : null\]\}>/);
  assert.doesNotMatch(continueCard, /s\.art, \{ backgroundColor: p\.glassRaised \}/);
  // 17.10: к стеклу добавилась приглушённая заливка занятости (busy → cardBusy, R09); стекло карточки прежнее
  assert.match(continueCard, /style=\{\[s\.card, glass(?:, busy \? s\.cardBusy : null)?\]\}/);
});

test('continue-learning card receives the approved notepad art from the real producer chain', () => {
  const assetProducer = fs.readFileSync(path.join(root, 'app/home_last_lesson_assets.ts'), 'utf8');
  const assetPath = path.join(root, 'assets/images/home_last_lesson/home-last-lesson-notepad.png');
  assert.ok(fs.existsSync(assetPath));
  assert.match(assetProducer, /const HOME_LAST_LESSON_ART = require\("\.\.\/assets\/images\/home_last_lesson\/home-last-lesson-notepad\.png"\);/);
  assert.equal((assetProducer.match(/HOME_LAST_LESSON_ART/g) ?? []).length, 10);
  assert.match(home, /const lastLessonImage = getHomeLastLessonImage\(themeMode\);/);
  // 04.10: карточка «Продолжить» — только последний урок (владелец), арт урока.
  // 17.10: основа и слой акцента — из ОДНОГО resolveThemedArt (priorityCardArt), картинка урока — запасная
  assert.match(home, /const priorityCardArt = resolveThemedArt\(lastLessonCompleted \? 'today' : 'continue', homeArtTone\);/);
  assert.match(home, /const priorityCardImage = priorityCardArt\.base \?\? lastLessonImage;/);
  assert.match(home, /<HomeV2ContinueCard[\s\S]{0,900}art=\{priorityCardImage\}/);
  assert.match(continueCard, /<ThemedArtLayers source=\{art\}/); // 17.10: арт рисует ThemedArtLayers (основа + слой акцента темы)
  // зачем (владелец 18.10 «вариант Г», «иконка 1 и не меняется»): одна иконка постоянного размера внутри кольца, contain, без плашки-бейджа поверх арта
  assert.match(continueCard, /<ThemedArtLayers source=\{art\} accent=\{artAccent\} style=\{s\.artImage\} contentFit="contain"/);
  assert.match(continueCard, /ring: \{ width: RING_SIZE, height: RING_SIZE/);
  // «обязаны слушаться цвета темы»: дуга accentGraphic, дорожка buttonFill — токены темы, без литералов
  assert.match(continueCard, /stroke=\{shadowGlass\.buttonFill\}/);
  assert.match(continueCard, /stroke=\{shadowGlass\.accentGraphic\}/);
});

// зачем (владелец 04.10, по скриншоту: «в два раза ниже»): карточка ≈ 80 вместо ≈ 150 —
// арт 72 справа, кнопки столбиком рядом; текст по-прежнему не заходит под арт.
test('phrase-of-day illustration is placed to the right of the copy in the compact card', () => {
  assert.match(dailyPhrase, /v2Art: \{[^}]*position: 'absolute'[^}]*right:/);
  assert.match(dailyPhrase, /v2Art: \{[^}]*width: 72, height: 72/);
  assert.match(dailyPhrase, /v2Card: \{\s*minHeight: 80,/);
  assert.match(dailyPhrase, /v2Copy: \{[^}]*paddingRight:/);
});

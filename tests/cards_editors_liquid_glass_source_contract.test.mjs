import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: редактор карточки, создание набора, стопка, карточка-фраза, превью ролика набора и
// соцбар набора переведены на Liquid Glass (cards.html #8, #18–19, #21–24, #37, #43, #50, #60–74;
// video.html #12–13). Этот сторож держит переход: токены стекла на месте, нативных Alert нет,
// запрещённые приёмы (сжатие шрифта, XP/жемчуг, толстые цветные рамки) не вернулись.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const KIT = 'app/flashcards/CardsGlassKit.tsx';
const PARTS = 'app/community_packs/PackCreateGlassParts.tsx';
const KIT_USERS = ['app/flashcards_card_editor.tsx', 'app/community_pack_create.tsx'];
const TOKEN_USERS = [
  'app/flashcards/CollectionDeckView.tsx',
  'app/flashcards/PhraseCard.tsx',
  'app/flashcards/PackVideoHero.tsx',
  'app/community_packs/CommunityPackSocialBar.tsx',
];
const ALL = [KIT, PARTS, ...KIT_USERS, ...TOKEN_USERS];

test('every touched file exists', () => {
  for (const file of ALL) assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), file);
});

test('kit reads the active 13-theme glass tokens', () => {
  const kit = read(KIT);
  assert.ok(kit.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active theme token registry');
  for (const token of ['g.opaqueCard', 'g.opaqueControl', 'g.glassEdge', 'g.cta', 'g.ctaInk']) {
    assert.ok(kit.includes(token), `kit uses ${token}`);
  }
});

test('editor and pack creation use the shared glass kit, not the legacy palette surfaces', () => {
  for (const file of KIT_USERS) {
    const source = read(file);
    assert.ok(source.includes("from './flashcards/CardsGlassKit'"), `${file} imports the kit`);
    assert.ok(source.includes('useCardsGlass()'), `${file} reads glass tokens`);
    assert.ok(source.includes('CardsGlassScreen'), `${file} uses the glass screen background`);
    assert.ok(!source.includes("from '../components/ScreenGradient'"), `${file} left the legacy screen gradient`);
    assert.ok(!/t\.bgSurface|t\.bgCard|t\.accent\b/.test(source), `${file} has no legacy palette surfaces`);
  }
});

test('other touched files read glass tokens', () => {
  for (const file of TOKEN_USERS) {
    assert.ok(read(file).includes('liquidGlassTokens('), `${file} uses liquidGlassTokens`);
  }
});

test('no native Alert.alert in the touched screens', () => {
  for (const file of ALL) {
    assert.ok(!/Alert\.alert\s*\(/.test(read(file)), `${file} has no Alert.alert`);
  }
});

test('forbidden owner patterns stay out', () => {
  for (const file of ALL) {
    const source = read(file);
    assert.ok(!source.includes('adjustsFontSizeToFit'), `${file}: adjustsFontSizeToFit`);
    assert.ok(!/\b(XP|xp)\b|жемчуг|жемчуж|осколк|pearl|shard/i.test(source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), `${file}: XP / pearls / shards in code`);
    assert.ok(!/borderWidth:\s*(1\.5|2|3)\b/.test(source.replace(/rgba?\(/g, '')) || file.endsWith('PhraseCard.tsx'), `${file}: thick border`);
  }
});

test('phrase card no longer draws thick colored swipe borders', () => {
  const source = read('app/flashcards/PhraseCard.tsx');
  assert.ok(!/borderWidth:\s*(1\.5|2)\b/.test(source), 'no 1.5/2px colored borders');
  assert.ok(source.includes('edgeLabels'), 'deck language labels are opt-in');
});

test('pack creation replaces the dead 50-card button with the limit window and keeps validation in onSubmit', () => {
  const source = read('app/community_pack_create.tsx');
  assert.ok(source.includes('setCardLimitModalOpen(true)'), 'limit window opens on tap');
  assert.ok(source.includes('ThemedChoiceModal'), 'limit window is the glass choice modal');
  assert.ok(source.includes('ThemedConfirmModal'), 'clear-draft confirm remains');
  assert.ok(source.includes('localSaveError(payload)'), 'save validation is untouched');
  assert.ok(source.includes('priceRunes: 0'), 'packs stay free');
  assert.ok(source.includes("DebugLogger.error('community_pack_create:save'"), 'save failure is logged');
});

test('social bar keeps the like gate, purchase hook and optimistic add', () => {
  const source = read('app/community_packs/CommunityPackSocialBar.tsx');
  assert.ok(source.includes('likeLockedToast()'), 'like before add still explains why it is locked');
  assert.ok(source.includes('onRequestPurchase(pack, price)'), 'paid pack still opens the purchase sheet');
  assert.ok(source.includes('addToLibraryOptimistic'), 'optimistic add stays');
  assert.ok(!source.includes('t.correct'), 'no green "added" state');
});

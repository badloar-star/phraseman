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
  // зачем (темы 2.0): главная кнопка берёт роли цвета темы g.accent/g.accentInk
  // (в «Спокойно» они равны прежним cta/ctaInk — сторож палитры это проверяет).
  for (const token of ['g.opaqueCard', 'g.opaqueControl', 'g.glassEdge', 'g.accent', 'g.accentInk']) {
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
    assert.ok(!/(?<![A-Za-z])t\.correct(?!Text)/.test(source), 'no green "added" state');
});

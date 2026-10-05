import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// зачем (владелец 2026-09-30): состояния 🟠/❌ страниц results / practice / coins / profile / community
// переносятся на Liquid Glass. Контракт держит: токены стекла в затронутых файлах, отсутствие
// adjustsFontSizeToFit, толстых рамок, нативного Alert.alert и показа XP/жемчуга. Комментарии
// (история решений) не считаются UI и вырезаются перед проверкой запретных слов.
const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
const code = (file) => read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const GLASS_FILES = [
  'app/dialogue_v2_completion.tsx',
  'components/mistake-practice/MistakeSessionFinale.tsx',
  'app/mistakes_hub.tsx',
  'app/mistakes_list.tsx',
  'app/mistake_detail.tsx',
  'app/mistake_practice_session.tsx',
  'app/streak_stats.tsx',
  'components/StatsCardArtSurface.tsx',
  'components/coins/CoinRankCatalog.tsx',
  'components/PlusBadge.tsx',
  'components/FirstPurchaseSealCelebration.tsx',
  'components/settings/StudyLanguagePicker.tsx',
  'components/AccountDeletedNotice.tsx',
  'components/spire/useSpirePalette.ts',
  'components/friends_together/FriendTogetherSheet.tsx',
];

for (const file of GLASS_FILES) {
  test(`${file}: Liquid Glass tokens, no forbidden tricks`, () => {
    const src = code(file);
    // 30.09: итог диалога V2 читает токены через useDialogueGlass (= liquidGlassTokens активной темы).
    assert.match(src, /liquidGlassTokens|useLv2Glass|useDialogueGlass/, `${file} must read glass tokens`);
    assert.doesNotMatch(src, /adjustsFontSizeToFit/);
    assert.doesNotMatch(src, /Alert\.alert/);
    assert.doesNotMatch(src, /borderWidth:\s*[2-9]/, 'no thick borders');
    assert.doesNotMatch(src, /\b(xp|XP|pearl)\w*\s*[=:]/, 'XP / pearls are never shown');
  });
}

test('spire screens use the glass palette hook, not the raw V2 palette', () => {
  for (const f of fs.readdirSync('components/spire').filter((n) => n.endsWith('.tsx'))) {
    assert.doesNotMatch(read(`components/spire/${f}`), /useV2Palette/, `${f} still on V2 palette`);
  }
});

test('practice energy pill is on glass in swipe trainings and prepositions', () => {
  assert.match(read('app/flashcards_swipe.tsx'), /<EnergyBar ownerActive glass \/>/);
  assert.match(read('app/preposition_drill.tsx'), /<EnergyBar size=\{30\} glass \/>/);
});

test('coin rank catalog shows all 20 ranks from the single table and is mounted on the rank screen', () => {
  const catalog = read('components/coins/CoinRankCatalog.tsx');
  assert.match(catalog, /COIN_RANK_TABLE\.map/);
  for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
    assert.ok(catalog.includes(lang.includes('-') ? `'${lang}':` : `${lang}:`), `catalog copy missing ${lang}`);
  }
  assert.match(read('app/coin_rank.tsx'), /<CoinRankCatalog /);
  // 05.10 (решение владельца 7): сетки на экране нет — каталог в шторке кита, открывается тапом по рангу.
  assert.match(read('app/coin_rank.tsx'), /testID="coin-rank-open-catalog"[\s\S]{0,160}onPress=\{\(\) => setCatalogOpen\(true\)\}/);
  assert.match(read('app/coin_rank.tsx'), /<KitSheetModal[\s\S]{0,400}<CoinRankCatalog glass=\{g\} lang=\{lang\} currentRank=\{rank\} showTitle=\{false\} \/>/);
  // трассировка церемонии другого автора не должна пропасть
  assert.match(read('app/coin_rank.tsx'), /\[RANK-CEREMONY\]/);
});

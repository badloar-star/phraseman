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

// зачем (приказ владельца 01.10 «иконка энергии БЕЗ ФОНА НИГДЕ» + Карточки 2.0 12.10, макет `sessHdr`): в шапке swipe-сессии пилюли энергии больше нет
// (✕ · название · попытки и руны, af9585203) — тест, ждавший там `<EnergyBar ownerActive glass />`, устарел. Пилюля остаётся в тренировке предлогов.
test('practice energy pill is on glass in prepositions; swipe header no longer carries it', () => {
  assert.doesNotMatch(read('app/flashcards_swipe.tsx'), /<EnergyBar\b/);
  assert.match(read('app/preposition_drill.tsx'), /<EnergyBar size=\{30\} glass \/>/);
});

test('coin rank catalog shows all 20 ranks from the single table and is mounted on the rank screen', () => {
  const catalog = read('components/coins/CoinRankCatalog.tsx');
  assert.match(catalog, /COIN_RANK_TABLE\.map/);
  for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
    assert.ok(catalog.includes(lang.includes('-') ? `'${lang}':` : `${lang}:`), `catalog copy missing ${lang}`);
  }
  // 11.10 (журнал 35, владелец): каталог — ОТДЕЛЬНЫЙ экран coin_rank_catalog, вход ссылкой «Все ранги» с экрана «Повысить ранг»; шторки нет.
  assert.match(read('app/coin_rank_catalog.tsx'), /<CoinRankCatalog glass=\{g\} lang=\{lang\} currentRank=\{rank\} showTitle=\{false\} \/>/);
  assert.match(read('app/coin_rank.tsx'), /testID="coin-rank-all-ranks"[\s\S]{0,260}router\.push\('\/coin_rank_catalog' as never\)/);
  assert.doesNotMatch(read('app/coin_rank.tsx'), /KitSheetModal|setCatalogOpen/);
  assert.match(read('app/_layout.tsx'), /<Stack\.Screen name="coin_rank_catalog" \/>/);
  // трассировка церемонии другого автора не должна пропасть
  assert.match(read('app/coin_rank.tsx'), /\[RANK-CEREMONY\]/);
});

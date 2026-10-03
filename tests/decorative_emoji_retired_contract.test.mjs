// зачем (PM-030-A1/A2): в 2.0 нет декоративных эмодзи в модалках, тостах и итоге урока.
// Смысловые знаки остаются: ⚡ (единица энергии), ★ (звёзды), ✓ (отметка верного).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

const RETIRED = {
  'components/BillingIssueToastHost.tsx': /💳/u,
  'components/StreakRiskToastHost.tsx': /🔥/u,
  'app/flashcards/CardPackShardPaywallModal.tsx': /reportPack: '⚐/u,
  'app/lesson_complete.tsx': /🥉|🥈|🥇|🔓|🙏|variant\.emoji/u,
  'components/feedback/ResultsSequence.tsx': /🎁/u,
  'app/pack_opening.tsx': /💡|🎉/u,
  'app/diagnostic_test.tsx': /🧩/u,
  'app/ai_kill_switch_copy.ts': /[🌀-🫿☀-➿]/u,
};

for (const [file, pattern] of Object.entries(RETIRED)) {
  test(`${file} has no decorative emoji`, () => {
    assert.doesNotMatch(read(file), pattern);
  });
}

test('semantic marks stay: energy unit and stars', () => {
  assert.match(read('app/energy_activity_titles.ts'), /⚡/u);
  assert.match(read('components/lessons/LessonsListGlassKit.tsx'), /2★/u);
});

// Пуши (решение координатора 01.10): не больше одного эмодзи и только в начале строки.
test('push copy has at most one emoji, only at the start of a line', () => {
  const src = read('app/notifications.ts');
  const EMO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu;
  const bad = [];
  for (const m of src.matchAll(/(['"`])((?:\.|(?!\1)[^\\n])*)\1/g)) {
    const body = m[2];
    const all = body.match(EMO) || [];
    if (all.length === 0) continue;
    const leadsWithEmoji = /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u.test(body);
    if (all.length > 1 || !leadsWithEmoji) bad.push(body.slice(0, 60));
  }
  assert.deepEqual(bad, []);
});

// зачем (§99, 03.10): проверка «у подарка нет ✨» снята — app/level_gift_system.ts удалён целиком (D09).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { normalizeEol } from './helpers/read_source_esm.mjs';

// зачем (владелец 2026-09-30, D78): оболочка A/D (PaywallLiquidGlass, карточки/плитки
// тарифов, PaywallTrialStages) удалена вместе с пейволами A–G. Этот сторож теперь
// держит модель выгод единственного пейвола Plus; экран сторожит
// tests/paywall_v3_source_contract.test.mjs.

const root = join(import.meta.dirname, '..');
const read = (path) => normalizeEol(readFileSync(join(root, path), 'utf8'));

function assertParses(path) {
  const result = ts.transpileModule(read(path), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], `${path} has TypeScript syntax errors`);
}

function block(source, name) {
  const start = source.indexOf(`export const ${name}`);
  assert.ok(start >= 0, `${name} is exported`);
  return source.slice(start, source.indexOf('\n];', start));
}

test('Plus benefit model: five highlights and the approved 14-row comparison', () => {
  const source = read('components/paywall/PaywallBenefitComparison.tsx');
  const main = block(source, 'PAYWALL_MAIN_BENEFITS');
  assert.equal((main.match(/icon: '/g) ?? []).length, 5, 'exactly five main benefit rows');
  for (const title of ['Карточки без ограничений', 'Все 32 урока курса', 'AI разбирает каждую ошибку', 'Энергия не тратится', '3 заморозки серии в месяц']) {
    assert.ok(main.includes(`LP('${title}'`), `approved main row «${title}»`);
  }

  const rows = block(source, 'PAYWALL_COMPARISON_ROWS');
  const ids = [...rows.matchAll(/\{ id: '([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(ids, [
    'saved_phrases', 'own_cards', 'own_packs', 'flashcard_training', 'course_lessons',
    'dialogue_replies', 'pronunciation', 'ai_mistake_explain', 'mistake_practice',
    'text_dialogue_review', 'combined_lesson', 'energy', 'streak_freezes', 'detailed_stats',
  ]);
  assert.match(source, /PAYWALL_COMPARISON_VISIBLE_ROWS = 6;/);
  // Языки обучения бесплатны (владелец 2026-09-30) — строки в сравнении нет.
  assert.ok(!ids.includes('study_languages'), 'study languages are free, not a Plus row');
  for (const forbidden of ['theme', 'aura', 'weekly_ai', 'mistake_pattern', 'dialogue_scenarios', 'voice_dialogue_review']) {
    assert.ok(!ids.includes(forbidden), `forbidden benefit ${forbidden}`);
  }
});

test('«Свои карточки» у Plus — Безлимит, и это правда в коде', () => {
  const source = read('components/paywall/PaywallBenefitComparison.tsx');
  assert.match(source, /id: 'own_cards'[\s\S]*?plus: UNLIMITED/);
  assert.match(source, /const UNLIMITED = LP\('Безлимит'/);
  assert.ok(!source.includes('1500') && !source.includes('1,500') && !source.includes('1.500'), 'no 1,500 cap in copy');
  assert.match(read('app/flashcards/custom_card_access.ts'), /PLUS_CUSTOM_CARD_LIMIT = Number\.POSITIVE_INFINITY/);
});

test('energy and dialogue rows state the real Free rules', () => {
  const source = read('components/paywall/PaywallBenefitComparison.tsx');
  assert.match(source, /id: 'energy'[\s\S]*?free: LP\('Тратится'[\s\S]*?plus: LP\('Не тратится'/);
  // D111: у Free 30 ответов в МЕСЯЦ.
  assert.match(source, /id: 'dialogue_replies'[\s\S]*?free: LP\('30 в месяц'/);
});

test('trial reminder scheduling stays in the purchase flow', () => {
  const purchase = read('app/paywall_purchase.ts');
  assert.ok(purchase.includes('requestNotificationPermission()'), 'onboarding path keeps the direct request');
  assert.ok(purchase.includes('requestNotificationPermissionWithFallback({ openSettingsIfBlocked: true })'));
  assert.ok(purchase.includes('scheduleTrialEndReminder('));
});

test('Plus paywall sources parse as TypeScript', () => {
  for (const path of [
    'components/paywall/PaywallBenefitComparison.tsx',
    'components/paywall/PaywallPlus.tsx',
    'components/paywall/PaywallPlusScreen.tsx',
    'components/paywall/PaywallPlusCopy.ts',
    'components/paywall/PaywallTrialReminderPrompt.tsx',
    'app/trial_end_reminder_schedule.ts',
  ]) {
    assertParses(path);
  }
});

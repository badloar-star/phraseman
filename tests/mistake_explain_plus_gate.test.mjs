import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isMistakeExplainBlockedByFreeLimit,
  shouldConsumeFreeMistakeExplain,
} from '../app/mistake_explain_plus_gate.ts';

// зачем (решение B6, 2026-09-30): сервер пропускает Plus без дневного лимита AI-разбора —
// клиент не должен ни останавливать Plus на 3 разборах, ни списывать ему бесплатные.

test('Plus is never blocked by the free daily limit', () => {
  for (const freeLeft of [3, 1, 0, -1]) {
    assert.equal(isMistakeExplainBlockedByFreeLimit({ freeLeft, isPremium: true, paidForThisPhrase: false }), false);
  }
});

test('free user is blocked only when the free explains are spent and the phrase is not paid', () => {
  assert.equal(isMistakeExplainBlockedByFreeLimit({ freeLeft: 1, isPremium: false, paidForThisPhrase: false }), false);
  assert.equal(isMistakeExplainBlockedByFreeLimit({ freeLeft: 0, isPremium: false, paidForThisPhrase: false }), true);
  assert.equal(isMistakeExplainBlockedByFreeLimit({ freeLeft: 0, isPremium: false, paidForThisPhrase: true }), false);
});

test('only a free, unpaid explain consumes the daily free counter', () => {
  assert.equal(shouldConsumeFreeMistakeExplain({ isPremium: false, paidForThisPhrase: false }), true);
  assert.equal(shouldConsumeFreeMistakeExplain({ isPremium: false, paidForThisPhrase: true }), false);
  assert.equal(shouldConsumeFreeMistakeExplain({ isPremium: true, paidForThisPhrase: false }), false);
});

test('the hook wires both rules and reads Plus from PremiumContext', async () => {
  const { readFileSync } = await import('node:fs');
  const hook = readFileSync(new URL('../app/use_mistake_explain.ts', import.meta.url), 'utf8');
  assert.ok(hook.includes("import { usePremium } from '../components/PremiumContext'"));
  assert.equal(hook.match(/isMistakeExplainBlockedByFreeLimit\(/g)?.length, 2, 'autoload stop + awaitingPurchase');
  assert.ok(hook.includes('shouldConsumeFreeMistakeExplain('), 'free counter consumption');
  assert.ok(!/freeExplainsLeft <= 0 && paidUnlockedForPhrase !== phraseKey/.test(hook), 'old Plus-blind checks gone');
  assert.ok(hook.includes('[MISTAKE-EXPLAIN]'), 'branch logged');
});

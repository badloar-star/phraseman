// Замок [PLUS-SOURCE] (жалоба №8): события «чей это Plus» и «что решило окно покупки» проходят белый список журнала обращений,
// пишутся одним событием на смену итога, а Plus, оплаченный через Telegram-бот (промокод → VIP-патч сервера), приложение
// считает активным — такой человек не должен попадать в окно покупки.
const recorded: Array<Record<string, unknown>> = [];
jest.mock('../app/support_diagnostics', () => ({
  recordSupportDiagnostic: jest.fn(async (event: Record<string, unknown>) => { recorded.push(event); }),
}));

import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';
import { getVipProgressState } from '../app/premium_progress';
import {
  notePlusPaywallDecision,
  notePlusSource,
  plusPaywallAction,
  plusSourceAction,
  resetPlusSourceDiagnosticsForTests,
  type PlusSource,
} from '../app/plus_source_diagnostics';

const passes = (action: string) => sanitizeSupportDiagnosticEvent({ event: 'feature_action', action, atMs: 1 })?.action === action;

const ALL_SOURCES: PlusSource[] = [
  'tester_off', 'tester_on', 'store', 'vip', 'intro', 'gift_local', 'gift_cloud',
  'cloud_store', 'cloud_vip', 'cloud_gift', 'none', 'none_fast', 'none_unconfirmed',
];

beforeEach(() => {
  recorded.length = 0;
  resetPlusSourceDiagnosticsForTests();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('every source and paywall action passes the support diagnostics whitelist', () => {
  for (const source of ALL_SOURCES) {
    expect(passes(plusSourceAction(source, true))).toBe(true);
    expect(passes(plusSourceAction(source, false))).toBe(true);
  }
  for (const decision of ['show', 'dismiss', 'wait', 'manage', 'none'] as const) {
    for (const from of ['live', 'wait', 'ceiling_cache'] as const) {
      for (const cached of ['premium', 'free', 'unknown'] as const) {
        expect(passes(plusPaywallAction(decision, from, false, cached))).toBe(true);
      }
    }
  }
  expect(plusSourceAction('vip', true)).toBe('plus:src:vip:p1');
  expect(plusPaywallAction('show', 'live', false, 'free')).toBe('plus:paywall:show:live:p0:cfree');
});

test('access source is written once per change, not on every check', async () => {
  notePlusSource('vip', true, 10);
  notePlusSource('vip', true, 11);
  notePlusSource('store', true, 12);
  await Promise.resolve();
  expect(recorded.map((e) => e.action)).toEqual(['plus:src:vip:p1', 'plus:src:store:p1']);
  expect(recorded[0]).toMatchObject({ event: 'feature_action', result: 'info', subject: 'app', atMs: 10 });
});

test('paywall decision is written with its inputs; show is marked blocked', async () => {
  notePlusPaywallDecision('show', 'ceiling_cache', false, 'free', 20);
  await Promise.resolve();
  expect(recorded[0]).toMatchObject({
    event: 'feature_action', action: 'plus:paywall:show:ceiling_cache:p0:cfree', screen: '/premium_modal', result: 'blocked', atMs: 20,
  });
});

test('Telegram-bot Plus (promo VIP patch from functions/src/promo_codes.ts buildPromoVipPatch) is active Plus on the client', () => {
  const now = Date.UTC(2026, 9, 28);
  // Ровно поля, которые пишет сервер при оплате через @PhrasemanPremiumBot и при продлении Stars-подписки.
  const telegramMonthly = {
    vip_active: 'true',
    vip_plan: 'promo',
    vip_from: String(now - 1000),
    vip_until: String(now + 31 * 24 * 60 * 60 * 1000),
    vip_admin_override: 'true',
    vip_admin_grant_at: String(now - 1000),
  };
  expect(getVipProgressState(telegramMonthly, now)?.active).toBe(true);
  const telegramLifetime = { ...telegramMonthly, vip_plan: 'promo_lifetime', vip_until: '0' };
  expect(getVipProgressState(telegramLifetime, now)?.active).toBe(true);
  // Срок вышел — Plus честно заканчивается.
  expect(getVipProgressState({ ...telegramMonthly, vip_until: String(now - 1) }, now)?.active).toBe(false);
});

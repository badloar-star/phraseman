// Замок (Ревизор по 5781370d8, 29.10): без аккаунта (гость до входа, онбординг) отметки облака нет — хук отдаёт undefined
// («не передано»), окно покупки решает как до отметки: обычный контекст сразу, без ожидания облака и без варианта «Не видим твой Plus».
// Лог ранней ветки говорит ровно это.
import { renderHook } from '@testing-library/react-native';

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ stableId: null, generation: 1 }),
}));
jest.mock('../app/premium_guard', () => ({
  forcePremiumAccessCloudRestore: jest.fn(async () => true),
  getVerifiedPremiumAccessStatus: jest.fn(async () => false),
  invalidatePremiumCache: jest.fn(),
}));

import { resolvePremiumModalEntry } from '../app/paywall_entry_contract';
import { PAYWALL_ENTRY_WAIT_CEILING_MS } from '../app/load_gate_config';
import { paywallEntryWaitCeilingMs, usePlusCloudConfirmedOnDevice } from '../app/plus_cloud_unconfirmed_entry';

let log: jest.SpyInstance;
beforeEach(() => {
  log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('без аккаунта хук отдаёт undefined — и до, и после потолка ожидания', async () => {
  const before = await renderHook(() => usePlusCloudConfirmedOnDevice('false:false', false));
  expect(before.result.current).toBeUndefined();
  const after = await renderHook(() => usePlusCloudConfirmedOnDevice('true:false', true));
  expect(after.result.current).toBeUndefined();
  expect(log.mock.calls.some((c) => String(c[0]).includes('аккаунта нет — отметка не передаётся (undefined), окно сразу и обычное'))).toBe(true);
});

test('без аккаунта: обычное окно сразу (доступ ещё проверяется, снимок «free»), потолок — обычный', () => {
  const res = resolvePremiumModalEntry({
    params: { context: 'course_after_lesson3', source: 'lesson_menu' },
    impressionId: 'imp_guest_1',
    accessResolved: false,
    hasPremiumAccess: false,
    cachedEntitlement: 'free',
    cloudConfirmedOnDevice: undefined,
  });
  expect(res.decision).toBe('show');
  if (res.decision === 'show') expect(res.entry.context).toBe('course_after_lesson3');
  expect(paywallEntryWaitCeilingMs(undefined, 'free')).toBe(PAYWALL_ENTRY_WAIT_CEILING_MS);
});

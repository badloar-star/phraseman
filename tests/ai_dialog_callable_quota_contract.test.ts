import { parsePremiumDialogResponse } from '../app/ai_dialog_client';

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));
jest.mock('../app/ai_kill_switch_copy', () => ({
  aiOffline: jest.fn(() => false),
  AiOfflineError: class AiOfflineError extends Error {},
  AI_GLOBAL_BUDGET_ERROR_CODE: 'explain_global_budget',
}));
jest.mock('../app/ai_callable_resilience', () => ({
  warmAiFunction: jest.fn(),
  withAiCallableRetry: jest.fn(),
  isDefinitelyNotStarted: jest.fn(),
  aiAttemptTimeoutMs: jest.fn(),
}));
jest.mock('../app/explain_callable_timeout', () => ({
  withExplainCallableTimeout: jest.fn(),
  EXPLAIN_CALLABLE_TIMEOUT_MS: 35_000,
}));

const valid = Object.freeze({
  ok: true,
  assistantMessage: 'Hola',
  remainingQuota: 4,
  // зачем (D111): лимит Free в Диалогах месячный — сервер шлёт границу календарного месяца UTC
  // (1-е число, 00:00:00.000); суточная граница (21 сентября) парсером отвергается.
  resetAtMs: Date.UTC(2026, 9, 1),
  quotaVersion: 9,
  model: 'dialog-model',
});

test('ordinary callable response accepts only the strict shared quota observation', () => {
  expect(parsePremiumDialogResponse(valid)).toEqual(valid);
});

test.each([
  { remainingQuota: '4' },
  { remainingQuota: null },
  { remainingQuota: [] },
  { resetAtMs: String(valid.resetAtMs) },
  { resetAtMs: null },
  { resetAtMs: [valid.resetAtMs] },
  { resetAtMs: Date.UTC(2026, 8, 21) },
  { quotaVersion: '9' },
  { quotaVersion: null },
  { quotaVersion: [9] },
])('ordinary callable rejects a non-numeric quota mutation %#', (mutation) => {
  expect(parsePremiumDialogResponse({ ...valid, ...mutation })).toBeNull();
});

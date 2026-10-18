// зачем (координатор 18.10): дневной потолок ИИ (daily_spend_cap) и дневные окна uid/IP сервера показываются спокойным
// «на сегодня всё» без повтора; часовые окна и короткий «занято» остаются прежними «подожди / попробуй ещё раз».
/* eslint-disable import/first */
const mockCallableRun = jest.fn();
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({ name: 'app' })) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: jest.fn(() => mockCallableRun),
}));

import { AI_DAILY_WINDOW_SCOPES, isAiDailyCapError } from '../app/ai_daily_cap_signal';
import { classifyPremiumDialogError } from '../app/ai_dialog_client';
import { classifyDialogueV2TurnFailure } from '../app/dialogue_v2_turn_coaching_client';
import { DialogueV2FreeformUnavailableError, sendDialogueV2FreeformTurn } from '../app/dialogue_v2_freeform_client';

const spendCap = { code: 'functions/resource-exhausted', message: 'daily_spend_cap' };
const dailyIp = { code: 'functions/resource-exhausted', message: 'dlg_free_ip_rate_limited' };
const hourly = { code: 'functions/resource-exhausted', message: 'ff_turn_rate_limited' };
const busy = { code: 'functions/unavailable', message: 'rate_window_busy' };

beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

test('распознаватель: потолок расходов и дневные окна — да; часовое окно и «занято» — нет', () => {
  expect(isAiDailyCapError(spendCap)).toBe(true);
  for (const scope of AI_DAILY_WINDOW_SCOPES) expect(isAiDailyCapError({ message: `${scope}_rate_limited` })).toBe(true);
  expect(isAiDailyCapError(hourly)).toBe(false);
  expect(isAiDailyCapError(busy)).toBe(false);
  expect(isAiDailyCapError(new Error('network request failed'))).toBe(false);
  expect(isAiDailyCapError(null)).toBe(false);
});

test('Диалоги V1: дневной потолок — спокойное «продолжим завтра» (premium_limit), часовое окно — прежнее «подожди»', () => {
  expect(classifyPremiumDialogError(spendCap)).toBe('premium_limit');
  expect(classifyPremiumDialogError(dailyIp)).toBe('premium_limit');
  expect(classifyPremiumDialogError(hourly)).toBe('rate_limited');
  expect(classifyPremiumDialogError(busy)).toBe('provider_unavailable');
});

test('Диалоги V2: дневной потолок закрывает ввод без повтора (plus_daily_cap), часовое окно — rate_limited', () => {
  expect(classifyDialogueV2TurnFailure(spendCap)).toBe('plus_daily_cap');
  expect(classifyDialogueV2TurnFailure(dailyIp)).toBe('plus_daily_cap');
  expect(classifyDialogueV2TurnFailure(hourly)).toBe('rate_limited');
});

test('свободный разговор: отказ по дневному потолку несёт причину daily_cap, прочие сбои — unavailable', async () => {
  const turn = (suffix: string) => sendDialogueV2FreeformTurn({
    sessionId: `d2fs_${'a'.repeat(32)}`, turnId: `d2ft_${suffix.repeat(16)}`, studyTarget: 'de', userMessage: 'Guten Tag!',
  });
  mockCallableRun.mockRejectedValueOnce(spendCap);
  await expect(turn('b')).rejects.toMatchObject({ name: 'DialogueV2FreeformUnavailableError', reason: 'daily_cap' });
  mockCallableRun.mockRejectedValueOnce(busy);
  await expect(turn('c')).rejects.toEqual(new DialogueV2FreeformUnavailableError());
});

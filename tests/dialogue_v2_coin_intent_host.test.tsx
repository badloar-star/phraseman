// R50 (координатор 26.10): «один хозяин начисления» монет за диалог за флагом dialogue_coin_intent_host_enabled (ВЫКЛ).
// Сторожим четыре обещания: (1) экран и хост — один id операции; (2) уход до чтения копилки — монеты придут после
// перезапуска; (3) при ВКЛ начисляет только хост, не экран; (4) при ВЫКЛ путь прежний и хост не грузится.
import React from 'react';
import { act, render, renderHook } from '@testing-library/react-native';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
    removeItem: jest.fn(async (k: string) => { mockStore.delete(k); }),
  },
}));
jest.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove: () => undefined }) } }));
let mockFlag = false;
jest.mock('../app/remote_flags', () => ({ getRemoteBool: () => mockFlag }));
jest.mock('../app/stable_id', () => ({ getStableId: async () => 'owner-1' }));
jest.mock('../app/dev_dialog_state', () => ({ isDevDialogCoinsAward: () => false }));

type RunesInput = Readonly<{ activity: string; sessionKey: string; completionOrdinal: number; repeatPriceOnly: boolean; enabled: boolean }>;
const mockInputs: RunesInput[] = [];
const mockCredits: string[] = [];
let mockHydrating = false;
jest.mock('../hooks/usePracticeRunes', () => ({
  usePracticeRunes: (input: RunesInput) => {
    mockInputs.push(input);
    return {
      hydrating: input.enabled ? mockHydrating : false,
      onCorrectAnswer: (itemId: string) => { mockCredits.push(`${input.sessionKey}|${itemId}`); return 1; },
      settle: async () => undefined,
    };
  },
}));

/* eslint-disable import/first */
import { useDialogueV2CoinReward } from '../hooks/useDialogueV2CoinReward';
import DialogueV2CoinIntentHost from '../components/dialogue_coin/DialogueV2CoinIntentHost';
import DialogueV2CoinIntentGate from '../components/dialogue_coin/DialogueV2CoinIntentGate';
import { dialogueV2CoinAwardedKey } from '../app/dialogue_v2_coin_reward';
import { dialogueV2CoinIntentsKey, readDialogueV2CoinIntents } from '../app/dialogue_v2_coin_intents';

const flush = async (): Promise<void> => { for (let i = 0; i < 8; i += 1) await act(async () => { await Promise.resolve(); }); };
const SESSION = 'sess-abc';

beforeEach(() => {
  mockStore.clear();
  mockInputs.length = 0;
  mockCredits.length = 0;
  mockHydrating = false;
  mockFlag = false;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

it('(4) флаг ВЫКЛ: экран начисляет сам, как раньше (30 монет без ошибок), хост не грузится', async () => {
  const { result } = await renderHook(() => useDialogueV2CoinReward({ sessionId: SESSION, ready: true, endedBy: 'bot', mistakes: 0 }));
  await flush();
  expect(result.current).toEqual({ coins: 30, status: 'awarded' });
  expect(mockCredits).toHaveLength(30);
  expect(mockStore.has(dialogueV2CoinAwardedKey('owner-1', SESSION))).toBe(true);
  expect(mockStore.has(dialogueV2CoinIntentsKey('owner-1'))).toBe(false);
  // даже с намерением на диске сторож при ВЫКЛ ничего не делает: копилка не читается, начислений нет
  mockStore.set(dialogueV2CoinIntentsKey('owner-1'), JSON.stringify([{ sessionId: 'other', amount: 10, endedBy: 'manual', mistakes: 0, atMs: 1 }]));
  const inputsBefore = mockInputs.length;
  const gate = await render(<DialogueV2CoinIntentGate />);
  await flush();
  expect(gate.toJSON()).toBeNull();
  expect(mockInputs.length).toBe(inputsBefore);
  expect(mockCredits).toHaveLength(30);
});

it('(3) флаг ВКЛ: экран не начисляет и не читает копилку, а пишет намерение и сразу показывает сумму', async () => {
  mockFlag = true;
  const { result } = await renderHook(() => useDialogueV2CoinReward({ sessionId: SESSION, ready: true, endedBy: 'bot', mistakes: 2 }));
  await flush();
  expect(result.current).toEqual({ coins: 25, status: 'awarded' });
  expect(mockCredits).toHaveLength(0);
  expect(mockInputs.every((input) => input.enabled === false)).toBe(true);
  expect(mockStore.has(dialogueV2CoinAwardedKey('owner-1', SESSION))).toBe(false);
  expect(await readDialogueV2CoinIntents('owner-1')).toEqual([expect.objectContaining({ sessionId: SESSION, amount: 25 })]);
});

it('(2) ушёл с итога, пока копилка грузилась → после «перезапуска» хост начисляет, повтор не начисляет', async () => {
  mockFlag = true;
  mockHydrating = true;
  const screen = await renderHook(() => useDialogueV2CoinReward({ sessionId: SESSION, ready: true, endedBy: 'manual', mistakes: 0 }));
  await flush();
  await screen.unmount(); // человек ушёл; экран ничего не начислил
  expect(mockCredits).toHaveLength(0);

  mockHydrating = false; // «перезапуск»: копилка прочиталась у хоста
  const host = await render(<DialogueV2CoinIntentHost />);
  await flush();
  expect(mockCredits).toHaveLength(10);
  expect(mockStore.has(dialogueV2CoinAwardedKey('owner-1', SESSION))).toBe(true);
  expect(await readDialogueV2CoinIntents('owner-1')).toEqual([]);
  await host.unmount();

  // возврат на итог той же сессии: отметка «начислено» есть — ни нового намерения, ни начисления
  const again = await renderHook(() => useDialogueV2CoinReward({ sessionId: SESSION, ready: true, endedBy: 'manual', mistakes: 0 }));
  await flush();
  expect(again.result.current).toEqual({ coins: 0, status: 'already' });
  expect(await readDialogueV2CoinIntents('owner-1')).toEqual([]);
  expect(mockCredits).toHaveLength(10);
});

it('(1) экран и хост — один вход копилки и одни id элементов → один id операции на сервере', async () => {
  await renderHook(() => useDialogueV2CoinReward({ sessionId: SESSION, ready: true, endedBy: 'manual', mistakes: 0 }));
  await flush();
  const screenInput = mockInputs.find((input) => input.enabled)!;
  const screenItems = [...mockCredits];

  mockStore.clear();
  mockInputs.length = 0;
  mockCredits.length = 0;
  mockStore.set(dialogueV2CoinIntentsKey('owner-1'), JSON.stringify([{ sessionId: SESSION, amount: 10, endedBy: 'manual', mistakes: 0, atMs: 1 }]));
  await render(<DialogueV2CoinIntentHost />);
  await flush();
  const hostInput = mockInputs.find((input) => input.enabled)!;
  const pick = (input: RunesInput) => ({ activity: input.activity, sessionKey: input.sessionKey, completionOrdinal: input.completionOrdinal, repeatPriceOnly: input.repeatPriceOnly });
  expect(pick(hostInput)).toEqual(pick(screenInput));
  expect(mockCredits).toEqual(screenItems);
});

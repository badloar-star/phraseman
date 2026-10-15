// D194 (владелец 15.10): Free — 3 голосовые попытки в день, ОДИН счётчик с Диалогами D165, локально; Plus — без лимита.
jest.mock('../components/PremiumContext', () => ({ usePremium: () => ({ accessResolved: true, hasPremiumAccess: false }) }));
jest.mock('../app/dev_dialog_state', () => ({ isDevDialogVoiceSpent: () => false }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DIALOG_VOICE_ATTEMPTS_KEY,
  hydrateDialogVoiceAttempts,
  isDialogVoiceAttemptsHydrated,
  recordDialogVoiceAttempt,
  resetDialogVoiceAttemptsForTests,
} from '../app/dialogue_v2_voice_daily_limit';
import {
  VOICE_ALLOWANCE_SURFACES,
  VOICE_LIMIT_PAYWALL_CONTEXT,
  setDevVoiceRemaining,
  recordVoiceDailyAttempt,
  resetVoiceDailyAllowanceForTests,
  voiceDailyAllowanceFrom,
  voiceDailyAllowanceGate,
} from '../app/voice_daily_allowance';
import { getLocalDayKey } from '../app/local_date';

const FREE = { accessResolved: true, hasPremiumAccess: false } as const;
const PLUS = { accessResolved: true, hasPremiumAccess: true } as const;

describe('голос на сегодня (D165 + D194)', () => {
  let logs: string[];
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetDialogVoiceAttemptsForTests();
    resetVoiceDailyAllowanceForTests();
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
    jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
  });
  afterEach(() => jest.restoreAllMocks());

  it('что рисует микрофон: Plus без цифры, неизвестно — без цифры, Free — остаток, 0 — исчерпан', () => {
    expect(voiceDailyAllowanceFrom({ ...PLUS, count: 9, hydrated: true })).toMatchObject({ kind: 'plus', remaining: null, exhausted: false });
    expect(voiceDailyAllowanceFrom({ accessResolved: false, hasPremiumAccess: false, count: 0, hydrated: true })).toMatchObject({ kind: 'unknown', remaining: null });
    expect(voiceDailyAllowanceFrom({ ...FREE, count: 0, hydrated: false })).toMatchObject({ kind: 'unknown', remaining: null });
    expect(voiceDailyAllowanceFrom({ ...FREE, count: 1, hydrated: true })).toMatchObject({ kind: 'limited', remaining: 2, exhausted: false });
    expect(voiceDailyAllowanceFrom({ ...FREE, count: 3, hydrated: true })).toMatchObject({ kind: 'limited', remaining: 0, exhausted: true });
    expect(VOICE_LIMIT_PAYWALL_CONTEXT).toBe('ai_voice_input');
  });

  it('один счётчик с Диалогами: 2 попытки в Диалогах + 1 в курсе = лимит, четвёртая не стартует', async () => {
    await hydrateDialogVoiceAttempts();
    recordDialogVoiceAttempt();
    recordDialogVoiceAttempt();
    expect(voiceDailyAllowanceGate('course_v2', FREE)).toBe(true);
    expect(recordVoiceDailyAttempt('course_v2', 's01:p3:1', FREE)).toBe(3);
    expect(voiceDailyAllowanceGate('course_v2', FREE)).toBe(false);
    expect(voiceDailyAllowanceGate('dialogs', FREE)).toBe(false);
    expect(voiceDailyAllowanceGate('course_v2', PLUS)).toBe(true);
    const stored = JSON.parse(String(await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY))) as { count: number };
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(JSON.parse(String(await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY))).count).toBeGreaterThanOrEqual(stored.count);
    expect(logs.some((l) => l.includes('[VOICE-LIMIT] gate') && l.includes('"allowed":false') && l.includes('"count":3'))).toBe(true);
  });

  it('одна запись — одно списание (повтор ключа), Plus не списывает', async () => {
    await hydrateDialogVoiceAttempts();
    expect(recordVoiceDailyAttempt('course_v2', 'k1', FREE)).toBe(1);
    expect(recordVoiceDailyAttempt('course_v2', 'k1', FREE)).toBe(1);
    expect(recordVoiceDailyAttempt('course_v2', 'k2', PLUS)).toBe(1);
    expect(logs.some((l) => l.includes('reason":"same_attempt_key'))).toBe(true);
  });

  it('dev lv2voice: остаток подменяется для гейта (0 — блок, 3 — можно), off — снять', async () => {
    await hydrateDialogVoiceAttempts();
    const g = globalThis as { __DEV__?: boolean };
    expect(setDevVoiceRemaining(0)).toBe(false); // вне dev подмена не включается
    g.__DEV__ = true;
    try {
      expect(setDevVoiceRemaining(0)).toBe(true);
      expect(voiceDailyAllowanceGate('course_v2', FREE)).toBe(false);
      setDevVoiceRemaining(3);
      expect(voiceDailyAllowanceGate('course_v2', FREE)).toBe(true);
      setDevVoiceRemaining(null);
      expect(voiceDailyAllowanceGate('course_v2', FREE)).toBe(true);
    } finally {
      delete g.__DEV__;
    }
  });

  it('D196: один счётчик на все микрофоны — Уроки + Ошибки + ИИ-диалог = лимит, дальше закрыто везде, исключений нет', async () => {
    await hydrateDialogVoiceAttempts();
    expect(VOICE_ALLOWANCE_SURFACES).toEqual(['course_v2', 'dialogs', 'dialog_call', 'ai_dialog', 'lessons', 'mistakes', 'cards', 'cards_speaking']);
    expect(recordVoiceDailyAttempt('lessons', 'lesson1:p4:1', FREE)).toBe(1);
    expect(recordVoiceDailyAttempt('mistakes', 'mistakes:q2:1', FREE)).toBe(2);
    expect(recordVoiceDailyAttempt('ai_dialog', 'ai:t3:1', FREE)).toBe(3);
    for (const surface of VOICE_ALLOWANCE_SURFACES) expect([surface, voiceDailyAllowanceGate(surface, FREE)]).toEqual([surface, false]);
    for (const surface of VOICE_ALLOWANCE_SURFACES) expect([surface, voiceDailyAllowanceGate(surface, PLUS)]).toEqual([surface, true]);
  });

  it('попытка до чтения диска складывается с диском: 2 на диске + 1 до гидрации = 3 → закрыто (аудит 15.10)', async () => {
    await AsyncStorage.setItem(DIALOG_VOICE_ATTEMPTS_KEY, JSON.stringify({ day: getLocalDayKey(new Date()), count: 2 }));
    expect(recordVoiceDailyAttempt('lessons', 'early:1', FREE)).toBe(1);
    // до гидрации на диск не пишем — сохранённые 2 не затёрты
    expect(JSON.parse(String(await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY))).count).toBe(2);
    expect(await hydrateDialogVoiceAttempts()).toBe(3);
    expect(voiceDailyAllowanceGate('course_v2', FREE)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(JSON.parse(String(await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY))).count).toBe(3);
    expect(logs.some((l) => l.includes('deferred_until_hydrate'))).toBe(true);
  });

  it('вчерашние попытки не считаются (местные сутки), до чтения диска — «не знаем»', async () => {
    const yesterday = getLocalDayKey(new Date(Date.now() - 26 * 60 * 60_000));
    await AsyncStorage.setItem(DIALOG_VOICE_ATTEMPTS_KEY, JSON.stringify({ day: yesterday, count: 3 }));
    expect(isDialogVoiceAttemptsHydrated()).toBe(false);
    expect(await hydrateDialogVoiceAttempts()).toBe(0);
    expect(isDialogVoiceAttemptsHydrated()).toBe(true);
    expect(voiceDailyAllowanceGate('course_v2', FREE)).toBe(true);
  });
});

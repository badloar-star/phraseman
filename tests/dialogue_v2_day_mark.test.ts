// зачем (координатор 22.10, «Сцена» Диалогов: состояние day_done «Сегодня разговор засчитан» и голосовой лимит): сторож локальной отметки «сегодня диалог засчитан» —
// мгновенность, перезапуск, новый день, разделение аккаунтов, чужие/битые данные, ключ в списке аккаунта (стирание и перенос), точка записи в сессии и подстановка лимита голоса.
import fs from 'node:fs';
import path from 'node:path';

const disk: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in disk ? disk[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { disk[k] = v; }),
    removeItem: jest.fn(async (k: string) => { delete disk[k]; }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => { delete disk[k]; }); }),
    getAllKeys: jest.fn(async () => Object.keys(disk)),
  },
}));
let token: { phase: string; generation: number; stableId: string | null } = { phase: 'active', generation: 1, stableId: 'uid-a' };
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => token }));

import {
  DIALOGUE_V2_DAY_MARK_PREFIX, getDialogueV2DoneTodayVersion, hydrateDialogueV2DoneToday, markDialogueV2DoneToday, peekDialogueV2DoneToday,
  resetDialogueV2DayMarkForTests, subscribeDialogueV2DoneToday,
} from '../app/dialogue_v2_day_mark';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const flush = async (): Promise<void> => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); };

const NOON = new Date(2026, 9, 22, 12, 0, 0).getTime();
const NEXT_DAY = new Date(2026, 9, 23, 9, 0, 0).getTime();

beforeEach(() => {
  for (const k of Object.keys(disk)) delete disk[k];
  token = { phase: 'active', generation: 1, stableId: 'uid-a' };
  resetDialogueV2DayMarkForTests();
});

describe('Отметка «сегодня диалог засчитан»', () => {
  it('до чтения диска состояние неизвестно (null), после чтения без записи — «нет» (false)', async () => {
    expect(peekDialogueV2DoneToday(NOON)).toBeNull();
    expect(await hydrateDialogueV2DoneToday()).toBe(false);
    expect(peekDialogueV2DoneToday(NOON)).toBe(false);
  });

  it('отметка мгновенная: память и версия меняются в тот же вызов, подписчик разбужен, диск догоняет фоном, повтор безвреден', async () => {
    const seen: number[] = [];
    const unsubscribe = subscribeDialogueV2DoneToday(() => seen.push(getDialogueV2DoneTodayVersion()));
    expect(markDialogueV2DoneToday(NOON)).toBe(true);
    expect(peekDialogueV2DoneToday(NOON)).toBe(true); // до записи на диск
    expect(seen).toEqual([1]);
    expect(markDialogueV2DoneToday(NOON)).toBe(true);
    expect(seen).toEqual([1]);
    await flush();
    const keys = Object.keys(disk);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe(`${DIALOGUE_V2_DAY_MARK_PREFIX}generation:1:uid:uid-a`);
    expect(disk[keys[0]!]).toBe('2026-10-22'); // только дата: ни id сценария, ни реплик
    unsubscribe();
  });

  it('после перезапуска отметка читается с диска; назавтра она уже не «сегодня»', async () => {
    markDialogueV2DoneToday(NOON);
    await flush();
    resetDialogueV2DayMarkForTests(); // «перезапуск»: память пуста, диск остался
    expect(peekDialogueV2DoneToday(NOON)).toBeNull();
    await hydrateDialogueV2DoneToday(); // возврат считается по настоящим часам теста — проверяем через фиксированные NOON / NEXT_DAY ниже
    expect(peekDialogueV2DoneToday(NOON)).toBe(true);
    expect(peekDialogueV2DoneToday(NEXT_DAY)).toBe(false);
  });

  it('отметка ДО чтения диска не затирается старой записью с диска', async () => {
    disk[`${DIALOGUE_V2_DAY_MARK_PREFIX}generation:1:uid:uid-a`] = '2026-10-01';
    markDialogueV2DoneToday(NOON);
    await flush();
    await hydrateDialogueV2DoneToday();
    expect(peekDialogueV2DoneToday(NOON)).toBe(true);
    expect(disk[`${DIALOGUE_V2_DAY_MARK_PREFIX}generation:1:uid:uid-a`]).toBe('2026-10-22');
  });

  it('битая запись на диске игнорируется: «нет», а не падение', async () => {
    disk[`${DIALOGUE_V2_DAY_MARK_PREFIX}generation:1:uid:uid-a`] = '{"x":1}';
    expect(await hydrateDialogueV2DoneToday()).toBe(false);
    expect(peekDialogueV2DoneToday(NOON)).toBe(false);
  });

  it('аккаунты разделены; переходное состояние аккаунта отметку не принимает и ничего не решает', async () => {
    markDialogueV2DoneToday(NOON);
    await flush();
    token = { phase: 'active', generation: 2, stableId: 'uid-b' };
    expect(peekDialogueV2DoneToday(NOON)).toBeNull(); // другой аккаунт отметку не прочтёт, пока не прочитал свой диск
    expect(await hydrateDialogueV2DoneToday()).toBe(false);
    token = { phase: 'transition', generation: 3, stableId: null };
    expect(markDialogueV2DoneToday(NOON)).toBe(false);
    expect(peekDialogueV2DoneToday(NOON)).toBeNull();
    expect(await hydrateDialogueV2DoneToday()).toBeNull();
  });
});

describe('Отметка: контракт подключения', () => {
  it('ключ в ACCOUNT_LOCAL_KEY_PREFIXES — стирается и переносится вместе с аккаунтом; модуль не делает свой multiRemove', () => {
    const cloudSync = read('app/cloud_sync.ts');
    const list = cloudSync.slice(cloudSync.indexOf('const ACCOUNT_LOCAL_KEY_PREFIXES = ['), cloudSync.indexOf('] as const;', cloudSync.indexOf('const ACCOUNT_LOCAL_KEY_PREFIXES = [')));
    expect(list).toContain(`'${DIALOGUE_V2_DAY_MARK_PREFIX}'`);
    // комментарии модуля называют эти слова («сеть и Firestore не участвуют») — проверяем только код
    const mod = read('app/dialogue_v2_day_mark.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(mod).not.toMatch(/multiRemove|removeItem|getAllKeys/);
    expect(mod).not.toMatch(/firestore|httpsCallable|fetch\(/i);
  });
  it('сессия пишет отметку рядом с «пройдено ✓» — при том же условии засчёта', () => {
    const session = read('app/dialogue_v2_session.tsx');
    expect(session).toMatch(/markDialogueV2Done\(studyTarget, scenarioId\);\n[^\n]*\n\s*markDialogueV2DoneToday\(\);/);
    expect(session).toMatch(/if \(endedBy === 'bot' && learnerTurns > 0 && supportedTarget\(studyTarget\)\) \{/);
  });
  it('сцена берёт dayDone из отметки, голосовой лимит — только у Free с известным доступом', () => {
    const hook = read('components/dialogs/scene/use_dialogs_scene_hub.ts');
    expect(hook).toMatch(/dayDone: peekDialogueV2DoneToday\(\)/);
    expect(hook).toMatch(/hydrateDialogueV2DoneToday\(\)/);
    expect(hook).toMatch(/voice\.kind === 'limited' \? FREE_DIALOG_VOICE_DAILY_LIMIT : null/);
    expect(read('components/dialogs/scene/DialogsSceneHub.tsx')).toMatch(/voicePerDay=\{hub\.voicePerDay\}/);
  });
});

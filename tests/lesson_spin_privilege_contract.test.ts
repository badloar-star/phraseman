// ════════════════════════════════════════════════════════════════════════════
// Сторож решения владельца 2026-09-17 → ПЕРЕПИСАН под PM-047 (2026-09-24):
// «спин это привилегия» отменено вместе со всей механикой спина (D09, R046/
// R047). grantLocalStudySpinWithChance (20%-бросок, счётчик невезения,
// страховка на 9-м уроке) удалена из app/local_level_spins.ts целиком —
// grantLocalLessonCompletionSpin/grantLocalCourseSessionCompletionSpin теперь
// БЕЗУСЛОВНО возвращают false и ничего не пишут в хранилище (см. app/
// local_level_spins.ts, комментарий у grantLocalLevelSpins).
//
// Что ЭТОТ файл сторожит теперь:
//  1. выдача спина за урок/сессию курса прекращена насовсем — не «редко»,
//     а НИКОГДА, при любом броске Math.random и любом числе повторов;
//  2. хранилище уже выданных (раньше) спинов не трогается выдачей — ключ
//     lessonSpinMisses и любое прежнее состояние остаются как есть;
//  3. словарь и неправильные глаголы по-прежнему НЕ выдают спин (это
//     свойство не связано с PM-047 и остаётся в силе).
//
// Сработал — проверить, не вернулась ли механика спина, а не чинить тест
// под старое поведение.
// ════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  grantLocalCourseSessionCompletionSpin,
  grantLocalLessonCompletionSpin,
  LOCAL_LEVEL_SPIN_STATE_KEY,
} from '../app/local_level_spins';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async () => 'a'.repeat(64)),
  randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111'),
}));

const storage: Record<string, string> = {};
const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:account-a`;

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('спин за урок/сессию курса больше не выдаётся (PM-047)', () => {
  it('ни удачный, ни неудачный бросок ничего не выдают — механики нет', async () => {
    const token = captureAccountGeneration();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await expect(grantLocalLessonCompletionSpin(1, 'en', token)).resolves.toBe(false);
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    await expect(grantLocalLessonCompletionSpin(2, 'en', token)).resolves.toBe(false);
    // Отключённая выдача не пишет состояние вовсе.
    expect(storage[stateKey]).toBeUndefined();
  });

  it('повторные завершения одного и того же урока остаются false, без побочных эффектов', async () => {
    const token = captureAccountGeneration();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await expect(grantLocalLessonCompletionSpin(7, 'en', token)).resolves.toBe(false);
    await expect(grantLocalLessonCompletionSpin(7, 'en', token)).resolves.toBe(false);
    expect(storage[stateKey]).toBeUndefined();
  });

  it('много завершённых уроков подряд — страховки/счётчика невезения больше нет, всегда false', async () => {
    const token = captureAccountGeneration();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    for (let lesson = 1; lesson <= 9; lesson += 1) {
      await expect(grantLocalLessonCompletionSpin(lesson, 'en', token)).resolves.toBe(false);
    }
    expect(storage[stateKey]).toBeUndefined();
  });

  it('сессия курса Learning V2 тоже ничего не выдаёт', async () => {
    const token = captureAccountGeneration();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await expect(grantLocalCourseSessionCompletionSpin('s01', 'en', token)).resolves.toBe(false);
    expect(storage[stateKey]).toBeUndefined();
  });

  it('прежнее состояние на диске (спины, выданные до отключения механики) не трогается выдачей', async () => {
    storage[stateKey] = JSON.stringify({
      owner: 'account-a',
      credits: [{ id: 'local_spin_lesson_en-1', level: 1 }],
      issuedLevels: [],
      issuedCreditIds: ['local_spin_lesson_en-1'],
      lessonSpinMisses: 3,
      activeReceipt: null,
      closedRequestIds: [],
    });
    const before = storage[stateKey];
    const token = captureAccountGeneration();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await expect(grantLocalLessonCompletionSpin(2, 'en', token)).resolves.toBe(false);
    // Уже выданный (раньше) кредит и счётчик остаются как есть — грант не пишет.
    expect(storage[stateKey]).toBe(before);
  });
});

describe('спин не выдаётся из словаря и неправильных глаголов (не связано с PM-047)', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const readSource = (relative: string) =>
    fs.readFileSync(path.join(repoRoot, relative), 'utf8');

  it.each([
    'app/lesson_words.tsx',
    'app/lesson_irregular_verbs.tsx',
  ])('%s не выдаёт спин', (relative) => {
    const source = readSource(relative);
    expect(source).not.toMatch(/grantLocal\w*CompletionSpin/);
    expect(source).not.toMatch(/grantLocalDailyJourneySpins|grantLocalDevSpin/);
  });
});

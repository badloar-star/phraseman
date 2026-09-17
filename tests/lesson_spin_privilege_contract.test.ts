// ════════════════════════════════════════════════════════════════════════════
// Сторож решения владельца 2026-09-17: «спин это привилегия».
//
// Сторожит ДВА свойства, каждое из которых уже терялось бы молча:
//  1. спин за урок НЕ гарантирован (шанс 20%) — регрессия «вернули 100%»
//     выглядит как щедрость и не падает ни в одном обычном тесте;
//  2. спин даёт ТОЛЬКО полный урок и сессия курса. Словарь и неправильные
//     глаголы его не выдают — и не должны начать выдавать «заодно».
//
// Сработал — возвращать правило, а не удалять проверку.
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

const readState = () =>
  JSON.parse(storage[stateKey]!) as {
    credits: { id: string }[];
    issuedCreditIds: string[];
    lessonSpinMisses: number;
  };

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

describe('спин за урок не гарантирован', () => {
  it('неудачный бросок не выдаёт кредит', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    await expect(grantLocalLessonCompletionSpin(1, 'en', captureAccountGeneration()))
      .resolves.toBe(false);
    expect(readState().credits).toHaveLength(0);
  });

  it('удачный бросок выдаёт ровно один кредит', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await expect(grantLocalLessonCompletionSpin(1, 'en', captureAccountGeneration()))
      .resolves.toBe(true);
    expect(readState().credits).toHaveLength(1);
  });

  it('КРИТИЧНО: неудача расходует попытку — перепройти урок ради приза нельзя', async () => {
    const token = captureAccountGeneration();
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.99);
    await expect(grantLocalLessonCompletionSpin(7, 'en', token)).resolves.toBe(false);
    // id обязан быть записан и при неудаче, иначе повтор даст новый бросок.
    expect(readState().issuedCreditIds).toContain('local_spin_lesson_en-7');

    random.mockReturnValue(0);
    await expect(grantLocalLessonCompletionSpin(7, 'en', token)).resolves.toBe(false);
    expect(readState().credits).toHaveLength(0);
  });

  it('счётчик невезения растёт и страховка выдаёт спин девятым уроком', async () => {
    const token = captureAccountGeneration();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    for (let lesson = 1; lesson <= 8; lesson += 1) {
      await expect(grantLocalLessonCompletionSpin(lesson, 'en', token)).resolves.toBe(false);
    }
    expect(readState().lessonSpinMisses).toBe(8);
    await expect(grantLocalLessonCompletionSpin(9, 'en', token)).resolves.toBe(true);
    expect(readState().lessonSpinMisses).toBe(0);
  });

  it('сессия курса Learning V2 держит ту же планку 20%', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    await expect(grantLocalCourseSessionCompletionSpin('s01', 'en', captureAccountGeneration()))
      .resolves.toBe(false);
    expect(readState().credits).toHaveLength(0);
  });

  it('состояние, записанное до правки (без счётчика), читается без миграции', async () => {
    storage[stateKey] = JSON.stringify({
      owner: 'account-a',
      credits: [],
      issuedLevels: [],
      issuedCreditIds: [],
      activeReceipt: null,
      closedRequestIds: [],
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await expect(grantLocalLessonCompletionSpin(1, 'en', captureAccountGeneration()))
      .resolves.toBe(true);
    expect(readState().lessonSpinMisses).toBe(0);
  });
});

describe('спин даёт только полный урок и сессия курса', () => {
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

  it('спин за учебную единицу выдаётся ровно из двух точек', () => {
    const source = readSource('app/local_level_spins.ts');
    const callers = source.match(/grantLocalStudySpinWithChance\(/g) ?? [];
    // 1 объявление + 2 вызова (урок и сессия курса).
    expect(callers).toHaveLength(3);
  });
});

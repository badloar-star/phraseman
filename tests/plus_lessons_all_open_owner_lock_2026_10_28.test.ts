// ЗАМОК ВЛАДЕЛЬЦА 28.10 ~21:05 (через координатора): «Plus открывает все 32». Подписка Plus (как в окне покупки «Все 32 урока курса») открывает ВСЕ 32
// классических урока сразу — без 2★ за предыдущий и без секций 1/9/19/29. Без Plus — ровно прежняя матрица (Free 1–3, жемчужины, legacy cap, 2★).
// Одно решение во всех местах: проекция списка, общая функция замка Plus (меню и охранник), «Продолжить» на Главной, охранник урока.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: string) => { store.set(key, value); },
      removeItem: async (key: string) => { store.delete(key); },
      multiGet: async (keys: string[]) => keys.map((key) => [key, store.get(key) ?? null]),
      multiSet: async (pairs: [string, string][]) => { for (const [k, v] of pairs) store.set(k, v); },
      clear: async () => { store.clear(); },
      getAllKeys: async () => [...store.keys()],
    },
  };
});
const mockRecord = jest.fn(async (_event: unknown) => undefined);
jest.mock('../app/support_diagnostics', () => ({ recordSupportDiagnostic: (event: unknown) => mockRecord(event) }));
jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(async () => true),
  isTesterNoLimitsActive: jest.fn(async () => false),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildPremiumLessonUnlocks, buildSequentialFreeLessonUnlocks } from '../app/monetization_policy';
import { isLessonUnlockedByPremiumCourse, resolveLastAvailableLessonId } from '../app/lesson_lock_system';
import { resolveLessonRuntimeGate } from '../app/lesson_premium_gate';
import { PLUS_OPENS_ALL_LESSONS, plusOpensLesson } from '../app/plus_lessons_rule';
import { legacyFreeLessonCapKey, lessonBestScoreKey } from '../app/target_storage_keys';
import { purchasedLessonsKey } from '../app/lessons_pearl_unlock_storage';
import { plusLessonsAction, resetPlusLessonsDiagnosticsForTests } from '../app/plus_lessons_diagnostics';
import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';
import * as premiumGuard from '../app/premium_guard';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const LESSONS = Array.from({ length: 32 }, (_v, i) => i + 1);

describe('ЗАМОК ВЛАДЕЛЬЦА 28.10: Plus открывает все 32 классических урока', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockRecord.mockClear();
    resetPlusLessonsDiagnosticsForTests(); // дедупликация записей журнала живёт в памяти процесса — между тестами сбрасываем
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    (premiumGuard.getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(true);
  });
  afterEach(() => logSpy.mockRestore());

  it('правило включено и покрывает ровно уроки 1–32', () => {
    expect(PLUS_OPENS_ALL_LESSONS).toBe(true);
    for (const id of LESSONS) expect(plusOpensLesson(id)).toBe(true);
    for (const id of [0, 33, -1, 1.5, Number.NaN]) expect(plusOpensLesson(id)).toBe(false);
  });

  it('список Plus: 32 из 32 открыты при пустом прогрессе; Free с пустым прогрессом — только первый урок', () => {
    const plus = buildPremiumLessonUnlocks({ scores: new Array(32).fill(0) });
    expect(plus).toHaveLength(32);
    expect(plus.every(Boolean)).toBe(true);
    const free = buildSequentialFreeLessonUnlocks({ scores: new Array(32).fill(0) });
    expect(free.filter(Boolean)).toHaveLength(1);
    expect(free[0]).toBe(true);
  });

  it('общая функция замка Plus (меню и охранник): все 32 открыты без прогресса', async () => {
    for (const id of LESSONS) expect(await isLessonUnlockedByPremiumCourse(id)).toBe(true);
  });

  it('охранник урока: у Plus все 32 — available; у Free прежняя матрица (урок 5 — пейвол, 2–3 — по прогрессу)', async () => {
    for (const id of LESSONS) expect(await resolveLessonRuntimeGate(id)).toBe('available');
    (premiumGuard.getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(false);
    expect(await resolveLessonRuntimeGate(1)).toBe('available');
    expect(await resolveLessonRuntimeGate(2)).toBe('progress_required');
    expect(await resolveLessonRuntimeGate(5)).toBe('premium_required');
    expect(await resolveLessonRuntimeGate(32)).toBe('premium_required');
  });

  it('«Продолжить» на Главной: у Plus запомненный урок остаётся (не откатывается к 1); у Free — прежнее', async () => {
    expect(await resolveLastAvailableLessonId(20, undefined, true)).toBe(20);
    expect(await resolveLastAvailableLessonId(32, undefined, true)).toBe(32);
    expect(await resolveLastAvailableLessonId(20, undefined, false)).toBe(1);
  });

  it('окончание Plus ничего не стирает: проверки Plus ничего не пишут на диск, прогресс на месте', async () => {
    await AsyncStorage.setItem('seed_progress', '42');
    const before = [...(await AsyncStorage.getAllKeys())].sort();
    for (const id of LESSONS) await isLessonUnlockedByPremiumCourse(id);
    for (const id of LESSONS) await resolveLessonRuntimeGate(id);
    await resolveLastAvailableLessonId(32, undefined, true);
    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual(before);
    expect(await AsyncStorage.getItem('seed_progress')).toBe('42');
  });

  // РЕШЕНИЕ ВЛАДЕЛЬЦА 29.10 («Как у бесплатных»): после окончания Plus — правило Free, прогресс и звёзды целы; «пройденные остаются открытыми» НЕ вводим.
  it('Plus снят: уроки 4+ снова закрыты правилом Free, 1–3 по прогрессу, прогресс и звёзды целы', async () => {
    for (let id = 1; id <= 12; id++) await AsyncStorage.setItem(lessonBestScoreKey(id), '4.5');
    const before = [...(await AsyncStorage.getAllKeys())].sort();
    const stars = await Promise.all([1, 5, 12].map((id) => AsyncStorage.getItem(lessonBestScoreKey(id))));
    for (let id = 1; id <= 32; id++) expect(await resolveLessonRuntimeGate(id)).toBe('available'); // Plus: все 32
    (premiumGuard.getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(false); // Plus закончился
    expect(await resolveLessonRuntimeGate(1)).toBe('available');
    expect(await resolveLessonRuntimeGate(2)).toBe('available'); // 2★ на первом есть — правило Free
    expect(await resolveLessonRuntimeGate(3)).toBe('available');
    for (const id of [4, 5, 9, 12, 20, 32]) expect(await resolveLessonRuntimeGate(id)).toBe('premium_required');
    expect(await resolveLastAvailableLessonId(12, undefined, false)).toBe(3);
    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual(before);
    expect(await Promise.all([1, 5, 12].map((id) => AsyncStorage.getItem(lessonBestScoreKey(id))))).toEqual(stars);
  });

  it('Plus снят: жемчужные покупки и legacy cap живут по правилам Free', async () => {
    await AsyncStorage.setItem(purchasedLessonsKey(), JSON.stringify([15]));
    await AsyncStorage.setItem(legacyFreeLessonCapKey(), '6');
    (premiumGuard.getVerifiedPremiumStatus as jest.Mock).mockResolvedValue(false);
    expect(await resolveLessonRuntimeGate(15)).toBe('available'); // куплен за жемчуг
    expect(await resolveLessonRuntimeGate(6)).toBe('available'); // до legacy cap 6
    expect(await resolveLessonRuntimeGate(7)).toBe('premium_required');
    expect(await resolveLessonRuntimeGate(16)).toBe('premium_required');
  });

  it('журнал [PLUS-LESSONS]: действие проходит белый список сервера и не длиннее 80 знаков; решение уходит в журнал обращений', async () => {
    for (const id of [2, 9, 32]) {
      for (const decision of ['available', 'premium_required', 'level_required', 'progress_required'] as const) {
        for (const branch of ['plus_all', 'plus_matrix', 'free_matrix', 'earned', 'tester', 'error'] as const) {
          for (const site of ['unlock', 'gate', 'continue'] as const) {
            const action = plusLessonsAction(site, decision, branch, id);
            expect(action.length).toBeLessThanOrEqual(80);
            expect(/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(action)).toBe(true);
            expect(/(?:^|[:._-])[A-Za-z0-9]{20,}(?:$|[:._-])/.test(action)).toBe(false);
            expect(sanitizeSupportDiagnosticEvent({ atMs: Date.now(), event: 'feature_action', action, screen: '/lessons' })?.action).toBe(action);
          }
        }
      }
    }
    await isLessonUnlockedByPremiumCourse(12);
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ event: 'feature_action', action: 'plus:lessons:unlock:available:plus_all:l12', screen: '/lessons' }));
    const server = read('functions/src/client_reports.ts');
    expect(server).toContain('/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(out)');
  });

  it('в коде: правило стоит во всех местах решения и откатывается одной строкой', () => {
    expect(read('app/monetization_policy.ts')).toContain('unlocked[i] = plusOpensLesson(lessonId)');
    expect(read('app/lesson_lock_system.ts')).toContain('if (plusOpensLesson(lessonId)) {');
    expect(read('app/lesson_lock_system.ts')).toContain('if (isPremium && plusOpensLesson(lessonId)) {');
    const gate = read('app/lesson_premium_gate.ts');
    expect(gate).toContain('isLessonUnlockedByPremiumCourse(lessonId, studyTarget)');
    expect(gate).toContain("decided(lessonId, 'progress_required', 'plus_matrix', true)");
    expect(read('app/plus_lessons_rule.ts')).toContain('export const PLUS_OPENS_ALL_LESSONS = true;');
    // правило не пишет на диск
    expect(read('app/plus_lessons_rule.ts')).not.toMatch(/AsyncStorage|storageSet|setItem/);
  });
});

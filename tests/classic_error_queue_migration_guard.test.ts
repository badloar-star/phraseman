/**
 * Сторож миграции очистки очереди повтора ошибок классических курсов (Ревизор, 05.11.2026).
 *
 * зачем (координатор 05.11; ЗАМОК ВЛАДЕЛЬЦА 04.11 «прогресс пользователей не пропадает»): Ядро чистит ТОЛЬКО очередь повтора
 * ошибок классики (errorReplayQueue/Since/Override по lessonSessionKey). Миграция не имеет права тронуть проценты
 * (best_score/pass_count/progress), достижения, счётчики, статистику, экзамены, «выученное» (слова), серию/опыт/звёзды.
 * Контракт: (1) очищает только очередь, (2) защищённые ключи побайтно те же, (3) идемпотентна (второй запуск ничего не меняет),
 * (4) не использует removeItem/multiRemove/clear (храповик progress_preservation_owner_lock: удаления ключей растут только по слову
 * владельца — очередь гасим setItem в пустое значение).
 *
 * Часть A (всегда включена): семейства ключей очереди и защищённых ключей не пересекаются — значит, чистка очереди не может задеть прогресс.
 * Часть B (включается, когда модуль миграции появился в одном из CANDIDATES): поведенческая проверка на «снимке профиля» + сторож исходника.
 * Пока модуля нет — B это it.todo (не зелёная подмена, а явная метка). Если Ядро назовёт файл иначе — добавить путь в CANDIDATES.
 */
import fs from 'fs';
import path from 'path';

import {
  achievementLessonPerfectPassesKey,
  achievementStateKey,
  comboAchievementCounterKey,
  dailyPhraseAchievementReadCountKey,
  irregularVerbsGlobalKey,
  lastOpenedLessonKey,
  lessonBestScoreKey,
  lessonBonusGrantedKey,
  lessonPassCountKey,
  lessonPerfectMilestoneKey,
  lessonProgressKey,
  lessonSessionKey,
  lessonWordsKey,
  levelExamKey,
  masteryFinishedOnceKey,
  posMasteryKey,
  shareAchievementCounterKey,
  statsDailyBreakdownKey,
  unlockedLessonsKey,
  userStatsKey,
} from '../app/target_storage_keys';

const ROOT = path.join(__dirname, '..');
const TARGETS = ['en', 'es', 'fr', 'de', 'it'] as const;
const LESSONS = Array.from({ length: 32 }, (_, i) => i + 1);
const QUEUE_KINDS = ['errorReplayQueue', 'errorReplaySince', 'errorReplayOverride'] as const;

const CANDIDATES = [
  'app/classic_error_queue_cleanup.ts',
  'app/classic_error_queue_migration.ts',
  'app/classic_errors_queue_cleanup.ts',
  'app/classic_error_replay_cleanup.ts',
  'app/error_replay_queue_cleanup.ts',
  'app/error_queue_cleanup.ts',
  'app/classic_completion_error_queue_cleanup.ts',
];

const queueKeys = (target: (typeof TARGETS)[number]): string[] =>
  LESSONS.flatMap((lesson) => QUEUE_KINDS.map((kind) => lessonSessionKey(lesson, kind, target)));

/** Защищённые ключи профиля одного языка: проценты, достижения, счётчики, статистика, экзамены, выученное. */
function protectedKeys(target: (typeof TARGETS)[number]): string[] {
  const perLesson = LESSONS.flatMap((lesson) => [
    lessonBestScoreKey(lesson, target), lessonPassCountKey(lesson, target), lessonProgressKey(lesson, target),
    lessonWordsKey(lesson, target), lessonBonusGrantedKey(lesson, target), masteryFinishedOnceKey(lesson, target),
    achievementLessonPerfectPassesKey(lesson, target),
  ]);
  const exams = ['A1', 'A2', 'B1', 'B2'].flatMap((level) =>
    ['passed', 'available', 'pct', 'best_pct', 'pass_count', 'attempt_count', 'medal_tier'].map((field) => levelExamKey(level as never, field as never, target)));
  return [
    ...perLesson, ...exams,
    achievementStateKey(target), userStatsKey(target), statsDailyBreakdownKey(target), comboAchievementCounterKey(target),
    dailyPhraseAchievementReadCountKey(target), shareAchievementCounterKey(target), irregularVerbsGlobalKey(target), posMasteryKey(target),
    unlockedLessonsKey(target), lastOpenedLessonKey(target), lessonPerfectMilestoneKey(5, target),
  ];
}

describe('миграция очереди ошибок классики — часть A: семейства ключей не пересекаются', () => {
  it.each(TARGETS)('%s: ни один защищённый ключ не входит в семейство очереди и не содержит errorReplay', (target) => {
    const queue = new Set(queueKeys(target));
    const protectedList = protectedKeys(target);
    expect(queue.size).toBe(32 * QUEUE_KINDS.length);
    const overlap = protectedList.filter((key) => queue.has(key) || /errorReplay/i.test(key));
    expect(overlap).toEqual([]);
  });

  it('очередь каждого языка живёт в своём пространстве ключей (чистка en не задевает es/fr/de/it)', () => {
    const owner = new Map<string, string>();
    for (const target of TARGETS) for (const key of queueKeys(target)) {
      expect(owner.has(key)).toBe(false);
      owner.set(key, target);
    }
  });
});

const modulePath = CANDIDATES.map((rel) => path.join(ROOT, rel)).find((abs) => fs.existsSync(abs));

if (!modulePath) {
  describe('миграция очереди ошибок классики — часть B (модуль ещё не сдан Ядром)', () => {
    it.todo('поведенческая проверка: защищённые ключи побайтно те же, очередь очищена, второй запуск ничего не меняет');
    it.todo('сторож исходника: нет removeItem/multiRemove/clear, трогает только errorReplay*');
  });
} else {
  const store = new Map<string, string>();
  jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
      setItem: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
      removeItem: jest.fn(async (key: string) => { store.delete(key); }),
      multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, store.has(key) ? store.get(key)! : null])),
      multiSet: jest.fn(async (pairs: Array<[string, string]>) => { for (const [k, v] of pairs) store.set(k, v); }),
      multiRemove: jest.fn(async (keys: string[]) => { for (const k of keys) store.delete(k); }),
      getAllKeys: jest.fn(async () => [...store.keys()]),
      clear: jest.fn(async () => { store.clear(); }),
    },
  }));

  const isEmptyQueueValue = (value: string | undefined): boolean => value === undefined || value === '' || value === '[]' || value === 'null' || value === '{}';

  function seedProfile(): Map<string, string> {
    store.clear();
    for (const target of TARGETS) {
      for (const key of protectedKeys(target)) store.set(key, JSON.stringify({ seed: key, n: key.length }));
      for (const key of queueKeys(target)) store.set(key, JSON.stringify([{ id: `${key}:e1` }, { id: `${key}:e2` }]));
    }
    for (const key of ['streak_count', 'user_total_xp', 'rune_balance_v1', 'first_lesson_bonus_unrelated', 'unrelated_foo']) store.set(key, `v:${key}`);
    return new Map(store);
  }

  describe(`миграция очереди ошибок классики — часть B (${path.relative(ROOT, modulePath)})`, () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(modulePath) as Record<string, unknown>;
    const run = Object.values(mod).find((value) => typeof value === 'function') as (() => Promise<unknown>) | undefined;

    it('экспортирует функцию миграции', () => { expect(typeof run).toBe('function'); });

    it('чистит только очередь: защищённые ключи и посторонние ключи побайтно те же', async () => {
      const before = seedProfile();
      await run!();
      const changed: string[] = [];
      for (const [key, value] of before) {
        const isQueue = /errorReplay/i.test(key);
        if (isQueue) continue;
        if (store.get(key) !== value) changed.push(key);
      }
      expect(changed).toEqual([]);
      for (const key of before.keys()) if (/errorReplay/i.test(key)) expect(isEmptyQueueValue(store.get(key))).toBe(true);
    });

    it('идемпотентна: второй запуск не меняет ни одного ключа', async () => {
      seedProfile();
      await run!();
      const afterFirst = new Map(store);
      await run!();
      expect([...store.entries()].sort()).toEqual([...afterFirst.entries()].sort());
    });

    it('сторож исходника: без removeItem/multiRemove/clear (храповик замка прогресса), только errorReplay*', () => {
      const source = fs.readFileSync(modulePath, 'utf8');
      expect(source).not.toMatch(/\.(removeItem|multiRemove|clear)\s*\(/);
      expect(source).toMatch(/errorReplay/);
      expect(source).not.toMatch(/best_score|pass_count|achievement|userStats|streak_count|user_total_xp|rune_balance|level_exam/i);
    });
  });
}

// Governance-ID: TG-419D574ABB4C
// зачем (владелец 05.11: «очистить ошибки у всех», но проценты/уроки/медали/монеты/счётчики не трогать): функциональный сторож миграции
// app/classic_error_queue_migration.ts на поддельном хранилище. Защита профиля побайтно — отдельный тест Ревизора (classic_error_queue_migration_guard).
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), getAllKeys: jest.fn(), multiSet: jest.fn() },
}));

import {
  CLASSIC_ERROR_QUEUE_MIGRATION_FLAG_KEY,
  classicErrorQueueKeysIn,
  runClassicErrorQueueMigration,
} from '../app/classic_error_queue_migration';
import { lessonSessionKey } from '../app/target_storage_keys';

function fakeStorage(initial: Record<string, string>) {
  const data = new Map(Object.entries(initial));
  const calls = { written: [] as string[][], set: [] as string[] };
  return {
    data,
    calls,
    storage: {
      getItem: async (k: string) => data.get(k) ?? null,
      setItem: async (k: string, v: string) => { calls.set.push(k); data.set(k, v); },
      getAllKeys: async () => [...data.keys()],
      multiSet: async (pairs: readonly (readonly [string, string])[]) => { calls.written.push(pairs.map(([k]) => k)); pairs.forEach(([k, v]) => data.set(k, v)); },
    },
  };
}

const TARGETS = ['en', 'es', 'fr', 'de', 'it'] as const;
const FIELDS = ['errorReplayQueue', 'errorReplaySince', 'errorReplayOverride'] as const;

const PROTECTED: Record<string, string> = {
  lesson1_progress: '["a","b"]', lesson1_best_score: '9', lesson1_pass_count: '3', lesson1_cellIndex: '4', lesson1_phraseOrder: '[1,0]',
  'lesson_session_local::fr::lesson1_cellIndex': '2', 'lesson_session_local::fr::lesson1_phraseOrder': '[0,1]',
  streak_count: '12', user_total_xp: '3400', unlocked_lessons: '[1,2,3]', achievementState: '{"a":1}', stats_daily: '{}',
  weekly_review_v1: '{}', premium_course_level: '2', runes_balance: '70',
};

describe('миграция очереди ошибок классики', () => {
  it('выбирает ровно ключи очереди для en/es/fr/de/it по любым урокам; чужие ключи не выбирает', () => {
    const queue: string[] = [];
    for (const t of TARGETS) for (const f of FIELDS) for (const id of [1, 7, 32]) queue.push(lessonSessionKey(id, f, t));
    const picked = classicErrorQueueKeysIn([...queue, ...Object.keys(PROTECTED), 'lessonX_errorReplayQueue', 'lesson_errorReplayQueue', 'lesson5_errorReplayQueue_extra']);
    expect(new Set(picked)).toEqual(new Set(queue));
    expect(picked).toHaveLength(TARGETS.length * FIELDS.length * 3);
  });

  it('гасит только очередь (ключи остаются, значения «пусто»), не трогает профиль, ставит флаг; повторный запуск ничего не делает', async () => {
    const queue = [
      ...FIELDS.map((f) => lessonSessionKey(3, f, 'en')),
      ...FIELDS.map((f) => lessonSessionKey(3, f, 'es')),
      ...FIELDS.map((f) => lessonSessionKey(12, f, 'it')),
    ];
    const initial: Record<string, string> = { ...PROTECTED };
    queue.forEach((k) => { initial[k] = '[1,2]'; });
    const { data, calls, storage } = fakeStorage(initial);
    const before = new Map(data);

    const first = await runClassicErrorQueueMigration(storage as never);
    expect(first).toEqual({ status: 'cleared', cleared: queue.length });
    // ключи НЕ удалены (храповик замка владельца) — стали «пусто» тем же значением, что пишет экран урока
    queue.forEach((k) => expect(data.get(k)).toBe(k.endsWith('errorReplayQueue') ? '[]' : k.endsWith('errorReplaySince') ? '0' : 'null'));
    Object.entries(PROTECTED).forEach(([k, v]) => expect(data.get(k)).toBe(v));
    // изменились ровно очередь (обнулена) и флаг (добавлен); ни одного удаления
    const changed = [...before.keys()].filter((k) => data.get(k) !== before.get(k));
    expect(new Set(changed)).toEqual(new Set(queue));
    expect([...before.keys()].every((k) => data.has(k))).toBe(true);
    expect([...data.keys()].filter((k) => !before.has(k))).toEqual([CLASSIC_ERROR_QUEUE_MIGRATION_FLAG_KEY]);

    const second = await runClassicErrorQueueMigration(storage as never);
    expect(second).toEqual({ status: 'already_done', cleared: 0 });
    expect(calls.written).toHaveLength(1);
  });

  it('если удаление упало — флага нет (повтор при следующем запуске), ошибка не бросается', async () => {
    const { data, storage } = fakeStorage({ [lessonSessionKey(1, 'errorReplayQueue', 'fr')]: '[1]' });
    const broken = { ...storage, multiSet: async () => { throw new Error('disk_full'); } };
    const result = await runClassicErrorQueueMigration(broken as never);
    expect(result.status).toBe('error');
    expect(result.reason).toBe('disk_full');
    expect(data.has(CLASSIC_ERROR_QUEUE_MIGRATION_FLAG_KEY)).toBe(false);
  });

  it('пустое хранилище: чистить нечего, флаг ставится', async () => {
    const { data, storage } = fakeStorage({});
    expect(await runClassicErrorQueueMigration(storage as never)).toEqual({ status: 'cleared', cleared: 0 });
    expect(data.has(CLASSIC_ERROR_QUEUE_MIGRATION_FLAG_KEY)).toBe(true);
  });
});

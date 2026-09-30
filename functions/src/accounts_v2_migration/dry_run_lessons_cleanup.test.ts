import { ACCOUNTS_V2_LIMITS } from '../accounts_v2_apply_core';
import {
  MIGRATION_INVENTORY,
  classifyProgressKey,
  classifyRootField,
  classifySubcollection,
  type Classification,
} from './inventory';
import {
  MIGRATION_EXPORT_FORMAT,
  assertLegacyCleanupAllowed,
  assertMigrationApplyAllowed,
  fieldPath,
  legacyCleanupPaths,
  runMigrationDryRun,
  type InventoryLookup,
  type MigrationReport,
} from './dry_run';
import { legacyCleanupPathsForLookup } from './report';

/*
 * Account V2, Пакет 5 — уроки (D121) и чистка легаси (keep_in_place, белый список).
 *
 * зачем: вынесено из dry_run.test.ts (≤ 800 строк). Держит два обещания:
 * перенос не открывает и не закрывает уроки, а чистка старого users/{uid}
 * удаляет ТОЛЬКО то, что белый список разрешает — ни корень, ни валюту, ни
 * серию, ни поля, которые 2.0 ещё читает из старого места.
 */

const UID = 'stable-user-0001';
const SRS_TIME = 1_780_000_000_000;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function card(id: string, extra: Record<string, Json> = {}): Record<string, Json> {
  return { id, en: `phrase ${id}`, ru: `фраза ${id}`, uk: `фраза ${id}`, source: 'lesson', addedAt: 1_700_000_000_000, ...extra };
}

function snapshot(user: Record<string, Json> | null, subcollections: Record<string, Json[]> = {}, uid = UID): Json {
  return { format: MIGRATION_EXPORT_FORMAT, uid, user, subcollections };
}

describe('accounts_v2_migration dry-run — доработка после ревью: D121 в обе стороны (P2-а)', () => {
  function lessons(progress: Record<string, Json>): Map<string, Json> {
    const result = runMigrationDryRun(snapshot({ progress }));
    return new Map(result.operations.lesson_progress.map((op) => [op.entityId, op.payload as Json]));
  }

  it('2.5/5 без открытого следующего урока — passed:false (перенос не открывает новое)', () => {
    expect(lessons({ lesson4_best_score: '2.5', unlocked_lessons: '[1,2,3,4]' }).get('en:lesson:4')).toEqual({ passed: false, score: 2.5 });
    expect(lessons({ lesson4_best_score: '2.5' }).get('en:lesson:4')).toEqual({ passed: false, score: 2.5 });
  });

  it('2.5/5 со следующим уроком в unlocked_lessons — passed:true (открытое не закрывается)', () => {
    expect(lessons({ lesson4_best_score: '2.5', unlocked_lessons: '[1,2,3,4,5]' }).get('en:lesson:4')).toEqual({ passed: true, score: 2.5 });
  });

  it('3/5 — passed:true без всяких списков; 1.9/5 с открытым следующим — false', () => {
    expect(lessons({ lesson4_best_score: '3' }).get('en:lesson:4')).toEqual({ passed: true, score: 3 });
    expect(lessons({ lesson4_best_score: '1.9', unlocked_lessons: '[5]' }).get('en:lesson:4')).toEqual({ passed: false, score: 1.9 });
  });

  it('списки открытых уроков по языкам не смешиваются (область цели как в parseProgressKey)', () => {
    const map = lessons({
      'lesson_progress_v2::fr::lesson4_best_score': '2.5', 'lesson_progress_v2::fr::unlocked_lessons': '[5]',
      lesson4_best_score: '2.5',
    });
    expect(map.get('fr:lesson:4')).toEqual({ passed: true, score: 2.5 });
    expect(map.get('en:lesson:4')).toEqual({ passed: false, score: 2.5 });
  });

  it('битый unlocked_lessons — HOLD malformed_value, открытие по старому порогу не выдаётся', () => {
    const result = runMigrationDryRun(snapshot({ progress: { lesson4_best_score: '2.5', unlocked_lessons: '{"x":1}' } }));
    expect(result.report.held).toEqual([{ reason: 'malformed_value', path: 'progress.unlocked_lessons', count: 1 }]);
    expect(result.operations.lesson_progress[0].payload).toEqual({ passed: false, score: 2.5 });
  });
});

describe('accounts_v2_migration dry-run — доработка после ревью: ready ≠ полный перенос (P2-б)', () => {
  it('pendingDomainCount считает только carry_pending_domain (набор сообщества); чистка запрещена, пока > 0', () => {
    const result = runMigrationDryRun(snapshot({ progress: {
      lesson1_best_score: '5', flashcards_swipe_memory_v1: JSON.stringify({ 'community:p:y': { seen: 1, lastSeenAt: SRS_TIME } }),
    } }));
    expect(result.report.status).toBe('ready');
    expect(result.report.pendingDomainCount).toBe(1);
    expect(() => assertMigrationApplyAllowed(result.report)).not.toThrow();
    expect(() => assertLegacyCleanupAllowed(result.report)).toThrow('accounts_v2_migration_cleanup_forbidden:pending_domain:1');
  });

  it('keep_in_place (серия, достижения) — keptInPlaceCount, в pendingDomainCount не входит, чистку не блокирует', () => {
    const result = runMigrationDryRun(snapshot({ progress: { lesson1_best_score: '5', streak_count: '4', achievements_state: '{}', user_name: 'x' } }));
    expect(result.report.keptInPlaceCount).toBe(2);
    expect(result.report.pendingDomainCount).toBe(0);
    expect(result.report.keptInPlace).toEqual([
      { reason: 'kept_in_v2_store', path: 'progress.achievements_state', count: 1, decisions: ['OD8'] },
      { reason: 'kept_in_v2_store', path: 'progress.streak_count', count: 1, decisions: ['OD8'] },
    ]);
    expect(() => assertLegacyCleanupAllowed(result.report)).not.toThrow();
  });

  it('нет ожидающих доменов и статус ready — чистка разрешена; статус ≠ ready — запрещена', () => {
    const clean = runMigrationDryRun(snapshot({ progress: { lesson1_best_score: '5', user_name: 'x' } }));
    expect(clean.report.pendingDomainCount).toBe(0);
    expect(() => assertLegacyCleanupAllowed(clean.report)).not.toThrow();
    const held = runMigrationDryRun(snapshot({ progress: { brand_new_key_v7: '1' } }));
    expect(() => assertLegacyCleanupAllowed(held.report)).toThrow('accounts_v2_migration_cleanup_forbidden:hold');
  });
});

describe('accounts_v2_migration dry-run — ремонт №1: D121 и открытые уроки', () => {
  it('2/5 со следующим открытым — passed, ниже 40% — нет; открытые уроки не закрываются', () => {
    const result = runMigrationDryRun(snapshot({ progress: {
      lesson1_best_score: '2', lesson2_best_score: '1.9', lesson3_best_score: '3', unlocked_lessons: '[1,2,3,4]',
    } }));
    const byId = new Map(result.operations.lesson_progress.map((op) => [op.entityId, op.payload]));
    expect(byId.get('en:lesson:1')).toEqual({ passed: true, score: 2 });
    expect(byId.get('en:lesson:2')).toEqual({ passed: false, score: 1.9 });
    expect(byId.get('en:lesson:3')).toEqual({ passed: true, score: 3 });
    expect(result.report.keptInPlace).toEqual([
      { reason: 'kept_in_v2_store', path: 'progress.unlocked_lessons', count: 1, decisions: ['D121', 'OD8'] },
    ]);
  });
});

describe('accounts_v2_migration dry-run — чистка легаси: белый список (ремонт после ревью)', () => {
  // зачем: в настоящей таблице ВСЕ drop удерживаются (живые читатели), поэтому механику
  // белого списка проверяем на таблице, где у drop снята только пометка удержания.
  const withoutDropRetention = (found: Classification): Classification => (found.disposition === 'drop'
    ? { ...found, retention: undefined } : found);
  const DROP_UNRETAINED: InventoryLookup = {
    progress: (key) => withoutDropRetention(classifyProgressKey(key)),
    root: (key) => withoutDropRetention(classifyRootField(key)),
    subcollection: (name) => withoutDropRetention(classifySubcollection(name)),
  };
  const cleanup = (report: MigrationReport): string[] => legacyCleanupPathsForLookup(report, DROP_UNRETAINED);

  function readyReport(progress: Record<string, Json> = { lesson1_best_score: '5', user_total_xp: '9' }): MigrationReport {
    return runMigrationDryRun(snapshot({ progress })).report;
  }

  function forged(base: MigrationReport, paths: readonly string[]): MigrationReport {
    const entries = paths.map((path) => ({ reason: 'x', path, count: 1, decisions: ['D90'] }));
    return {
      ...base,
      dropped: [...base.dropped, ...entries],
      derived: [...base.derived, ...entries],
      carriedSources: [...base.carriedSources, ...entries],
    };
  }

  it('настоящая таблица: чистить нечего — перенесённое, Plus, отброшенное и поля входа читает живой код', () => {
    const result = runMigrationDryRun(snapshot({
      premium: true, stars: { balance: 3 }, firebaseAuthUid: 'a',
      progress: {
        lesson1_best_score: '5', flashcards_v1: JSON.stringify([card('c1')]), user_total_xp: '9', streak_count: '4',
        unlocked_lessons: '[1,2]', user_name: 'x', premium_plan: 'yearly',
        flashcards_swipe_memory_v1: JSON.stringify({ 'saved:all:c1': { seen: 1, lastSeenAt: SRS_TIME } }),
      },
    }, { shard_log: [{ id: 'l', data: {} }], access_projection: [{ id: 'current', data: {} }] }));
    expect(result.report.status).toBe('ready');
    // зачем (ремонт №2 после повторного ревью): OD11 = «не переносить», а не «удалить» — вход их читает.
    expect(legacyCleanupPaths(result.report)).toEqual([]);
    expect(cleanup(result.report)).toEqual(['firebaseAuthUid', 'progress.user_total_xp', 'subcollections.shard_log']);
    expect(result.report.carriedSources).toEqual(expect.arrayContaining([
      { reason: 'flashcard', path: 'progress.flashcards_v1', count: 1 },
      { reason: 'flashcard_srs', path: 'progress.flashcards_swipe_memory_v1', count: 1 },
      { reason: 'lesson_progress', path: 'progress.lesson1_best_score', count: 1 },
    ]));
    // зачем (P2 ревью): 2.0 читает оценки уроков (lesson_lock_system, экзамены) и карточки (cloud_sync) из старого места.
    expect(result.report.carriedAndKeptCount).toBe(3);
  });

  it('оценки уроков переносятся, но в чистку не попадают даже из подделанного отчёта', () => {
    const base = readyReport();
    const cleaned = cleanup(forged(base, ['progress.lesson1_best_score', 'progress.lesson_progress_v2::fr::lesson3_best_score']));
    expect(cleaned).toEqual(['progress.user_total_xp']);
  });

  it.each([
    ['корень progress', 'progress'],
    ['stars.balance', 'stars.balance'],
    ['корень subcollections', 'subcollections'],
    ['лишняя точка в ключе', 'progress.streak_count.x'],
    ['пробел в конце', 'progress.active_days_v1 '],
    ['пустой путь', ''],
    ['корень stars', 'stars'],
    ['управляющий символ', 'progress.user_total_xp\u0000'],
    ['подпуть дропа', 'progress.user_total_xp.extra'],
    ['подколлекция с хвостом', 'subcollections.shard_log/x'],
    ['скобки', 'progress.user_total_xp[*]'],
    ['пробел после ключа под шаблоном drop', 'progress.arena_last_season_seen '],
    ['перевод строки после ключа под шаблоном drop', 'progress.arena_x\n'],
    ['точка после ключа под шаблоном drop', 'progress.arena_season.x'],
    ['подколлекция под шаблоном drop с хвостом', 'subcollections.arena_v2_x/doc'],
    ['обрезанный длинный ключ «…»', 'progress.arena_' + 'x'.repeat(120) + '…'],
    ['uid-маркер', 'progress.arena_<uid>'],
    ['маска', 'progress.arena_<masked>'],
    ['маска в подколлекции', 'subcollections.arena_v2_<masked>'],
  ])('подделанный путь «%s» не удаляется', (_name, path) => {
    const cleaned = cleanup(forged(readyReport(), [path]));
    expect(cleaned).toEqual(['progress.user_total_xp']);
  });

  it('путь, который хоть частично в HOLD/информационном, не удаляется', () => {
    const base = readyReport();
    const report = { ...base, held: [{ reason: 'x', path: 'progress.user_total_xp[*].y', count: 1 }] };
    const allowed = { ...report, status: 'ready' as const, applyAllowed: true };
    expect(cleanup(allowed)).toEqual([]);
  });

  it('статус hold — чистка запрещена целиком', () => {
    const result = runMigrationDryRun(snapshot({ progress: { flashcards_v1: JSON.stringify([card('ok'), { en: 'no id' }]), user_total_xp: '1' } }));
    expect(() => cleanup(result.report)).toThrow('accounts_v2_migration_cleanup_forbidden:hold');
  });

  it('carriedSources считает только выданные операции (отвергнутая ядром карточка — не «перенесена»)', () => {
    const huge = card('huge', { description: 'x'.repeat(ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes) });
    const result = runMigrationDryRun(snapshot({ progress: { custom_flashcards_v2: JSON.stringify([huge, card('small')]) } }));
    expect(result.report.carriedSources).toEqual([{ reason: 'flashcard', path: 'progress.custom_flashcards_v2', count: 1 }]);
  });

  it('сторож: ни один keep_in_place путь таблицы не возвращается, даже если отчёт подделан', () => {
    const keepRules = MIGRATION_INVENTORY.filter((rule) => rule.disposition === 'keep_in_place');
    expect(keepRules.length).toBeGreaterThan(0);
    const keepPaths: string[] = [];
    for (const rule of keepRules) {
      const keys = rule.match.exact ?? [];
      const sample = rule.match.pattern === undefined ? [] : [rule.id === 'p.exams' ? 'level_exam_A1_pct' : 'achievement_x_v1'];
      for (const key of [...keys, ...sample]) {
        keepPaths.push(rule.scope === 'root' ? key : rule.scope === 'progress' ? `progress.${key}` : `subcollections.${key}`);
      }
    }
    const cleaned = cleanup(forged(readyReport(), [...keepPaths, 'progress.lesson_progress_v2::fr::unlocked_lessons']));
    for (const path of keepPaths) expect(cleaned).not.toContain(path);
    expect(cleaned).toEqual(['progress.user_total_xp']);
  });
});

describe('accounts_v2_migration dry-run — ключи со скобками (P3)', () => {
  it('fieldPath снимает только разметку отчёта в конце, а не всё после первой `[`', () => {
    expect(fieldPath('progress.flashcards_v1[*].id')).toBe('progress.flashcards_v1');
    expect(fieldPath('progress.flashcards_swipe_memory_v1[official:*]')).toBe('progress.flashcards_swipe_memory_v1');
    expect(fieldPath('progress.a[b]c[*]')).toBe('progress.a[b]c');
    expect(fieldPath('progress.a[b]c')).toBe('progress.a[b]c');
  });

  it('ключ с `[` или `]` неоднозначен с разметкой отчёта → HOLD ambiguous_key', () => {
    const result = runMigrationDryRun(snapshot({ 'root[x]': 1, progress: { 'user_total_xp[*]': '1', lesson1_best_score: '5' } }, {
      'shard_log[0]': [{ id: 'l', data: {} }],
    }));
    expect(result.report.held).toEqual([
      { reason: 'ambiguous_key', path: '<masked>', count: 1 },
      { reason: 'ambiguous_key', path: 'progress.<masked>', count: 1 },
      { reason: 'ambiguous_key', path: 'subcollections.<masked>', count: 1 },
    ]);
  });
});

describe('accounts_v2_migration dry-run — ремонт №2: ES/DE без списка открытых уроков (P3)', () => {
  it('es/de: 40–59% без unlocked_lessons этой цели — HOLD, операции урока нет', () => {
    for (const target of ['es', 'de']) {
      const result = runMigrationDryRun(snapshot({ progress: { [`lesson_progress_v2::${target}::lesson4_best_score`]: '2.5' } }));
      expect(result.operations.lesson_progress).toEqual([]);
      expect(result.report.held).toEqual([
        { reason: 'lesson_unlock_unprovable', path: `progress.lesson_progress_v2::${target}::lesson4_best_score`, count: 1 },
      ]);
    }
  });

  it('es: со списком этой цели — решает список; от 60% и ниже 40% — без HOLD; en/fr без списка — passed:false', () => {
    const withList = runMigrationDryRun(snapshot({ progress: {
      'lesson_progress_v2::es::lesson4_best_score': '2.5', 'lesson_progress_v2::es::unlocked_lessons': '[5]',
      'lesson_progress_v2::es::lesson5_best_score': '3', 'lesson_progress_v2::es::lesson6_best_score': '1',
    } }));
    expect(withList.report.held).toEqual([]);
    const noList = runMigrationDryRun(snapshot({ progress: {
      'lesson_progress_v2::es::lesson5_best_score': '3', 'lesson_progress_v2::es::lesson6_best_score': '1',
      lesson4_best_score: '2.5', 'lesson_progress_v2::fr::lesson4_best_score': '2.5',
    } }));
    expect(noList.report.held).toEqual([]);
    // зачем (P3 ревью): EN/FR 40–59% без списка — не молча: информационная запись с путём.
    expect(noList.report.informational).toEqual([
      { reason: 'lesson_unlock_list_absent', path: 'progress.lesson4_best_score', count: 1 },
      { reason: 'lesson_unlock_list_absent', path: 'progress.lesson_progress_v2::fr::lesson4_best_score', count: 1 },
    ]);
    const byId = new Map(noList.operations.lesson_progress.map((op) => [op.entityId, op.payload]));
    expect(byId.get('es:lesson:5')).toEqual({ passed: true, score: 3 });
    expect(byId.get('es:lesson:6')).toEqual({ passed: false, score: 1 });
    expect(byId.get('en:lesson:4')).toEqual({ passed: false, score: 2.5 });
    expect(byId.get('fr:lesson:4')).toEqual({ passed: false, score: 2.5 });
  });
});

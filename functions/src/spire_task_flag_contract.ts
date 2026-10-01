/**
 * Договор «снять задание Шпиля» (PM-287-A2, T41).
 *
 * зачем: владелец решил публиковать пулы es/de/fr БЕЗ проверки носителем
 * (T41, D55, evidence/PM-270_pool_preflight.md) — значит ошибки в заданиях
 * первыми увидят игроки. Нужен быстрый способ снять с публикации конкретное
 * задание из админки, без полного отката пула и без релиза. Тот же принцип,
 * что у Арены (adminArenaPublicationRollback), но точечно — по одному
 * taskId, а не по всему пакету публикации.
 *
 * PM-272 (серверная сборка недельного пакета) ещё не реализована (status
 * "planned" в registries/tasks.json на момент написания) — этот модуль
 * заранее задаёт КОНТРАКТ, которым сборщик пакета обязан пользоваться:
 * читать `spireFlaggedTaskIds(lang)` и ИСКЛЮЧАТЬ эти id из собираемого
 * пакета. Сам сборщик (PM-272) эту функцию ещё не вызывает — интеграция
 * входит в объём PM-272, не в объём этой задачи (см. docs/work/tasks/
 * 2026-09-24_pm287_spire_task_flag.md).
 *
 * Хранение: один документ на язык в `config/spire_task_flags_{lang}` —
 * не отдельный документ на задание, чтобы сборщик пакета читал ОДНИМ
 * запросом список скрытых id на язык (экономия чтений Firestore, тот же
 * принцип, что и у остальных конфигов Шпиля). Документ мал (id — короткие
 * строки вида `arena-es-fill_gap-1-0000`), тысячи флагов не ожидаются —
 * если жалоб станет много, это само по себе сигнал остановить публикацию
 * пула, а не масштабировать этот механизм.
 *
 * Чистый модуль: ни сети, ни Firestore, ни времени (время задаётся снаружи,
 * как flaggedAtMs, чтобы функция оставалась тестируемой без моков Date.now).
 *
 * СИНХРОНИЗАЦИЯ: клиент Шпиля этот документ не читает напрямую — фильтрация
 * происходит на сервере при сборке пакета (PM-272), поэтому парной копии в
 * modules/spire/ не требуется (в отличие от spire_config_contract.ts,
 * который клиент действительно читает).
 */

import { ARENA_STUDY_TARGETS, type ArenaStudyTarget } from './arena_target_registry';

export const SPIRE_TASK_FLAGS_SCHEMA_VERSION = 'spire-task-flags-v1' as const;
export const SPIRE_TASK_FLAGS_COLLECTION = 'config' as const;

/** T41 покрывает только es/de/fr (пулы без проверки носителем); en остаётся в Арене. */
export const SPIRE_FLAGGABLE_STUDY_TARGETS = ARENA_STUDY_TARGETS
  .filter((t): t is Exclude<ArenaStudyTarget, 'en'> => t !== 'en');

export function spireTaskFlagsDocId(lang: Exclude<ArenaStudyTarget, 'en'>): string {
  return `spire_task_flags_${lang}`;
}

export function isSpireFlaggableStudyTarget(value: unknown): value is Exclude<ArenaStudyTarget, 'en'> {
  return (SPIRE_FLAGGABLE_STUDY_TARGETS as readonly string[]).includes(String(value ?? ''));
}

export type SpireTaskFlagEntry = Readonly<{
  taskId: string;
  /** Свободный текст причины — жалоба игрока, находка проверки, опечатка. */
  reason: string;
  flaggedAtMs: number;
  flaggedByUid: string;
}>;

export type SpireTaskFlagsDoc = Readonly<{
  schemaVersion: typeof SPIRE_TASK_FLAGS_SCHEMA_VERSION;
  studyTarget: Exclude<ArenaStudyTarget, 'en'>;
  /** Ключ — taskId, значение — запись флага. Object, не массив: O(1) на сборке пакета. */
  flagged: Readonly<Record<string, SpireTaskFlagEntry>>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => actual.includes(key));
}

function validTaskId(value: unknown): value is string {
  const s = String(value ?? '').trim();
  // формат сгенерированного пула: arena-{lang}-{mode}-{difficulty}-{index}
  return s.length > 0 && s.length <= 200 && /^[a-z0-9][a-z0-9_-]*$/i.test(s);
}

function parseFlagEntry(raw: unknown, studyTarget?: Exclude<ArenaStudyTarget, 'en'>): SpireTaskFlagEntry | null {
  if (!isRecord(raw)) return null;
  if (!validTaskId(raw.taskId)) return null;
  if (studyTarget && !String(raw.taskId).startsWith(`arena-${studyTarget}-`)) return null;
  const flaggedAtMs = raw.flaggedAtMs;
  const flaggedByUid = String(raw.flaggedByUid ?? '').trim();
  if (typeof flaggedAtMs !== 'number' || !Number.isFinite(flaggedAtMs) || flaggedAtMs <= 0) return null;
  if (!flaggedByUid) return null;
  return {
    taskId: String(raw.taskId).trim(),
    reason: String(raw.reason ?? '').trim().slice(0, 400),
    flaggedAtMs,
    flaggedByUid,
  };
}

/**
 * Mutation/publication decoder. Existing malformed state must never be
 * normalized while a write silently drops unknown or damaged entries.
 * A genuinely missing document is the only input that means an empty list.
 */
export function parseSpireTaskFlagsDocStrict(
  raw: unknown,
  studyTarget: Exclude<ArenaStudyTarget, 'en'>,
): SpireTaskFlagsDoc {
  if (raw === null || raw === undefined) return parseSpireTaskFlagsDoc(null, studyTarget);
  if (!isRecord(raw)
    || !hasExactKeys(raw, ['schemaVersion', 'studyTarget', 'flagged'])
    || raw.schemaVersion !== SPIRE_TASK_FLAGS_SCHEMA_VERSION
    || raw.studyTarget !== studyTarget
    || !isRecord(raw.flagged)) {
    throw new Error('spire_task_flags_invalid');
  }
  const parsed = parseSpireTaskFlagsDoc(raw, studyTarget);
  for (const [key, value] of Object.entries(raw.flagged)) {
    const canonical = parsed.flagged[key];
    if (!isRecord(value)
      || !canonical
      || !hasExactKeys(value, ['taskId', 'reason', 'flaggedAtMs', 'flaggedByUid'])
      || value.taskId !== canonical.taskId
      || value.reason !== canonical.reason
      || value.flaggedAtMs !== canonical.flaggedAtMs
      || value.flaggedByUid !== canonical.flaggedByUid) {
      throw new Error('spire_task_flags_invalid');
    }
  }
  if (Object.keys(parsed.flagged).length !== Object.keys(raw.flagged).length) {
    throw new Error('spire_task_flags_invalid');
  }
  return parsed;
}

/** Документа нет / повреждён → честный пустой список, не падение (та же логика, что spireConfigStatus). */
export function parseSpireTaskFlagsDoc(
  raw: unknown,
  studyTarget: Exclude<ArenaStudyTarget, 'en'>,
): SpireTaskFlagsDoc {
  const doc = isRecord(raw) ? raw : {};
  const rawFlagged = isRecord(doc.flagged) ? doc.flagged : {};
  const flagged: Record<string, SpireTaskFlagEntry> = {};
  for (const [key, value] of Object.entries(rawFlagged)) {
    const entry = parseFlagEntry(value, studyTarget);
    if (entry && entry.taskId === key) flagged[key] = entry;
  }
  return {
    schemaVersion: SPIRE_TASK_FLAGS_SCHEMA_VERSION,
    studyTarget,
    flagged: Object.freeze(flagged),
  };
}

/**
 * Список id, которые сборщик пакета (PM-272) обязан ИСКЛЮЧИТЬ из недельного
 * пакета этого языка. Чистая функция — сборщик передаёт уже прочитанный
 * документ, сам не читает Firestore здесь.
 */
export function spireFlaggedTaskIds(doc: SpireTaskFlagsDoc): readonly string[] {
  return Object.keys(doc.flagged);
}

export function spireTaskFlagAdd(
  doc: SpireTaskFlagsDoc,
  input: Readonly<{ taskId: string; reason: string; flaggedAtMs: number; flaggedByUid: string }>,
): SpireTaskFlagsDoc {
  if (!validTaskId(input.taskId) || !String(input.taskId).startsWith(`arena-${doc.studyTarget}-`)) {
    throw new Error('spire_task_flag_invalid_task_id');
  }
  const flaggedByUid = String(input.flaggedByUid ?? '').trim();
  if (!flaggedByUid) throw new Error('spire_task_flag_actor_required');
  const taskId = String(input.taskId).trim();
  const entry: SpireTaskFlagEntry = {
    taskId,
    reason: String(input.reason ?? '').trim().slice(0, 400),
    flaggedAtMs: input.flaggedAtMs,
    flaggedByUid,
  };
  return { ...doc, flagged: Object.freeze({ ...doc.flagged, [taskId]: entry }) };
}

export function spireTaskFlagRemove(doc: SpireTaskFlagsDoc, taskId: string): SpireTaskFlagsDoc {
  const key = String(taskId ?? '').trim();
  if (!(key in doc.flagged)) return doc;
  const next = { ...doc.flagged };
  delete next[key];
  return { ...doc, flagged: Object.freeze(next) };
}

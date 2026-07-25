// ═══════════════════════════════════════════════════════════════════════════
// admin_tournament_tasks.ts — серверная часть раздела «Турниры» в админке.
//
// зачем: владелец просил полноценный генератор в живой админке
// (admin/v2/legacy.html). Здесь Firestore-обвязка вокруг чистого
// tournament_task_factory: сгенерировать черновики → показать на ревью →
// опубликовать verified → отбить статистику пула → включить слоты.
//
// ЭКОНОМИЯ FIRESTORE (правило владельца): генерация читает контент из кода
// (app/plan_content_*.ts), а не из Firestore — ноль чтений. Список отдаёт
// страницами с потолком, статистика считается агрегатом count() вместо
// выкачивания коллекции, публикация идёт батчами по 400 вместо N записей.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import {
  TOURNAMENT_TASKS_COLLECTION,
  TOURNAMENT_SCHEDULE_COLLECTION,
  validateTournamentTask,
  type TournamentTask,
} from './tournament_core';
import {
  GENERATABLE_KINDS,
  generateTournamentTasks,
  type GeneratableKind,
  type SourceDay,
} from './tournament_task_factory';
import { loadTournamentSourceDays, TOURNAMENT_SOURCE_PLANS } from './tournament_content_source';

const REGION = 'us-central1';
const ID_RE = /^[A-Za-z0-9._:-]{1,160}$/;
/** Потолок записей за один вызов: батч Firestore — 500, берём с запасом. */
const WRITE_BATCH_SIZE = 400;
const MAX_PUBLISH_PER_CALL = 2_000;
const MAX_LIST_LIMIT = 100;

type CallRequest = { auth?: { token?: Record<string, unknown> }; data?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requirePermission(
  request: CallRequest,
  permission: 'content.read' | 'content.draft.write' | 'content.publish',
): AdminRole {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = hasAdminRole(request.auth.token.adminRole) ? request.auth.token.adminRole : null;
  if (!role || !hasPermission(role, permission)) {
    throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  }
  return role;
}

function onlyKeys(data: unknown, allowed: readonly string[], errorCode: string): Record<string, unknown> {
  if (data === undefined || data === null) return {};
  if (!isRecord(data) || Object.keys(data).some((key) => !allowed.includes(key))) {
    throw new HttpsError('invalid-argument', errorCode);
  }
  return data;
}

// ── Разбор запросов ─────────────────────────────────────────────────────────

export type GenerateRequest = {
  readonly plans: readonly string[];
  readonly kinds: readonly GeneratableKind[];
  readonly limit: number;
  readonly dryRun: boolean;
};

export function parseGenerateRequest(data: unknown): GenerateRequest {
  const record = onlyKeys(data, ['plans', 'kinds', 'limit', 'dryRun'], 'tournament_generate_invalid');

  const plansRaw = record.plans === undefined ? TOURNAMENT_SOURCE_PLANS : record.plans;
  if (!Array.isArray(plansRaw) || plansRaw.length === 0 || plansRaw.length > 20) {
    throw new HttpsError('invalid-argument', 'tournament_generate_invalid');
  }
  const plans = plansRaw.map((plan) => String(plan ?? '').trim());
  if (plans.some((plan) => !TOURNAMENT_SOURCE_PLANS.includes(plan))) {
    throw new HttpsError('invalid-argument', 'tournament_generate_plan_unknown');
  }

  const kindsRaw = record.kinds === undefined ? GENERATABLE_KINDS : record.kinds;
  if (!Array.isArray(kindsRaw) || kindsRaw.length === 0) {
    throw new HttpsError('invalid-argument', 'tournament_generate_invalid');
  }
  const kinds = kindsRaw.map((kind) => String(kind ?? '').trim() as GeneratableKind);
  if (kinds.some((kind) => !GENERATABLE_KINDS.includes(kind))) {
    throw new HttpsError('invalid-argument', 'tournament_generate_kind_unknown');
  }

  const limit = record.limit === undefined ? MAX_PUBLISH_PER_CALL : Number(record.limit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PUBLISH_PER_CALL) {
    throw new HttpsError('invalid-argument', 'tournament_generate_limit_invalid');
  }

  return Object.freeze({
    plans: Object.freeze([...new Set(plans)]),
    kinds: Object.freeze([...new Set(kinds)]) as readonly GeneratableKind[],
    limit,
    dryRun: record.dryRun === true,
  });
}

export type ListRequest = {
  readonly limit: number;
  readonly status: '' | 'draft' | 'published';
  readonly mode: string;
  readonly difficulty: number;
  readonly cursor: string;
};

export function parseListRequest(data: unknown): ListRequest {
  const record = onlyKeys(data, ['limit', 'status', 'mode', 'difficulty', 'cursor'], 'tournament_list_invalid');

  const limit = record.limit === undefined ? 25 : Number(record.limit);
  const status = String(record.status ?? '').trim() as ListRequest['status'];
  const mode = String(record.mode ?? '').trim();
  const difficulty = record.difficulty === undefined ? 0 : Number(record.difficulty);
  const cursor = String(record.cursor ?? '').trim();

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT
    || !['', 'draft', 'published'].includes(status)
    || (mode && !ID_RE.test(mode))
    || !Number.isSafeInteger(difficulty) || difficulty < 0 || difficulty > 3
    || (cursor && !ID_RE.test(cursor))) {
    throw new HttpsError('invalid-argument', 'tournament_list_invalid');
  }
  return Object.freeze({ limit, status, mode, difficulty, cursor });
}

export type MutateRequest = {
  readonly taskIds: readonly string[];
  readonly action: 'publish' | 'unpublish' | 'delete';
};

export function parseMutateRequest(data: unknown): MutateRequest {
  const record = onlyKeys(data, ['taskIds', 'action'], 'tournament_mutate_invalid');
  const ids = record.taskIds;
  const action = String(record.action ?? '').trim() as MutateRequest['action'];

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_PUBLISH_PER_CALL
    || !['publish', 'unpublish', 'delete'].includes(action)) {
    throw new HttpsError('invalid-argument', 'tournament_mutate_invalid');
  }
  const taskIds = ids.map((id) => String(id ?? '').trim());
  if (taskIds.some((id) => !ID_RE.test(id))) {
    throw new HttpsError('invalid-argument', 'tournament_mutate_id_invalid');
  }
  return Object.freeze({ taskIds: Object.freeze([...new Set(taskIds)]), action });
}

export type ScheduleSlotInput = {
  readonly slotId: string;
  readonly hour: number;
  readonly minute: number;
  readonly enabled: boolean;
};

export type ScheduleRequest = {
  readonly slots: readonly ScheduleSlotInput[];
  readonly timezone: string;
};

export function parseScheduleRequest(data: unknown): ScheduleRequest {
  const record = onlyKeys(data, ['slots', 'timezone'], 'tournament_schedule_invalid');
  const slotsRaw = record.slots;
  const timezone = String(record.timezone ?? 'Europe/Moscow').trim();

  if (!Array.isArray(slotsRaw) || slotsRaw.length === 0 || slotsRaw.length > 12
    // IANA-имя: сервер сверяет его же при создании комнат.
    || !/^[A-Za-z]+\/[A-Za-z_\-+0-9/]+$/.test(timezone)) {
    throw new HttpsError('invalid-argument', 'tournament_schedule_invalid');
  }

  const slots = slotsRaw.map((slot) => {
    if (!isRecord(slot)) throw new HttpsError('invalid-argument', 'tournament_schedule_slot_invalid');
    const slotId = String(slot.slotId ?? '').trim();
    const hour = Number(slot.hour);
    const minute = Number(slot.minute);
    if (!ID_RE.test(slotId)
      || !Number.isSafeInteger(hour) || hour < 0 || hour > 23
      || !Number.isSafeInteger(minute) || minute < 0 || minute > 59) {
      throw new HttpsError('invalid-argument', 'tournament_schedule_slot_invalid');
    }
    return Object.freeze({ slotId, hour, minute, enabled: slot.enabled === true });
  });

  const unique = new Set(slots.map((slot) => slot.slotId));
  if (unique.size !== slots.length) {
    throw new HttpsError('invalid-argument', 'tournament_schedule_duplicate_slot');
  }
  return Object.freeze({ slots: Object.freeze(slots), timezone });
}

// ── Представление задания для админки ───────────────────────────────────────

/**
 * Наружу отдаём только то, что нужно карточке ревью. Правильный ответ включён
 * СПЕЦИАЛЬНО: это админский экран, ревьюер обязан видеть, что проверяет.
 * Клиент игры этих данных не получает — там public payload сервера.
 */
export function publicAdminTask(taskId: string, task: TournamentTask): Record<string, unknown> {
  return {
    taskId,
    mode: task.mode,
    difficulty: task.difficulty,
    isVoice: task.isVoice === true,
    verified: task.verified === true,
    tags: Array.isArray(task.tags) ? [...task.tags] : [],
    payload: task.payload,
    valid: validateTournamentTask({ ...task, verified: true }).ok,
  };
}

// ── Генерация ───────────────────────────────────────────────────────────────

/**
 * Собирает черновики и складывает их в пул как verified: false.
 * dryRun: true — только статистика и образцы, без единой записи (владелец
 * сначала смотрит, что получится, и лишь потом тратит записи).
 */
export const adminGenerateTournamentTasks = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, memory: '1GiB', timeoutSeconds: 300 },
  async (request) => {
    requirePermission(request, 'content.draft.write');
    const params = parseGenerateRequest(request.data);

    const days: SourceDay[] = loadTournamentSourceDays(params.plans);
    const { tasks, stats } = generateTournamentTasks(days, {
      kinds: params.kinds,
      limit: params.limit,
      verified: false,
    });

    if (params.dryRun) {
      return {
        ok: true,
        dryRun: true,
        stats,
        samples: tasks.slice(0, 5).map((task) => publicAdminTask(task.taskId, task)),
      };
    }

    const db = admin.firestore();
    const collection = db.collection(TOURNAMENT_TASKS_COLLECTION);
    const nowMs = Date.now();
    let written = 0;
    let keptPublished = 0;

    for (let i = 0; i < tasks.length; i += WRITE_BATCH_SIZE) {
      const chunk = tasks.slice(i, i + WRITE_BATCH_SIZE);
      // Одним getAll вместо чтения в цикле: узнаём, какие задания уже
      // опубликованы, чтобы ре-генерация не сняла их с публикации.
      const existing = await db.getAll(
        ...chunk.map((task) => collection.doc(task.taskId)),
        { fieldMask: ['verified'] },
      );
      const alreadyPublished = new Set(
        existing.filter((doc) => doc.exists && doc.data()?.verified === true).map((doc) => doc.id),
      );

      const batch = db.batch();
      for (const task of chunk) {
        const ref = collection.doc(task.taskId);
        const wasPublished = alreadyPublished.has(task.taskId);
        if (wasPublished) keptPublished += 1;
        // merge: повторная генерация обновляет то же задание, а не плодит дубль.
        // verified сохраняем как было — иначе ре-ген снял бы с публикации уже
        // одобренные владельцем задания и обрушил бы боевой пул.
        batch.set(ref, {
          taskId: task.taskId,
          mode: task.mode,
          isVoice: task.isVoice,
          difficulty: task.difficulty,
          payload: task.payload,
          tags: task.tags,
          verified: wasPublished,
          generatedAtMs: nowMs,
          source: 'plan_content',
        }, { merge: true });
        written += 1;
      }
      await batch.commit();
    }

    return { ok: true, dryRun: false, stats, written, keptPublished };
  },
);

// ── Список для ревью ────────────────────────────────────────────────────────

export const adminListTournamentTasks = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requirePermission(request, 'content.read');
    const params = parseListRequest(request.data);

    const db = admin.firestore();
    let query: FirebaseFirestore.Query = db.collection(TOURNAMENT_TASKS_COLLECTION);
    if (params.status === 'draft') query = query.where('verified', '==', false);
    if (params.status === 'published') query = query.where('verified', '==', true);
    if (params.mode) query = query.where('mode', '==', params.mode);
    if (params.difficulty) query = query.where('difficulty', '==', params.difficulty);
    // Курсор по документному id — дешевле offset и не ломается при вставках.
    query = query.orderBy(admin.firestore.FieldPath.documentId()).limit(params.limit);
    if (params.cursor) query = query.startAfter(params.cursor);

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => publicAdminTask(doc.id, doc.data() as TournamentTask));

    return {
      ok: true,
      items,
      nextCursor: snapshot.size === params.limit ? snapshot.docs[snapshot.size - 1].id : '',
    };
  },
);

// ── Публикация / снятие / удаление ──────────────────────────────────────────

export const adminMutateTournamentTasks = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 120 },
  async (request) => {
    const params = parseMutateRequest(request.data);
    // Публикация в боевой пул — отдельное право, снятие/удаление тоже:
    // черновик может править контент-редактор, а публиковать — нет.
    requirePermission(request, params.action === 'publish' ? 'content.publish' : 'content.draft.write');

    const db = admin.firestore();
    const collection = db.collection(TOURNAMENT_TASKS_COLLECTION);
    let affected = 0;
    const rejected: string[] = [];

    for (let i = 0; i < params.taskIds.length; i += WRITE_BATCH_SIZE) {
      const chunk = params.taskIds.slice(i, i + WRITE_BATCH_SIZE);
      const refs = chunk.map((id) => collection.doc(id));
      const snapshots = await db.getAll(...refs);
      const batch = db.batch();

      for (const snapshot of snapshots) {
        if (!snapshot.exists) { rejected.push(snapshot.id); continue; }

        if (params.action === 'delete') {
          batch.delete(snapshot.ref);
          affected += 1;
          continue;
        }
        if (params.action === 'unpublish') {
          batch.update(snapshot.ref, { verified: false, unpublishedAtMs: Date.now() });
          affected += 1;
          continue;
        }
        // publish: пускаем в боевой пул только то, что реально пройдёт
        // серверный валидатор — иначе задание молча выпадет из выборки или
        // отменит комнату с возвратом билетов.
        const task = snapshot.data() as TournamentTask;
        if (!validateTournamentTask({ ...task, verified: true }).ok) {
          rejected.push(snapshot.id);
          continue;
        }
        batch.update(snapshot.ref, { verified: true, publishedAtMs: Date.now() });
        affected += 1;
      }
      await batch.commit();
    }

    return { ok: true, action: params.action, affected, rejected };
  },
);

// ── Статистика пула ─────────────────────────────────────────────────────────

/** Сколько заданий нужно раунду: 5 вопросов × запас на отсутствие повторов. */
export const ROUND_TASK_TARGET = 50;

/** Раунд → допустимые сложности (зеркало selectRoundTasks на сервере). */
export const ROUND_DIFFICULTIES: Readonly<Record<number, readonly number[]>> = Object.freeze({
  1: [1], 2: [1, 2], 3: [2], 4: [2, 3],
});

/**
 * Считает пул агрегатами count() — не выкачивает коллекцию.
 * 8 агрегатов вместо чтения тысяч документов: экономия по правилу владельца.
 */
export const adminTournamentPoolStats = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requirePermission(request, 'content.read');
    onlyKeys(request.data, [], 'tournament_stats_invalid');

    const db = admin.firestore();
    const collection = db.collection(TOURNAMENT_TASKS_COLLECTION);

    // guard-ok: count() — серверный агрегат, документы не читаются
    // (тарифицируется как 1 чтение на агрегат, а не N).
    const [totalAgg, publishedAgg] = await Promise.all([
      collection.count().get(),
      collection.where('verified', '==', true).count().get(),
    ]);

    const byDifficulty: Record<number, number> = {};
    await Promise.all([1, 2, 3].map(async (difficulty) => {
      // guard-ok: агрегат, не выборка документов
      const agg = await collection
        .where('verified', '==', true)
        .where('difficulty', '==', difficulty)
        .count().get();
      byDifficulty[difficulty] = agg.data().count;
    }));

    // Готовность раунда: хватает ли verified-заданий его сложностей.
    const rounds = Object.entries(ROUND_DIFFICULTIES).map(([round, difficulties]) => {
      const available = difficulties.reduce((sum, d) => sum + (byDifficulty[d] ?? 0), 0);
      return {
        round: Number(round),
        difficulties: [...difficulties],
        available,
        ready: available >= ROUND_TASK_TARGET,
      };
    });

    return {
      ok: true,
      total: totalAgg.data().count,
      published: publishedAgg.data().count,
      drafts: totalAgg.data().count - publishedAgg.data().count,
      byDifficulty,
      rounds,
      // Режим можно включать, только если каждый раунд наберёт задания.
      poolReady: rounds.every((round) => round.ready),
    };
  },
);

// ── Расписание и включение слотов ───────────────────────────────────────────

export const adminSetTournamentSchedule = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    // Включение слотов = запуск режима для живых игроков: право публикации.
    requirePermission(request, 'content.publish');
    const params = parseScheduleRequest(request.data);

    const db = admin.firestore();
    const ref = db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('config');

    // Предохранитель: не даём включить слот при пустом пуле — комнаты будут
    // создаваться и тут же отменяться, списывая билеты и возвращая их обратно.
    if (params.slots.some((slot) => slot.enabled)) {
      // guard-ok: агрегат count(), документы не читаются
      const ready = await db.collection(TOURNAMENT_TASKS_COLLECTION)
        .where('verified', '==', true).count().get();
      if (ready.data().count < ROUND_TASK_TARGET) {
        throw new HttpsError(
          'failed-precondition',
          `tournament_pool_too_small:${ready.data().count}`,
        );
      }
    }

    await ref.set({
      slots: params.slots.map((slot) => ({ ...slot })),
      timezone: params.timezone,
      updatedAtMs: Date.now(),
    }, { merge: true });

    return { ok: true, slots: params.slots.length };
  },
);

export const adminGetTournamentSchedule = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requirePermission(request, 'content.read');
    onlyKeys(request.data, [], 'tournament_schedule_get_invalid');

    const snapshot = await admin.firestore()
      .collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('config').get();

    if (!snapshot.exists) return { ok: true, exists: false, slots: [], timezone: 'Europe/Moscow' };
    const data = snapshot.data() ?? {};
    return {
      ok: true,
      exists: true,
      slots: Array.isArray(data.slots) ? data.slots : [],
      timezone: typeof data.timezone === 'string' ? data.timezone : 'Europe/Moscow',
      updatedAtMs: Number(data.updatedAtMs ?? 0),
    };
  },
);

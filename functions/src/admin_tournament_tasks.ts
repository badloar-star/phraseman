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
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import {
  TOURNAMENT_CURATED_COLLECTION,
  TOURNAMENT_TASKS_COLLECTION,
  TOURNAMENT_SCHEDULE_COLLECTION,
  normalizeTournamentCuratedSet,
  tournamentRoomId,
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
import {
  TOURNAMENT_AI_BATCH_SIZE,
  buildTournamentAiPromptPacket,
  buildTournamentAiRepairTask,
  isTournamentAiLevel,
  tournamentAiSemanticKey,
  tournamentAiTasksFrom,
  validateTournamentAiBatch,
  type TournamentAiItem,
  type TournamentAiLevel,
} from './tournament_ai_generator';
import { openAiChat } from './explain/explain_provider';
import { assertJobEnabled, resolveJobConfig } from './openai_jobs_config';

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
  const role = /* зачем: adminRole в проекте никем не выдаётся (setCustomUserClaims нет) — флага admin достаточно, роль по умолчанию owner */ hasAdminRole(request.auth.token.adminRole) ? request.auth.token.adminRole : 'owner';
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
  /** Раздельные пулы владельца: '' = все, 'ai' = ИИ-генератор, 'plan_content' = из планов. */
  readonly source: '' | 'ai' | 'plan_content';
};

export function parseListRequest(data: unknown): ListRequest {
  const record = onlyKeys(data, ['limit', 'status', 'mode', 'difficulty', 'cursor', 'source'], 'tournament_list_invalid');

  const limit = record.limit === undefined ? 25 : Number(record.limit);
  const status = String(record.status ?? '').trim() as ListRequest['status'];
  const mode = String(record.mode ?? '').trim();
  const difficulty = record.difficulty === undefined ? 0 : Number(record.difficulty);
  const cursor = String(record.cursor ?? '').trim();
  const source = String(record.source ?? '').trim() as ListRequest['source'];

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT
    || !['', 'draft', 'published'].includes(status)
    || (mode && !ID_RE.test(mode))
    || !Number.isSafeInteger(difficulty) || difficulty < 0 || difficulty > 3
    || (cursor && !ID_RE.test(cursor))
    || !['', 'ai', 'plan_content'].includes(source)) {
    throw new HttpsError('invalid-argument', 'tournament_list_invalid');
  }
  return Object.freeze({ limit, status, mode, difficulty, cursor, source });
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

/**
 * Слот расписания.
 *
 * зачем: формат обязан совпадать с TournamentSlotConfig из tournament_core —
 * его читает планировщик комнат (readTournamentSchedule). Первая версия
 * админки писала hour/minute, и сервер такие слоты молча отбрасывал: в UI
 * показывалось «undefined:undefined», а сохранённое расписание не запустило
 * бы ни одного турнира.
 */
export type ScheduleSlotInput = {
  readonly slotId: string;
  readonly localTime: string;
  readonly timezone: string;
  readonly ticketsRequired: number;
  readonly enabled: boolean;
};

export type ScheduleRequest = {
  readonly slots: readonly ScheduleSlotInput[];
  readonly timezone: string;
  readonly freeWeeklyEntry: boolean;
  readonly ticketGemValue: number;
};

/** Валидна ли IANA-таймзона — той же проверкой, что делает сервер комнат. */
function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function parseScheduleRequest(data: unknown): ScheduleRequest {
  const record = onlyKeys(
    data,
    ['slots', 'timezone', 'freeWeeklyEntry', 'ticketGemValue'],
    'tournament_schedule_invalid',
  );
  const slotsRaw = record.slots;
  const timezone = String(record.timezone ?? 'Europe/Moscow').trim();

  if (!Array.isArray(slotsRaw) || slotsRaw.length === 0 || slotsRaw.length > 12
    || !isValidTimezone(timezone)) {
    throw new HttpsError('invalid-argument', 'tournament_schedule_invalid');
  }

  const ticketGemValue = record.ticketGemValue === undefined ? 0 : Number(record.ticketGemValue);
  if (!Number.isSafeInteger(ticketGemValue) || ticketGemValue < 0 || ticketGemValue > 1_000) {
    throw new HttpsError('invalid-argument', 'tournament_schedule_invalid');
  }

  const slots = slotsRaw.map((slot) => {
    if (!isRecord(slot)) throw new HttpsError('invalid-argument', 'tournament_schedule_slot_invalid');
    const slotId = String(slot.slotId ?? '').trim();
    const localTime = String(slot.localTime ?? '').trim();
    const slotTimezone = String(slot.timezone ?? timezone).trim();
    const ticketsRequired = slot.ticketsRequired === undefined ? 1 : Number(slot.ticketsRequired);
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(localTime);

    if (!ID_RE.test(slotId)
      || !timeMatch || Number(timeMatch[1]) > 23 || Number(timeMatch[2]) > 59
      || !isValidTimezone(slotTimezone)
      || !Number.isSafeInteger(ticketsRequired) || ticketsRequired < 1 || ticketsRequired > 100) {
      throw new HttpsError('invalid-argument', 'tournament_schedule_slot_invalid');
    }
    return Object.freeze({
      slotId,
      localTime,
      timezone: slotTimezone,
      ticketsRequired,
      enabled: slot.enabled === true,
    });
  });

  const unique = new Set(slots.map((slot) => slot.slotId));
  if (unique.size !== slots.length) {
    throw new HttpsError('invalid-argument', 'tournament_schedule_duplicate_slot');
  }
  return Object.freeze({
    slots: Object.freeze(slots),
    timezone,
    freeWeeklyEntry: record.freeWeeklyEntry === true,
    ticketGemValue,
  });
}

// ── Представление задания для админки ───────────────────────────────────────

/**
 * Наружу отдаём только то, что нужно карточке ревью. Правильный ответ включён
 * СПЕЦИАЛЬНО: это админский экран, ревьюер обязан видеть, что проверяет.
 * Клиент игры этих данных не получает — там public payload сервера.
 */
export function publicAdminTask(taskId: string, task: TournamentTask): Record<string, unknown> {
  const doc = task as TournamentTask & { source?: unknown; aiMeta?: unknown };
  return {
    taskId,
    mode: task.mode,
    difficulty: task.difficulty,
    isVoice: task.isVoice === true,
    verified: task.verified === true,
    tags: Array.isArray(task.tags) ? [...task.tags] : [],
    payload: task.payload,
    valid: validateTournamentTask({ ...task, verified: true }).ok,
    // Раздельные пулы и карточка ревью ИИ-заданий (сцена + заметка редактору).
    source: typeof doc.source === 'string' ? doc.source : '',
    aiMeta: doc.aiMeta && typeof doc.aiMeta === 'object' && !Array.isArray(doc.aiMeta) ? doc.aiMeta : null,
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

// ── ИИ-генерация (второй источник пула) ─────────────────────────────────────

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const AI_LEDGER_COLLECTION = 'tournament_ai_ledger';
const AI_BILLING_COLLECTION = 'tournament_ai_billing';
const AI_USAGE_COLLECTION = 'tournament_ai_usage';
/** До 2 починок на батч (паттерн stage_runner) — итого максимум 3 запроса. */
const AI_MAX_REPAIRS = 2;
const AI_MAX_BATCHES_PER_CALL = 3;
/** Реестр против повторов: ключи смыслов и недавние фразы на уровень CEFR. */
const AI_LEDGER_MAX_KEYS = 5_000;
const AI_LEDGER_MAX_PHRASES = 200;
/**
 * зачем: 0.2 арены даёт форматную дисциплину, но сцены выходят одинаковыми.
 * Живость сцен — прямое требование владельца; формат держит strict-схема
 * и жёсткая валидация, поэтому чуть выше без риска брака.
 */
const AI_TEMPERATURE = 0.35;
const AI_MAX_TOKENS = 6_000;

export type AiGenerateRequest = {
  readonly level: TournamentAiLevel;
  readonly topicHint: string;
  readonly batches: number;
  readonly dryRun: boolean;
};

export function parseAiGenerateRequest(data: unknown): AiGenerateRequest {
  const record = onlyKeys(data, ['level', 'topicHint', 'batches', 'dryRun'], 'tournament_ai_invalid');

  const level = String(record.level ?? '').trim().toUpperCase();
  if (!isTournamentAiLevel(level)) {
    throw new HttpsError('invalid-argument', 'tournament_ai_level_invalid');
  }
  const topicHint = String(record.topicHint ?? '').trim().slice(0, 120);
  const batches = record.batches === undefined ? 1 : Number(record.batches);
  if (!Number.isSafeInteger(batches) || batches < 1 || batches > AI_MAX_BATCHES_PER_CALL) {
    throw new HttpsError('invalid-argument', 'tournament_ai_batches_invalid');
  }
  return Object.freeze({ level, topicHint, batches, dryRun: record.dryRun === true });
}

function utcDateKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Дневной кап на батчи: жёсткий стоп расходов OpenAI поверх kill-switch джоба. */
async function reserveAiDailyBudget(
  db: FirebaseFirestore.Firestore,
  cap: number,
  batches: number,
  nowMs: number,
): Promise<void> {
  if (cap <= 0) return;
  const ref = db.collection(AI_USAGE_COLLECTION).doc(utcDateKey(nowMs));
  await db.runTransaction(async (tx) => {
    const used = Number((await tx.get(ref)).data()?.batches ?? 0);
    if (used + batches > cap) {
      throw new HttpsError('resource-exhausted', `tournament_ai_daily_cap:${used}/${cap}`);
    }
    tx.set(ref, { batches: used + batches, updatedAtMs: nowMs }, { merge: true });
  });
}

type AiBatchOutcome =
  | { ok: true; items: readonly TournamentAiItem[]; promptTokens: number; completionTokens: number; requests: number }
  | { ok: false; errors: readonly string[]; promptTokens: number; completionTokens: number; requests: number };

/** Один батч: генерация → валидация → до 2 починок с конвертом ошибок. */
async function generateOneAiBatch(
  apiKey: string,
  model: string,
  params: { level: TournamentAiLevel; topicHint: string; previousKeys: ReadonlySet<string>; previousPhrases: readonly string[] },
): Promise<AiBatchOutcome> {
  const packet = buildTournamentAiPromptPacket({
    level: params.level,
    topicHint: params.topicHint,
    previousPhrases: params.previousPhrases,
  });

  let promptTokens = 0;
  let completionTokens = 0;
  let requests = 0;
  let task = packet.task;
  let lastErrors: readonly string[] = [];

  for (let attempt = 0; attempt <= AI_MAX_REPAIRS; attempt += 1) {
    const result = await openAiChat({
      apiKey,
      model,
      messages: [
        { role: 'system', content: packet.system },
        { role: 'user', content: task },
      ],
      maxTokens: AI_MAX_TOKENS,
      temperature: AI_TEMPERATURE,
      responseFormat: packet.responseFormat,
    });
    requests += 1;
    promptTokens += result.promptTokens;
    completionTokens += result.completionTokens;

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      lastErrors = ['ai_batch_json_invalid'];
      task = buildTournamentAiRepairTask(packet, result.text, lastErrors);
      continue;
    }

    const validation = validateTournamentAiBatch(parsed, {
      level: params.level,
      previousKeys: params.previousKeys as Set<string>,
    });
    if (validation.ok) return { ok: true, items: validation.items, promptTokens, completionTokens, requests };
    lastErrors = validation.errors;
    task = buildTournamentAiRepairTask(packet, result.text, lastErrors);
  }
  return { ok: false, errors: lastErrors, promptTokens, completionTokens, requests };
}

/**
 * Генерация через ИИ: батчи по 10 choice-вопросов → строгая валидация →
 * черновики verified:false в общий пул с source:'ai'. Публикация — только
 * руками через существующее ревью (adminMutateTournamentTasks).
 */
export const adminGenerateTournamentTasksAi = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 300, secrets: [OPENAI_API_KEY] },
  async (request) => {
    requirePermission(request, 'content.draft.write');
    const params = parseAiGenerateRequest(request.data);
    const db = admin.firestore();
    const nowMs = Date.now();

    const cfg = await resolveJobConfig(db, 'tournament');
    assertJobEnabled(cfg, 'tournament');
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

    // dryRun капа не резервирует: он тоже жжёт OpenAI, поэтому резервируем всегда.
    await reserveAiDailyBudget(db, cfg.globalDailyCap, params.batches, nowMs);

    // Реестр уровня: смысловые ключи против повторов + недавние фразы в промпт.
    const ledgerRef = db.collection(AI_LEDGER_COLLECTION).doc(params.level);
    const ledgerData = (await ledgerRef.get()).data() ?? {};
    const knownKeys = new Set<string>(
      Array.isArray(ledgerData.keys) ? ledgerData.keys.map((key: unknown) => String(key)) : [],
    );
    const knownPhrases: string[] = Array.isArray(ledgerData.phrases)
      ? ledgerData.phrases.map((phrase: unknown) => String(phrase))
      : [];

    const accepted: TournamentAiItem[] = [];
    const rejectedBatches: string[][] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let requests = 0;

    // зачем: billing пишется и при падении OpenAI посреди repair-цикла —
    // токены первых запросов уже потрачены, и без finally дашборд трат
    // повторил бы старый баг недосчёта (>60% невидимых расходов).
    try {
      for (let batchNo = 0; batchNo < params.batches; batchNo += 1) {
        const outcome = await generateOneAiBatch(apiKey, cfg.model, {
          level: params.level,
          topicHint: params.topicHint,
          previousKeys: knownKeys,
          previousPhrases: knownPhrases.slice(-120),
        });
        promptTokens += outcome.promptTokens;
        completionTokens += outcome.completionTokens;
        requests += outcome.requests;
        if (!outcome.ok) {
          rejectedBatches.push([...outcome.errors]);
          continue;
        }
        for (const item of outcome.items) {
          // Второй батч не должен дублировать первый в этом же вызове.
          knownKeys.add(tournamentAiSemanticKey(item));
          knownPhrases.push(item.phrase);
          accepted.push(item);
        }
      }
    } finally {
      if (requests > 0) {
        // Учёт трат — в общий дашборд OpenAI (схема A: promptTokens/completionTokens).
        await db.collection(AI_BILLING_COLLECTION).add({
          model: cfg.model,
          promptTokens,
          completionTokens,
          requests,
          level: params.level,
          batchesRequested: params.batches,
          batchesAccepted: params.batches - rejectedBatches.length,
          dryRun: params.dryRun,
          uid: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
          createdAtMs: nowMs,
        }).catch((error) => console.error('[tournament_ai] billing write failed', error));
      }
    }

    const tasks = tournamentAiTasksFrom(accepted, params.level) ?? [];
    if (accepted.length > 0 && tasks.length === 0) {
      // Валидация батча прошла, а контракт пула — нет: это баг генератора,
      // фиксируем громко, а не молча пустым результатом.
      throw new HttpsError('internal', 'tournament_ai_contract_mismatch');
    }

    const samples = tasks.slice(0, TOURNAMENT_AI_BATCH_SIZE).map((task, index) => ({
      ...publicAdminTask(task.taskId, task),
      aiMeta: {
        scenario: accepted[index]?.scenario ?? '',
        ruleNote: accepted[index]?.ruleNote ?? '',
      },
    }));

    if (params.dryRun) {
      return {
        ok: true,
        dryRun: true,
        accepted: accepted.length,
        rejectedBatches,
        requests,
        samples,
      };
    }

    let written = 0;
    let keptPublished = 0;
    if (tasks.length > 0) {
      const collection = db.collection(TOURNAMENT_TASKS_COLLECTION);
      for (let i = 0; i < tasks.length; i += WRITE_BATCH_SIZE) {
        const chunk = tasks.slice(i, i + WRITE_BATCH_SIZE);
        const existing = await db.getAll(
          ...chunk.map((task) => collection.doc(task.taskId)),
          { fieldMask: ['verified'] },
        );
        const alreadyPublished = new Set(
          existing.filter((doc) => doc.exists && doc.data()?.verified === true).map((doc) => doc.id),
        );
        const batch = db.batch();
        for (let j = 0; j < chunk.length; j += 1) {
          const task = chunk[j];
          const item = accepted[i + j];
          const wasPublished = alreadyPublished.has(task.taskId);
          if (wasPublished) keptPublished += 1;
          batch.set(collection.doc(task.taskId), {
            taskId: task.taskId,
            mode: task.mode,
            isVoice: task.isVoice,
            difficulty: task.difficulty,
            payload: task.payload,
            tags: task.tags,
            verified: wasPublished,
            generatedAtMs: nowMs,
            source: 'ai',
            aiMeta: {
              scenario: item.scenario,
              ruleNote: item.ruleNote,
              level: params.level,
              model: cfg.model,
            },
          }, { merge: true });
          written += 1;
        }
        await batch.commit();
      }

      // Реестр: дописываем ключи/фразы, старьё отрезаем с головы.
      const nextKeys = [...knownKeys].slice(-AI_LEDGER_MAX_KEYS);
      const nextPhrases = knownPhrases.slice(-AI_LEDGER_MAX_PHRASES);
      await ledgerRef.set({ keys: nextKeys, phrases: nextPhrases, updatedAtMs: nowMs }, { merge: true });
    }

    return {
      ok: true,
      dryRun: false,
      accepted: accepted.length,
      rejectedBatches,
      requests,
      written,
      keptPublished,
      samples,
    };
  },
);

// ── Редактирование задания ──────────────────────────────────────────────────

export type EditRequest = {
  readonly taskId: string;
  readonly payload: Record<string, unknown>;
  readonly difficulty: number;
};

export function parseEditRequest(data: unknown): EditRequest {
  const record = onlyKeys(data, ['taskId', 'payload', 'difficulty'], 'tournament_edit_invalid');
  const taskId = String(record.taskId ?? '').trim();
  const difficulty = record.difficulty === undefined ? 0 : Number(record.difficulty);
  if (!ID_RE.test(taskId) || !isRecord(record.payload) || Object.keys(record.payload).length === 0
    || !Number.isSafeInteger(difficulty) || difficulty < 0 || difficulty > 3) {
    throw new HttpsError('invalid-argument', 'tournament_edit_invalid');
  }
  return Object.freeze({ taskId, payload: record.payload, difficulty });
}

/**
 * Правка вопроса/вариантов/ответа в админке. Сохраняем только то, что пройдёт
 * серверный контракт — иначе испорченное задание молча выпало бы из выборки
 * или отменило комнату. Правка опубликованного = правка боевого пула, поэтому
 * требует права публикации. Идущие турниры не затрагиваются: комнаты копируют
 * задания в taskSecrets при заполнении.
 */
export const adminEditTournamentTask = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requirePermission(request, 'content.draft.write');
    const params = parseEditRequest(request.data);

    const db = admin.firestore();
    const ref = db.collection(TOURNAMENT_TASKS_COLLECTION).doc(params.taskId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'tournament_task_not_found');
    const existing = snap.data() as TournamentTask;

    if (existing.verified === true) requirePermission(request, 'content.publish');

    const candidate: TournamentTask = {
      taskId: params.taskId,
      mode: existing.mode,
      isVoice: existing.isVoice === true,
      // 0 = «не менять» (валидный диапазон пула 1-3); явная проверка вместо
      // falsy — чтобы будущая правка диапазона не сделала 0 молча-игнорируемым.
      difficulty: params.difficulty === 0 ? existing.difficulty : params.difficulty,
      payload: params.payload,
      tags: Array.isArray(existing.tags) ? existing.tags : [],
      verified: existing.verified === true,
    };
    const validation = validateTournamentTask({ ...candidate, verified: true });
    if (!validation.ok) {
      throw new HttpsError('invalid-argument', `tournament_edit_contract:${validation.reason}`);
    }

    await ref.set({
      payload: params.payload,
      difficulty: candidate.difficulty,
      editedAtMs: Date.now(),
      editedBy: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
    }, { merge: true });

    return { ok: true, task: publicAdminTask(params.taskId, candidate) };
  },
);

// ── Кураторские наборы: ручной отбор заданий на конкретный турнир ───────────

export type CuratedSetRequest = {
  readonly slotId: string;
  readonly timezone: string;
  readonly dateKey: string;
  readonly rounds: ReadonlyArray<{ readonly roundNo: number; readonly taskIds: readonly string[] }>;
};

export function parseCuratedSetRequest(data: unknown): CuratedSetRequest {
  const record = onlyKeys(data, ['slotId', 'timezone', 'dateKey', 'rounds'], 'tournament_curated_invalid');
  const slotId = String(record.slotId ?? '').trim();
  const timezone = String(record.timezone ?? '').trim();
  const dateKey = String(record.dateKey ?? '').trim();
  if (!ID_RE.test(slotId) || !isValidTimezone(timezone) || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new HttpsError('invalid-argument', 'tournament_curated_invalid');
  }
  // Пустой rounds = снять кураторский набор. Формат раундов сверяет тот же
  // normalize, что читает планировщик комнат — расхождения быть не может.
  const rounds = Array.isArray(record.rounds) ? record.rounds : [];
  if (rounds.length > 0) {
    const normalizedSet = normalizeTournamentCuratedSet({ slotId, timezone, dateKey, rounds });
    if (!normalizedSet) throw new HttpsError('invalid-argument', 'tournament_curated_rounds_invalid');
    return Object.freeze({ slotId, timezone, dateKey, rounds: normalizedSet.rounds });
  }
  return Object.freeze({ slotId, timezone, dateKey, rounds: [] });
}

export const adminSetTournamentCurated = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    // Набор попадает в живой турнир напрямую — право уровня публикации.
    requirePermission(request, 'content.publish');
    const params = parseCuratedSetRequest(request.data);

    const db = admin.firestore();
    const roomId = tournamentRoomId(params.slotId, params.timezone, params.dateKey);
    const ref = db.collection(TOURNAMENT_CURATED_COLLECTION).doc(roomId);

    if (params.rounds.length === 0) {
      await ref.delete();
      return { ok: true, roomId, cleared: true };
    }

    // Каждое задание набора обязано существовать, быть опубликованным и
    // проходить контракт — иначе владелец соберёт турнир, который молча
    // откатится на случайную выборку.
    const taskIds = Array.from(new Set(params.rounds.flatMap((round) => round.taskIds)));
    const snaps = await db.getAll(
      ...taskIds.map((taskId) => db.collection(TOURNAMENT_TASKS_COLLECTION).doc(taskId)),
    );
    const rejected: string[] = [];
    for (const snap of snaps) {
      const task = snap.exists ? snap.data() as TournamentTask : null;
      if (!task || task.verified !== true
        || !validateTournamentTask({ ...task, taskId: snap.id, verified: true }).ok) {
        rejected.push(snap.id);
      }
    }
    if (rejected.length > 0) {
      return { ok: false, roomId, rejected };
    }

    await ref.set({
      slotId: params.slotId,
      timezone: params.timezone,
      dateKey: params.dateKey,
      rounds: params.rounds.map((round) => ({ roundNo: round.roundNo, taskIds: [...round.taskIds] })),
      updatedAtMs: Date.now(),
      updatedBy: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
    });

    return { ok: true, roomId, rounds: params.rounds.length };
  },
);

export const adminGetTournamentCurated = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requirePermission(request, 'content.read');
    const record = onlyKeys(request.data, ['slotId', 'timezone', 'dateKey'], 'tournament_curated_invalid');
    const slotId = String(record.slotId ?? '').trim();
    const timezone = String(record.timezone ?? '').trim();
    const dateKey = String(record.dateKey ?? '').trim();
    if (!ID_RE.test(slotId) || !isValidTimezone(timezone) || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new HttpsError('invalid-argument', 'tournament_curated_invalid');
    }

    const roomId = tournamentRoomId(slotId, timezone, dateKey);
    const snap = await admin.firestore().collection(TOURNAMENT_CURATED_COLLECTION).doc(roomId).get();
    if (!snap.exists) return { ok: true, roomId, exists: false, rounds: [] };
    const curated = normalizeTournamentCuratedSet(snap.data());
    return {
      ok: true,
      roomId,
      exists: true,
      rounds: curated?.rounds ?? [],
      updatedAtMs: Number(snap.data()?.updatedAtMs ?? 0),
    };
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
    if (params.source) query = query.where('source', '==', params.source);
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

    // Раздельные пулы владельца: ИИ-генератор и задания из планов. Ещё 4
    // count()-агрегата вместо выкачивания коллекции.
    const sources: Record<string, { total: number; published: number; drafts: number }> = {};
    await Promise.all((['ai', 'plan_content'] as const).map(async (source) => {
      // guard-ok: count() — серверные агрегаты, документы не читаются
      const [totalAgg, publishedAgg] = await Promise.all([
        collection.where('source', '==', source).count().get(),
        collection.where('source', '==', source).where('verified', '==', true).count().get(),
      ]);
      const total = totalAgg.data().count;
      const published = publishedAgg.data().count;
      sources[source] = { total, published, drafts: total - published };
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
      sources,
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

    // Пишем ровно те поля, что читает readTournamentSchedule в tournament_core:
    // slotId/localTime/timezone/ticketsRequired/enabled + freeWeeklyEntry и
    // ticketGemValue на верхнем уровне. Любое расхождение = слот молча
    // отбрасывается планировщиком и турнир не стартует.
    await ref.set({
      slots: params.slots.map((slot) => ({
        slotId: slot.slotId,
        localTime: slot.localTime,
        timezone: slot.timezone,
        ticketsRequired: slot.ticketsRequired,
        enabled: slot.enabled,
      })),
      freeWeeklyEntry: params.freeWeeklyEntry,
      ticketGemValue: params.ticketGemValue,
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

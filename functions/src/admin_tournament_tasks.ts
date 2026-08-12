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
  validateTournamentTaskForNewRoom,
  type TournamentTask,
} from './tournament_core';
import { buildTournamentScheduleWrite } from './tournament_all_day';
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
import {
  defaultRoundMix,
  normalizeModeMix,
  normalizeRoundMix,
  ROUND_NUMBERS,
} from './tournament_mode_mix';
import {
  TOURNAMENT_MODES,
  planGenerationOrders,
  planPoolGaps,
  poolIsTournamentReady,
  roundReadiness,
} from './tournament_pool_plan';
import {
  AUDIO_BATCH_SIZE,
  audioTasksFrom,
  buildAudioPromptPacket,
  isTournamentAudioMode,
  validateAudioBatch,
  type TournamentAudioMode,
} from './tournament_ai_audio_generator';
import {
  TOURNAMENT_AUDIO_SECRETS,
  checkTournamentAudioFreshness,
  ensureTournamentAudio,
  modeNeedsAudio,
} from './tournament_audio';
import {
  SPEED_MATCH_PAIRS,
  buildSpeedMatchPromptPacket,
  speedMatchTasksFrom,
  validateSpeedMatchBatch,
  type SpeedMatchItem,
} from './tournament_ai_generator';
import { openAiChat } from './explain/explain_provider';
import { assertJobEnabled, resolveJobConfig } from './openai_jobs_config';
import { loadEligibleTournamentCellCounts } from './tournament_task_eligibility';
import { isOwnerApprovedTournamentMode } from './tournament_mode_contract';
import { assertTournamentsReleased } from './tournament_release_gate';

const REGION = 'us-central1';
const ID_RE = /^[A-Za-z0-9._:-]{1,160}$/;
/** Потолок записей за один вызов: батч Firestore — 500, берём с запасом. */
const WRITE_BATCH_SIZE = 400;
const MAX_PUBLISH_PER_CALL = 2_000;
const MAX_LIST_LIMIT = 100;
const TOURNAMENT_TEXT_GENERATION_RETIRED: boolean = true;

type CallRequest = { auth?: { token?: Record<string, unknown> }; data?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requirePermission(
  request: CallRequest,
  permission: 'content.read' | 'content.draft.write' | 'content.publish',
): AdminRole {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = /* зачем: adminRole в проекте никем не выдаётся (setCustomUserClaims нет) — флага admin достаточно, роль по умолчанию owner */ hasAdminRole(request.auth.token.adminRole) ? request.auth.token.adminRole : 'owner';
  if (!role || !hasPermission(role, permission)) {
    throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  }
  // Owner lock covers the internal control plane too: an old admin page,
  // schedule editor or AI generator cannot mutate/cost money for a feature
  // that has been explicitly conserved out of release.
  assertTournamentsReleased();
  return role;
}

export function onlyKeys(data: unknown, allowed: readonly string[], errorCode: string): Record<string, unknown> {
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
  /** Exact server-side lifecycle filter; empty preserves the existing all-lifecycles list. */
  readonly lifecycle: '' | 'awaiting_approval';
  readonly mode: string;
  readonly difficulty: number;
  readonly cursor: string;
  /** Раздельные пулы владельца: '' = все, 'ai' = ИИ-генератор, 'plan_content' = из планов. */
  readonly source: '' | 'ai' | 'plan_content';
};

export function parseListRequest(data: unknown): ListRequest {
  const record = onlyKeys(data, ['limit', 'status', 'lifecycle', 'mode', 'difficulty', 'cursor', 'source'], 'tournament_list_invalid');

  const limit = record.limit === undefined ? 25 : Number(record.limit);
  const status = String(record.status ?? '').trim() as ListRequest['status'];
  const lifecycle = String(record.lifecycle ?? '').trim() as ListRequest['lifecycle'];
  const mode = String(record.mode ?? '').trim();
  const difficulty = record.difficulty === undefined ? 0 : Number(record.difficulty);
  const cursor = String(record.cursor ?? '').trim();
  const source = String(record.source ?? '').trim() as ListRequest['source'];

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT
    || !['', 'draft', 'published'].includes(status)
    || !['', 'awaiting_approval'].includes(lifecycle)
    || (mode && !ID_RE.test(mode))
    || !Number.isSafeInteger(difficulty) || difficulty < 0 || difficulty > 3
    || (cursor && !ID_RE.test(cursor))
    || !['', 'ai', 'plan_content'].includes(source)) {
    throw new HttpsError('invalid-argument', 'tournament_list_invalid');
  }
  return Object.freeze({ limit, status, lifecycle, mode, difficulty, cursor, source });
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
  readonly testingEnabled: boolean;
  readonly allDayEnabled: boolean;
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
    ['slots', 'timezone', 'freeWeeklyEntry', 'ticketGemValue', 'testingEnabled', 'allDayEnabled'],
    'tournament_schedule_invalid',
  );
  const slotsRaw = record.slots;
  const timezone = String(record.timezone ?? 'Europe/Moscow').trim();

  if (!Array.isArray(slotsRaw) || slotsRaw.length === 0 || slotsRaw.length > 12
    || !isValidTimezone(timezone)) {
    throw new HttpsError('invalid-argument', 'tournament_schedule_invalid');
  }

  const ticketGemValue = record.ticketGemValue === undefined ? 0 : Number(record.ticketGemValue);
  if (!Number.isSafeInteger(ticketGemValue) || ticketGemValue < 0 || ticketGemValue > 1_000
    || (record.allDayEnabled !== undefined && typeof record.allDayEnabled !== 'boolean')) {
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
    testingEnabled: record.testingEnabled === true,
    allDayEnabled: record.allDayEnabled === true,
  });
}

// ── Представление задания для админки ───────────────────────────────────────

/**
 * Наружу отдаём только то, что нужно карточке ревью. Правильный ответ включён
 * СПЕЦИАЛЬНО: это админский экран, ревьюер обязан видеть, что проверяет.
 * Клиент игры этих данных не получает — там public payload сервера.
 */
/**
 * Пробный адрес озвучки для валидации черновика. Реальный появляется при
 * публикации (tournament_audio), но контракт требует непустой audioUri.
 */
const AUDIO_PROBE_URI = 'https://firebasestorage.googleapis.com/pending.mp3';

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
    explanation: task.explanation ?? null,
    // зачем 2026-07-27: у аудио-черновика audioUri ПУСТОЙ — озвучка делается
    // при публикации, чтобы не платить за то, что владелец не одобрил. Без
    // подстановки пробного адреса контракт валится, и КАЖДАЯ карточка в
    // админке выглядела бы сломанной. Проверяем форму задания, а наличие
    // звука — отдельным флагом needsAudio.
    valid: validateTournamentTask({
      ...task,
      verified: true,
      payload: modeNeedsAudio(task.mode) && !task.payload.audioUri
        ? { ...task.payload, audioUri: AUDIO_PROBE_URI }
        : task.payload,
    }).ok,
    // Владельцу видно, что озвучка появится при публикации, а не потеряна.
    needsAudio: modeNeedsAudio(task.mode),
    hasAudio: modeNeedsAudio(task.mode) ? Boolean(task.payload.audioUri) : null,
    // Раздельные пулы и карточка ревью ИИ-заданий (сцена + заметка редактору).
    source: typeof doc.source === 'string' ? doc.source : '',
    aiMeta: doc.aiMeta && typeof doc.aiMeta === 'object' && !Array.isArray(doc.aiMeta) ? doc.aiMeta : null,
    lifecycle: typeof (doc as any).lifecycle === 'string' ? (doc as any).lifecycle : (task.verified === true ? 'published' : 'generated'),
    aiVerdict: typeof (doc as any).aiVerdict === 'string' ? (doc as any).aiVerdict : null,
    aiReason: typeof (doc as any).aiReason === 'string' ? (doc as any).aiReason : null,
  };
}

// ── Генерация ───────────────────────────────────────────────────────────────

/**
 * ОТКЛЮЧЁН 2026-07-26 по решению владельца.
 *
 * зачем: генератор собирал турнирные задания из фраз обучающих планов, и это
 * давало негодный для соревнования контент — дистракторы не конкурировали
 * («Hi, I am Anna» против «Привет, ты здесь?»), ответ угадывался без знания
 * языка, форматы дублировали одну фразу трижды. Учебный контент и
 * соревновательный — разные жанры.
 *
 * Функция оставлена задеплоенной, но отвечает отказом: у владельца может быть
 * открыта старая вкладка админки, и молчаливое «ничего не произошло» хуже
 * внятной ошибки. Единственный источник заданий — adminGenerateTournamentTasksAi.
 */
export const adminGenerateTournamentTasks = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, memory: '1GiB', timeoutSeconds: 300 },
  async (request) => {
    requirePermission(request, 'content.draft.write');
    throw new HttpsError(
      'failed-precondition',
      'Генератор из планов отключён: турнирные задания создаются только ИИ-генератором.',
    );
    // eslint-disable-next-line no-unreachable
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
  | { ok: true; items: readonly TournamentAiItem[]; partialErrors: readonly string[]; promptTokens: number; completionTokens: number; requests: number }
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
    if (validation.ok) {
      // Частичный приём: часть вопросов могла отсеяться поштучно. Коды брака
      // отдаём наружу как отчёт, но батч НЕ теряем — деньги уже потрачены.
      return {
        ok: true,
        items: validation.items,
        partialErrors: validation.rejected ?? [],
        promptTokens,
        completionTokens,
        requests,
      };
    }
    lastErrors = validation.errors;
    // зачем: без этого лога брак батча неотличим от «модель не ответила» —
    // владелец видит только «забраковано, деньги потрачены» и не может понять,
    // какое правило не выполнилось. Пишем ошибки и образец брака.
    console.warn('[tournament_ai] batch rejected', {
      attempt: attempt + 1,
      level: params.level,
      errors: lastErrors.slice(0, 12),
      sample: result.text.slice(0, 600),
    });
    task = buildTournamentAiRepairTask(packet, result.text, lastErrors);
  }
  return { ok: false, errors: lastErrors, promptTokens, completionTokens, requests };
}

/**
 * Генерация через ИИ: батчи по 10 choice-вопросов → строгая валидация →
 * черновики verified:false в общий пул с source:'ai'. Публикация — только
 * руками через существующее ревью (adminMutateTournamentTasks).
 */
/** Параметры текстовой генерации — та же причина выноса, что у аудио. */
export type TextGenerationParams = {
  level: TournamentAiLevel;
  batches: number;
  topicHint: string;
  dryRun: boolean;
  actor: string;
};

export async function runTextGeneration(input: TextGenerationParams): Promise<Record<string, unknown>> {
  // Kept as a callable compatibility tombstone: deployed clients receive an
  // explicit failure without Firestore writes or OpenAI spend. New tournament
  // rooms use only the four owner-approved mockup modes.
  if (TOURNAMENT_TEXT_GENERATION_RETIRED) {
    throw new HttpsError('failed-precondition', 'tournament_text_modes_retired');
  }

  const params = {
    level: input.level,
    batches: input.batches,
    topicHint: input.topicHint,
    dryRun: input.dryRun,
  };
  const actor = input.actor;
  {
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
        if (outcome.ok === false) {
          rejectedBatches.push([...outcome.errors]);
          continue;
        }
        // Часть вопросов батча могла отсеяться поштучно — показываем владельцу,
        // что именно, но батч засчитан: остальные вопросы сохраняются.
        if (outcome.partialErrors.length > 0) rejectedBatches.push([...outcome.partialErrors]);
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
          uid: actor,
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
            ...(task.explanation ? { explanation: task.explanation } : {}),
            tags: task.tags,
            verified: wasPublished,
            lifecycle: wasPublished ? 'published' : 'awaiting_approval',
            aiVerdict: 'approved',
            aiReason: 'Passed server AI contract validation.',
            aiCheckedAtMs: nowMs,
            generatedAtMs: nowMs,
            source: 'ai',
            aiMeta: {
              scenario: item.scenario,
              ruleNote: item.ruleNote,
              example: task.explanation?.example ?? '',
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
  }
}

/** Тонкая обёртка: разбор входа и права, работа — в runTextGeneration. */
export const adminGenerateTournamentTasksAi = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 300, secrets: [OPENAI_API_KEY] },
  async (request) => {
    requirePermission(request, 'content.draft.write');
    const parsed = parseAiGenerateRequest(request.data);
    return runTextGeneration({
      level: parsed.level,
      batches: parsed.batches,
      topicHint: parsed.topicHint,
      dryRun: parsed.dryRun,
      actor: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
    });
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

/** Manual edits invalidate the independent AI judge receipt. */
export function aiLifecycleAfterTournamentTaskEdit(
  task: unknown,
): Record<string, unknown> {
  if (!isRecord(task) || task.source !== 'ai') return {};
  return {
    verified: false,
    lifecycle: 'generated',
    aiVerdict: 'pending',
    aiReason: 'Manual edit requires AI validation before approval.',
    aiCheckedAtMs: null,
  };
}

/** Shared publication boundary used by both individual and folder publish. */
export function canPublishTournamentTask(
  task: TournamentTask & { source?: unknown; lifecycle?: unknown; aiVerdict?: unknown },
): boolean {
  if (!validateTournamentTaskForNewRoom({ ...task, verified: true }).ok) return false;
  return task.source !== 'ai'
    || (task.lifecycle === 'awaiting_approval' && task.aiVerdict === 'approved');
}

/** Publication is the explicit human approval step after automatic validation. */
export function humanApprovalAfterTournamentTaskPublish(
  actor: string,
  nowMs: number,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    verified: true,
    lifecycle: 'published',
    publishedAtMs: nowMs,
    humanApprovedAtMs: nowMs,
    humanApprovedBy: actor,
  });
}

/**
 * Правка вопроса/вариантов/ответа в админке. Сохраняем только то, что пройдёт
 * серверный контракт — иначе испорченное задание молча выпало бы из выборки
 * или отменило комнату. Правка опубликованного = правка боевого пула, поэтому
 * требует права публикации. Идущие турниры не затрагиваются: комнаты копируют
 * задания в taskSecrets при заполнении.
 */
export const adminEditTournamentTask = onCall(
  // secrets: правка текста аудио-задания перегенерирует озвучку.
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: TOURNAMENT_AUDIO_SECRETS },
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

    // зачем: СТРАЖ СВЕЖЕСТИ. Правка фразы аудио-задания оставляла бы старую
    // озвучку — игрок слышал бы одно, а варианты были бы от другого текста
    // (известный класс бага в проекте). Сверяем хэш текста и, если он
    // изменился, перегенерируем звук ДО записи. Дедуп внутри ensure*: если
    // такую фразу уже озвучивали, повторного вызова OpenAI не будет.
    const update: Record<string, unknown> = {
      payload: params.payload,
      difficulty: candidate.difficulty,
      editedAtMs: Date.now(),
      editedBy: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
    };
    Object.assign(update, aiLifecycleAfterTournamentTaskEdit(existing));
    if (modeNeedsAudio(existing.mode)) {
      const payloadRecord = params.payload as Record<string, unknown>;
      const freshness = checkTournamentAudioFreshness({
        downloadUrl: String(payloadRecord.audioUri ?? ''),
        textHash: String(snap.get('audioTextHash') ?? ''),
        voice: String(snap.get('audioVoice') ?? ''),
      }, String(payloadRecord.phrase ?? ''));
      if (!freshness.fresh) {
        const audio = await ensureTournamentAudio(existing.mode, payloadRecord);
        if (!audio) throw new HttpsError('failed-precondition', 'tournament_audio_unavailable');
        update.payload = { ...payloadRecord, audioUri: audio.downloadUrl };
        update.audioSourceText = audio.sourceText;
        update.audioTextHash = audio.textHash;
        update.audioVoice = audio.voice;
        update.audioGeneratedAtMs = audio.createdAtMs;
      }
    }
    await ref.set(update, { merge: true });

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
        || !validateTournamentTaskForNewRoom({ ...task, taskId: snap.id, verified: true }).ok) {
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
    if (params.lifecycle) query = query.where('lifecycle', '==', params.lifecycle);
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
    const actor = String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin');
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
        const task = snapshot.data() as TournamentTask & { source?: unknown; lifecycle?: unknown; aiVerdict?: unknown };
        if (!canPublishTournamentTask(task)) {
          rejected.push(snapshot.id);
          continue;
        }
        batch.update(snapshot.ref, humanApprovalAfterTournamentTaskPublish(actor, Date.now()));
        affected += 1;
      }
      await batch.commit();
    }

    return { ok: true, action: params.action, affected, rejected };
  },
);

// зачем: функция массового удаления пула убрана — владелец уточнил, что
// задания из планов должны ОСТАТЬСЯ в базе, они просто не участвуют в
// турнирах. Неучастие обеспечено фильтром source:'ai' в loadResourcePool
// (tournaments.ts). Возможности стереть пул не существует намеренно:
// неиспользование обратимо, удаление — нет.

// ── Статистика пула ─────────────────────────────────────────────────────────

/** Сколько заданий нужно раунду: 5 вопросов × запас на отсутствие повторов. */
export const ROUND_TASK_TARGET = 50;

/** Папки вопросов в админке = режимы пула (зеркало KIND_TO_MODE). */
// зачем 2026-07-27: список отстал от пула — новые режимы (аудио и пары)
// существовали в базе, но счётчики папок в админке показывали для них НОЛЬ,
// и владелец видел пустые папки при полном пуле. Берём режимы из единого
// источника — планировщика комплекта, чтобы список не разъезжался снова.
export const TOURNAMENT_FOLDER_MODES: readonly string[] = TOURNAMENT_MODES;

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

    // зачем: счётчики папок в админке — владелец должен видеть, сколько
    // вопросов каждого типа, не открывая папку. guard-ok: count() — серверные
    // агрегаты, документы не читаются (4 агрегата вместо выкачивания пула).
    const byMode: Record<string, number> = {};
    await Promise.all(TOURNAMENT_FOLDER_MODES.map(async (mode) => {
      const agg = await collection.where('mode', '==', mode).count().get();
      byMode[mode] = agg.data().count;
    }));

    // зачем 2026-07-27: раньше готовность считалась по СУММЕ заданий нужных
    // сложностей, без учёта режима. Это давало ложную зелёную галочку: пул из
    // 44 заданий выглядел готовым, а раунд не собирался, потому что раунду с
    // одним режимом нужно TASKS_PER_ROUND заданий ОДНОГО режима, и ни в одной
    // ячейке их столько не было. Считаем по ячейкам режим×сложность.
    // guard-ok: агрегаты count(), документы не читаются.
    const cellCounts = await loadEligibleTournamentCellCounts(collection);

    const readiness = roundReadiness(cellCounts);
    const rounds = readiness.map((round) => ({
      round: round.roundNo,
      difficulties: [...ROUND_DIFFICULTIES[round.roundNo as 1 | 2 | 3 | 4]],
      available: round.totalTasks,
      // Какими режимами раунд реально может быть сыгран прямо сейчас —
      // владельцу видно, что раунд 1 всегда «Собери фразу», и почему.
      readyModes: round.readyModes,
      ready: round.ok,
    }));

    // Что дозаказать генератору: сначала ячейки, блокирующие сборку раунда,
    // затем добор до запаса (иначе каждый турнир играет один и тот же набор).
    const gaps = planPoolGaps(cellCounts)
      .filter((gap) => gap.missing > 0 || gap.missingHealthy > 0)
      .map((gap) => ({
        mode: gap.mode,
        difficulty: gap.difficulty,
        have: gap.have,
        missing: gap.missing,
        missingHealthy: gap.missingHealthy,
        blocking: gap.blocking,
      }));
    const nextOrders = planGenerationOrders(cellCounts, { maxTasks: 60 });

    return {
      ok: true,
      total: totalAgg.data().count,
      published: publishedAgg.data().count,
      drafts: totalAgg.data().count - publishedAgg.data().count,
      byDifficulty,
      sources,
      byMode,
      // Ячейки режим×сложность: сырые числа для сетки в админке.
      cells: cellCounts,
      rounds,
      // Чего не хватает и что заказать — владелец не гадает, а видит список.
      gaps,
      nextOrders,
      // Режим можно включать, только если КАЖДЫЙ раунд реально собирается.
      poolReady: poolIsTournamentReady(cellCounts),
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
    if (params.allDayEnabled || params.slots.some((slot) => slot.enabled)) {
      // guard-ok: агрегат count(), документы не читаются
      const readyCells = await loadEligibleTournamentCellCounts(db.collection(TOURNAMENT_TASKS_COLLECTION));
      if (!poolIsTournamentReady(readyCells)) {
        const readyCount = Object.values(readyCells).reduce((sum, count) => sum + count, 0);
        throw new HttpsError(
          'failed-precondition',
          `tournament_pool_too_small:${readyCount}`,
        );
      }
    }

    // Пишем ровно те поля, что читает readTournamentSchedule в tournament_core:
    // slotId/localTime/timezone/ticketsRequired/enabled + freeWeeklyEntry и
    // ticketGemValue на верхнем уровне. Любое расхождение = слот молча
    // отбрасывается планировщиком и турнир не стартует.
    const write = buildTournamentScheduleWrite(params, Date.now());
    const batch = db.batch();
    batch.set(ref, write.config, { merge: true });
    batch.set(
      db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy'),
      write.economy,
      { merge: true },
    );
    await batch.commit();

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
      slots: data.allDayEnabled === true && Array.isArray(data.scheduledSlots)
        ? data.scheduledSlots
        : (Array.isArray(data.slots) ? data.slots : []),
      timezone: typeof data.timezone === 'string' ? data.timezone : 'Europe/Moscow',
      allDayEnabled: data.allDayEnabled === true,
      testingEnabled: data.testingEnabled === true,
      updatedAtMs: Number(data.updatedAtMs ?? 0),
    };
  },
);


// ── Генератор аудио-заданий ─────────────────────────────────────────────────

/**
 * зачем отдельный callable: у аудио-режимов свой промпт (похожесть НА СЛУХ),
 * своя валидация (минимальная пара, дистракторы диктанта) и свой реестр
 * повторов — смешивать с текстовым генератором значило бы получать фразы,
 * которые на слух не различаются. Бюджет, учёт трат и запись в пул общие.
 */
/**
 * Параметры генерации аудио-заданий. Вынесены из callable, чтобы автодобор
 * комплекта звал ту же логику напрямую: callable из callable — это лишний
 * сетевой round-trip и повторная проверка прав на ту же операцию.
 */
export type AudioGenerationParams = {
  mode: TournamentAudioMode;
  level: TournamentAiLevel;
  batches: number;
  topicHint: string;
  dryRun: boolean;
  /** Кто запустил — пишется в учёт трат. */
  actor: string;
};

export async function runAudioGeneration(params: AudioGenerationParams): Promise<Record<string, unknown>> {
  const { mode, level, batches, topicHint, dryRun, actor } = params;
  {
    const db = admin.firestore();
    const nowMs = Date.now();
    const cfg = await resolveJobConfig(db, 'tournament');
    assertJobEnabled(cfg, 'tournament');
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

    await reserveAiDailyBudget(db, cfg.globalDailyCap, batches, nowMs);

    // Реестр повторов — СВОЙ на режим: одна и та же фраза уместна и в выборе
    // на слух, и в диктанте; запрещать её во втором из-за первого незачем.
    const ledgerRef = db.collection(AI_LEDGER_COLLECTION).doc(`${mode}_${level}`);
    const ledgerData = (await ledgerRef.get()).data() ?? {};
    const knownPhrases: string[] = Array.isArray(ledgerData.phrases)
      ? ledgerData.phrases.map((phrase: unknown) => String(phrase))
      : [];

    const accepted: Record<string, unknown>[] = [];
    const rejectedBatches: string[][] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let requests = 0;

    // Учёт трат в finally: токены сгоревших запросов должны попасть в дашборд
    // даже при падении посреди цикла (иначе повторяем баг недосчёта расходов).
    try {
      for (let batchNo = 0; batchNo < batches; batchNo += 1) {
        const packet = buildAudioPromptPacket({
          mode: mode as TournamentAudioMode,
          level,
          topicHint,
          previousPhrases: knownPhrases.slice(-80),
        });
        const result = await openAiChat({
          apiKey,
          model: cfg.model,
          messages: [
            { role: 'system', content: packet.system },
            { role: 'user', content: packet.task },
          ],
          maxTokens: AI_MAX_TOKENS,
          temperature: AI_TEMPERATURE,
          responseFormat: packet.responseFormat,
        });
        requests += 1;
        promptTokens += result.promptTokens;
        completionTokens += result.completionTokens;

        let parsed: unknown;
        try {
          parsed = JSON.parse(result.text);
        } catch {
          rejectedBatches.push(['model returned invalid JSON']);
          continue;
        }
        const validation = validateAudioBatch(mode as TournamentAudioMode, parsed);
        if (!validation.ok) {
          rejectedBatches.push([...validation.errors].slice(0, 12));
          continue;
        }
        for (const item of validation.items as Record<string, unknown>[]) {
          knownPhrases.push(String(item.phrase ?? ''));
          accepted.push(item);
        }
      }
    } finally {
      if (requests > 0) {
        await db.collection(AI_BILLING_COLLECTION).add({
          model: cfg.model,
          promptTokens,
          completionTokens,
          requests,
          level,
          mode,
          batchesRequested: batches,
          batchesAccepted: batches - rejectedBatches.length,
          dryRun,
          uid: actor,
          createdAtMs: nowMs,
        }).catch((error) => console.error('[tournament_audio_ai] billing write failed', error));
      }
    }

    const tasks = audioTasksFrom(mode as TournamentAudioMode, accepted, level) ?? [];
    if (accepted.length > 0 && tasks.length === 0) {
      // Валидация прошла, а контракт пула — нет: это баг генератора, кричим.
      throw new HttpsError('internal', 'tournament_audio_contract_mismatch');
    }

    const samples = tasks.slice(0, AUDIO_BATCH_SIZE).map((task, index) => ({
      ...publicAdminTask(task.taskId, task),
      aiMeta: {
        note: String(accepted[index]?.confusionNote ?? accepted[index]?.contrast ?? ''),
      },
    }));

    if (dryRun) {
      return { ok: true, dryRun: true, mode, accepted: accepted.length, rejectedBatches, requests, samples };
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
        // Опубликованное задание не должно откатиться в черновик: озвучка за
        // него оплачена, а игроки могут быть в комнате прямо сейчас.
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
              note: String(item?.confusionNote ?? item?.contrast ?? ''),
              level,
              model: cfg.model,
            },
          }, { merge: true });
          written += 1;
        }
        await batch.commit();
      }
      await ledgerRef.set({
        phrases: knownPhrases.slice(-AI_LEDGER_MAX_PHRASES),
        updatedAtMs: nowMs,
      }, { merge: true });
    }

    return {
      ok: true,
      dryRun: false,
      mode,
      accepted: accepted.length,
      rejectedBatches,
      requests,
      written,
      keptPublished,
      samples,
    };
  }
}

/** Тонкая обёртка: разбор входа и права, вся работа — в runAudioGeneration. */
export const adminGenerateTournamentAudioTasksAi = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 300, secrets: [OPENAI_API_KEY] },
  async (request) => {
    requirePermission(request, 'content.draft.write');
    const record = onlyKeys(request.data, ['mode', 'level', 'batches', 'topicHint', 'dryRun'],
      'tournament_audio_ai_invalid');
    const mode = String(record.mode ?? '').trim();
    const level = String(record.level ?? '').trim().toUpperCase();
    // Retired modes may remain in historic documents, but may never consume
    // generation budget or return to a newly assembled tournament.
    if (!isTournamentAudioMode(mode) || !isOwnerApprovedTournamentMode(mode) || !isTournamentAiLevel(level)) {
      throw new HttpsError('invalid-argument', 'tournament_audio_ai_invalid');
    }
    return runAudioGeneration({
      mode,
      level,
      batches: Math.max(1, Math.min(3, Math.trunc(Number(record.batches ?? 1)))),
      topicHint: String(record.topicHint ?? '').trim().slice(0, 120),
      dryRun: record.dryRun === true,
      actor: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
    });
  },
);


/**
 * Генерация полей «Пары на скорость».
 *
 * зачем отдельный раннер: одно задание здесь — это ЦЕЛОЕ ПОЛЕ из пар, то есть
 * целый раунд (решение владельца 2026-07-27). Батч из 10 пар даёт одно поле,
 * поэтому пачек нужно больше, чем у обычных вопросов.
 */
export async function runSpeedMatchGeneration(params: {
  level: TournamentAiLevel;
  batches: number;
  topicHint: string;
  dryRun: boolean;
  actor: string;
}): Promise<Record<string, unknown>> {
  const { level, batches, topicHint, dryRun, actor } = params;
  const db = admin.firestore();
  const nowMs = Date.now();
  const cfg = await resolveJobConfig(db, 'tournament');
  assertJobEnabled(cfg, 'tournament');
  const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

  await reserveAiDailyBudget(db, cfg.globalDailyCap, batches, nowMs);

  const ledgerRef = db.collection(AI_LEDGER_COLLECTION).doc(`speed_match_${level}`);
  const ledgerData = (await ledgerRef.get()).data() ?? {};
  const knownPhrases: string[] = Array.isArray(ledgerData.phrases)
    ? ledgerData.phrases.map((phrase: unknown) => String(phrase))
    : [];

  const pairs: SpeedMatchItem[] = [];
  const rejectedBatches: string[][] = [];
  let promptTokens = 0;
  let completionTokens = 0;
  let requests = 0;

  try {
    for (let batchNo = 0; batchNo < batches; batchNo += 1) {
      const packet = buildSpeedMatchPromptPacket({
        level,
        topicHint,
        previousPhrases: knownPhrases.slice(-120),
      });
      const result = await openAiChat({
        apiKey,
        model: cfg.model,
        messages: [
          { role: 'system', content: packet.system },
          { role: 'user', content: packet.task },
        ],
        maxTokens: AI_MAX_TOKENS,
        temperature: AI_TEMPERATURE,
        responseFormat: packet.responseFormat,
      });
      requests += 1;
      promptTokens += result.promptTokens;
      completionTokens += result.completionTokens;

      let parsed: unknown;
      try {
        parsed = JSON.parse(result.text);
      } catch {
        rejectedBatches.push(['model returned invalid JSON']);
        continue;
      }
      const validation = validateSpeedMatchBatch(parsed);
      if (!validation.ok) {
        rejectedBatches.push([...validation.errors].slice(0, 12));
        continue;
      }
      for (const pair of validation.items as unknown as SpeedMatchItem[]) {
        knownPhrases.push(pair.en);
        pairs.push(pair);
      }
    }
  } finally {
    if (requests > 0) {
      await db.collection(AI_BILLING_COLLECTION).add({
        model: cfg.model,
        promptTokens,
        completionTokens,
        requests,
        level,
        mode: 'speed_match',
        batchesRequested: batches,
        batchesAccepted: batches - rejectedBatches.length,
        dryRun,
        uid: actor,
        createdAtMs: nowMs,
      }).catch((error) => console.error('[speed_match] billing write failed', error));
    }
  }

  const tasks = speedMatchTasksFrom(pairs, level);
  const samples = tasks.slice(0, 3).map((task) => publicAdminTask(task.taskId, task));

  if (dryRun) {
    return { ok: true, dryRun: true, mode: 'speed_match', accepted: pairs.length, rejectedBatches, requests, samples };
  }

  let written = 0;
  let keptPublished = 0;
  if (tasks.length > 0) {
    const collection = db.collection(TOURNAMENT_TASKS_COLLECTION);
    const existing = await db.getAll(
      ...tasks.map((task) => collection.doc(task.taskId)),
      { fieldMask: ['verified'] },
    );
    const alreadyPublished = new Set(
      existing.filter((doc) => doc.exists && doc.data()?.verified === true).map((doc) => doc.id),
    );
    const batch = db.batch();
    for (const task of tasks) {
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
        lifecycle: wasPublished ? 'published' : 'awaiting_approval',
        aiVerdict: 'approved',
        aiReason: 'Passed automatic speed-match validation; human approval is still required.',
        aiCheckedAtMs: nowMs,
        generatedAtMs: nowMs,
        source: 'ai',
        aiMeta: { note: `${SPEED_MATCH_PAIRS} пар`, level, model: cfg.model },
      }, { merge: true });
      written += 1;
    }
    await batch.commit();
    await ledgerRef.set({
      phrases: knownPhrases.slice(-AI_LEDGER_MAX_PHRASES),
      updatedAtMs: nowMs,
    }, { merge: true });
  }

  return {
    ok: true,
    dryRun: false,
    mode: 'speed_match',
    accepted: pairs.length,
    rejectedBatches,
    requests,
    written,
    keptPublished,
    samples,
  };
}

// ── Автодобор комплекта ─────────────────────────────────────────────────────

/**
 * Один вызов вместо ручного перебора режимов.
 *
 * зачем (владелец 2026-07-27): «генератор должен быть переписан — блокер
 * снимается, если генератор будет сразу создавать все задания». Раньше
 * владелец жал «сгенерировать» по одному режиму и не знал, хватает ли пула
 * на раунд: готовность считалась по сумме сложностей и врала. Теперь сервер
 * сам смотрит, каких ячеек режим×сложность не хватает, и заказывает только их.
 *
 * Дороговизна под контролем: за вызов закрывается не больше maxTasks заданий,
 * дневной кап OpenAI тот же, что у остальных генераторов. Владелец жмёт
 * повторно, пока комплект не станет зелёным.
 */
export const adminFillTournamentPool = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 540, secrets: [OPENAI_API_KEY] },
  async (request) => {
    requirePermission(request, 'content.draft.write');
    const record = onlyKeys(request.data, ['level', 'maxTasks', 'healthy', 'dryRun'],
      'tournament_fill_invalid');
    const level = String(record.level ?? 'A2').trim().toUpperCase();
    // Потолок за вызов: 60 заданий ≈ 6 батчей. Больше — риск таймаута функции
    // и неожиданного счёта за OpenAI одним нажатием.
    const maxTasks = Math.max(6, Math.min(60, Math.trunc(Number(record.maxTasks ?? 30))));
    const healthy = record.healthy === true;
    const dryRun = record.dryRun === true;
    if (!isTournamentAiLevel(level)) {
      throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
    }

    const db = admin.firestore();
    const collection = db.collection(TOURNAMENT_TASKS_COLLECTION);

    // Текущий комплект: агрегаты, документы не читаются.
    // guard-ok: count() — серверные агрегаты.
    const cellCounts = await loadEligibleTournamentCellCounts(collection);

    const orders = planGenerationOrders(cellCounts, { maxTasks, healthy });
    if (orders.length === 0) {
      return {
        ok: true,
        complete: true,
        poolReady: poolIsTournamentReady(cellCounts),
        orders: [],
        results: [],
      };
    }

    if (dryRun) {
      // Показать план, ничего не потратив: сколько и чего будет заказано.
      return {
        ok: true,
        dryRun: true,
        poolReady: poolIsTournamentReady(cellCounts),
        orders,
        results: [],
      };
    }

    // Заказы выполняются ПОСЛЕДОВАТЕЛЬНО: параллельные вызовы OpenAI съели бы
    // дневной кап рывком и мешали бы друг другу в реестре повторов.
    const actor = String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin');
    const results: Array<Record<string, unknown>> = [];
    for (const order of orders) {
      const isAudio = isTournamentAudioMode(order.mode);
      const isSpeedMatch = order.mode === 'speed_match';
      // Обычный батч даёт ~10 заданий, а в парах 10 пар = ОДНО поле (раунд),
      // поэтому пачек нужно столько же, сколько заказано полей.
      const batches = isSpeedMatch
        ? Math.max(1, Math.min(3, order.count))
        : Math.max(1, Math.min(3, Math.ceil(order.count / 10)));
      try {
        // Вызываем ОБЩУЮ логику напрямую: callable нельзя звать из callable
        // (это был бы сетевой round-trip и вторая проверка прав на ту же
        // операцию). Бюджет и учёт трат внутри самих runner-функций.
        const response = isSpeedMatch
          ? await runSpeedMatchGeneration({ level, batches, topicHint: '', dryRun: false, actor })
          : isAudio
          ? await runAudioGeneration({
            mode: order.mode as TournamentAudioMode,
            level,
            batches,
            topicHint: '',
            dryRun: false,
            actor,
          })
          : await runTextGeneration({ level, batches, topicHint: '', dryRun: false, actor });
        results.push({ mode: order.mode, difficulty: order.difficulty, ok: true, ...response });
      } catch (error) {
        // Одна упавшая ячейка не должна отменять остальные: владелец увидит,
        // что именно не сгенерилось, и повторит только это.
        console.error('[tournament_fill] order failed', order.mode, error);
        results.push({
          mode: order.mode,
          difficulty: order.difficulty,
          ok: false,
          error: String((error as { message?: string })?.message ?? 'failed'),
        });
      }
    }

    return { ok: true, dryRun: false, orders, results };
  },
);


// ── Проценты распределения типов по раундам ─────────────────────────────────

const MODE_MIX_DOC = 'modeMix';

/**
 * Текущие проценты + сколько заданий каждого типа реально есть.
 *
 * зачем счётчики рядом: владелец ставит 50% на режим, у которого в пуле
 * 2 задания — раунд соберётся не так, как он ожидает. Показываем правду
 * сразу, чтобы настройка не расходилась с реальностью.
 */
export const adminGetTournamentModeMix = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requirePermission(request, 'content.read');
    onlyKeys(request.data, [], 'tournament_mix_invalid');

    const db = admin.firestore();
    const collection = db.collection(TOURNAMENT_TASKS_COLLECTION);
    const snap = await db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc(MODE_MIX_DOC).get();
    const mix = snap.exists ? normalizeRoundMix(snap.data()) : defaultRoundMix();

    // guard-ok: count() — серверные агрегаты, документы не читаются.
    const cells = await loadEligibleTournamentCellCounts(collection);

    const byMode: Record<string, number> = {};
    for (const mode of TOURNAMENT_MODES) {
      byMode[mode] = [1, 2, 3].reduce((sum, d) => sum + (cells[`${mode}:${d}`] ?? 0), 0);
    }

    return {
      ok: true,
      configured: snap.exists,
      rounds: mix.rounds,
      modes: TOURNAMENT_MODES,
      byMode,
      cells,
    };
  },
);

/** Сохранение процентов. Нормализация обязательна: клиент мог прислать 99. */
export const adminSetTournamentModeMix = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    // Микс влияет на состав живых турниров — право уровня публикации.
    requirePermission(request, 'content.publish');
    const record = onlyKeys(request.data, ['rounds', 'reset'], 'tournament_mix_invalid');

    const db = admin.firestore();
    const ref = db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc(MODE_MIX_DOC);

    if (record.reset === true) {
      // Сброс к равным долям = удаление настройки: сервер вернётся к жребию.
      await ref.delete().catch(() => {});
      return { ok: true, reset: true, rounds: defaultRoundMix().rounds };
    }

    const normalized = normalizeRoundMix({ rounds: record.rounds });
    const payload: Record<string, unknown> = {};
    for (const roundNo of ROUND_NUMBERS) {
      payload[String(roundNo)] = normalizeModeMix(normalized.rounds[roundNo]);
    }

    await ref.set({
      rounds: payload,
      updatedAtMs: Date.now(),
      updatedBy: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
    }, { merge: true });

    return { ok: true, rounds: normalized.rounds };
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// admin_tournament_tasks.ts — серверная часть раздела «Турниры» в админке.
//
// зачем: владелец просил полноценный генератор в живой админке
// (admin/v2/legacy.html). Здесь Firestore-обвязка вокруг чистого
// Черновики проходят ревью, публикацию и проверку готовности пула.
// Список отдаёт
// страницами с потолком, статистика считается агрегатом count() вместо
// выкачивания коллекции, публикация идёт батчами по 400 вместо N записей.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { createHash, randomUUID } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import {
  TOURNAMENT_CURATED_COLLECTION,
  TOURNAMENT_TASKS_COLLECTION,
  TOURNAMENT_SCHEDULE_COLLECTION,
  TOURNAMENT_PRIVATE_STATE_COLLECTION,
  TOURNAMENT_POOL_BARRIER_DOC,
  normalizeTournamentCuratedSet,
  tournamentRoomId,
  validateTournamentTask,
  validateTournamentTaskForNewRoom,
  type TournamentTask,
} from './tournament_core';
import { buildTournamentScheduleWrite } from './tournament_all_day';
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
import {
  assertJobEnabled,
  resolveJobConfig,
  resolveTournamentSemanticJobConfig,
  type TournamentSemanticJobConfig,
} from './openai_jobs_config';
import { loadEligibleTournamentCellCounts } from './tournament_task_eligibility';
import { isOwnerApprovedTournamentMode } from './tournament_mode_contract';
import { assertTournamentsReleased } from './tournament_release_gate';
import {
  ALL_V11_MODES,
  buildTournamentV11Candidates,
  type V11CandidateSourceDay,
} from './tournament_pool_v11_candidates';
import {
  selectTournamentV11Candidates,
  TOURNAMENT_V11_CELL_QUOTAS,
} from './tournament_pool_v11_selector';
import {
  applySemanticJobCheckpoint,
  applySemanticJobPendingReview,
  assertSemanticJobReviewIdentity,
  claimSemanticJobLease,
  createInitialSemanticJobState,
  dryRunTournamentSemanticJob,
  runTournamentSemanticJobBatch,
  settleSemanticJobBatch,
  type SemanticJobRepository,
  type SemanticJobState,
  type SemanticJobReviewIdentity,
  type TournamentSemanticJobBatchResult,
  type TournamentSemanticJobDryRun,
} from './tournament_semantic_job';
import {
  loadHistoricalTournamentSignatures,
  type TournamentReadyBarrier,
  type TournamentSemanticHistoryAdapter,
} from './tournament_semantic_history';
import {
  createTournamentSemanticReceiptStore,
  semanticReceiptId,
  validateTournamentSemanticReceipt,
  type TournamentSemanticReceipt,
  type TournamentSemanticReceiptPersistence,
} from './tournament_semantic_receipt_store';
import {
  reviewTournamentCandidate,
  TOURNAMENT_SEMANTIC_PROMPTS,
  type TournamentSemanticReviewProvider,
} from './tournament_semantic_review';
import { createTournamentSemanticOpenAiProvider } from './tournament_semantic_openai_provider';
import {
  allocateSemanticAttemptOrdinals,
  createReservedSemanticAttempt,
  resumeSemanticAttempt,
  transitionSemanticAttempt,
  type TournamentSemanticAttempt,
} from './tournament_semantic_attempt_store';
import {
  finalizeTournamentV11Bundle,
  tournamentV11BundlePublicationStatus,
  type TournamentV11BundleJobBinding,
} from './tournament_pool_v11_bundle';
import { finalizeTournamentV11TaskPool } from './tournament_pool_v11_factory';
import { auditTournamentV11RuntimePool } from './tournament_pool_v11_runtime_audit';
import type { TournamentSemanticCandidate } from './tournament_semantic_contract';

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

export type ListRequest = {
  readonly limit: number;
  readonly status: '' | 'draft' | 'published';
  /** Exact server-side lifecycle filter; empty preserves the existing all-lifecycles list. */
  readonly lifecycle: '' | 'awaiting_approval';
  readonly mode: string;
  readonly difficulty: number;
  readonly cursor: string;
  readonly source: '' | 'ai';
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
    || !['', 'ai'].includes(source)) {
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

    const sources: Record<string, { total: number; published: number; drafts: number }> = {};
    await Promise.all((['ai'] as const).map(async (source) => {
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

export const TOURNAMENT_POOL_V11_VERSION = 'tpool_20260808_v11' as const;
const TOURNAMENT_SEMANTIC_JOBS_COLLECTION = 'tournament_semantic_jobs';
const TOURNAMENT_SEMANTIC_RECEIPTS_COLLECTION = 'tournament_semantic_review_receipts';
const TOURNAMENT_POOL_V11_BUNDLES_COLLECTION = 'tournament_pool_v11_bundles';
const V11_DEFAULT_MAX_CANDIDATES = 4;
const V11_MAX_CANDIDATES = 6;

export type AdminFillTournamentPoolAction = 'dry_run' | 'run_batch' | 'status';
export type AdminFillTournamentPoolRequest = Readonly<{
  action: AdminFillTournamentPoolAction;
  poolVersion: typeof TOURNAMENT_POOL_V11_VERSION;
  jobId?: string;
  maxCandidates: number;
}>;

export type AdminTournamentV11Cells = Readonly<Record<string, Readonly<Record<string, number>>>>;
type AdminTournamentV11DryRun = TournamentSemanticJobDryRun & Readonly<{
  cells: AdminTournamentV11Cells;
}>;
type AdminTournamentV11Batch = TournamentSemanticJobBatchResult & Readonly<{
  cells?: AdminTournamentV11Cells;
  shortages?: readonly string[];
}>;

export interface AdminTournamentV11Dependencies {
  dryRun(input: Readonly<{ poolVersion: typeof TOURNAMENT_POOL_V11_VERSION }>): Promise<AdminTournamentV11DryRun>;
  runBatch(input: Readonly<{
    poolVersion: typeof TOURNAMENT_POOL_V11_VERSION;
    jobId?: string;
    maxCandidates: number;
  }>): Promise<AdminTournamentV11Batch>;
  status(input: Readonly<{
    poolVersion: typeof TOURNAMENT_POOL_V11_VERSION;
    jobId: string;
  }>): Promise<AdminTournamentV11Batch>;
}

export type AdminTournamentV11Response = Readonly<{
  ok: true;
  action: AdminFillTournamentPoolAction;
  poolVersion: typeof TOURNAMENT_POOL_V11_VERSION;
  jobId: string | null;
  state: 'preflight' | 'running' | 'paused' | 'blocked' | 'ready';
  continuation: boolean;
  paused: boolean;
  blocked: boolean;
  shortage: boolean;
  cursor: number;
  totalCandidates: number;
  processed: number;
  approved: number;
  rejected: number;
  quarantined: number;
  cacheHits: number;
  providerAttempts: number;
  transientRetries: number;
  cells: AdminTournamentV11Cells;
  shortages: readonly string[];
  modes: typeof ALL_V11_MODES;
  feasibility: TournamentSemanticJobDryRun | null;
}>;

export function parseAdminFillTournamentPoolRequest(data: unknown): AdminFillTournamentPoolRequest {
  const record = onlyKeys(data, [
    'action', 'dryRun', 'poolVersion', 'jobId', 'maxCandidates',
    // Accepted only to keep the existing Admin v2 click envelope compatible.
    'level', 'maxTasks', 'healthy',
  ], 'tournament_fill_invalid');
  if (record.dryRun !== undefined && typeof record.dryRun !== 'boolean') {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  const requestedAction = record.action === undefined ? '' : String(record.action);
  if (requestedAction && !['dry_run', 'run_batch', 'status'].includes(requestedAction)) {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  const action = (requestedAction || (record.dryRun === true ? 'dry_run' : 'run_batch')) as AdminFillTournamentPoolAction;
  if (record.dryRun === true && action !== 'dry_run') {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  if (record.poolVersion !== undefined && record.poolVersion !== TOURNAMENT_POOL_V11_VERSION) {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  if (record.level !== undefined && !isTournamentAiLevel(String(record.level).trim().toUpperCase())) {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  if (record.maxTasks !== undefined && !Number.isFinite(Number(record.maxTasks))) {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  if (record.healthy !== undefined && typeof record.healthy !== 'boolean') {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  const maxCandidates = record.maxCandidates === undefined
    ? V11_DEFAULT_MAX_CANDIDATES : Number(record.maxCandidates);
  if (!Number.isSafeInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > V11_MAX_CANDIDATES) {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  const jobId = record.jobId === undefined ? undefined : String(record.jobId).trim();
  if (jobId !== undefined && !/^tsj_[a-f0-9]{64}$/u.test(jobId)) {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  if (action === 'status' && !jobId) {
    throw new HttpsError('invalid-argument', 'tournament_fill_invalid');
  }
  return Object.freeze({
    action,
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    ...(jobId ? { jobId } : {}),
    maxCandidates,
  });
}

function progressResponse(
  action: AdminFillTournamentPoolAction,
  batch: AdminTournamentV11Batch,
): AdminTournamentV11Response {
  const shortages = Object.freeze([...(batch.shortages ?? [])]);
  const state = batch.state === 'ready' && batch.continuation ? 'running' : batch.state;
  return Object.freeze({
    ok: true,
    action,
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    jobId: batch.jobId,
    state,
    continuation: batch.continuation,
    paused: state === 'paused',
    blocked: state === 'blocked',
    shortage: batch.shortage || shortages.length > 0,
    cursor: batch.cursor,
    totalCandidates: batch.totalCandidates,
    processed: batch.processed,
    approved: batch.approved,
    rejected: batch.rejected,
    quarantined: batch.quarantined,
    cacheHits: batch.cacheHits,
    providerAttempts: batch.providerAttempts,
    transientRetries: batch.transientRetries,
    cells: Object.freeze({ ...(batch.cells ?? {}) }),
    shortages,
    modes: ALL_V11_MODES,
    feasibility: null,
  });
}

export async function runAdminFillTournamentPoolV11(
  data: unknown,
  deps: AdminTournamentV11Dependencies,
): Promise<AdminTournamentV11Response> {
  const input = parseAdminFillTournamentPoolRequest(data);
  if (input.action === 'dry_run') {
    const feasibility = await deps.dryRun({ poolVersion: input.poolVersion });
    const shortages = Object.freeze([...feasibility.diversityShortages]);
    return Object.freeze({
      ok: true,
      action: 'dry_run',
      poolVersion: input.poolVersion,
      jobId: null,
      state: feasibility.diversityFeasible ? 'preflight' : 'blocked',
      continuation: false,
      paused: false,
      blocked: !feasibility.diversityFeasible,
      shortage: shortages.length > 0,
      cursor: 0,
      totalCandidates: feasibility.sourceCandidates,
      processed: 0,
      approved: 0,
      rejected: 0,
      quarantined: 0,
      cacheHits: 0,
      providerAttempts: 0,
      transientRetries: 0,
      cells: feasibility.cells,
      shortages,
      modes: ALL_V11_MODES,
      feasibility,
    });
  }
  if (input.action === 'status') {
    return progressResponse('status', await deps.status({
      poolVersion: input.poolVersion,
      jobId: input.jobId!,
    }));
  }
  return progressResponse('run_batch', await deps.runBatch({
    poolVersion: input.poolVersion,
    jobId: input.jobId,
    maxCandidates: input.maxCandidates,
  }));
}

function jobStateFrom(data: FirebaseFirestore.DocumentData | undefined): SemanticJobState {
  if (!data) throw new HttpsError('not-found', 'tournament_semantic_job_not_found');
  return Object.freeze({
    kind: data.kind,
    jobId: data.jobId,
    poolVersion: data.poolVersion,
    queueSha256: data.queueSha256,
    reviewContractVersion: data.reviewContractVersion,
    promptSetSha256: data.promptSetSha256,
    primaryModel: data.primaryModel,
    adversarialModel: data.adversarialModel,
    totalCandidates: data.totalCandidates,
    revision: data.revision,
    lifecycle: data.lifecycle,
    cursor: data.cursor,
    progress: Object.freeze({ ...(data.progress ?? {}) }),
    pendingReview: data.pendingReview === null ? null : Object.freeze({
      ...data.pendingReview,
      evidenceRefs: Object.freeze([...(data.pendingReview?.evidenceRefs ?? [])]),
    }),
    lease: data.lease === null ? null : Object.freeze({ ...data.lease }),
    pauseReason: data.pauseReason,
    createdAtMs: data.createdAtMs,
    updatedAtMs: data.updatedAtMs,
  }) as SemanticJobState;
}

function batchFromState(
  state: SemanticJobState,
  cells: AdminTournamentV11Cells = {},
  shortages: readonly string[] = [],
): AdminTournamentV11Batch {
  return Object.freeze({
    jobId: state.jobId,
    poolVersion: state.poolVersion,
    state: state.lifecycle,
    revision: state.revision,
    cursor: state.cursor,
    totalCandidates: state.totalCandidates,
    ...state.progress,
    continuation: state.lifecycle === 'running' || state.lifecycle === 'paused',
    shortage: state.lifecycle === 'blocked' && state.pauseReason === 'candidate_shortage',
    cells,
    shortages: Object.freeze([...shortages]),
  });
}

function tournamentV11BundleJobBinding(state: SemanticJobState): TournamentV11BundleJobBinding {
  return Object.freeze({
    jobId: state.jobId,
    queueSha256: state.queueSha256,
    reviewContractVersion: state.reviewContractVersion,
    promptSetSha256: state.promptSetSha256,
    primaryModel: state.primaryModel,
    adversarialModel: state.adversarialModel,
  });
}

function sourceDays(): readonly V11CandidateSourceDay[] {
  // Lazy load: unit tests and status calls do not parse the 2.6 MiB corpus.
  return require('./generated/tournament_content.json') as readonly V11CandidateSourceDay[];
}

function candidateCells(candidates: readonly TournamentSemanticCandidate[]): AdminTournamentV11Cells {
  const counts: Record<string, { available: number; required: number }> = {};
  for (const [cell, required] of Object.entries(TOURNAMENT_V11_CELL_QUOTAS)) {
    counts[cell] = { available: 0, required };
  }
  for (const candidate of candidates) {
    const cell = `${candidate.mode}:${candidate.difficulty}`;
    if (counts[cell]) counts[cell].available += 1;
  }
  return Object.freeze(Object.fromEntries(Object.entries(counts).map(([key, value]) => (
    [key, Object.freeze({ ...value })]
  ))));
}

function receiptPersistence(db: FirebaseFirestore.Firestore): TournamentSemanticReceiptPersistence {
  return {
    async get(path) {
      const snapshot = await db.doc(path).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    async create(path, value) {
      try { await db.doc(path).create(value as FirebaseFirestore.DocumentData); }
      catch (error) {
        if ((error as { code?: number | string })?.code === 6
          || (error as { code?: number | string })?.code === 'already-exists') throw new Error('already_exists');
        throw error;
      }
    },
  };
}

function semanticJobReviewIdentity(cfg: TournamentSemanticJobConfig): SemanticJobReviewIdentity {
  return Object.freeze({
    reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    primaryModel: cfg.primaryModel,
    adversarialModel: cfg.adversarialModel,
  });
}

function receiptPath(candidate: TournamentSemanticCandidate, cfg: TournamentSemanticJobConfig): string {
  const id = semanticReceiptId(
    candidate.contentSha256,
    TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    { primaryModel: cfg.primaryModel, adversarialModel: cfg.adversarialModel },
  );
  return `${TOURNAMENT_SEMANTIC_RECEIPTS_COLLECTION}/${id}`;
}

async function cachedTerminal(
  persistence: TournamentSemanticReceiptPersistence,
  candidate: TournamentSemanticCandidate,
  cfg: TournamentSemanticJobConfig,
) {
  const path = receiptPath(candidate, cfg);
  const raw = await persistence.get(path);
  if (raw === null) return null;
  validateTournamentSemanticReceipt(raw, candidate);
  if (raw.decision !== 'PASS' && raw.decision !== 'REJECT') throw new Error('receipt_invalid');
  return Object.freeze({ decision: raw.decision, reference: path });
}

async function readyBarrier(db: FirebaseFirestore.Firestore): Promise<TournamentReadyBarrier> {
  const snapshot = await db.collection(TOURNAMENT_PRIVATE_STATE_COLLECTION)
    .doc(TOURNAMENT_POOL_BARRIER_DOC).get();
  const data = snapshot.data();
  if (!data || data.state !== 'ready' || typeof data.generation !== 'string'
    || !Number.isSafeInteger(data.revision)) throw new Error('semantic_history_barrier_invalid');
  return Object.freeze({ state: 'ready', generation: data.generation, revision: data.revision });
}

function historyAdapter(
  db: FirebaseFirestore.Firestore,
  activeJobId?: string,
): TournamentSemanticHistoryAdapter {
  return {
    async readBarrier() {
      const snapshot = await db.collection(TOURNAMENT_PRIVATE_STATE_COLLECTION)
        .doc(TOURNAMENT_POOL_BARRIER_DOC).get();
      const data = snapshot.data();
      return data ? { state: String(data.state ?? ''), generation: String(data.generation ?? ''), revision: Number(data.revision) } : null;
    },
    async readTaskSignaturePage(input) {
      let query: FirebaseFirestore.Query = db.collection(TOURNAMENT_TASKS_COLLECTION)
        .where('poolVersion', '==', input.generation)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(input.limit);
      if (input.cursor) query = query.startAfter(input.cursor);
      const snapshot = await query.get();
      return {
        signatures: snapshot.docs.map((item) => item.get('semanticSignature')),
        nextCursor: snapshot.size === input.limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      };
    },
    async readApprovalSignaturePage(input) {
      let query: FirebaseFirestore.Query = db.collection(TOURNAMENT_SEMANTIC_RECEIPTS_COLLECTION)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(input.limit);
      if (input.cursor) query = query.startAfter(input.cursor);
      const snapshot = await query.get();
      const signatures: string[] = [];
      for (const item of snapshot.docs) {
        const data = item.data();
        const signature = historicalTournamentSemanticApprovalSignature(data, input, activeJobId);
        if (signature) signatures.push(signature);
      }
      return {
        signatures,
        nextCursor: snapshot.size === input.limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      };
    },
  };
}

async function candidateContext(
  db: FirebaseFirestore.Firestore,
  cfg: TournamentSemanticJobConfig,
  activeJobId?: string,
) {
  const baseline = buildTournamentV11Candidates({ sourceDays: sourceDays() });
  const barrier = await readyBarrier(db);
  const history = await loadHistoricalTournamentSignatures(historyAdapter(db, activeJobId), barrier, {
    reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    primaryModel: cfg.primaryModel,
    adversarialModel: cfg.adversarialModel,
  });
  const build = buildTournamentV11Candidates({
    sourceDays: sourceDays(),
    historicalSemanticSignatures: history.signatures,
  });
  return Object.freeze({ baseline, build, history });
}

export function isHistoricalTournamentSemanticApproval(
  data: Readonly<Record<string, unknown>>,
  contract: Readonly<{
    reviewContractVersion: string;
    promptSetSha256: string;
    primaryModel: string;
    adversarialModel: string;
  }>,
  activeJobId?: string,
): boolean {
  return data.decision === 'PASS'
    && data.reviewContractVersion === contract.reviewContractVersion
    && data.promptSetSha256 === contract.promptSetSha256
    && data.primaryModel === contract.primaryModel
    && data.adversarialModel === contract.adversarialModel
    && (activeJobId === undefined || data.generationJobId !== activeJobId);
}

export function historicalTournamentSemanticApprovalSignature(
  data: Readonly<Record<string, unknown>>,
  contract: Readonly<{
    reviewContractVersion: string;
    promptSetSha256: string;
    primaryModel: string;
    adversarialModel: string;
  }>,
  activeJobId?: string,
): string | null {
  return isHistoricalTournamentSemanticApproval(data, contract, activeJobId)
    && typeof data.semanticSignature === 'string'
    && /^[a-f0-9]{64}$/u.test(data.semanticSignature)
    ? data.semanticSignature : null;
}

export function publicationContinuationForStatus(
  lifecycle: SemanticJobState['lifecycle'],
  bundleRootComplete: boolean,
  checkpointPhase: unknown,
): boolean {
  if (lifecycle === 'running' || lifecycle === 'paused') return true;
  return lifecycle === 'ready' && (!bundleRootComplete || checkpointPhase !== 'ready');
}

export function finalizeAndAuditTournamentV11Selection(
  selection: Parameters<typeof finalizeTournamentV11TaskPool>[0]['selection'],
  receipts: ReadonlyMap<string, TournamentSemanticReceipt>,
) {
  const finalized = finalizeTournamentV11TaskPool({ selection, receipts });
  const runtimeAudit = auditTournamentV11RuntimePool(finalized);
  return Object.freeze({ finalized, runtimeAudit });
}

export function semanticJobLeaseAuthorizesAttempt(
  job: Readonly<{ lifecycle?: unknown; lease?: Readonly<{ token?: unknown; expiresAtMs?: unknown }> | null }>,
  leaseToken: string,
  nowMs: number,
): boolean {
  return job.lifecycle === 'running'
    && job.lease?.token === leaseToken
    && Number.isSafeInteger(job.lease.expiresAtMs)
    && nowMs < Number(job.lease.expiresAtMs);
}

export function semanticProviderAttemptIdFromError(error: unknown): string | null {
  if (!error || typeof error !== 'object' || Array.isArray(error)) return null;
  const value = (error as Readonly<{ semanticAttemptId?: unknown }>).semanticAttemptId;
  return typeof value === 'string' && /^tsa_[a-f0-9]{64}$/u.test(value) ? value : null;
}

class SemanticProviderAttemptFailure extends Error {
  readonly semanticAttemptId: string;
  readonly semanticAttemptOrdinal: number;
  readonly semanticAttemptPassOrdinal: number;

  constructor(
    semanticAttemptId: string,
    semanticAttemptOrdinal: number,
    semanticAttemptPassOrdinal: number,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : 'semantic_provider_error');
    this.name = 'SemanticProviderAttemptFailure';
    this.semanticAttemptId = semanticAttemptId;
    this.semanticAttemptOrdinal = semanticAttemptOrdinal;
    this.semanticAttemptPassOrdinal = semanticAttemptPassOrdinal;
  }
}

function firestoreJobRepository(
  db: FirebaseFirestore.Firestore,
  candidateById: ReadonlyMap<string, TournamentSemanticCandidate>,
  active: { jobId: string; leaseToken: string },
): SemanticJobRepository {
  const root = (jobId: string) => db.collection(TOURNAMENT_SEMANTIC_JOBS_COLLECTION).doc(jobId);
  const mutate = async (
    jobId: string,
    apply: (current: SemanticJobState) => SemanticJobState,
  ): Promise<SemanticJobState> => db.runTransaction(async (tx) => {
    const ref = root(jobId);
    const snapshot = await tx.get(ref);
    const current = jobStateFrom(snapshot.data());
    const next = apply(current);
    tx.set(ref, { ...next, cells: snapshot.get('cells') ?? {} });
    return next;
  });
  return {
    async createOrResume(input) {
      return db.runTransaction(async (tx) => {
        const ref = root(input.jobId);
        const snapshot = await tx.get(ref);
        active.jobId = input.jobId;
        if (snapshot.exists) return jobStateFrom(snapshot.data());
        const state = createInitialSemanticJobState(input);
        tx.create(ref, { ...state, cells: {} });
        return state;
      });
    },
    async claimLease(input) {
      const state = await mutate(input.jobId, (current) => claimSemanticJobLease(current, input));
      active.jobId = input.jobId;
      active.leaseToken = input.leaseToken;
      return state;
    },
    async savePendingReview(input) {
      return mutate(input.jobId, (current) => applySemanticJobPendingReview(current, input));
    },
    async checkpoint(input) {
      return db.runTransaction(async (tx) => {
        const ref = root(input.jobId);
        const snapshot = await tx.get(ref);
        const current = jobStateFrom(snapshot.data());
        const next = applySemanticJobCheckpoint(current, input);
        const terminalRef = ref.collection('terminals').doc(input.terminal.candidateId);
        const terminalSnapshot = await tx.get(terminalRef);
        const candidate = candidateById.get(input.terminal.candidateId);
        if (!candidate || candidate.contentSha256 !== input.terminal.contentSha256) {
          throw new Error('semantic_job_candidate_missing');
        }
        const terminalValue = {
          ...input.terminal,
          mode: candidate.mode,
          difficulty: candidate.difficulty,
          semanticSignature: candidate.semanticSignature,
        };
        if (terminalSnapshot.exists) {
          if (JSON.stringify(terminalSnapshot.data()) !== JSON.stringify(terminalValue)) {
            throw new Error('semantic_job_terminal_conflict');
          }
        } else tx.create(terminalRef, terminalValue);
        const cells = { ...(snapshot.get('cells') ?? {}) } as Record<string, Record<string, number>>;
        const cell = `${candidate.mode}:${candidate.difficulty}`;
        const previous = cells[cell] ?? {};
        cells[cell] = {
          processed: Number(previous.processed ?? 0) + 1,
          approved: Number(previous.approved ?? 0) + (input.terminal.decision === 'PASS' ? 1 : 0),
          rejected: Number(previous.rejected ?? 0) + (input.terminal.decision === 'REJECT' ? 1 : 0),
          quarantined: Number(previous.quarantined ?? 0) + (input.terminal.decision === 'QUARANTINED' ? 1 : 0),
          cacheHits: Number(previous.cacheHits ?? 0) + (input.terminal.source === 'cache' ? 1 : 0),
        };
        tx.set(ref, { ...next, cells });
        return next;
      });
    },
    async settle(input) {
      return mutate(input.jobId, (current) => settleSemanticJobBatch(current, input));
    },
  };
}

async function reserveSemanticAttempt(
  db: FirebaseFirestore.Firestore,
  active: { jobId: string; leaseToken: string },
  candidate: TournamentSemanticCandidate,
  pass: 'primary' | 'adversarial',
  dailyCap: number,
): Promise<TournamentSemanticAttempt | null> {
  if (!active.jobId || !active.leaseToken) throw new Error('semantic_job_lease_missing');
  const day = utcDateKey(Date.now());
  const usageRef = db.collection(AI_USAGE_COLLECTION).doc(day);
  const jobRef = db.collection(TOURNAMENT_SEMANTIC_JOBS_COLLECTION).doc(active.jobId);
  const ordinalKey = createHash('sha256').update(`${candidate.candidateId}\n${pass}`, 'utf8').digest('hex');
  return db.runTransaction(async (tx) => {
    const jobSnapshot = await tx.get(jobRef);
    const nowMs = Date.now();
    if (!semanticJobLeaseAuthorizesAttempt(jobSnapshot.data() ?? {}, active.leaseToken, nowMs)) {
      throw new Error('semantic_job_stale_lease');
    }
    const activeAttempts = { ...(jobSnapshot.get('semanticActiveAttempts') ?? {}) } as Record<string, string>;
    const activeAttemptId = activeAttempts[ordinalKey];
    let abandoned: TournamentSemanticAttempt | null = null;
    if (typeof activeAttemptId === 'string' && /^tsa_[a-f0-9]{64}$/u.test(activeAttemptId)) {
      const activeAttemptRef = jobRef.collection('attempts').doc(activeAttemptId);
      const activeAttemptSnapshot = await tx.get(activeAttemptRef);
      if (activeAttemptSnapshot.exists) {
        const existing = activeAttemptSnapshot.data() as TournamentSemanticAttempt;
        const resumed = resumeSemanticAttempt(existing, active.leaseToken);
        if (resumed.action === 'reuse_returned' || resumed.action === 'already_recorded'
          || resumed.action === 'transition_calling') return resumed.attempt;
        abandoned = existing;
      }
    }
    const usage = await tx.get(usageRef);
    const used = Number(usage.get('semanticRequests') ?? 0);
    if (used >= dailyCap) return null;
    const ordinals = { ...(jobSnapshot.get('semanticAttemptOrdinals') ?? {}) } as Record<string, number>;
    const allocated = allocateSemanticAttemptOrdinals({
      globalOrdinal: Number(jobSnapshot.get('semanticGlobalAttemptOrdinal') ?? 0),
      passOrdinal: Number(ordinals[ordinalKey] ?? 0),
    });
    ordinals[ordinalKey] = allocated.passOrdinal;
    const attempt = createReservedSemanticAttempt({
      jobId: active.jobId,
      candidateId: candidate.candidateId,
      pass,
      ordinal: allocated.ordinal,
      passOrdinal: allocated.passOrdinal,
      leaseToken: active.leaseToken,
      nowMs,
    });
    tx.set(usageRef, {
      semanticRequests: used + 1,
      updatedAtMs: nowMs,
    }, { merge: true });
    activeAttempts[ordinalKey] = attempt.internalAttemptId;
    tx.set(jobRef, {
      semanticGlobalAttemptOrdinal: allocated.ordinal,
      semanticAttemptOrdinals: ordinals,
      semanticActiveAttempts: activeAttempts,
    }, { merge: true });
    if (abandoned && (abandoned.state === 'reserved' || abandoned.state === 'calling')) {
      tx.set(jobRef.collection('attempts').doc(abandoned.internalAttemptId), transitionSemanticAttempt(abandoned, {
        kind: 'abandoned', leaseToken: abandoned.leaseToken, nowMs,
      }));
    }
    tx.create(jobRef.collection('attempts').doc(attempt.internalAttemptId), attempt);
    return attempt;
  });
}

function returnedSemanticProviderResponse(attempt: TournamentSemanticAttempt) {
  if ((attempt.state !== 'returned' && attempt.state !== 'recorded')
    || !attempt.structuredResult || !Number.isSafeInteger(attempt.inputTokens)
    || !Number.isSafeInteger(attempt.outputTokens)) {
    throw new Error('semantic_attempt_response_invalid');
  }
  const raw = Object.prototype.hasOwnProperty.call(attempt.structuredResult, 'raw')
    ? attempt.structuredResult.raw : attempt.structuredResult;
  return Object.freeze({
    raw,
    inputTokens: attempt.inputTokens!,
    outputTokens: attempt.outputTokens!,
  });
}

async function callSemanticProvider(
  db: FirebaseFirestore.Firestore,
  cfg: TournamentSemanticJobConfig,
  active: { jobId: string; leaseToken: string },
  candidate: TournamentSemanticCandidate,
  request: Parameters<TournamentSemanticReviewProvider['review']>[0],
  invokeProvider?: () => ReturnType<TournamentSemanticReviewProvider['review']>,
): Promise<{
  response: Awaited<ReturnType<TournamentSemanticReviewProvider['review']>>;
  attemptId: string;
  ordinal: number;
  passOrdinal: number;
  providerCalled: boolean;
}> {
  const reserved = await reserveSemanticAttempt(db, active, candidate, request.pass, cfg.semanticDailyRequestCap);
  if (!reserved) throw new Error('semantic_daily_cap_exhausted');
  const jobRef = db.collection(TOURNAMENT_SEMANTIC_JOBS_COLLECTION).doc(active.jobId);
  const attemptRef = jobRef.collection('attempts').doc(reserved.internalAttemptId);
  const prepared = await db.runTransaction(async (tx) => {
    const jobSnapshot = await tx.get(jobRef);
    const attemptSnapshot = await tx.get(attemptRef);
    const nowMs = Date.now();
    if (!semanticJobLeaseAuthorizesAttempt(jobSnapshot.data() ?? {}, active.leaseToken, nowMs)) {
      throw new Error('semantic_job_stale_lease');
    }
    if (!attemptSnapshot.exists) throw new Error('semantic_attempt_missing');
    const latest = attemptSnapshot.data() as TournamentSemanticAttempt;
    const resumed = resumeSemanticAttempt(latest, active.leaseToken);
    if (resumed.action === 'reuse_returned' || resumed.action === 'already_recorded') {
      return Object.freeze({ attempt: resumed.attempt, callProvider: false as const });
    }
    if (resumed.action !== 'transition_calling') throw new Error('semantic_attempt_reconcile_required');
    const calling = transitionSemanticAttempt(resumed.attempt, {
      kind: 'calling', leaseToken: active.leaseToken, nowMs,
    });
    tx.set(attemptRef, calling);
    return Object.freeze({ attempt: calling, callProvider: true as const });
  });
  let response = prepared.callProvider ? undefined : returnedSemanticProviderResponse(prepared.attempt);
  // Secret access is deliberately after durable budget authorization and only
  // on this real provider-attempt path. Dry-run/status/cache hits never read it.
  if (prepared.callProvider) {
    try {
      if (invokeProvider) response = await invokeProvider();
      else {
        const apiKey = String(OPENAI_API_KEY.value() || '').trim();
        if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
        response = await createTournamentSemanticOpenAiProvider({ apiKey }).review(request);
      }
    } catch (error) {
      throw new SemanticProviderAttemptFailure(
        reserved.internalAttemptId, reserved.ordinal, reserved.passOrdinal, error,
      );
    }
    const raw = response.raw;
    if (raw === undefined) throw new SemanticProviderAttemptFailure(
      reserved.internalAttemptId, reserved.ordinal, reserved.passOrdinal, new Error('provider_response_invalid'),
    );
    const returned = transitionSemanticAttempt(prepared.attempt, {
      kind: 'returned',
      leaseToken: prepared.attempt.leaseToken,
      nowMs: Date.now(),
      responseHash: createHash('sha256').update(JSON.stringify(raw), 'utf8').digest('hex'),
      structuredResult: { raw },
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    });
    await db.runTransaction(async (tx) => {
      const jobSnapshot = await tx.get(jobRef);
      const latest = await tx.get(attemptRef);
      const nowMs = Date.now();
      if (!semanticJobLeaseAuthorizesAttempt(jobSnapshot.data() ?? {}, active.leaseToken, nowMs)
        || latest.get('state') !== 'calling'
        || latest.get('leaseToken') !== prepared.attempt.leaseToken) {
        throw new Error('semantic_attempt_stale_lease');
      }
      tx.set(attemptRef, { ...returned, updatedAtMs: nowMs });
    });
  }
  await db.runTransaction(async (tx) => {
    const billingRef = db.collection(AI_BILLING_COLLECTION).doc(reserved.internalAttemptId);
    const jobSnapshot = await tx.get(jobRef);
    const latest = await tx.get(attemptRef);
    const billing = await tx.get(billingRef);
    const nowMs = Date.now();
    if (!semanticJobLeaseAuthorizesAttempt(jobSnapshot.data() ?? {}, active.leaseToken, nowMs)) {
      throw new Error('semantic_attempt_stale_lease');
    }
    const latestAttempt = latest.data() as TournamentSemanticAttempt;
    if (latestAttempt.state === 'recorded' && billing.exists) return;
    if (latestAttempt.state !== 'returned') throw new Error('semantic_attempt_response_invalid');
    if (!billing.exists) tx.create(billingRef, {
      internalAttemptId: latestAttempt.internalAttemptId,
      jobId: active.jobId,
      candidateId: candidate.candidateId,
      pass: request.pass,
      model: request.model,
      inputTokens: latestAttempt.inputTokens,
      outputTokens: latestAttempt.outputTokens,
      responseHash: latestAttempt.responseHash,
      recordedAtMs: nowMs,
    });
    tx.set(attemptRef, transitionSemanticAttempt(latestAttempt, {
      kind: 'recorded', leaseToken: latestAttempt.leaseToken, nowMs,
    }));
  });
  if (!response) throw new Error('semantic_attempt_response_invalid');
  return {
    response,
    attemptId: reserved.internalAttemptId,
    ordinal: reserved.ordinal,
    passOrdinal: reserved.passOrdinal,
    providerCalled: prepared.callProvider,
  };
}

export async function callSemanticProviderForJob(input: Readonly<{
  db: FirebaseFirestore.Firestore;
  config: Pick<TournamentSemanticJobConfig, 'semanticDailyRequestCap'>;
  active: { jobId: string; leaseToken: string };
  candidate: TournamentSemanticCandidate;
  request: Parameters<TournamentSemanticReviewProvider['review']>[0];
  invokeProvider: () => ReturnType<TournamentSemanticReviewProvider['review']>;
}>) {
  return callSemanticProvider(
    input.db,
    input.config as TournamentSemanticJobConfig,
    input.active,
    input.candidate,
    input.request,
    input.invokeProvider,
  );
}

async function reviewCandidateForJob(
  db: FirebaseFirestore.Firestore,
  cfg: TournamentSemanticJobConfig,
  active: { jobId: string; leaseToken: string },
  store: ReturnType<typeof createTournamentSemanticReceiptStore>,
  candidate: TournamentSemanticCandidate,
) {
  let budgetPaused = false;
  let lastAttemptId = '';
  const attemptOrdinals: Partial<Record<'primary' | 'adversarial', number>> = {};
  const provider: TournamentSemanticReviewProvider = {
    async review(request) {
      try {
        const called = await callSemanticProvider(db, cfg, active, candidate, request);
        lastAttemptId = called.attemptId;
        attemptOrdinals[request.pass] = Math.max(attemptOrdinals[request.pass] ?? 0, called.passOrdinal);
        return called.response;
      } catch (error) {
        lastAttemptId = semanticProviderAttemptIdFromError(error) ?? lastAttemptId;
        if (error instanceof SemanticProviderAttemptFailure) {
          attemptOrdinals[request.pass] = Math.max(
            attemptOrdinals[request.pass] ?? 0,
            error.semanticAttemptPassOrdinal,
          );
        }
        if (error instanceof Error && error.message === 'semantic_daily_cap_exhausted') budgetPaused = true;
        throw error;
      }
    },
  };
  const startedAtMs = Date.now();
  const reviewed = await reviewTournamentCandidate(candidate, {
    primaryModel: cfg.primaryModel,
    adversarialModel: cfg.adversarialModel,
  }, provider);
  const cumulativeProviderAttempts = (attemptOrdinals.primary ?? 0) + (attemptOrdinals.adversarial ?? 0);
  if (budgetPaused) return Object.freeze({
    kind: 'BUDGET_PAUSED' as const,
    providerAttempts: cumulativeProviderAttempts,
    providerAttemptsCumulative: true as const,
    reason: 'daily_cap_exhausted' as const,
  });
  const base = {
    contentSha256: candidate.contentSha256,
    canonicalTaskSnapshotHash: candidate.contentSha256,
    semanticSignature: candidate.semanticSignature,
    candidateId: candidate.candidateId,
    mode: candidate.mode,
    difficulty: candidate.difficulty,
    provenanceKeys: candidate.provenanceKeys,
    reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    primaryPromptVersion: TOURNAMENT_SEMANTIC_PROMPTS.primary.version,
    adversarialPromptVersion: TOURNAMENT_SEMANTIC_PROMPTS.adversarial.version,
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    primaryModel: cfg.primaryModel,
    adversarialModel: cfg.adversarialModel,
    requestAccounting: reviewed.requestAccounting,
    createdAtMs: startedAtMs,
    completedAtMs: Date.now(),
    generationJobId: active.jobId,
  } as const;
  if (reviewed.decision === 'PASS') {
    const receipt: TournamentSemanticReceipt = {
      ...base,
      decision: 'PASS',
      primaryVerdict: reviewed.primaryVerdict,
      adversarialVerdict: reviewed.adversarialVerdict,
    };
    const stored = await store.createImmutable(receipt, candidate);
    return Object.freeze({
      kind: 'PASS' as const,
      providerAttempts: cumulativeProviderAttempts,
      providerAttemptsCumulative: true as const,
      evidenceRef: stored.id,
    });
  }
  if (reviewed.decision === 'REJECT') {
    const receipt: TournamentSemanticReceipt = {
      ...base,
      decision: 'REJECT',
      primaryVerdict: reviewed.primaryVerdict,
      ...(reviewed.adversarialVerdict ? { adversarialVerdict: reviewed.adversarialVerdict } : {}),
      blockingFindings: reviewed.blockingFindings,
    };
    const stored = await store.createImmutable(receipt, candidate);
    return Object.freeze({
      kind: 'REJECT' as const,
      providerAttempts: cumulativeProviderAttempts,
      providerAttemptsCumulative: true as const,
      evidenceRef: stored.id,
    });
  }
  if (!lastAttemptId) throw new Error('semantic_review_attempt_missing');
  const evidence: TournamentSemanticReceipt = {
    ...base,
    decision: 'ERROR',
    internalAttemptId: lastAttemptId,
    completedPasses: reviewed.completedPasses,
    failureCode: reviewed.failureCode,
  };
  const stored = await store.createEvidence(evidence);
  return Object.freeze({
    kind: reviewed.failureCode === 'provider_error' ? 'TRANSIENT_ERROR' as const : 'MALFORMED' as const,
    providerAttempts: cumulativeProviderAttempts,
    providerAttemptsCumulative: true as const,
    evidenceRef: stored.id,
  });
}

async function approvedSelection(
  db: FirebaseFirestore.Firestore,
  jobId: string,
  candidateById: ReadonlyMap<string, TournamentSemanticCandidate>,
) {
  const snapshot = await db.collection(TOURNAMENT_SEMANTIC_JOBS_COLLECTION).doc(jobId)
    .collection('terminals').where('decision', '==', 'PASS').limit(5_000).get();
  const approved = snapshot.docs
    .map((item) => candidateById.get(item.id))
    .filter((item): item is TournamentSemanticCandidate => Boolean(item));
  return selectTournamentV11Candidates({ candidates: approved });
}

function publicationPersistence(db: FirebaseFirestore.Firestore) {
  return {
    async get(path: string) {
      const snapshot = await db.doc(path).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    async create(path: string, value: unknown) {
      try { await db.doc(path).create(value as FirebaseFirestore.DocumentData); }
      catch (error) {
        if ((error as { code?: number | string })?.code === 6
          || (error as { code?: number | string })?.code === 'already-exists') throw new Error('already_exists');
        throw error;
      }
    },
    async compareAndSet(path: string, expectedRevision: number, value: unknown) {
      await db.runTransaction(async (tx) => {
        const ref = db.doc(path);
        const snapshot = await tx.get(ref);
        if (snapshot.get('revision') !== expectedRevision) throw new Error('publication_revision_conflict');
        tx.set(ref, value as FirebaseFirestore.DocumentData);
      });
    },
  };
}

function productionV11Dependencies(db: FirebaseFirestore.Firestore): AdminTournamentV11Dependencies {
  return {
    async dryRun(input) {
      const cfg = await resolveTournamentSemanticJobConfig(db);
      assertJobEnabled(cfg, 'tournament');
      const context = await candidateContext(db, cfg);
      const persistence = receiptPersistence(db);
      const report = await dryRunTournamentSemanticJob({
        poolVersion: input.poolVersion,
        candidates: context.baseline.candidates,
        historicalSignatures: context.history.signatures,
        lookupCachedTerminal: (candidate) => cachedTerminal(persistence, candidate, cfg),
        assessDiversity: async (candidates) => {
          const selection = selectTournamentV11Candidates({ candidates });
          return selection.ok
            ? { feasible: true, shortages: [] }
            : { feasible: false, shortages: selection.shortages.map((item) => `${item.axis}:${item.key}:${item.available}/${item.required}`) };
        },
      });
      return Object.freeze({ ...report, cells: candidateCells(context.baseline.candidates) });
    },
    async runBatch(input) {
      const cfg = await resolveTournamentSemanticJobConfig(db);
      assertJobEnabled(cfg, 'tournament');
      const context = await candidateContext(db, cfg, input.jobId);
      const candidateById = new Map(context.build.candidates.map((candidate) => [candidate.candidateId, candidate] as const));
      const active = { jobId: '', leaseToken: '' };
      const persistence = receiptPersistence(db);
      const store = createTournamentSemanticReceiptStore(persistence);
      const result = await runTournamentSemanticJobBatch({
        reviewIdentity: semanticJobReviewIdentity(cfg),
        repository: firestoreJobRepository(db, candidateById, active),
        loadCandidates: async () => context.build.candidates,
        lookupCachedTerminal: (candidate) => cachedTerminal(persistence, candidate, cfg),
        reviewCandidate: (candidate) => reviewCandidateForJob(db, cfg, active, store, candidate),
        assessSupply: async (state) => (await approvedSelection(db, state.jobId, candidateById)).ok ? 'ready' : 'continue',
        nowMs: () => Date.now(),
        createLeaseToken: () => randomUUID(),
      }, {
        poolVersion: input.poolVersion,
        jobId: input.jobId,
        maxCandidates: input.maxCandidates,
        deadlineAtMs: Date.now() + 480_000,
      });
      const jobSnapshot = await db.collection(TOURNAMENT_SEMANTIC_JOBS_COLLECTION).doc(result.jobId).get();
      const jobState = jobStateFrom(jobSnapshot.data());
      const selection = await approvedSelection(db, result.jobId, candidateById);
      let continuation = result.continuation;
      let publicationConflict = false;
      if (result.state === 'ready' && selection.ok) {
        const receipts = new Map<string, TournamentSemanticReceipt>();
        for (const candidate of selection.selected) {
          const raw = await persistence.get(receiptPath(candidate, cfg));
          validateTournamentSemanticReceipt(raw, candidate);
          if (raw.decision !== 'PASS') throw new Error('bundle_receipt_missing');
          receipts.set(candidate.contentSha256, raw);
        }
        const { finalized, runtimeAudit } = finalizeAndAuditTournamentV11Selection(selection, receipts);
        try {
          const bundle = await finalizeTournamentV11Bundle({
            finalized,
            runtimeAudit,
            jobBinding: tournamentV11BundleJobBinding(jobState),
            persistence: publicationPersistence(db),
            maxOperations: 100,
          });
          continuation = bundle.continuation;
        } catch (error) {
          if (error instanceof Error && ['publication_plan_conflict', 'publication_conflict',
            'publication_root_premature'].includes(error.message)) {
            publicationConflict = true;
            continuation = false;
          } else throw error;
        }
      }
      const shortages = publicationConflict ? ['publication_conflict']
        : selection.ok ? [] : selection.shortages.map((item) => `${item.axis}:${item.key}:${item.available}/${item.required}`);
      return Object.freeze({
        ...result,
        ...(publicationConflict ? { state: 'blocked' as const, shortage: false } : {}),
        continuation,
        cells: Object.freeze({ ...(jobSnapshot.get('cells') ?? {}) }),
        shortages: Object.freeze(shortages),
      });
    },
    async status(input) {
      const cfg = await resolveTournamentSemanticJobConfig(db);
      assertJobEnabled(cfg, 'tournament');
      const snapshot = await db.collection(TOURNAMENT_SEMANTIC_JOBS_COLLECTION).doc(input.jobId).get();
      const state = jobStateFrom(snapshot.data());
      if (state.poolVersion !== input.poolVersion) throw new HttpsError('not-found', 'tournament_semantic_job_not_found');
      assertSemanticJobReviewIdentity(state, semanticJobReviewIdentity(cfg));
      const bundleRoot = db.collection(TOURNAMENT_POOL_V11_BUNDLES_COLLECTION).doc(input.poolVersion);
      const [rootSnapshot, checkpointSnapshot] = await Promise.all([
        bundleRoot.get(),
        bundleRoot.collection('internal').doc('publication_checkpoint').get(),
      ]);
      const publicationStatus = tournamentV11BundlePublicationStatus(
        rootSnapshot.exists ? rootSnapshot.data() : null,
        checkpointSnapshot.exists ? checkpointSnapshot.data() : null,
        tournamentV11BundleJobBinding(state),
      );
      const base = batchFromState(state, Object.freeze({ ...(snapshot.get('cells') ?? {}) }));
      if (publicationStatus === 'conflict') return Object.freeze({
        ...base,
        state: 'blocked' as const,
        continuation: false,
        shortage: false,
        shortages: Object.freeze(['publication_conflict']),
      });
      return Object.freeze({
        ...base,
        continuation: publicationContinuationForStatus(
          state.lifecycle,
          publicationStatus === 'ready',
          publicationStatus === 'ready' ? 'ready' : publicationStatus,
        ),
      });
    },
  };
}

/**
 * Existing callable name and security boundary are intentionally preserved.
 * Legacy clicks are only an input compatibility envelope; all five text modes
 * now flow through the V11 candidate/review job and never through runTextGeneration.
 */
export const adminFillTournamentPool = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 540, secrets: [OPENAI_API_KEY] },
  async (request) => {
    requirePermission(request, 'content.draft.write');
    return runAdminFillTournamentPoolV11(request.data, productionV11Dependencies(admin.firestore()));
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

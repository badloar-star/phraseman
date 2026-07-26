// ═══════════════════════════════════════════════════════════════════════════
// admin_tournament_full.ts — генерация ЦЕЛОГО турнира одним вызовом.
//
// зачем: владелец забраковал генерацию пачками однотипных вопросов — «чтобы
// генерация ВСЕГДА генерировала 1 фулл готовый турнир, все раунды, и для
// каждого режима своё, и сохранялось в отдельный раздел пула». Здесь один
// вызов = 24 задания: план раундов берётся из tournament_ai_blueprint (он
// зеркалит selectRoundTasks сервера), каждый тип просится своим промптом,
// задания ложатся в пул с режимом своего типа — разделы не смешиваются.
//
// Вынесено отдельным файлом, чтобы не раздувать admin_tournament_tasks.ts
// (там уже 1000+ строк) и чтобы старая пакетная генерация осталась рабочей.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { TOURNAMENT_TASKS_COLLECTION, type TournamentTask } from './tournament_core';
import {
  TOURNAMENT_AI_TOTAL_TASKS,
  buildTournamentPlan,
  flattenPlan,
  type TournamentAiKind,
} from './tournament_ai_blueprint';
import {
  KIND_SYSTEM_PROMPT,
  buildKindTask,
  responseFormatForKind,
} from './tournament_ai_kind_prompts';
import {
  kindItemToTask,
  kindTaskPassesServerContract,
  parseKindItem,
  type ParsedKindItem,
} from './tournament_ai_kind_items';
import { isTournamentAiLevel, type TournamentAiLevel } from './tournament_ai_generator';
import { onlyKeys, publicAdminTask, requirePermission } from './admin_tournament_tasks';
import { openAiChat } from './explain/explain_provider';
import { assertJobEnabled, resolveJobConfig } from './openai_jobs_config';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const WRITE_BATCH_SIZE = 400;
const AI_BILLING_COLLECTION = 'tournament_ai_billing';
const AI_BUDGET_COLLECTION = 'tournament_ai_budget';
const AI_MAX_REPAIRS = 2;
const AI_TEMPERATURE = 0.35;
const AI_MAX_TOKENS = 6_000;

/** Уровень словами — модель держит сложность точнее, чем по голой метке CEFR. */
const LEVEL_ANCHORS: Readonly<Record<TournamentAiLevel, string>> = Object.freeze({
  A1: 'level 1 of 6, absolute beginner: the 500 most common words, present simple only',
  A2: 'level 2 of 6, elementary: everyday routines, past simple, basic future',
  B1: 'level 3 of 6, intermediate: opinions, plans, common phrasal verbs',
  B2: 'level 4 of 6, upper-intermediate: nuanced tenses, common idioms, collocations',
  C1: 'level 5 of 6, advanced: subtle register shifts, idiomatic usage',
  C2: 'level 6 of 6, mastery: native-like nuance, rare idioms, stylistic contrast',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type TournamentFullRequest = {
  readonly level: TournamentAiLevel;
  readonly topicHint: string;
  readonly dryRun: boolean;
};

export function parseTournamentFullRequest(data: unknown): TournamentFullRequest {
  const record = onlyKeys(data, ['level', 'topicHint', 'dryRun'], 'tournament_ai_full_invalid');
  const level = String(record.level ?? 'A2').trim();
  if (!isTournamentAiLevel(level)) {
    throw new HttpsError('invalid-argument', 'tournament_ai_level_invalid');
  }
  const topicHint = String(record.topicHint ?? '').trim().slice(0, 120);
  return Object.freeze({ level, topicHint, dryRun: record.dryRun === true });
}

/** Сложность 1..3 → слово: модель держит уровень по слову лучше, чем по числу. */
export function difficultyWord(difficulty: number): 'easy' | 'medium' | 'hard' {
  if (difficulty <= 1) return 'easy';
  return difficulty === 2 ? 'medium' : 'hard';
}

/** Группы «тип + сложность»: один запрос к модели на группу, а не на задание. */
export type KindGroup = {
  readonly kind: TournamentAiKind;
  readonly difficulty: number;
  readonly count: number;
};

export function groupPlannedTasks(): readonly KindGroup[] {
  const groups = new Map<string, { kind: TournamentAiKind; difficulty: number; count: number }>();
  for (const planned of flattenPlan(buildTournamentPlan())) {
    const key = `${planned.kind}:${planned.difficulty}`;
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { kind: planned.kind, difficulty: planned.difficulty, count: 1 });
  }
  return Object.freeze([...groups.values()].map((group) => Object.freeze(group)));
}

type GroupOutcome = {
  readonly items: readonly ParsedKindItem[];
  readonly errors: readonly string[];
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly requests: number;
};

/**
 * Одна группа: N заданий одного типа и одной сложности.
 * Плохие отсеиваются поштучно — один брак не роняет оплаченный запрос.
 */
async function generateKindGroup(
  apiKey: string,
  model: string,
  params: {
    readonly kind: TournamentAiKind;
    readonly level: TournamentAiLevel;
    readonly count: number;
    readonly difficulty: number;
    readonly topicHint: string;
    readonly previousPrompts: readonly string[];
  },
): Promise<GroupOutcome> {
  const baseTask = buildKindTask({
    kind: params.kind,
    level: params.level,
    levelAnchor: LEVEL_ANCHORS[params.level],
    count: params.count,
    difficultyWord: difficultyWord(params.difficulty),
    topicHint: params.topicHint || undefined,
    previousPrompts: params.previousPrompts,
  });

  let promptTokens = 0;
  let completionTokens = 0;
  let requests = 0;
  let currentTask = baseTask;
  const errors = new Set<string>();
  let best: readonly ParsedKindItem[] = [];

  for (let attempt = 0; attempt <= AI_MAX_REPAIRS; attempt += 1) {
    const result = await openAiChat({
      apiKey,
      model,
      messages: [
        { role: 'system', content: KIND_SYSTEM_PROMPT },
        { role: 'user', content: currentTask },
      ],
      maxTokens: AI_MAX_TOKENS,
      temperature: AI_TEMPERATURE,
      responseFormat: responseFormatForKind(params.kind),
    });
    requests += 1;
    promptTokens += result.promptTokens;
    completionTokens += result.completionTokens;

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      errors.add('kind_batch_json_invalid');
      currentTask = `${baseTask}\nRepair: previous output was not valid JSON. Return JSON only.`;
      continue;
    }

    const rawItems = isRecord(parsed) && Array.isArray(parsed.items) ? parsed.items : [];
    const accepted: ParsedKindItem[] = [];
    for (const raw of rawItems) {
      const item = parseKindItem(raw, params.kind);
      if (item.ok) accepted.push(item.item);
      else item.errors.forEach((code) => errors.add(code));
    }
    if (accepted.length > best.length) best = accepted;

    if (accepted.length >= params.count) {
      return {
        items: accepted.slice(0, params.count),
        errors: Object.freeze([...errors]),
        promptTokens,
        completionTokens,
        requests,
      };
    }
    // зачем: не хватило — просим починить, но лучший результат уже сохранён.
    // Так последняя неудачная попытка не обнуляет то, что уже оплачено.
    currentTask = `${baseTask}\nRepair: fix these violations and return the full corrected JSON: ${JSON.stringify([...errors].slice(0, 10))}`;
  }

  return { items: best, errors: Object.freeze([...errors]), promptTokens, completionTokens, requests };
}

/** Дневной кап на запросы к OpenAI — тот же счётчик, что у пакетной генерации. */
async function reserveDailyBudget(
  db: FirebaseFirestore.Firestore,
  cap: number,
  requested: number,
  nowMs: number,
): Promise<void> {
  const dayKey = new Date(nowMs).toISOString().slice(0, 10);
  const ref = db.collection(AI_BUDGET_COLLECTION).doc(dayKey);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = Number(snap.data()?.batches ?? 0);
    if (used + requested > cap) {
      throw new HttpsError('resource-exhausted', 'tournament_ai_daily_cap_reached');
    }
    tx.set(ref, { batches: used + requested, updatedAtMs: nowMs }, { merge: true });
  });
}

export const adminGenerateTournamentAi = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 540, secrets: [OPENAI_API_KEY] },
  async (request) => {
    requirePermission(request, 'content.draft.write');
    const params = parseTournamentFullRequest(request.data);
    const db = admin.firestore();
    const nowMs = Date.now();

    const cfg = await resolveJobConfig(db, 'tournament');
    assertJobEnabled(cfg, 'tournament');
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

    const groups = groupPlannedTasks();
    // Кап по числу групп: каждая — отдельный запрос к OpenAI.
    await reserveDailyBudget(db, cfg.globalDailyCap, groups.length, nowMs);

    const collected: Array<{ readonly item: ParsedKindItem; readonly difficulty: number }> = [];
    const rejected = new Set<string>();
    const usedPrompts: string[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let requests = 0;

    try {
      for (const group of groups) {
        const outcome = await generateKindGroup(apiKey, cfg.model, {
          kind: group.kind,
          level: params.level,
          count: group.count,
          difficulty: group.difficulty,
          topicHint: params.topicHint,
          previousPrompts: usedPrompts.slice(-80),
        });
        promptTokens += outcome.promptTokens;
        completionTokens += outcome.completionTokens;
        requests += outcome.requests;
        outcome.errors.forEach((code) => rejected.add(code));
        for (const item of outcome.items) {
          usedPrompts.push(item.prompt);
          collected.push({ item, difficulty: group.difficulty });
        }
      }
    } finally {
      // billing в finally: падение провайдера посреди цикла не должно прятать
      // уже потраченные токены от дашборда трат.
      if (requests > 0) {
        await db.collection(AI_BILLING_COLLECTION).add({
          model: cfg.model,
          promptTokens,
          completionTokens,
          requests,
          level: params.level,
          mode: 'full_tournament',
          dryRun: params.dryRun,
          uid: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
          createdAtMs: nowMs,
        }).catch((error) => console.error('[tournament_ai_full] billing write failed', error));
      }
    }

    // Задания пула + отсев тех, что не проходят серверный контракт: битое
    // задание в пуле молча выпало бы из выборки раунда.
    const tasks: TournamentTask[] = [];
    for (const entry of collected) {
      const task = kindItemToTask(entry.item, { level: params.level, difficulty: entry.difficulty });
      if (kindTaskPassesServerContract(task)) tasks.push(task);
      else rejected.add('kind_server_contract_failed');
    }

    const byMode: Record<string, number> = {};
    for (const task of tasks) byMode[task.mode] = (byMode[task.mode] ?? 0) + 1;

    const report = {
      ok: true as const,
      planned: TOURNAMENT_AI_TOTAL_TASKS,
      produced: tasks.length,
      byMode,
      rejected: [...rejected],
      samples: tasks.slice(0, 6).map((task) => publicAdminTask(task.taskId, task)),
    };

    if (params.dryRun) return { ...report, dryRun: true, written: 0 };

    // Запись батчами; уже опубликованные задания не трогаем.
    let written = 0;
    const collection = db.collection(TOURNAMENT_TASKS_COLLECTION);
    for (let i = 0; i < tasks.length; i += WRITE_BATCH_SIZE) {
      const chunk = tasks.slice(i, i + WRITE_BATCH_SIZE);
      const snapshots = await db.getAll(...chunk.map((task) => collection.doc(task.taskId)));
      const batch = db.batch();
      for (let j = 0; j < chunk.length; j += 1) {
        if (snapshots[j].exists && snapshots[j].get('verified') === true) continue;
        batch.set(collection.doc(chunk[j].taskId), {
          ...chunk[j],
          source: 'ai',
          createdAtMs: nowMs,
        }, { merge: true });
        written += 1;
      }
      await batch.commit();
    }

    return { ...report, dryRun: false, written };
  },
);

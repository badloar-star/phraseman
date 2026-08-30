// ═══════════════════════════════════════════════════════════════════════════
// max_voice_tutor_memory.ts — память учителя между звонками + знание приложения.
//
// зачем: владелец 2026-08-16 — вариант A «личный учитель»: учитель помнит
// ученика (имя, интересы, повторяющиеся ошибки), домашку и тему на завтра,
// ведёт счёт уроков и советует шаги В РАМКАХ приложения (по уставу из админки).
//
// Один док на ученика: voice_tutor_memory/{vtm_<hash authUid|stableUid>}
// (docId — тот же паттерн, что у квоты). Пишет ТОЛЬКО сервер: минт читает,
// разбор после звонка (premiumDialogReview, mode 'tutor') обновляет. Клиент к
// коллекции доступа не имеет (firestore.rules → allow read, write: if false).
//
// Экономика: 1 чтение на минт, 1 запись на звонок. Устав — 1 чтение в час на
// инстанс (кэш). Всё изменчивое уходит в ХВОСТ instructions (кэш префикса).
// Данные персональные → Privacy Policy обязана описывать (см. план 2026-08-16),
// удаление аккаунта чистит коллекцию (account_delete.ts, поля authUid/stableUid).
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { PRODUCT_CHARTER_DOC, parseProductCharter, type ProductCharter } from './jarvis/product_charter';
import {
  canDoGoalById,
  canDoProgress,
  levelFromMastery,
  parseCanDoMastery,
  pickNextGoal,
  type CanDoMastery,
} from './max_voice_can_do_goals';

export const VOICE_TUTOR_MEMORY_COLLECTION = 'voice_tutor_memory';

/** Потолки — память должна оставаться дешёвой и помещаться в хвост промпта. */
export const TUTOR_MEMORY_FACTS_MAX = 8;
export const TUTOR_MEMORY_ERRORS_MAX = 8;
export const TUTOR_MEMORY_HOMEWORK_MAX = 6;
export const TUTOR_MEMORY_ITEM_MAX_CHARS = 140;
export const TUTOR_MEMORY_BLOCK_MAX_CHARS = 2_600;
export const TUTOR_MEMORY_RESOLVED_ISSUES_MAX = 12;
/** Короткий журнал для идемпотентности ретраев; старые id вытесняются FIFO. */
export const TUTOR_MEMORY_RECENT_SESSIONS_MAX = 32;
const TUTOR_MEMORY_SESSION_ID_MAX_CHARS = 80;

// ── Ступень 1 плана обучения (владелец 2026-08-17: «1 → 2 → 3») ─────────────
// Очередь ПОВТОРЕНИЯ РЕЧИ: каждая отработанная фраза созревает по расширяющимся
// интервалам (Cepeda: 1 → 3 → 7 → 21 день); учитель в начале урока просит СКАЗАТЬ
// созревшие, результат двигает интервал. Домашка входит в очередь на завтра.
export const TUTOR_PHRASE_QUEUE_MAX = 20;
export const TUTOR_PHRASE_DUE_MAX = 4;
/** Интервалы (дни) по «коробке»; выше последней — коробка держится на 21 дне. */
export const TUTOR_PHRASE_INTERVAL_DAYS = [1, 3, 7, 21] as const;
/** Типы уроков чередуются по номеру урока (как «цель звонка» у Duolingo/Loora). */
export const TUTOR_LESSON_TYPES = ['new_material', 'review_and_scene', 'free_talk'] as const;
export type TutorLessonType = typeof TUTOR_LESSON_TYPES[number];

export interface TutorPhraseQueueItem {
  text: string;
  /** Индекс в TUTOR_PHRASE_INTERVAL_DAYS. */
  box: number;
  dueAtMs: number;
}

export interface TutorConversationHook {
  id: string;
  text: string;
  evidenceSessionId: string;
  updatedAtMs: number;
}

export interface TutorActiveIssue {
  id: string;
  label: string;
  evidenceCount: number;
  lastSeenAtMs: number;
}

export interface TutorResolvedIssue {
  id: string;
  label: string;
  resolvedAtMs: number;
}

export type TutorPacePreference = 'slower' | 'normal' | 'faster';

export interface TutorMemory {
  schemaVersion: 2;
  stableUid: string;
  authUid?: string;
  preferredName: string | null;
  learningGoal: string | null;
  pacePreference: TutorPacePreference | null;
  conversationHooks: TutorConversationHook[];
  activeIssues: TutorActiveIssue[];
  resolvedIssues: TutorResolvedIssue[];
  /** Что учитель знает об ученике: имя, город, интересы, работа — как сказал сам ученик. */
  facts: string[];
  /** Повторяющиеся ошибки: «says "I go yesterday" — past simple of go». */
  recurringErrors: string[];
  /** Домашка с прошлого урока: фразы, которые надо сказать сегодня. */
  homework: string[];
  /** Тема, которую учитель обещал на следующий раз. */
  nextTopic: string;
  /** Сколько уроков-звонков было. */
  callCount: number;
  lastCallAtMs: number;
  /** Последний известный уровень (для «ты вырос с A1 до A2»). */
  lastCefr: string;
  /**
   * Просьба ученика, как с ним говорить: 'more_english' | 'more_native' | ''
   * (дефолт уровня). зачем: владелец 2026-08-16 — «он должен учитывать пожелание:
   * если пользователь говорит "дальше говори со мной по-английски"». Живёт между
   * уроками, пока ученик не попросит иначе.
   */
  languagePreference: TutorLanguagePreference | null;
  /** Очередь повторения речи (ступень 1 плана обучения). */
  phraseQueue: TutorPhraseQueueItem[];
  /** Сцены-задачи: сколько выполнено / всего (критерий успеха сцены — objectives). */
  scenesDone: number;
  scenesTotal: number;
  /** Карта речевых целей (ступень 2): id цели → mastery 0–3. */
  goalMastery: CanDoMastery;
  /** Уже учтённые сессии: не даёт ретраю повторно продвинуть счётчики/интервалы. */
  recentSessionIds: string[];
}

export type TutorLanguagePreference = '' | 'more_target' | 'more_native';

/** 'more_english' — старое имя (до появления второго изучаемого языка) → 'more_target'. */
export function asTutorLanguagePreference(value: unknown): TutorLanguagePreference {
  const v = String(value ?? '').trim();
  if (v === 'more_target' || v === 'more_english') return 'more_target';
  return v === 'more_native' ? 'more_native' : '';
}

export const TUTOR_MEMORY_EMPTY: TutorMemory = Object.freeze({
  schemaVersion: 2,
  stableUid: '',
  preferredName: null,
  learningGoal: null,
  pacePreference: null,
  conversationHooks: [],
  activeIssues: [],
  resolvedIssues: [],
  facts: [],
  recurringErrors: [],
  homework: [],
  nextTopic: '',
  callCount: 0,
  lastCallAtMs: 0,
  lastCefr: 'A1',
  languagePreference: null,
  phraseQueue: [],
  scenesDone: 0,
  scenesTotal: 0,
  goalMastery: {},
  recentSessionIds: [],
}) as TutorMemory;

function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

export function voiceTutorMemoryDocId(authUid: string, stableUid: string): string {
  return docId('vtm', authUid, stableUid);
}

function cleanItem(value: unknown): string {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TUTOR_MEMORY_ITEM_MAX_CHARS);
}

function cleanList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') continue; // числа/объекты из битого дока — не заметки
    const item = cleanItem(raw);
    if (!item || out.some((x) => x.toLowerCase() === item.toLowerCase())) continue;
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

export interface TutorMemoryCandidateEvidence {
  evidenceSessionId: string;
  directlyStatedByLearner?: boolean;
  learnerText?: string;
}

const SENSITIVE_MEMORY_PATTERNS: readonly RegExp[] = [
  /\b(password|passcode|pin\s*(?:code)?|api\s*key|secret\s*key|парол|пін(?:-код)?|senha|contraseña)\b/iu,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /(?:^|[^\p{L}\p{N}])\+?\d(?:[\s().-]*\d){6,14}(?:[^\p{L}\p{N}]|$)/u,
  /\b(?:\d[ -]*?){13,19}\b/u,
  /\b\d{1,6}\s+[\p{L}][\p{L}.'’-]*(?:\s+[\p{L}][\p{L}.'’-]*){0,4}\s+(?:street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|drive|dr\.?|boulevard|blvd\.?|улиц|вулиц|calle|rua|jalan|sokak|ulica)\b/iu,
  /\b(diagnosed|diagnosis|medical\s+condition|depression|bipolar|cancer|hiv|aids|суицид|депресс|діагноз|depresión|depressão)\b/iu,
  /\b(gay|lesbian|bisexual|transgender|sexuality|sexual\s+orientation|гей|лесбиян|бисексуал|трансгендер)\b/iu,
  /\b(catholic|muslim|christian|jewish|hindu|buddhist|religion|faith|католик|мусульман|православ)\b/iu,
  /\b(vote|voted|labour|conservative|republican|democrat|political\s+party|голосую|парті|партия)\b/iu,
  /\b(accused|arrested|convicted|being\s+sued|lawsuit|fraud|обвин|арестован|судим)\b/iu,
  /\b(my|his|her|their|мо[йяеи]|мі[йяєї]|mi|mijn|benim)\s+(mother|father|sister|brother|wife|husband|partner|child|daughter|son|мам|пап|сестр|брат|жен|муж|доч|сын)\b/iu,
];

export function isSensitiveMemoryText(value: unknown): boolean {
  const candidate = cleanItem(value);
  return candidate === '' || SENSITIVE_MEMORY_PATTERNS.some((pattern) => pattern.test(candidate));
}

export function acceptMemoryCandidate(
  value: unknown,
  evidence: TutorMemoryCandidateEvidence,
): boolean {
  const candidate = cleanItem(value);
  const sessionId = sanitizeTutorSessionId(evidence.evidenceSessionId);
  if (!candidate || !sessionId || isSensitiveMemoryText(candidate)) return false;
  if (evidence.directlyStatedByLearner === true) return true;
  const learnerText = cleanItem(evidence.learnerText).toLocaleLowerCase();
  if (!learnerText) return false;
  const normalizedCandidate = candidate.toLocaleLowerCase();
  if (learnerText.includes(normalizedCandidate)) return true;
  const candidateTokens = normalizedCandidate.match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const learnerTokens = new Set(learnerText.match(/[\p{L}\p{N}]{4,}/gu) ?? []);
  const overlap = candidateTokens.filter((token) => learnerTokens.has(token)).length;
  return candidateTokens.length > 0 && overlap >= Math.min(2, candidateTokens.length);
}

export function tutorMemoryItemId(kind: 'hook' | 'active_issue' | 'resolved_issue', label: string): string {
  return createHash('sha256')
    .update(`${kind}|${cleanItem(label).toLocaleLowerCase()}`)
    .digest('hex')
    .slice(0, 24);
}

/** Одинаково нормализует клиентский id при первой записи и любом ретрае. */
export function sanitizeTutorSessionId(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TUTOR_MEMORY_SESSION_ID_MAX_CHARS);
}

function parseRecentSessionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const id = sanitizeTutorSessionId(raw);
    if (!id || out.includes(id)) continue;
    out.push(id);
    if (out.length >= TUTOR_MEMORY_RECENT_SESSIONS_MAX) break;
  }
  return out;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function cleanChars(value: unknown, max: number): string {
  return Array.from(String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim())
    .slice(0, max)
    .join('');
}

function pacePreference(value: unknown): TutorPacePreference | null {
  return value === 'slower' || value === 'normal' || value === 'faster' ? value : null;
}

function parseConversationHooks(
  structured: unknown,
  legacyFacts: unknown,
  fallbackSessionId: string,
  fallbackUpdatedAtMs: number,
): TutorConversationHook[] {
  const candidates: { text: string; evidenceSessionId: string; updatedAtMs: number }[] = [];
  if (Array.isArray(structured)) {
    for (const raw of structured) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      const text = cleanItem(row.text);
      if (!text || isSensitiveMemoryText(text)) continue;
      candidates.push({
        text,
        evidenceSessionId: sanitizeTutorSessionId(row.evidenceSessionId) || fallbackSessionId || 'legacy_migration',
        updatedAtMs: Math.floor(num(row.updatedAtMs)) || fallbackUpdatedAtMs,
      });
    }
  }
  for (const fact of cleanList(legacyFacts, TUTOR_MEMORY_FACTS_MAX)) {
    if (!isSensitiveMemoryText(fact)) {
      candidates.push({ text: fact, evidenceSessionId: fallbackSessionId || 'legacy_migration', updatedAtMs: fallbackUpdatedAtMs });
    }
  }
  const out: TutorConversationHook[] = [];
  for (const candidate of candidates.sort((a, b) => b.updatedAtMs - a.updatedAtMs)) {
    const id = tutorMemoryItemId('hook', candidate.text);
    if (out.some((item) => item.id === id)) continue;
    out.push({ id, ...candidate });
    if (out.length >= TUTOR_MEMORY_FACTS_MAX) break;
  }
  return out;
}

function parseActiveIssues(structured: unknown, legacyErrors: unknown, fallbackSeenAtMs: number): TutorActiveIssue[] {
  const candidates: { label: string; evidenceCount: number; lastSeenAtMs: number }[] = [];
  if (Array.isArray(structured)) {
    for (const raw of structured) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      const label = cleanChars(row.label, 100);
      if (!label || isSensitiveMemoryText(label)) continue;
      candidates.push({
        label,
        evidenceCount: Math.max(1, Math.floor(num(row.evidenceCount))),
        lastSeenAtMs: Math.floor(num(row.lastSeenAtMs)) || fallbackSeenAtMs,
      });
    }
  }
  for (const label of cleanList(legacyErrors, TUTOR_MEMORY_ERRORS_MAX)) {
    if (!isSensitiveMemoryText(label)) candidates.push({ label: cleanChars(label, 100), evidenceCount: 1, lastSeenAtMs: fallbackSeenAtMs });
  }
  const out: TutorActiveIssue[] = [];
  for (const candidate of candidates.sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs)) {
    const id = tutorMemoryItemId('active_issue', candidate.label);
    const existing = out.find((item) => item.id === id);
    if (existing) {
      existing.evidenceCount = Math.max(existing.evidenceCount, candidate.evidenceCount);
      existing.lastSeenAtMs = Math.max(existing.lastSeenAtMs, candidate.lastSeenAtMs);
      continue;
    }
    out.push({ id, ...candidate });
    if (out.length >= TUTOR_MEMORY_ERRORS_MAX) break;
  }
  return out;
}

function parseResolvedIssues(value: unknown, fallbackResolvedAtMs: number): TutorResolvedIssue[] {
  if (!Array.isArray(value)) return [];
  const out: TutorResolvedIssue[] = [];
  for (const raw of value) {
    const row: Record<string, unknown> = raw && typeof raw === 'object'
      ? raw as Record<string, unknown>
      : { label: raw };
    const label = cleanChars(row.label, 100);
    if (!label || isSensitiveMemoryText(label)) continue;
    const id = tutorMemoryItemId('resolved_issue', label);
    if (out.some((item) => item.id === id)) continue;
    out.push({ id, label, resolvedAtMs: Math.floor(num(row.resolvedAtMs)) || fallbackResolvedAtMs });
    if (out.length >= TUTOR_MEMORY_RESOLVED_ISSUES_MAX) break;
  }
  return out;
}

/** Разбор дока памяти: мусор → пустые поля, никогда не бросает. */
export function parseTutorMemory(raw: unknown): TutorMemory {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const lastCallAtMs = Math.floor(num(d.lastCallAtMs));
  const recentSessionIds = parseRecentSessionIds(d.recentSessionIds);
  const conversationHooks = parseConversationHooks(
    d.conversationHooks,
    d.facts,
    recentSessionIds[0] ?? '',
    lastCallAtMs,
  );
  const resolvedIssues = parseResolvedIssues(d.resolvedIssues, lastCallAtMs);
  const resolvedLabels = new Set(resolvedIssues.map((issue) => issue.label.toLocaleLowerCase()));
  const activeIssues = parseActiveIssues(d.activeIssues, d.recurringErrors, lastCallAtMs)
    .filter((issue) => !resolvedLabels.has(issue.label.toLocaleLowerCase()));
  const lastCefrRaw = cleanItem(d.lastCefr).slice(0, 2).toUpperCase();
  const lastCefr = lastCefrRaw === 'A1' || lastCefrRaw === 'A2' || lastCefrRaw === 'B1' || lastCefrRaw === 'B2'
    ? lastCefrRaw
    : 'A1';
  return {
    schemaVersion: 2,
    stableUid: cleanChars(d.stableUid, 128),
    ...(cleanChars(d.authUid, 128) ? { authUid: cleanChars(d.authUid, 128) } : {}),
    preferredName: cleanChars(d.preferredName, 60) || null,
    learningGoal: cleanChars(d.learningGoal, 160) || null,
    pacePreference: pacePreference(d.pacePreference),
    conversationHooks,
    activeIssues,
    resolvedIssues,
    // Legacy aliases remain during the rollout so old prompt/review code cannot lose state.
    facts: conversationHooks.map((hook) => hook.text),
    recurringErrors: activeIssues.map((issue) => issue.label),
    homework: cleanList(d.homework, TUTOR_MEMORY_HOMEWORK_MAX),
    nextTopic: cleanItem(d.nextTopic),
    callCount: Math.floor(num(d.callCount)),
    lastCallAtMs,
    lastCefr,
    languagePreference: asTutorLanguagePreference(d.languagePreference) || null,
    phraseQueue: parsePhraseQueue(d.phraseQueue),
    scenesDone: Math.floor(num(d.scenesDone)),
    scenesTotal: Math.floor(num(d.scenesTotal)),
    goalMastery: parseCanDoMastery(d.goalMastery),
    recentSessionIds,
  };
}

function parsePhraseQueue(value: unknown): TutorPhraseQueueItem[] {
  if (!Array.isArray(value)) return [];
  const out: TutorPhraseQueueItem[] = [];
  for (const raw of value) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const text = typeof item.text === 'string' ? cleanItem(item.text) : '';
    if (!text || out.some((x) => x.text.toLowerCase() === text.toLowerCase())) continue;
    const box = Math.min(TUTOR_PHRASE_INTERVAL_DAYS.length - 1, Math.max(0, Math.floor(num(item.box))));
    out.push({ text, box, dueAtMs: Math.floor(num(item.dueAtMs)) });
    if (out.length >= TUTOR_PHRASE_QUEUE_MAX) break;
  }
  return out;
}

const DAY_MS = 86_400_000;

/** Тип сегодняшнего урока по номеру (0-based callCount → 1-й урок = new_material). */
export function tutorLessonTypeFor(callCount: number): TutorLessonType {
  const idx = ((Math.max(0, Math.floor(callCount)) % TUTOR_LESSON_TYPES.length) + TUTOR_LESSON_TYPES.length) % TUTOR_LESSON_TYPES.length;
  return TUTOR_LESSON_TYPES[idx];
}

/** Созревшие к уроку фразы — самые «старые» первыми, не больше потолка. */
export function duePhrases(memory: TutorMemory, nowMs: number, max = TUTOR_PHRASE_DUE_MAX): TutorPhraseQueueItem[] {
  return memory.phraseQueue
    .filter((p) => p.dueAtMs <= nowMs)
    .sort((a, b) => a.dueAtMs - b.dueAtMs)
    .slice(0, max);
}

export interface TutorPhraseResult {
  text: string;
  result?: 'pass' | 'needs_work' | 'uncertain' | 'invalid';
  /** Совместимость с уже открытыми клиентами старой схемы. */
  ok?: boolean;
}

/**
 * Фактический формат сегодняшнего урока: созревшее повторение и незавершённая
 * цель важнее календарной ротации. Free talk остаётся вариантом для разгрузки,
 * но только когда нет учебного долга; пустой review-слот становится новым.
 */
export function selectTutorLessonType(memory: TutorMemory, nowMs: number): TutorLessonType {
  const hasDueEvidence = duePhrases(memory, nowMs).length > 0;
  const hasPartialGoal = Object.values(memory.goalMastery).some((mastery) => mastery === 1 || mastery === 2);
  if (hasDueEvidence || hasPartialGoal) return 'review_and_scene';
  return tutorLessonTypeFor(memory.callCount) === 'free_talk' ? 'free_talk' : 'new_material';
}

/**
 * Обновить очередь по итогам урока: сказал верно → коробка +1 (интервал шире),
 * не смог → коробка 0 (завтра снова); новая домашка → в очередь на завтра
 * (коробка 0). Чистая функция.
 */
export function applyPhraseResults(
  queue: readonly TutorPhraseQueueItem[],
  results: readonly TutorPhraseResult[],
  newPhrases: readonly string[],
  nowMs: number,
): TutorPhraseQueueItem[] {
  const byKey = new Map<string, TutorPhraseQueueItem>();
  for (const item of queue) byKey.set(item.text.toLowerCase(), { ...item });
  for (const r of results) {
    const key = cleanItem(r.text).toLowerCase();
    if (!key) continue;
    const result = r.result ?? (typeof r.ok === 'boolean' ? (r.ok ? 'pass' : 'needs_work') : 'invalid');
    // Неуверенное распознавание и непригодное аудио ничего не доказывают и не
    // должны ни продвигать, ни сбрасывать интервал.
    if (result === 'uncertain' || result === 'invalid') continue;
    const prev = byKey.get(key);
    const box = result === 'pass' ? Math.min(TUTOR_PHRASE_INTERVAL_DAYS.length - 1, (prev?.box ?? -1) + 1) : 0;
    byKey.set(key, {
      text: prev?.text ?? cleanItem(r.text),
      box,
      dueAtMs: nowMs + TUTOR_PHRASE_INTERVAL_DAYS[box] * DAY_MS,
    });
  }
  for (const raw of newPhrases) {
    const text = cleanItem(raw);
    const key = text.toLowerCase();
    if (!text || byKey.has(key)) continue;
    byKey.set(key, { text, box: 0, dueAtMs: nowMs + TUTOR_PHRASE_INTERVAL_DAYS[0] * DAY_MS });
  }
  // Свежие (ближайшие к повторению) — впереди; хвост режем по потолку.
  return [...byKey.values()].sort((a, b) => a.dueAtMs - b.dueAtMs).slice(0, TUTOR_PHRASE_QUEUE_MAX);
}

export async function readTutorMemory(db: Firestore, authUid: string, stableUid: string): Promise<TutorMemory> {
  try {
    const snap = await db.collection(VOICE_TUTOR_MEMORY_COLLECTION).doc(voiceTutorMemoryDocId(authUid, stableUid)).get();
    return parseTutorMemory(snap.data());
  } catch (e) {
    // Память недоступна — учитель начнёт «как в первый раз», это не повод ронять звонок.
    console.warn('max_voice_tutor_memory read failed', e);
    return { ...TUTOR_MEMORY_EMPTY };
  }
}

export interface TutorMemoryUpdate {
  preferredName?: unknown;
  learningGoal?: unknown;
  pacePreference?: unknown;
  /** Новые факты из разговора (модель извлекла). Мержатся с прежними, свежие — впереди. */
  facts?: unknown;
  /** Ошибки этого урока — становятся «повторяющимися», прежние сохраняются, свежие впереди. */
  recurringErrors?: unknown;
  /** Ошибки, которые ученик сегодня исправил сам — удалить из памяти. */
  resolvedErrors?: unknown;
  /** Домашка на следующий раз (заменяет прошлую: она либо сдана, либо устарела). */
  homework?: unknown;
  nextTopic?: unknown;
  cefr?: unknown;
  /** Просьба ученика за урок ('more_english' | 'more_native' | 'default' → ''); undefined — не менять. */
  languagePreference?: unknown;
  /** Итоги повторения речи за урок: сказал верно / не смог (инструмент mark_phrase_result). */
  phraseResults?: readonly TutorPhraseResult[];
  /** Сцена-задача: 'done' | 'partial' | 'skipped' | '' (end_scene outcome). */
  sceneOutcome?: unknown;
  /** Прогресс по цели за урок (mark_goal_progress): { goalId, mastery 0–3 }. Mastery не убывает. */
  goalProgress?: {
    goalId: unknown;
    mastery: unknown;
    evidence?: unknown;
    sceneId?: unknown;
  } | null;
  /** Стабильный id звонка. Нет поля → прежняя семантика: каждый merge считается новым уроком. */
  sessionId?: unknown;
  /** Внутренний второй этап для старых клиентов без sessionId: принять только вывод ревью. */
  reviewOnly?: boolean;
  /** Callable tutor path: homework must be backed by pass evidence from this lesson. */
  enforceHomeworkEvidence?: boolean;
  nowMs: number;
}

export interface TutorMemoryMergeEvidence {
  /** Two independent successful retrievals are required before an issue is resolved. */
  passCount?: number;
}

/**
 * Чистое слияние: старая память + итог урока → новая память. Свежее — впереди,
 * дубли (без учёта регистра) схлопываются, потолки соблюдаются.
 */
export function mergeTutorMemory(
  prev: TutorMemory,
  update: TutorMemoryUpdate,
  evidence: TutorMemoryMergeEvidence = {},
): TutorMemory {
  const sessionId = sanitizeTutorSessionId(update.sessionId);
  const candidateSessionId = sessionId || (update.reviewOnly === true ? `legacy_review_${Math.floor(update.nowMs)}` : '');
  const duplicateSession = Boolean(sessionId && prev.recentSessionIds.includes(sessionId));
  const newHooks = cleanList(update.facts, TUTOR_MEMORY_FACTS_MAX)
    .filter((candidate) => acceptMemoryCandidate(candidate, {
      evidenceSessionId: candidateSessionId,
      directlyStatedByLearner: true,
    }))
    .map<TutorConversationHook>((text) => ({
      id: tutorMemoryItemId('hook', text),
      text,
      evidenceSessionId: candidateSessionId,
      updatedAtMs: update.nowMs,
    }));
  const conversationHooks: TutorConversationHook[] = [];
  for (const hook of [...newHooks, ...prev.conversationHooks]) {
    if (conversationHooks.some((item) => item.id === hook.id)) continue;
    conversationHooks.push(hook);
    if (conversationHooks.length >= TUTOR_MEMORY_FACTS_MAX) break;
  }

  const newIssueLabels = cleanList(update.recurringErrors, TUTOR_MEMORY_ERRORS_MAX)
    .map((label) => cleanChars(label, 100))
    .filter((label) => label !== '' && !isSensitiveMemoryText(label));
  const activeByLabel = new Map(prev.activeIssues.map((issue) => [issue.label.toLocaleLowerCase(), { ...issue }]));
  for (const label of newIssueLabels) {
    const key = label.toLocaleLowerCase();
    const current = activeByLabel.get(key);
    activeByLabel.set(key, {
      id: tutorMemoryItemId('active_issue', label),
      label: current?.label ?? label,
      evidenceCount: Math.min(99, (current?.evidenceCount ?? 0) + (current && duplicateSession ? 0 : 1)),
      lastSeenAtMs: update.nowMs,
    });
  }
  let resolvedIssues = [...prev.resolvedIssues];
  if (newIssueLabels.length > 0) {
    const reopened = new Set(newIssueLabels.map((label) => label.toLocaleLowerCase()));
    resolvedIssues = resolvedIssues.filter((issue) => !reopened.has(issue.label.toLocaleLowerCase()));
  }
  const inferredPassCount = (update.phraseResults ?? []).filter((item) => (
    item.result ?? (item.ok === true ? 'pass' : item.ok === false ? 'needs_work' : 'invalid')
  ) === 'pass').length;
  const passCount = Math.max(0, Math.floor(evidence.passCount ?? inferredPassCount));
  if (passCount >= 2) {
    for (const label of cleanList(update.resolvedErrors, TUTOR_MEMORY_ERRORS_MAX).map((item) => cleanChars(item, 100))) {
      const key = label.toLocaleLowerCase();
      const active = activeByLabel.get(key);
      if (!active) continue;
      activeByLabel.delete(key);
      const resolved: TutorResolvedIssue = {
        id: tutorMemoryItemId('resolved_issue', active.label),
        label: active.label,
        resolvedAtMs: update.nowMs,
      };
      resolvedIssues = [resolved, ...resolvedIssues.filter((item) => item.label.toLocaleLowerCase() !== key)];
    }
  }
  const activeIssues = [...activeByLabel.values()]
    .sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs)
    .slice(0, TUTOR_MEMORY_ERRORS_MAX);
  resolvedIssues = resolvedIssues
    .sort((a, b) => b.resolvedAtMs - a.resolvedAtMs)
    .slice(0, TUTOR_MEMORY_RESOLVED_ISSUES_MAX);
  const preferredNameCandidate = cleanChars(update.preferredName, 60);
  const learningGoalCandidate = cleanChars(update.learningGoal, 160);
  const preferredName = preferredNameCandidate && acceptMemoryCandidate(preferredNameCandidate, {
    evidenceSessionId: candidateSessionId,
    directlyStatedByLearner: true,
  }) ? preferredNameCandidate : prev.preferredName;
  const learningGoal = learningGoalCandidate && acceptMemoryCandidate(learningGoalCandidate, {
    evidenceSessionId: candidateSessionId,
    directlyStatedByLearner: true,
  }) ? learningGoalCandidate : prev.learningGoal;
  const nextPace = pacePreference(update.pacePreference) ?? prev.pacePreference;
  const nextLanguagePreference = update.languagePreference === undefined
    || update.languagePreference === null
    || update.languagePreference === ''
    ? prev.languagePreference
    : asTutorLanguagePreference(update.languagePreference) || null;
  const memoryProjection: TutorMemory = {
    ...prev,
    schemaVersion: 2,
    preferredName,
    learningGoal,
    pacePreference: nextPace,
    conversationHooks,
    activeIssues,
    resolvedIssues,
    facts: conversationHooks.map((hook) => hook.text),
    recurringErrors: activeIssues.map((issue) => issue.label),
    languagePreference: nextLanguagePreference,
  };
  if (update.reviewOnly === true || duplicateSession) {
    // Второй этап того же звонка может принести вывод модели (факты/ошибки),
    // но не имеет права повторно засчитать детерминированные результаты урока.
    return memoryProjection;
  }
  const submittedHomework = cleanList(update.homework, TUTOR_MEMORY_HOMEWORK_MAX);
  const passEvidence = new Set(
    (update.phraseResults ?? [])
      .filter((item) => (item.result ?? (item.ok === true ? 'pass' : item.ok === false ? 'needs_work' : 'invalid')) === 'pass')
      .map((item) => cleanItem(item.text).toLowerCase())
      .filter(Boolean),
  );
  const homeworkEvidenceValid = !update.enforceHomeworkEvidence
    || submittedHomework.every((phrase) => passEvidence.has(phrase.toLowerCase()));
  // Invalid client batches are rejected atomically: keep the previous assignment
  // and do not re-enqueue it with a fresh due date.
  const homework = homeworkEvidenceValid ? submittedHomework : prev.homework;
  const homeworkForQueue = homeworkEvidenceValid ? submittedHomework : [];
  const nextTopic = cleanItem(update.nextTopic);
  const progressBefore = canDoProgress(prev.goalMastery);
  const cefrFloor = cleanItem(update.cefr).slice(0, 2).toUpperCase() || prev.lastCefr || 'A1';
  const goalLevel = progressBefore.done > 0 ? levelFromMastery(prev.goalMastery, cefrFloor) : cefrFloor;
  const expectedGoalId = pickNextGoal(prev.goalMastery, goalLevel)?.id ?? '';
  return {
    ...memoryProjection,
    homework: homework.length > 0 ? homework : [],
    nextTopic,
    callCount: prev.callCount + 1,
    lastCallAtMs: update.nowMs,
    lastCefr: cleanItem(update.cefr).slice(0, 2).toUpperCase() || prev.lastCefr,
    // Явная просьба за урок меняет предпочтение ('default' сбрасывает); молчание — сохраняет прежнее.
    languagePreference: update.languagePreference === 'default' ? null : nextLanguagePreference,
    // Очередь повторения: результаты урока + новая домашка на завтра.
    phraseQueue: applyPhraseResults(prev.phraseQueue, update.phraseResults ?? [], homeworkForQueue, update.nowMs),
    scenesTotal: prev.scenesTotal + (String(update.sceneOutcome ?? '') === 'done' || String(update.sceneOutcome ?? '') === 'partial' ? 1 : 0),
    scenesDone: prev.scenesDone + (String(update.sceneOutcome ?? '') === 'done' ? 1 : 0),
    goalMastery: applyGoalProgress(prev.goalMastery, update.goalProgress, update.sceneOutcome, expectedGoalId),
    recentSessionIds: sessionId
      ? [sessionId, ...prev.recentSessionIds.filter((id) => id !== sessionId)].slice(0, TUTOR_MEMORY_RECENT_SESSIONS_MAX)
      : prev.recentSessionIds,
  };
}

/** Mastery цели только растёт (учитель не может «разучить»); неизвестная цель игнорируется. */
export function applyGoalProgress(
  prev: CanDoMastery,
  progress: TutorMemoryUpdate['goalProgress'],
  sceneOutcome: unknown = '',
  expectedGoalId = '',
): CanDoMastery {
  if (!progress) return prev;
  const goalId = String(progress.goalId ?? '').trim();
  const goal = canDoGoalById(goalId);
  if (!goal) return prev;
  if (expectedGoalId && goalId !== expectedGoalId) return prev;
  const n = Number(progress.mastery);
  if (!Number.isFinite(n)) return prev;
  const requested = Math.min(3, Math.max(0, Math.floor(n)));
  const current = prev[goalId] ?? 0;
  if (requested <= current) return prev;
  // Один разговор — не полное освоение: максимум одна новая ступень. Финальная
  // ступень требует уже накопленных доказательств и выполненной сцены переноса.
  let mastery = Math.min(requested, current + 1);
  if (mastery >= 3) {
    const evidence = String(progress.evidence ?? '').trim();
    const sceneId = String(progress.sceneId ?? '').trim();
    const hasCataloguedScenes = goal.sceneIds.length > 0;
    const validTransfer = hasCataloguedScenes
      ? evidence === 'scene' && String(sceneOutcome ?? '') === 'done' && goal.sceneIds.includes(sceneId)
      : evidence === 'novel_context';
    if (!validTransfer) mastery = 2;
  }
  if (mastery <= current) return prev;
  return { ...prev, [goalId]: mastery };
}

/** Прочитать → слить → записать. Ошибка записи логируется, не бросает (разбор важнее). */
export async function applyTutorMemoryUpdate(
  db: Firestore,
  authUid: string,
  stableUid: string,
  update: TutorMemoryUpdate,
  options: { strict?: boolean } = {},
): Promise<TutorMemory> {
  const ref = db.collection(VOICE_TUTOR_MEMORY_COLLECTION).doc(voiceTutorMemoryDocId(authUid, stableUid));
  try {
    return await db.runTransaction(async (tx) => {
      const prev = parseTutorMemory((await tx.get(ref)).data());
      const next = mergeTutorMemory(prev, update);
      tx.set(ref, { ...next, authUid, stableUid, updatedAtMs: update.nowMs }, { merge: true });
      return next;
    });
  } catch (e) {
    console.warn('max_voice_tutor_memory write failed', e);
    if (options.strict) throw e;
    return { ...TUTOR_MEMORY_EMPTY };
  }
}

/** Сколько дней прошло с последнего урока (для «давно не виделись»). */
function daysSince(lastMs: number, nowMs: number): number | null {
  if (lastMs <= 0) return null;
  return Math.max(0, Math.floor((nowMs - lastMs) / 86_400_000));
}

/**
 * Блок памяти для хвоста instructions. Английский (промпт англоязычный), без
 * markdown. Пустая память → короткая заметка «первый урок».
 */
export function renderTutorMemoryBlock(memory: TutorMemory, nowMs: number): string {
  const lines: string[] = ['WHAT YOU REMEMBER ABOUT THIS LEARNER'];
  lines.push('Use at most ONE relevant memory detail naturally when it helps the lesson. Never announce that a profile or memory is stored. Never infer missing facts or mention rejected/sensitive candidates.');
  if (memory.callCount <= 0) {
    lines.push('This is your FIRST lesson together. Learn their name and one or two things about them, warmly.');
  } else {
    const days = daysSince(memory.lastCallAtMs, nowMs);
      lines.push(`Lessons so far: ${memory.callCount}.${days === null ? '' : days === 0 ? ' Last lesson: today.' : days === 1 ? ' Last lesson: yesterday.' : ` Last lesson: ${days} days ago.`}`);
  }
  if (memory.preferredName) lines.push(`Preferred name: ${memory.preferredName}.`);
  if (memory.learningGoal) lines.push(`Learning goal: ${memory.learningGoal}.`);
  if (memory.pacePreference) lines.push(`PACE PREFERENCE: ${memory.pacePreference}.`);
  const relevantHooks = memory.conversationHooks.slice(0, 2);
  if (relevantHooks.length > 0) lines.push(`Relevant conversation hooks: ${relevantHooks.map((hook) => hook.text).join('; ')}.`);
  if (memory.activeIssues.length > 0) {
    lines.push(`Active learning issues: ${memory.activeIssues.map((issue) => issue.label).join('; ')}. Correct these gently when they recur.`);
  }
  if (memory.resolvedIssues.length > 0) {
    lines.push(`Already resolved: ${memory.resolvedIssues.map((issue) => issue.label).join('; ')}. Do not reteach unless it returns.`);
  }
  if (memory.homework.length > 0) {
    lines.push(`Homework you gave last time (check it early in this lesson, ask them to SAY each phrase): ${memory.homework.join(' | ')}.`);
  }
  if (memory.nextTopic) lines.push(`You promised today's topic would be: ${memory.nextTopic}.`);
  // План урока: тип сегодняшнего урока и созревшие фразы для повторения речи.
  const lessonType = selectTutorLessonType(memory, nowMs);
  const typeLine = lessonType === 'new_material'
    ? 'TODAY\'S LESSON TYPE: NEW MATERIAL — teach 2-3 phrases + the grammar point of the current app lesson (SYLLABUS), practise them in mini-situations.'
    : lessonType === 'review_and_scene'
      ? 'TODAY\'S LESSON TYPE: REVIEW + SCENE — retrieval of due phrases first, then a role-play scene as a TASK with a clear goal; new material only if time remains.'
      : 'TODAY\'S LESSON TYPE: FREE TALK — a warm conversation about the learner\'s life that naturally uses their weak words and recurring mistakes; correct gently, no new grammar.';
  lines.push(typeLine);
  const due = duePhrases(memory, nowMs);
  if (due.length > 0) {
    lines.push(`PHRASES DUE FOR SPOKEN RETRIEVAL TODAY (ask the learner to SAY each one in a natural mini-question, then call mark_phrase_result for each): ${due.map((p) => p.text).join(' | ')}.`);
  }
  if (memory.scenesTotal > 0) lines.push(`Scene tasks completed so far: ${memory.scenesDone} of ${memory.scenesTotal}.`);
  if (memory.languagePreference === 'more_target') {
    lines.push('LANGUAGE PREFERENCE: the learner asked you to speak MORE of the language they are learning with them than the level default — honor it (still keep it simple and clear).');
  } else if (memory.languagePreference === 'more_native') {
    lines.push('LANGUAGE PREFERENCE: the learner asked you to explain and speak MORE in their native language than the level default — honor it.');
  }
  const text = lines.join('\n');
  return text.length > TUTOR_MEMORY_BLOCK_MAX_CHARS ? text.slice(0, TUTOR_MEMORY_BLOCK_MAX_CHARS) : text;
}

// ── Знание приложения (устав из админки) ────────────────────────────────────

/**
 * Встроенная выжимка продукта — запасной вариант, когда устав в админке пуст.
 * Только то, что учитель может СОВЕТОВАТЬ ученику сделать в приложении.
 */
export const TUTOR_APP_DIGEST_FALLBACK = `WHAT THE APP OFFERS (so you can advise concrete next steps; never invent features)
- Lessons: short phrase-based lessons on the main tab; each has phrases, listening and speaking practice.
- Trainer (flashcards): spaced repetition of the learner's weak words and phrases.
- Dialogs: text role-play scenes with an AI partner (cafe, hotel, doctor, etc.).
- Calls with you: this daily voice lesson.
- Streak: a daily streak of activity; XP for lessons, trainer and speaking; pearls (in-app currency) for rewards.
- Friends and league: weekly league with friends; you may mention it, never push it.`;

const CHARTER_CACHE_TTL_MS = 60 * 60 * 1000;
const CHARTER_SECTIONS_FOR_TUTOR = ['learning', 'navigation', 'currencies', 'disabled'] as const;
const CHARTER_SECTION_MAX_CHARS = 700;
const DIGEST_MAX_CHARS = 2_200;

let charterCache: { text: string; atMs: number } | null = null;

export function __resetTutorCharterCacheForTests(): void {
  charterCache = null;
}

/** Собрать выжимку из устава: только разделы, полезные учителю, обрезанные. */
export function renderTutorCharterDigest(charter: ProductCharter): string {
  const parts: string[] = [];
  for (const key of CHARTER_SECTIONS_FOR_TUTOR) {
    const section = charter.sections.find((s) => s.key === key);
    const body = String(section?.body ?? '').replace(/\s+/g, ' ').trim();
    if (!body) continue;
    parts.push(`[${key}] ${body.slice(0, CHARTER_SECTION_MAX_CHARS)}`);
  }
  if (parts.length === 0) return '';
  const text = `WHAT THE APP OFFERS (from the product charter; advise only what is listed here, never invent features)\n${parts.join('\n')}`;
  return text.length > DIGEST_MAX_CHARS ? text.slice(0, DIGEST_MAX_CHARS) : text;
}

/**
 * Выжимка устава для промпта учителя с кэшем 1ч на инстанс. Устав пуст или
 * недоступен → встроенная выжимка. Ошибка чтения не кэшируется.
 */
export async function loadTutorAppDigest(db: Firestore, nowMs: number = Date.now()): Promise<string> {
  if (charterCache && nowMs - charterCache.atMs < CHARTER_CACHE_TTL_MS) return charterCache.text;
  try {
    const [collection, doc] = PRODUCT_CHARTER_DOC.split('/');
    const snap = await db.collection(collection).doc(doc).get();
    const digest = renderTutorCharterDigest(parseProductCharter(snap.data()));
    const text = digest || TUTOR_APP_DIGEST_FALLBACK;
    charterCache = { text, atMs: nowMs };
    return text;
  } catch (e) {
    console.warn('max_voice_tutor_memory charter read failed', e);
    return TUTOR_APP_DIGEST_FALLBACK;
  }
}

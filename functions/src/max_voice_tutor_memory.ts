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

export const VOICE_TUTOR_MEMORY_COLLECTION = 'voice_tutor_memory';

/** Потолки — память должна оставаться дешёвой и помещаться в хвост промпта. */
export const TUTOR_MEMORY_FACTS_MAX = 12;
export const TUTOR_MEMORY_ERRORS_MAX = 8;
export const TUTOR_MEMORY_HOMEWORK_MAX = 6;
export const TUTOR_MEMORY_ITEM_MAX_CHARS = 140;
export const TUTOR_MEMORY_BLOCK_MAX_CHARS = 1_800;

export interface TutorMemory {
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
}

export const TUTOR_MEMORY_EMPTY: TutorMemory = Object.freeze({
  facts: [],
  recurringErrors: [],
  homework: [],
  nextTopic: '',
  callCount: 0,
  lastCallAtMs: 0,
  lastCefr: '',
}) as TutorMemory;

function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

export function voiceTutorMemoryDocId(authUid: string, stableUid: string): string {
  return docId('vtm', authUid, stableUid);
}

function cleanItem(value: unknown): string {
  // eslint-disable-next-line no-control-regex
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

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Разбор дока памяти: мусор → пустые поля, никогда не бросает. */
export function parseTutorMemory(raw: unknown): TutorMemory {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    facts: cleanList(d.facts, TUTOR_MEMORY_FACTS_MAX),
    recurringErrors: cleanList(d.recurringErrors, TUTOR_MEMORY_ERRORS_MAX),
    homework: cleanList(d.homework, TUTOR_MEMORY_HOMEWORK_MAX),
    nextTopic: cleanItem(d.nextTopic),
    callCount: Math.floor(num(d.callCount)),
    lastCallAtMs: Math.floor(num(d.lastCallAtMs)),
    lastCefr: cleanItem(d.lastCefr).slice(0, 2).toUpperCase(),
  };
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
  nowMs: number;
}

/**
 * Чистое слияние: старая память + итог урока → новая память. Свежее — впереди,
 * дубли (без учёта регистра) схлопываются, потолки соблюдаются.
 */
export function mergeTutorMemory(prev: TutorMemory, update: TutorMemoryUpdate): TutorMemory {
  const newFacts = cleanList(update.facts, TUTOR_MEMORY_FACTS_MAX);
  const newErrors = cleanList(update.recurringErrors, TUTOR_MEMORY_ERRORS_MAX);
  const resolved = new Set(cleanList(update.resolvedErrors, TUTOR_MEMORY_ERRORS_MAX).map((x) => x.toLowerCase()));
  const keptErrors = prev.recurringErrors.filter((e) => !resolved.has(e.toLowerCase()));
  const homework = cleanList(update.homework, TUTOR_MEMORY_HOMEWORK_MAX);
  const nextTopic = cleanItem(update.nextTopic);
  return {
    facts: cleanList([...newFacts, ...prev.facts], TUTOR_MEMORY_FACTS_MAX),
    recurringErrors: cleanList([...newErrors, ...keptErrors], TUTOR_MEMORY_ERRORS_MAX),
    homework: homework.length > 0 ? homework : [],
    nextTopic,
    callCount: prev.callCount + 1,
    lastCallAtMs: update.nowMs,
    lastCefr: cleanItem(update.cefr).slice(0, 2).toUpperCase() || prev.lastCefr,
  };
}

/** Прочитать → слить → записать. Ошибка записи логируется, не бросает (разбор важнее). */
export async function applyTutorMemoryUpdate(
  db: Firestore,
  authUid: string,
  stableUid: string,
  update: TutorMemoryUpdate,
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
  if (memory.callCount <= 0) {
    lines.push('This is your FIRST lesson together. Learn their name and one or two things about them, warmly.');
  } else {
    const days = daysSince(memory.lastCallAtMs, nowMs);
    lines.push(`Lessons so far: ${memory.callCount}.${days === null ? '' : days === 0 ? ' Last lesson: today.' : days === 1 ? ' Last lesson: yesterday.' : ` Last lesson: ${days} days ago.`}`);
  }
  if (memory.facts.length > 0) lines.push(`Facts they told you: ${memory.facts.join('; ')}.`);
  if (memory.recurringErrors.length > 0) {
    lines.push(`Recurring mistakes to watch and gently fix: ${memory.recurringErrors.join('; ')}.`);
  }
  if (memory.homework.length > 0) {
    lines.push(`Homework you gave last time (check it early in this lesson, ask them to SAY each phrase): ${memory.homework.join(' | ')}.`);
  }
  if (memory.nextTopic) lines.push(`You promised today's topic would be: ${memory.nextTopic}.`);
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
- Trainer (flashcards): spaced repetition of the learner's weak words and phrases; you can put phrases there yourself (assign_homework).
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

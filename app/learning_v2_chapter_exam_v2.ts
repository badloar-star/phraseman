// learning_v2_chapter_exam_v2.ts — экзамен главы v2 в приложении: банк главы, подготовка попытки, итог, повтор слабых тем.
// зачем (владелец утвердил прототип экзамена v2 25.10, координатор): глава с банком v2 сдаётся по новому экрану, остальные — по
// прежнему экзамену. Запись попыток — тот же ключ и то же хранилище, что у прежнего экзамена (карта видит «сдан» и паузу), открытие
// главы и 40 монет — то же правило (finishLearningV2ChapterExamWithResultV1). Пауза после провала снимается, когда все эпизоды
// слабых тем пройдены ПОСЛЕ провала — отметку ставит плеер. Ни сети, ни Firestore: всё на устройстве, банк в бандле.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRemoteBool, hasRemoteBoolOverride } from './remote_flags';
import { onAccountOwnerChanged } from './account_owner_change';
import { loadLearningV2ChapterExamRecordsV1, saveLearningV2ChapterExamRecordV1 } from './learning_v2_chapter_exam_store_v1';
import { finishLearningV2ChapterExamWithResultV1, type ChapterExamFinishV1 } from './learning_v2_chapter_exam_v1';
import { chapterExamAvailabilityV1, chapterExamKeyV1 } from '../modules/learning-v2/exam/chapter_exam_v1';
import {
  scoreChapterExamV2,
  selectChapterExamV2Items,
  type ChapterExamV2Answer,
  type ChapterExamV2Bank,
  type ChapterExamV2Item,
  type ChapterExamV2Result,
  type ChapterExamV2WeakPoint,
} from '../modules/learning-v2/exam/chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANK_L01_C1 } from '../modules/learning-v2/exam/banks/chapter_exam_v2_l01_c1';
import { CHAPTER_EXAM_V2_BANK_L01_C2 } from '../modules/learning-v2/exam/banks/chapter_exam_v2_l01_c2';
import { CHAPTER_EXAM_V2_BANK_L01_C3 } from '../modules/learning-v2/exam/banks/chapter_exam_v2_l01_c3';

const LOG = '[CHAPTER-EXAM-V2]';
const TARGET_LANGUAGE = 'en';

// Банки глав v2. Нет банка — у главы прежний экзамен. Новые банки пишет фабрика курса (сторож слов эпизодов — owner_locks_exam_episode_words).
// зачем (владелец 25.10, «Да, включать и делать дальше» после чтения docs/work/exam-banks-for-owner-2026-10-25.md): главы 1–3 урока 1.
const BANKS: ReadonlyMap<string, ChapterExamV2Bank> = new Map([[`1:1`, CHAPTER_EXAM_V2_BANK_L01_C1], [`1:2`, CHAPTER_EXAM_V2_BANK_L01_C2], [`1:3`, CHAPTER_EXAM_V2_BANK_L01_C3]]);

export function chapterExamV2BankFor(lessonOrdinal: number, chapterOrdinal: number): ChapterExamV2Bank | null {
  return BANKS.get(`${lessonOrdinal}:${chapterOrdinal}`) ?? null;
}

let gateLogged: string | null = null;
/** Новый экзамен для главы: переключатель «Пульта» (по умолчанию ВКЛ) и наличие банка. */
export function isChapterExamV2EnabledFor(lessonOrdinal: number, chapterOrdinal: number): boolean {
  const flag = getRemoteBool('learning_chapter_exam_v2_enabled') !== false;
  const hasBank = chapterExamV2BankFor(lessonOrdinal, chapterOrdinal) !== null;
  const decision = `${lessonOrdinal}:${chapterOrdinal}:${flag}:${hasBank}`;
  if (gateLogged !== decision) {
    gateLogged = decision;
    console.log(`${LOG} gate`, JSON.stringify({ lessonOrdinal, chapterOrdinal, flag, flagSource: hasRemoteBoolOverride('learning_chapter_exam_v2_enabled') ? 'cache' : 'default', hasBank, v2: flag && hasBank })); // guard-ok: одна строка на смену решения
  }
  return flag && hasBank;
}

// ── отметка повтора слабых тем (на устройстве, по аккаунту) ──────────────────────────────────────────────────────────
type ReviewEntry = Readonly<{ failedAtMs: number; lessonOrdinal: number; weak: readonly ChapterExamV2WeakPoint[]; episodes: readonly number[]; done: readonly number[]; lastItemIds: readonly string[] }>;
export type ChapterExamV2ReviewState = Readonly<{ weak: readonly ChapterExamV2WeakPoint[]; episodes: readonly number[]; done: readonly number[] }>;
type ReviewMap = Readonly<Record<string, ReviewEntry>>;
const REVIEW_KEY = (scope: string) => `v2:chapter-exam-v2-review:v1:${scope}`;
const reviewMemory = new Map<string, ReviewMap>();
onAccountOwnerChanged('learning_v2_chapter_exam_v2_review', () => { reviewMemory.clear(); });

const isReviewEntry = (v: unknown): v is ReviewEntry => {
  const r = v as Record<string, unknown> | null;
  return !!r && typeof r.failedAtMs === 'number' && typeof r.lessonOrdinal === 'number' && Array.isArray(r.weak) && Array.isArray(r.episodes) && Array.isArray(r.done) && Array.isArray(r.lastItemIds);
};

async function loadReview(scope: string): Promise<ReviewMap> {
  const cached = reviewMemory.get(scope);
  if (cached) return cached;
  let out: ReviewMap = {};
  try {
    const raw = await AsyncStorage.getItem(REVIEW_KEY(scope));
    if (raw) out = Object.fromEntries(Object.entries(JSON.parse(raw) as Record<string, unknown>).filter(([, v]) => isReviewEntry(v))) as ReviewMap;
  } catch (error) {
    console.warn(`${LOG} review:read_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
  reviewMemory.set(scope, out);
  return out;
}

async function saveReview(scope: string, next: ReviewMap): Promise<void> {
  reviewMemory.set(scope, next);
  try {
    await AsyncStorage.setItem(REVIEW_KEY(scope), JSON.stringify(next));
  } catch (error) {
    console.warn(`${LOG} review:write_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
}

/** Эпизоды слабых тем последнего провала и какие уже пройдены после него — для экрана «Повтори эти темы». */
export async function chapterExamV2ReviewStateFor(scope: string, examKey: string): Promise<ChapterExamV2ReviewState | null> {
  const entry = (await loadReview(scope))[examKey];
  return entry ? { weak: entry.weak, episodes: entry.episodes, done: entry.done } : null;
}

/**
 * Плеер закончил занятие. Если это эпизод слабой темы проваленного экзамена — отметить; все пройдены → пауза снята сразу
 * (запись экзамена получает retryAtMs = сейчас, карта главы тоже видит «можно пересдать»).
 */
export async function noteChapterExamV2EpisodeFinishedV1(scope: string, courseSessionId: string, nowMs: number = Date.now()): Promise<void> {
  const match = /lesson-0*(\d+):session-0*(\d+)/u.exec(courseSessionId);
  if (!match) {
    console.log(`${LOG} review:skip`, JSON.stringify({ courseSessionId, reason: 'not_course_session' })); // guard-ok: ранний выход с причиной
    return;
  }
  const lessonOrdinal = Number(match[1]);
  const episode = Number(match[2]);
  const review = await loadReview(scope);
  let next: Record<string, ReviewEntry> | null = null;
  for (const [examKey, entry] of Object.entries(review)) {
    if (entry.lessonOrdinal !== lessonOrdinal || !entry.episodes.includes(episode) || entry.done.includes(episode)) continue;
    const done = [...entry.done, episode].sort((a, b) => a - b);
    next = { ...(next ?? review), [examKey]: { ...entry, done } };
    const all = entry.episodes.every((e) => done.includes(e));
    console.log(`${LOG} review:episode_done`, JSON.stringify({ examKey, episode, done, episodes: entry.episodes, all })); // guard-ok: что отметили
    if (all) {
      const records = await loadLearningV2ChapterExamRecordsV1(scope);
      const record = records[examKey];
      if (record && record.status === 'failed' && record.retryAtMs !== null && record.retryAtMs > nowMs) {
        await saveLearningV2ChapterExamRecordV1(scope, { ...record, retryAtMs: nowMs });
        console.log(`${LOG} review:cooldown_lifted`, JSON.stringify({ examKey, wasRetryAtMs: record.retryAtMs, nowMs })); // guard-ok: пауза снята повтором
      } else {
        console.log(`${LOG} review:cooldown_untouched`, JSON.stringify({ examKey, status: record?.status ?? 'none', retryAtMs: record?.retryAtMs ?? null })); // guard-ok: ветка и значение
      }
    }
  }
  if (next) await saveReview(scope, next);
}

// ── попытка ─────────────────────────────────────────────────────────────────────────────────────────────────────
export type ChapterExamV2Prepared =
  | Readonly<{ kind: 'ready'; examKey: string; attempt: number; bank: ChapterExamV2Bank; items: readonly ChapterExamV2Item[] }>
  | Readonly<{ kind: 'cooldown'; examKey: string; minutesLeft: number; bank: ChapterExamV2Bank; review: ChapterExamV2ReviewState | null }>;

export async function prepareChapterExamV2(input: Readonly<{ scope: string; lessonOrdinal: number; chapterOrdinal: number; nowMs?: number }>): Promise<ChapterExamV2Prepared | null> {
  const bank = chapterExamV2BankFor(input.lessonOrdinal, input.chapterOrdinal);
  const examKey = chapterExamKeyV1({ targetLanguage: TARGET_LANGUAGE, lessonOrdinal: input.lessonOrdinal, chapterOrdinal: input.chapterOrdinal });
  if (!bank) {
    console.warn(`${LOG} prepare:no_bank`, JSON.stringify({ examKey })); // guard-ok: ранний выход с причиной
    return null;
  }
  const records = await loadLearningV2ChapterExamRecordsV1(input.scope);
  const gate = chapterExamAvailabilityV1({ record: records[examKey] ?? null, chapterReached: true, nowMs: input.nowMs ?? Date.now() });
  const review = await loadReview(input.scope);
  if (gate.state === 'cooldown') {
    const entry = review[examKey];
    console.warn(`${LOG} prepare:cooldown`, JSON.stringify({ examKey, minutesLeft: gate.minutesLeft, reviewDone: entry?.done ?? [], reviewEpisodes: entry?.episodes ?? [] })); // guard-ok: ранний выход с причиной
    return { kind: 'cooldown', examKey, minutesLeft: gate.minutesLeft, bank, review: entry ? { weak: entry.weak, episodes: entry.episodes, done: entry.done } : null };
  }
  const attempt = (records[examKey]?.attempts ?? 0) + 1;
  const items = selectChapterExamV2Items(bank, { examKey, attempt, previousItemIds: review[examKey]?.lastItemIds ?? [] });
  if (!items) {
    console.warn(`${LOG} prepare:not_enough_items`, JSON.stringify({ examKey, items: bank.items.length })); // guard-ok: ранний выход с причиной
    return null;
  }
  console.log(`${LOG} prepare:ready`, JSON.stringify({ examKey, attempt, items: items.map((i) => i.id), source: 'bundled_bank' })); // guard-ok: что подобрано и откуда
  return { kind: 'ready', examKey, attempt, bank, items };
}

export type ChapterExamV2Finish = Readonly<{ result: ChapterExamV2Result; finish: ChapterExamFinishV1 }>;

/** Итог: счёт v2 → общая запись/открытие главы; провал — эпизоды слабых тем в «повторить», задания попытки — в конец следующей. */
export async function finishChapterExamV2(input: Readonly<{
  scope: string;
  examKey: string;
  bank: ChapterExamV2Bank;
  items: readonly ChapterExamV2Item[];
  answers: readonly ChapterExamV2Answer[];
  finishedAtMs: number;
}>): Promise<ChapterExamV2Finish> {
  const result = scoreChapterExamV2(input.bank, input.answers);
  const finish = await finishLearningV2ChapterExamWithResultV1({
    accountScopeHash: input.scope,
    progressAccountScopeHash: input.scope,
    examKey: input.examKey,
    lessonOrdinal: input.bank.lessonOrdinal,
    chapterOrdinal: input.bank.chapterOrdinal,
    result: { correct: result.correct, total: result.total, passed: result.passed, mistakes: input.answers.filter((a) => !a.correct).map((a) => a.itemId) },
    finishedAtMs: input.finishedAtMs,
  });
  const review = await loadReview(input.scope);
  if (result.passed) {
    if (review[input.examKey]) {
      const { [input.examKey]: _dropped, ...rest } = review;
      await saveReview(input.scope, rest);
    }
  } else {
    const episodes = [...new Set(result.weakPoints.flatMap((w) => w.episodeOrdinals))].sort((a, b) => a - b);
    await saveReview(input.scope, { ...review, [input.examKey]: { failedAtMs: input.finishedAtMs, lessonOrdinal: input.bank.lessonOrdinal, weak: result.weakPoints, episodes, done: [], lastItemIds: input.items.map((i) => i.id) } });
  }
  console.log(`${LOG} finish`, JSON.stringify({ examKey: input.examKey, correct: result.correct, passed: result.passed, weak: result.weakPoints.map((w) => `${w.grammarPoint}:${w.errors}`), firstPass: finish.firstPass, startSessionId: finish.startSessionId })); // guard-ok: итог
  return { result, finish };
}

export function __resetChapterExamV2ForTests(): void {
  reviewMemory.clear();
  gateLogged = null;
}

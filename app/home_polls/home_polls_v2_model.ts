// ═══ Опросы на Главной 2.0 — модель набора (без сети и хранилища) ═══════════════
// зачем (владелец 18.10, сборка 134): набор = 2–3 вопроса подряд, у каждого 2–4 варианта и свои счётчики.
// Тексты всех наборов едут в приложении (content/polls/home_polls_v2.json) — для показа сеть не нужна вовсе,
// Firestore хранит только счётчики. Здесь — чистый разбор и выбор текста, чтобы его проверял обычный jest.
import { DAILY_POLL_LOCALES, pickDailyPollText, type DailyPollLocalizedText } from '../daily_poll/daily_poll_model';

export type HomePollV2Option = Readonly<{ id: string; text: DailyPollLocalizedText }>;
export type HomePollV2Question = Readonly<{ id: string; text: DailyPollLocalizedText; options: readonly HomePollV2Option[] }>;
export type HomePollV2Set = Readonly<{ id: string; theme: string; questions: readonly HomePollV2Question[] }>;

/**
 * Ответ человека на один вопрос: общие счётчики и, только если этот клиент получил accepted, свой вариант.
 * null означает, что сервер уже видел ответ, но намеренно не хранит и не раскрывает выбранный вариант.
 */
export type HomePollV2Answer = Readonly<{ optionId: string | null; counts: Readonly<Record<string, number>> }>;

const SET_ID_RE = /^p2-\d{3}$/;
const ITEM_ID_RE = /^[a-z0-9_-]{1,24}$/;
const MAX_TEXT = 240;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseText(raw: unknown): DailyPollLocalizedText {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const locale of DAILY_POLL_LOCALES) {
    const value = typeof raw[locale] === 'string' ? (raw[locale] as string).trim().slice(0, MAX_TEXT) : '';
    if (value) out[locale] = value;
  }
  return out;
}

const hasText = (text: DailyPollLocalizedText): boolean => Object.keys(text).length > 0;

function parseQuestion(raw: unknown): HomePollV2Question | null {
  if (!isRecord(raw)) return null;
  const id = String(raw.id ?? '').trim();
  const text = parseText(raw.text);
  if (!ITEM_ID_RE.test(id) || !hasText(text)) return null;
  const options: HomePollV2Option[] = [];
  for (const item of Array.isArray(raw.options) ? raw.options : []) {
    if (!isRecord(item)) continue;
    const optionId = String(item.id ?? '').trim();
    const optionText = parseText(item.text);
    if (!ITEM_ID_RE.test(optionId) || !hasText(optionText) || options.some((o) => o.id === optionId)) continue;
    options.push({ id: optionId, text: optionText });
  }
  if (options.length < 2 || options.length > 4) return null;
  return { id, text, options };
}

/** Один набор из исходника. Набор целиком отбрасывается, если битый хоть один вопрос — частичный набор не показываем. */
export function parseHomePollV2Set(raw: unknown): HomePollV2Set | null {
  if (!isRecord(raw)) return null;
  const id = String(raw.id ?? '').trim();
  if (!SET_ID_RE.test(id)) return null;
  const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
  const questions = rawQuestions.map(parseQuestion);
  if (questions.length < 2 || questions.length > 3 || questions.some((q) => q === null)) return null;
  const ids = (questions as HomePollV2Question[]).map((q) => q.id);
  if (new Set(ids).size !== ids.length) return null;
  return { id, theme: String(raw.theme ?? '').slice(0, 24), questions: questions as HomePollV2Question[] };
}

/**
 * Весь список из исходника в порядке id (p2-001…). Порядок важен: расписание берёт набор по индексу.
 * Битый набор не выкидывается из списка (иначе съедут индексы), а заменяется null — в его день карточки просто нет.
 */
export function parseHomePollV2Catalog(raw: unknown): readonly (HomePollV2Set | null)[] {
  const rows = isRecord(raw) && Array.isArray(raw.sets) ? raw.sets : [];
  const parsed = rows.map(parseHomePollV2Set);
  return parsed;
}

export function pickHomePollV2Text(text: DailyPollLocalizedText, lang: string): string {
  return pickDailyPollText(text, lang);
}

/** Счётчики вопроса только по его вариантам; мусор и отрицательные — ноль. */
export function normalizeHomePollV2Counts(raw: unknown, optionIds: readonly string[]): Record<string, number> {
  const source = isRecord(raw) ? raw : {};
  const out: Record<string, number> = {};
  for (const id of optionIds) {
    const n = Number(source[id]);
    out[id] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

/** Первый вопрос без ответа; null — набор пройден целиком (карточка скрывается до следующего набора). */
export function nextUnansweredQuestionIndex(set: HomePollV2Set, answers: Readonly<Record<string, HomePollV2Answer>>): number | null {
  const index = set.questions.findIndex((q) => !answers[q.id]);
  return index < 0 ? null : index;
}

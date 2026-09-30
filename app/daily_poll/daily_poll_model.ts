// ═══ «Опрос дня» — модель без сети и хранилища ════════════════════════════════
// зачем (владелец 2026-09-30): чистые функции разбора опроса, выбора языка и
// процентов — отдельно от Firebase, чтобы их проверял обычный jest.

/** Языки интерфейса; вопросы в админке заводятся минимум на ru + en. */
export const DAILY_POLL_LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export type DailyPollLocale = (typeof DAILY_POLL_LOCALES)[number];
export type DailyPollLocalizedText = Readonly<Partial<Record<DailyPollLocale, string>>>;

export type DailyPollOption = Readonly<{ id: string; text: DailyPollLocalizedText }>;

export type DailyPoll = Readonly<{
  dateKey: string;
  question: DailyPollLocalizedText;
  options: readonly DailyPollOption[];
  counts: Readonly<Record<string, number>>;
}>;

export type DailyPollVote = Readonly<{
  optionId: string;
  counts: Readonly<Record<string, number>>;
}>;

const OPTION_ID_RE = /^[a-z0-9_-]{1,24}$/;
const MAX_TEXT = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLocalizedText(raw: unknown): DailyPollLocalizedText {
  if (!isRecord(raw)) return {};
  const out: Partial<Record<DailyPollLocale, string>> = {};
  for (const locale of DAILY_POLL_LOCALES) {
    const value = typeof raw[locale] === 'string' ? (raw[locale] as string).trim().slice(0, MAX_TEXT) : '';
    if (value) out[locale] = value;
  }
  return out;
}

function hasBaseLocale(text: DailyPollLocalizedText): boolean {
  return Boolean(text.ru || text.en);
}

/** Счётчики только по вариантам опроса; мусор и отрицательные — ноль. */
export function normalizeDailyPollCounts(raw: unknown, optionIds: readonly string[]): Record<string, number> {
  const source = isRecord(raw) ? raw : {};
  const out: Record<string, number> = {};
  for (const id of optionIds) {
    const n = Number(source[id]);
    out[id] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

/**
 * Документ daily_polls/{dateKey} → опрос для карточки. null — показывать нечего
 * (нет документа, архив, битые варианты, нет ни ru, ни en).
 */
export function parseDailyPoll(raw: unknown, dateKey: string): DailyPoll | null {
  if (!isRecord(raw)) return null;
  if (raw.status !== 'active') return null;
  const question = parseLocalizedText(raw.question);
  if (!hasBaseLocale(question)) return null;
  const options: DailyPollOption[] = [];
  for (const item of Array.isArray(raw.options) ? raw.options : []) {
    if (!isRecord(item)) continue;
    const id = String(item.id ?? '').trim();
    const text = parseLocalizedText(item.text);
    if (!OPTION_ID_RE.test(id) || !hasBaseLocale(text) || options.some((o) => o.id === id)) continue;
    options.push({ id, text });
  }
  if (options.length < 2 || options.length > 4) return null;
  return { dateKey, question, options, counts: normalizeDailyPollCounts(raw.counts, options.map((o) => o.id)) };
}

/** Текст на языке интерфейса → английский → русский → любой непустой. */
export function pickDailyPollText(text: DailyPollLocalizedText, lang: string): string {
  const direct = (text as Record<string, string | undefined>)[lang];
  if (direct) return direct;
  if (text.en) return text.en;
  if (text.ru) return text.ru;
  for (const locale of DAILY_POLL_LOCALES) if (text[locale]) return text[locale] as string;
  return '';
}

/**
 * Проценты по вариантам, в сумме ровно 100 (метод наибольшего остатка), чтобы
 * «33 + 33 + 33» не смущало. Нет голосов — все нули.
 */
export function dailyPollPercents(counts: Readonly<Record<string, number>>, optionIds: readonly string[]): Record<string, number> {
  const values = optionIds.map((id) => Math.max(0, Math.floor(Number(counts[id]) || 0)));
  const total = values.reduce((sum, n) => sum + n, 0);
  const out: Record<string, number> = {};
  if (total <= 0) {
    for (const id of optionIds) out[id] = 0;
    return out;
  }
  const raw = values.map((n) => (n * 100) / total);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((sum, n) => sum + n, 0);
  const order = raw.map((v, i) => ({ i, rest: v - floors[i] })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  const result = [...floors];
  for (const { i } of order) {
    if (left <= 0) break;
    result[i] += 1;
    left -= 1;
  }
  optionIds.forEach((id, i) => { out[id] = result[i]; });
  return out;
}


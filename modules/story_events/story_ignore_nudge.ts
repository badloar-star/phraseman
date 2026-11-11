// ═══════════════════════════════════════════════════════════════════════════
// story_ignore_nudge.ts — правило «усилить сигнал историй, если их игнорируют два дня захода» (чистая логика).
//
// зачем (владелец 11.11: «а если юзер игнорирует истории и не просматривает их 2 дня (заходя при этом 2 дня в приложение)…»;
// вместо колокольчика владелец выбрал на макете «Волны» от кольца аватара): считаются ДНИ ЗАХОДА, а не часы — два дня без запуска
// приложения игнором не считаются. Хранятся только факты (дни захода и было ли в этот день кольцо; день последнего просмотра);
// «показать волны» вычисляется из них каждый раз — долга на показ в хранилище нет (фундамент «празднование не durable»).
// Умолчания, названные владельцу: игнором считается ЗАВЕРШЁННЫЙ день захода (сегодняшний ещё идёт), поэтому сигнал появляется на
// третий день захода; просмотр любой истории обнуляет счёт; день захода без кольца прерывает счёт; дни старше срока жизни историй не считаются.
// Без React Native и без хранилища — правило проверяется тестом напрямую.
// ═══════════════════════════════════════════════════════════════════════════

/** Сколько завершённых дней захода подряд без просмотра нужно, чтобы усилить сигнал. */
export const STORY_IGNORE_NUDGE_DAYS = 2;
/** Дни старше этого окна не считаются: истории живут 7 дней, прошлогодний игнор не про сегодняшнюю историю. */
export const STORY_IGNORE_WINDOW_DAYS = 7;
const DAYS_LIMIT = 8;
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export type StoryIgnoreDay = Readonly<{
  /** Местная дата ГГГГ-ММ-ДД. */
  day: string;
  /** В этот день при заходе была непросмотренная история (хоть раз за день). */
  ring: boolean;
}>;

export type StoryIgnoreFacts = Readonly<{
  /** Дни захода по возрастанию даты, не больше 8. */
  days: readonly StoryIgnoreDay[];
  /** Местная дата последнего просмотра любой истории; null — ещё не смотрели. */
  lastViewedDay: string | null;
}>;

export const STORY_IGNORE_EMPTY: StoryIgnoreFacts = Object.freeze({ days: Object.freeze([]) as readonly StoryIgnoreDay[], lastViewedDay: null });

export function isStoryIgnoreDayKey(value: unknown): value is string {
  return typeof value === 'string' && DAY_KEY.test(value);
}

/** Местная дата телефона: день захода человек понимает по своему календарю, а не по UTC. */
export function storyIgnoreDayKey(nowMs: number): string {
  const date = new Date(nowMs);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayNumber(key: string): number {
  const match = DAY_KEY.exec(key);
  return match ? Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS) : Number.NaN;
}

/** Заход в приложение. Пометка «кольцо было» липкая в пределах дня: поздний пустой снимок историй не стирает её. */
export function recordStoryVisit(facts: StoryIgnoreFacts, input: Readonly<{ today: string; hasUnseen: boolean }>): StoryIgnoreFacts {
  if (!isStoryIgnoreDayKey(input.today)) return facts;
  const known = facts.days.find((entry) => entry.day === input.today);
  if (known && (known.ring || !input.hasUnseen)) return facts;
  const days = [...facts.days.filter((entry) => entry.day !== input.today), { day: input.today, ring: input.hasUnseen }]
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
    .slice(-DAYS_LIMIT);
  return { days, lastViewedDay: facts.lastViewedDay };
}

/** Человек открыл историю: дни до и включая сегодняшний перестают считаться игнором. */
export function recordStoryViewed(facts: StoryIgnoreFacts, today: string): StoryIgnoreFacts {
  if (!isStoryIgnoreDayKey(today) || facts.lastViewedDay === today) return facts;
  return { days: facts.days, lastViewedDay: today };
}

/** Сколько последних завершённых дней захода подряд кольцо было, а историю так и не открыли. */
export function storyIgnoredStreak(facts: StoryIgnoreFacts, today: string): number {
  if (!isStoryIgnoreDayKey(today)) return 0;
  const todayNumber = dayNumber(today);
  const viewed = isStoryIgnoreDayKey(facts.lastViewedDay) ? facts.lastViewedDay : null;
  const past = facts.days.filter((entry) => isStoryIgnoreDayKey(entry.day) && entry.day < today);
  let streak = 0;
  for (let i = past.length - 1; i >= 0; i -= 1) {
    const entry = past[i];
    if (!entry.ring) break;
    if (viewed !== null && entry.day <= viewed) break;
    if (todayNumber - dayNumber(entry.day) > STORY_IGNORE_WINDOW_DAYS) break;
    streak += 1;
  }
  return streak;
}

export function shouldShowStoryIgnoreNudge(facts: StoryIgnoreFacts, input: Readonly<{ today: string; hasUnseen: boolean }>): boolean {
  if (!input.hasUnseen) return false;
  return storyIgnoredStreak(facts, input.today) >= STORY_IGNORE_NUDGE_DAYS;
}

export function serializeStoryIgnoreFacts(facts: StoryIgnoreFacts): string {
  return JSON.stringify({ v: 1, days: facts.days, lastViewedDay: facts.lastViewedDay });
}

/** Разбор уже прочитанной записи (JSON разбирает хранилище и само пишет причину сбоя): чужой формат → пустые факты, счёт начнётся заново. */
export function storyIgnoreFactsFromJson(data: unknown): StoryIgnoreFacts {
  if (typeof data !== 'object' || data === null) return STORY_IGNORE_EMPTY;
  const record = data as { v?: unknown; days?: unknown; lastViewedDay?: unknown };
  if (record.v !== 1 || !Array.isArray(record.days)) return STORY_IGNORE_EMPTY;
  const days = record.days
    .filter((entry): entry is StoryIgnoreDay => typeof entry === 'object' && entry !== null
      && isStoryIgnoreDayKey((entry as { day?: unknown }).day) && typeof (entry as { ring?: unknown }).ring === 'boolean')
    .map((entry) => ({ day: entry.day, ring: entry.ring }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
    .slice(-DAYS_LIMIT);
  return { days, lastViewedDay: isStoryIgnoreDayKey(record.lastViewedDay) ? record.lastViewedDay : null };
}

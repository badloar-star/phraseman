// ═══════════════════════════════════════════════════════════════════════════
// packs_contest_model.ts — «Набор месяца»: кто в подиуме, сколько дней до конца, своё место.
//
// зачем (слово владельца 26.10 через координатора: «голос = лайк, участвуют все новые наборы месяца, призы — Plus и монеты; один игровой блок
// на сцене каталога: подиум топ-3, дни до конца, твоё место»): чистый модуль без React и без сети. Данные — уже загруженный каталог
// (likesCount, authorName, cardCount, updatedAt), поэтому никаких новых чтений Firestore (Firebase-экономия). Месяц — по UTC: один общий
// конец месяца для всех часовых поясов, иначе у соседей на подиуме были бы разные «дни до конца».
// Пока в проекции каталога нет даты создания набора, участие считается по publishedAt (если есть), иначе по updatedAt — заменитель; когда
// Ядро добавит createdAt, меняется только packPublishedAtMs.
// ═══════════════════════════════════════════════════════════════════════════

const DAY_MS = 24 * 60 * 60 * 1000;

/** Минимум полей набора, которые читает конкурс (подмножество FlashcardMarketPack). */
export type ContestPackInput = Readonly<{
  id: string;
  likesCount?: number;
  cardCount: number;
  authorName: string;
  authorStableId?: string;
  isOfficial?: boolean;
  videoId?: string;
  /** Дата публикации набора (ISO), если проекция каталога её отдаёт. */
  publishedAt?: string;
  updatedAt?: string;
}>;

export type ContestEntry = Readonly<{
  id: string;
  likes: number;
  cardCount: number;
  authorName: string;
  authorStableId: string | null;
  publishedAtMs: number;
}>;

export type ContestStanding = Readonly<{
  /** Ключ месяца «ГГГГ-ММ» (UTC). */
  monthKey: string;
  /** Целых дней до конца месяца, минимум 1 (в последний день — «1»). */
  daysLeft: number;
  /** Сколько наборов участвует. */
  entries: number;
  /** Места 1, 2, 3 (меньше — сколько есть). */
  podium: readonly ContestEntry[];
  /** Лучшее место среди своих наборов; нет своих участвующих наборов — null. */
  myPlace: number | null;
  /** Лайки лучшего своего набора; нет — 0. */
  myLikes: number;
}>;

export function contestMonthKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Начало следующего месяца по UTC, мс. */
function nextMonthStartMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

export function contestDaysLeft(nowMs: number): number {
  return Math.max(1, Math.ceil((nextMonthStartMs(nowMs) - nowMs) / DAY_MS));
}

/** Время публикации набора, мс; нет читаемой даты — null (такой набор в конкурсе не участвует: честнее, чем выдумывать месяц). */
export function packPublishedAtMs(pack: Pick<ContestPackInput, 'publishedAt' | 'updatedAt'>): number | null {
  for (const raw of [pack.publishedAt, pack.updatedAt]) {
    if (!raw) continue;
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

function likesOf(pack: ContestPackInput): number {
  const n = pack.likesCount;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Порядок мест: больше лайков — выше; поровну — раньше опубликованный; затем по id (стабильно между кадрами). */
function compareEntries(a: ContestEntry, b: ContestEntry): number {
  if (b.likes !== a.likes) return b.likes - a.likes;
  if (a.publishedAtMs !== b.publishedAtMs) return a.publishedAtMs - b.publishedAtMs;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function contestStanding(packs: readonly ContestPackInput[], nowMs: number, myStableId: string | null): ContestStanding {
  const monthKey = contestMonthKey(nowMs);
  const entries: ContestEntry[] = [];
  for (const pack of packs) {
    if (pack.isOfficial || pack.videoId) continue; // в конкурсе — наборы людей (как в ленте Сообщества)
    const publishedAtMs = packPublishedAtMs(pack);
    if (publishedAtMs === null || contestMonthKey(publishedAtMs) !== monthKey) continue;
    entries.push({
      id: pack.id,
      likes: likesOf(pack),
      cardCount: Math.max(0, Math.floor(pack.cardCount) || 0),
      authorName: pack.authorName,
      authorStableId: pack.authorStableId ?? null,
      publishedAtMs,
    });
  }
  entries.sort(compareEntries);
  let myPlace: number | null = null;
  let myLikes = 0;
  if (myStableId) {
    const index = entries.findIndex((entry) => entry.authorStableId === myStableId);
    if (index >= 0) {
      myPlace = index + 1;
      myLikes = entries[index]!.likes;
    }
  }
  return { monthKey, daysLeft: contestDaysLeft(nowMs), entries: entries.length, podium: entries.slice(0, 3), myPlace, myLikes };
}

export type CatalogSort = 'popular' | 'new';

/**
 * Порядок плиток каталога: «Топ» — больше лайков выше (поровну — новее выше), «Новые» — новее выше (поровну — больше лайков).
 * Набор без читаемой даты уходит вниз «Новых», но остаётся виден. Чистая функция над одним списком — ни запроса, ни индекса.
 */
export function catalogOrder<T extends ContestPackInput>(packs: readonly T[], sort: CatalogSort): T[] {
  const stamp = (pack: T): number => packPublishedAtMs(pack) ?? 0;
  const likes = (pack: T): number => likesOf(pack);
  const out = [...packs];
  out.sort((a, b) => {
    const byLikes = likes(b) - likes(a);
    const byNew = stamp(b) - stamp(a);
    const first = sort === 'popular' ? byLikes : byNew;
    if (first !== 0) return first;
    const second = sort === 'popular' ? byNew : byLikes;
    if (second !== 0) return second;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return out;
}

// Подсчёт конкурса «Набор месяца» по правилам владельца (26.10 + ответы 29.10 ~07:50).
//
// зачем: рейтинг и финализация должны считать одинаково, а правила допуска голоса — работать, не ломая лайки
// старых сборок 147/148 (там лайк и голос пишутся одним пакетом, поэтому правила Firestore голоса не ужесточаем —
// условия применяются здесь, при подсчёте). Модуль чистый: ни Firestore, ни часов — всё во входе; тестируется без эмулятора.
// Типы свои и структурно совместимы с ContestEntry из shared/community_month_contest.ts (тот файл ещё не в git).
//
// Правила:
//  1. участвуют наборы, опубликованные в этом месяце (published / update_pending);
//  2. голос засчитывается, если аккаунту на момент голоса ≥ 72 ч (created_at, иначе дата Firebase Auth — решает вызывающий);
//  3. у голосующего пройден ≥ 1 урок: классика ИЛИ занятие Learning V2;
//  4. у человека засчитываются 10 действующих голосов месяца (самые ранние по времени последнего изменения);
//     снятый лайк перестаёт быть действующим и возвращает голос.

export const CONTEST_MIN_ACCOUNT_AGE_MS = 3 * 24 * 60 * 60 * 1000;
export const CONTEST_MIN_LESSONS = 1;
export const CONTEST_MAX_VOTES_PER_MONTH = 10;
export const CONTEST_TALLY_RULE_VERSION = 3;
/** Ключ облачной копии прогресса Learning V2 в users.progress (modules/learning-v2/progress/progress_sync_v1.ts). */
export const LEARNING_V2_PROGRESS_SYNC_FIELD = 'learning_v2_course_progress_sync_v1';
/**
 * Маска пройденных занятий V2 (course_progress_masks_v1.ts, JSON {v, c, o, s}; c — hex «пройдено»). Ловит прохождение
 * не с начала, которого нет в числе «подряд» (Learning V2 29.10). «o» (открыто) ≠ пройдено — не считаем.
 */
export const LEARNING_V2_MASKS_SYNC_FIELD = 'learning_v2_course_masks_sync_v1';

const HEX_BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

/** Сколько занятий отмечено пройденными в маске V2; битое значение — 0 (не повод отказать, просто нет данных). */
export function learningV2CompletedFromMasks(raw: unknown): number {
  if (typeof raw !== 'string' || !raw || raw.length > 4096) return 0;
  try {
    const value = JSON.parse(raw) as { c?: unknown };
    if (typeof value?.c !== 'string') return 0;
    let bits = 0;
    for (const ch of value.c.toLowerCase()) {
      const n = parseInt(ch, 16);
      if (Number.isNaN(n)) return 0;
      bits += HEX_BITS[n];
    }
    return bits;
  } catch {
    // зачем: битая маска у одного человека не должна валить подсчёт — считаем «данных нет», причина видна в noLesson
    return 0;
  }
}

export type TallyMonth = Readonly<{ id: string; startMs: number; endMs: number }>;
export type TallyPack = Readonly<{ id: string; authorId: string; title: string; publishedAtMs: number; status: string }>;
export type TallyVote = Readonly<{ packId: string; voterId: string; liked: boolean; atMs: number; voteId: string }>;
export type TallyVoter = Readonly<{ createdAtMs: number | null; lessonsCompleted: number }>;
export type TallyEntry = Readonly<{ id: string; authorId: string; title: string; hearts: number; publishedAtMs: number; status: string }>;
export type TallyExclusions = {
  outsideMonth: number; packNotEligible: number; unliked: number; self: number;
  unknownVoter: number; tooYoung: number; noLesson: number; overCap: number;
};
export type TallyStats = Readonly<{ packs: number; votesRead: number; counted: number; excluded: Readonly<TallyExclusions> }>;

const ELIGIBLE_STATUSES = new Set(['published', 'update_pending']);

function count(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * «Пройденный урок» = любой (владелец 29.10): классический (lessons_completed или completed_lessons)
 * ИЛИ занятие Learning V2 (облачная копия числа пройденных подряд занятий). Испанский курс V2 пока не синхронизирует
 * своё число в облако (ключ с суффиксом :target:es) — такие люди засчитываются, если прошли хоть что-то из названного.
 */
export function contestLessonsCompleted(progress: Readonly<Record<string, unknown>> | null | undefined): number {
  if (!progress) return 0;
  const classicDirect = count(progress.lessons_completed);
  const completed = progress.completed_lessons;
  const classicList = Array.isArray(completed) ? completed.length
    : completed && typeof completed === 'object' ? Object.keys(completed).length : 0;
  const v2 = Math.max(count(progress[LEARNING_V2_PROGRESS_SYNC_FIELD]), learningV2CompletedFromMasks(progress[LEARNING_V2_MASKS_SYNC_FIELD]));
  return Math.max(classicDirect, classicList) + v2;
}

/** Возраст аккаунта: created_at профиля, а если пусто — дата создания в Firebase Auth (владелец 29.10). */
export function contestAccountCreatedAtMs(profileCreatedAtMs: number | null, authCreatedAtMs: number | null): number | null {
  if (profileCreatedAtMs != null && Number.isFinite(profileCreatedAtMs) && profileCreatedAtMs > 0) return profileCreatedAtMs;
  if (authCreatedAtMs != null && Number.isFinite(authCreatedAtMs) && authCreatedAtMs > 0) return authCreatedAtMs;
  return null;
}

/**
 * Пересчёт снимка: раз в 3 ч, а в последние сутки месяца — каждый час (владелец 29.10).
 * Расписание функции — каждый час; эта проверка отсекает лишние запуски без чтений базы.
 */
export function contestStandingsShouldRefresh(nowMs: number, month: TallyMonth): boolean {
  if (nowMs >= month.endMs - 24 * 60 * 60 * 1000) return true;
  return new Date(nowMs).getUTCHours() % 3 === 0;
}

/** Поле профиля с фактом победы — его читает приложение и показывает историю (макет Моментов, владелец 29.10). */
export const CONTEST_WIN_STORY_FIELD = 'contest_last_win';
export const CONTEST_WIN_STORY_VERSION = 1;
export type ContestWinStory = Readonly<{
  v: typeof CONTEST_WIN_STORY_VERSION; monthId: string; place: 1 | 2 | 3; plusMonths: number;
  packId: string; packTitle: string; hearts: number; grantedAtMs: number;
}>;

/**
 * Значение progress.contest_last_win: JSON одной строкой (progress — карта строк). Пишется той же транзакцией и тем же
 * ключом журнала, что Plus (grantPlusOnce.extraProgress), поэтому история не может прийти без Plus и наоборот.
 * Название набора режем до 120 знаков — поле лежит в документе пользователя, который синхронизируется целиком.
 */
export function contestWinStoryValue(input: Omit<ContestWinStory, 'v'>): string {
  const story: ContestWinStory = {
    v: CONTEST_WIN_STORY_VERSION,
    monthId: input.monthId,
    place: input.place,
    plusMonths: input.plusMonths,
    packId: input.packId,
    packTitle: input.packTitle.trim().slice(0, 120),
    hearts: Math.max(0, Math.trunc(input.hearts)),
    grantedAtMs: input.grantedAtMs,
  };
  return JSON.stringify(story);
}

export function tallyContestMonth(input: Readonly<{
  month: TallyMonth;
  packs: readonly TallyPack[];
  votes: readonly TallyVote[];
  voters: ReadonlyMap<string, TallyVoter>;
}>): { entries: TallyEntry[]; stats: TallyStats } {
  const { month } = input;
  const ex: TallyExclusions = { outsideMonth: 0, packNotEligible: 0, unliked: 0, self: 0, unknownVoter: 0, tooYoung: 0, noLesson: 0, overCap: 0 };
  // правило 1: только наборы этого месяца
  const packs = new Map<string, TallyPack>();
  for (const p of input.packs) {
    if (p.publishedAtMs >= month.startMs && p.publishedAtMs < month.endMs && ELIGIBLE_STATUSES.has(p.status)) packs.set(p.id, p);
  }
  // последнее состояние голоса (набор, человек) внутри месяца
  const latest = new Map<string, TallyVote>();
  for (const v of input.votes) {
    if (!(v.atMs >= month.startMs && v.atMs < month.endMs)) { ex.outsideMonth += 1; continue; }
    const key = `${v.packId}\u0000${v.voterId}`;
    const prev = latest.get(key);
    if (!prev || v.atMs > prev.atMs || (v.atMs === prev.atMs && v.voteId > prev.voteId)) latest.set(key, v);
  }
  // правила 2–3 — допуск; правило 4 — лимит действующих голосов
  const byVoter = new Map<string, TallyVote[]>();
  for (const v of latest.values()) {
    const pack = packs.get(v.packId);
    if (!pack) { ex.packNotEligible += 1; continue; }
    if (!v.liked) { ex.unliked += 1; continue; } // снятый лайк — не действующий голос и место не занимает
    if (v.voterId === pack.authorId) { ex.self += 1; continue; }
    const voter = input.voters.get(v.voterId);
    if (!voter) { ex.unknownVoter += 1; continue; }
    if (voter.createdAtMs == null || v.atMs - voter.createdAtMs < CONTEST_MIN_ACCOUNT_AGE_MS) { ex.tooYoung += 1; continue; }
    if (voter.lessonsCompleted < CONTEST_MIN_LESSONS) { ex.noLesson += 1; continue; }
    const list = byVoter.get(v.voterId);
    if (list) list.push(v); else byVoter.set(v.voterId, [v]);
  }
  const hearts = new Map<string, number>();
  let counted = 0;
  for (const list of byVoter.values()) {
    const ordered = [...list].sort((a, b) => a.atMs - b.atMs || (a.packId < b.packId ? -1 : a.packId > b.packId ? 1 : 0));
    ex.overCap += Math.max(0, ordered.length - CONTEST_MAX_VOTES_PER_MONTH);
    for (const v of ordered.slice(0, CONTEST_MAX_VOTES_PER_MONTH)) {
      hearts.set(v.packId, (hearts.get(v.packId) ?? 0) + 1);
      counted += 1;
    }
  }
  const entries: TallyEntry[] = [...packs.values()].map((p) => ({
    id: p.id, authorId: p.authorId, title: p.title, hearts: hearts.get(p.id) ?? 0, publishedAtMs: p.publishedAtMs, status: p.status,
  }));
  return { entries, stats: { packs: packs.size, votesRead: input.votes.length, counted, excluded: ex } };
}

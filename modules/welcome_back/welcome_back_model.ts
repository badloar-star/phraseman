/**
 * Окно «С возвращением» — чистая логика без React и без чтения данных (D193, владелец 14.10).
 *
 * зачем: по возвращении после долгого отсутствия вместо пейвола Plus показываем окно «С возвращением» (образец m21
 * engagement-moments-v3-all.html). Цифры — только настоящие, из локальных данных; серию не упоминаем, если она сгорела;
 * главная кнопка ведёт к самому лёгкому шагу: короткое повторение карточек, а без карточек — к текущему уроку.
 * Решение отделено от экрана, чтобы правила проверялись тестами, а экран только рисовал.
 */

/** Порог отсутствия — тот же, что у winback (7 дней). */
export const WELCOME_BACK_MIN_AWAY_MS = 7 * 24 * 60 * 60 * 1000;
/** Сколько карточек максимум в коротком повторении «— 1 минута». */
export const WELCOME_BACK_MAX_CARDS = 5;

export type WelcomeBackInput = Readonly<{
  nowMs: number;
  /** Последняя активность до этого возвращения (мс), null — нет данных. */
  lastActiveMs: number | null;
  /** Когда это окно показывали в последний раз (мс), null — никогда. */
  shownAtMs: number | null;
  phrasesLearned: number;
  coinRank: number;
  energy: Readonly<{ current: number; max: number }> | null;
  /** Серия дней, если она ещё жива; null — сгорела или её нет. */
  aliveStreakDays: number | null;
  cardsDue: number;
  cardsSaved: number;
  /** Текущий урок для кнопки «Продолжить урок», null — нет. */
  currentLessonId: number | null;
}>;

export type WelcomeBackPrimary =
  | Readonly<{ kind: 'cards'; count: number; source: 'due' | 'recent_saved' }>
  | Readonly<{ kind: 'lesson'; lessonId: number }>
  | Readonly<{ kind: 'home' }>;

export type WelcomeBackStats = Readonly<{
  awayDays: number;
  phrasesLearned: number;
  coinRank: number;
  energyFull: boolean | null;
  /** Только если серия жива; иначе не упоминается. */
  aliveStreakDays: number | null;
}>;

export type WelcomeBackDecision =
  | Readonly<{ show: false; reason: 'no_last_active' | 'recent' | 'already_shown' }>
  | Readonly<{ show: true; reason: 'away'; stats: WelcomeBackStats; primary: WelcomeBackPrimary }>;

function clampCount(n: number): number {
  return Math.max(0, Math.min(WELCOME_BACK_MAX_CARDS, Math.floor(Number.isFinite(n) ? n : 0)));
}

export function decideWelcomeBackPrimary(input: Pick<WelcomeBackInput, 'cardsDue' | 'cardsSaved' | 'currentLessonId'>): WelcomeBackPrimary {
  const due = clampCount(input.cardsDue);
  if (due > 0) return { kind: 'cards', count: due, source: 'due' };
  const saved = clampCount(input.cardsSaved);
  if (saved > 0) return { kind: 'cards', count: saved, source: 'recent_saved' };
  if (input.currentLessonId !== null && input.currentLessonId > 0) return { kind: 'lesson', lessonId: input.currentLessonId };
  return { kind: 'home' };
}

export function decideWelcomeBack(input: WelcomeBackInput): WelcomeBackDecision {
  if (input.lastActiveMs === null || input.lastActiveMs <= 0) return { show: false, reason: 'no_last_active' };
  const awayMs = input.nowMs - input.lastActiveMs;
  if (awayMs < WELCOME_BACK_MIN_AWAY_MS) return { show: false, reason: 'recent' };
  // 1 раз на возвращение: окно уже показывали после последней активности — это то же возвращение.
  if (input.shownAtMs !== null && input.shownAtMs > input.lastActiveMs) return { show: false, reason: 'already_shown' };
  const energyFull = input.energy ? input.energy.current >= input.energy.max : null;
  return {
    show: true,
    reason: 'away',
    stats: {
      awayDays: Math.floor(awayMs / (24 * 60 * 60 * 1000)),
      phrasesLearned: Math.max(0, Math.floor(input.phrasesLearned)),
      coinRank: Math.max(0, Math.floor(input.coinRank)), // guard-ok: только показ числа в окне, баланс не меняется
      energyFull,
      aliveStreakDays: input.aliveStreakDays !== null && input.aliveStreakDays > 0 ? input.aliveStreakDays : null,
    },
    primary: decideWelcomeBackPrimary(input),
  };
}

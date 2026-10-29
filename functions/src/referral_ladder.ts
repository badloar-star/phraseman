// Лесенка приглашений (владелец 29.10 ~09:20–09:22): вместо рулетки и «7 дней за друга».
// За каждого засчитанного друга — 500 монет обоим; за каждые 3 засчитанных — Plus 14 дней пригласившему.
// Друг засчитывается за ПЕРВЫЙ пройденный урок (любой: классика или Learning V2), а не за покупку.
//
// зачем защита (координатор 29.10): без покупки лесенку легко «фармить» новыми аккаунтами. Поэтому засчитывается только:
//  - свежий аккаунт друга (создан не раньше чем за сутки до ввода кода — старый аккаунт «под чужой код» не годится);
//  - один раз на аккаунт друга (ключ журнала по другу);
//  - не сам себя: разные uid и, если оба известны, разные installationId;
//  - урок пройден в течение 30 дней от ввода кода;
//  - не больше 10 засчитанных друзей в месяц на пригласившего (≤ 3 × 14 дней Plus в месяц).
// Модуль чистый: решение по фактам на входе, без Firestore. Каждый отказ — с причиной для лога [REF-LADDER].

export const LADDER_COINS_PER_FRIEND = 500;
export const LADDER_FRIENDS_PER_TIER = 3;
export const LADDER_PLUS_DAYS_PER_TIER = 14;
export const LADDER_MAX_FRIENDS_PER_MONTH = 10;
export const LADDER_LESSON_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** «Аккаунт создан после ввода кода» с запасом на установку и регистрацию перед вводом кода. */
export const LADDER_FRESH_ACCOUNT_SLACK_MS = 24 * 60 * 60 * 1000;

export type LadderRefusal =
  | 'self_referral'
  | 'same_installation'
  | 'account_not_fresh'
  | 'account_age_unknown'
  | 'no_lesson'
  | 'lesson_window_expired'
  | 'already_counted'
  | 'monthly_cap';

export type LadderInput = Readonly<{
  referrerUid: string;
  refereeUid: string;
  referrerInstallationId: string | null;
  refereeInstallationId: string | null;
  /** Когда друг ввёл код (attribution.createdAtMs). */
  appliedAtMs: number;
  /** Когда создан аккаунт друга (created_at профиля или Firebase Auth). */
  refereeCreatedAtMs: number | null;
  /** Пройденные уроки друга (contestLessonsCompleted: классика + V2). */
  refereeLessonsCompleted: number;
  /** Когда сработало прохождение урока (время триггера). */
  lessonAtMs: number;
  /** Друг уже засчитан раньше (attribution не 'pending'). */
  alreadyCounted: boolean;
  /** Сколько друзей уже засчитано пригласившему в этом месяце (UTC). */
  referrerCountedThisMonth: number;
  /** Сколько друзей засчитано пригласившему за всё время до этого (для ступеней Plus). */
  referrerCountedTotal: number;
}>;

export type LadderDecision =
  | Readonly<{ ok: true; coinsEach: number; friendNumber: number; plusTier: number | null; plusDays: number }>
  | Readonly<{ ok: false; reason: LadderRefusal; detail: Readonly<Record<string, number | string | null>> }>;

export function decideReferralLadder(input: LadderInput): LadderDecision {
  const refuse = (reason: LadderRefusal, detail: Record<string, number | string | null> = {}): LadderDecision => ({ ok: false, reason, detail });
  if (input.alreadyCounted) return refuse('already_counted');
  if (!input.referrerUid || input.referrerUid === input.refereeUid) return refuse('self_referral');
  if (input.referrerInstallationId && input.refereeInstallationId && input.referrerInstallationId === input.refereeInstallationId) {
    return refuse('same_installation');
  }
  if (input.refereeCreatedAtMs == null || !Number.isFinite(input.refereeCreatedAtMs)) return refuse('account_age_unknown');
  if (input.refereeCreatedAtMs < input.appliedAtMs - LADDER_FRESH_ACCOUNT_SLACK_MS) {
    return refuse('account_not_fresh', { createdBeforeApplyMs: input.appliedAtMs - input.refereeCreatedAtMs });
  }
  if (input.refereeLessonsCompleted < 1) return refuse('no_lesson', { lessons: input.refereeLessonsCompleted });
  if (input.lessonAtMs - input.appliedAtMs > LADDER_LESSON_WINDOW_MS) {
    return refuse('lesson_window_expired', { sinceApplyMs: input.lessonAtMs - input.appliedAtMs });
  }
  if (input.referrerCountedThisMonth >= LADDER_MAX_FRIENDS_PER_MONTH) {
    return refuse('monthly_cap', { countedThisMonth: input.referrerCountedThisMonth });
  }
  const friendNumber = Math.max(0, Math.trunc(input.referrerCountedTotal)) + 1;
  const plusTier = friendNumber % LADDER_FRIENDS_PER_TIER === 0 ? friendNumber / LADDER_FRIENDS_PER_TIER : null;
  return { ok: true, coinsEach: LADDER_COINS_PER_FRIEND, friendNumber, plusTier, plusDays: plusTier ? LADDER_PLUS_DAYS_PER_TIER : 0 };
}

/** Ключи журналов (идемпотентность): монеты — на пару, Plus — на ступень пригласившего. */
export function ladderCoinsOpId(referrerUid: string, refereeUid: string, side: 'referrer' | 'referee'): string {
  return `referral_ladder_coins:${side}:${referrerUid}_${refereeUid}`;
}
export function ladderPlusGrantKey(referrerUid: string, tier: number): string {
  return `referral_ladder:${referrerUid}_tier${tier}`;
}

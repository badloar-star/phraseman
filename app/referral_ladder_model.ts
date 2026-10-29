// ═══════════════════════════════════════════════════════════════════════════
// referral_ladder_model.ts — «Лесенка приглашений»: чистая модель двух ступеней из снимка приглашений.
//
// зачем (владелец 29.10, макет v3 QTcHjbVMPK64SWmobt1Vig): вместо скрытой рулетки Plus — понятные ступени. Ступень 1: друг прошёл первый урок = 500 монет
// обоим. Ступень 2: каждые трое засчитанных друзей = Plus на 14 дней, прогресс «x из 3». Награды выдаёт ТОЛЬКО сервер; клиент ничего не считает за
// сервер и не выдумывает — если поля `ladder` в ответе ещё нет (старый сервер), лесенка показывает нули и `hasData=false`.
// Контракт с Ядром (29.10): referralListMyInvites.ladder = { countedFriends, plusGrants, coinsPerFriend, plusDaysPerGrant, friendsPerGrant,
// monthCounted, monthlyCap, lessonWindowDays }; прогресс = countedFriends − plusGrants × friendsPerGrant (по факту 0..2: на каждом третьем сервер сразу выдаёт Plus).
// Статусы «покупка Plus» (qualified/rewarded старой рулетки) с «первым уроком» НЕ смешиваются.
// ═══════════════════════════════════════════════════════════════════════════
import type { ReferralDrainState, ReferralInvite, ReferralLadderData } from './referral_cloud';

export const LADDER_DEFAULT_COINS = 500;
export const LADDER_DEFAULT_PLUS_DAYS = 14;
export const LADDER_DEFAULT_PER_GRANT = 3;
export const LADDER_DEFAULT_WINDOW_DAYS = 30;

export type ReferralLadderView = Readonly<{
  /** Пришли ли данные лесенки с сервера (иначе все числа — значения по умолчанию, ступени пустые). */
  hasData: boolean;
  counted: number;
  /** Имя единственного засчитанного друга (ответ координатора 29.10: без рода и падежа); null — друзей не один или имени нет. */
  firstName: string | null;
  coinsPerFriend: number;
  plusDays: number;
  friendsPerGrant: number;
  lessonWindowDays: number;
  /** Ступень 1 пройдена: засчитан хотя бы один друг. */
  step1Done: boolean;
  /** Сколько друзей из текущей тройки (0..friendsPerGrant). */
  cycle: number;
  /** Ступень 2 «Plus получен»: на тройке (или чуть раньше счётчика сервера) — выдача уже была. */
  step2Done: boolean;
  /** Полоса прогресса ступени 2, 0..100. */
  progressPct: number;
  monthCounted: number;
  monthlyCap: number;
  /** Месячный потолок исчерпан: новые друзья пойдут в следующем месяце. */
  capReached: boolean;
}>;

function whole(value: unknown, fallback: number, min = 0): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= min ? n : fallback;
}

export function deriveReferralLadder(raw: Partial<ReferralLadderData> | null | undefined, invites?: ReadonlyArray<Pick<ReferralInvite, 'ladder' | 'refereeName'>> | null): ReferralLadderView {
  const hasData = !!raw && typeof raw === 'object';
  const counted = whole(raw?.countedFriends, 0);
  const perGrant = whole(raw?.friendsPerGrant, LADDER_DEFAULT_PER_GRANT, 1);
  const grants = whole(raw?.plusGrants, 0);
  const cycleRaw = Math.max(0, counted - grants * perGrant);
  const cycle = Math.min(perGrant, cycleRaw);
  // зачем: сервер выдаёт Plus ровно на каждом третьем, так что cycle живёт в 0..2; «выдано» = были выдачи и новая тройка ещё не начата,
  // либо счётчик уже догнал тройку, а выдача ещё в пути (3/3 мгновенно превращается в Plus).
  const step2Done = cycle >= perGrant || (grants > 0 && cycle === 0 && counted > 0);
  const countedInvites = counted === 1 ? (invites ?? []).filter((i) => i.ladder === 'counted') : [];
  const rawName = countedInvites.length === 1 ? String(countedInvites[0]?.refereeName ?? '').trim().split(' ').filter(Boolean).join(' ') : '';
  const monthlyCap = whole(raw?.monthlyCap, 0);
  const monthCounted = whole(raw?.monthCounted, 0);
  return {
    hasData,
    counted,
    firstName: rawName ? rawName.slice(0, 40) : null,
    coinsPerFriend: whole(raw?.coinsPerFriend, LADDER_DEFAULT_COINS, 1),
    plusDays: whole(raw?.plusDaysPerGrant, LADDER_DEFAULT_PLUS_DAYS, 1),
    friendsPerGrant: perGrant,
    lessonWindowDays: whole(raw?.lessonWindowDays, LADDER_DEFAULT_WINDOW_DAYS, 1),
    step1Done: counted >= 1,
    cycle,
    step2Done,
    progressPct: step2Done ? 100 : Math.round((cycle / perGrant) * 100),
    monthCounted,
    monthlyCap,
    capReached: monthlyCap > 0 && monthCounted >= monthlyCap,
  };
}

/**
 * Рулетка при включённой лесенке видна только пока есть накопленное: готовый ключ или друг, чей ключ ещё можно забрать.
 * зачем (Ядро 29.10): новые ключи за покупку не начисляются для приглашений после включения лесенки, старые ещё ~7 дней могут заработать ключ.
 */
export function referralRouletteVisibleWithLadder(drain: Pick<ReferralDrainState, 'availableCreditCount' | 'claimableQualifiedCount'> | null | undefined, spinCredits: number): boolean {
  if (spinCredits > 0) return true;
  if (!drain) return false;
  return drain.availableCreditCount > 0 || drain.claimableQualifiedCount > 0;
}

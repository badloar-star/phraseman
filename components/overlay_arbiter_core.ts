export type OverlayKey =
  | 'update'
  | 'releaseNotes'
  | 'broadcast'
  | 'leagueBonusAvailable'
  | 'notifNudge'
  | 'introFullAccess'
  | 'loyaltyGift'
  | 'dailyPlan'
  | 'levelUp'
  | 'themedAlert'
  | 'premiumCelebration'
  | 'vipCelebration'
  | 'leagueResult'
  | 'streakRevive'
  | 'entitlementExpired'
  | 'referralWelcome'
  | 'mysteryMondayChest'
  | 'comebackDay'
  | 'perfectWeekReward'
  | 'compassBriefing'
  | 'lessonCompleteNotif'
  | 'arenaRoomConfirm'
  | 'shardsEarned'
  | 'matchFoundToastScreen'
  | 'matchFoundToast'
  | 'arenaInvite'
  | 'achievementToast'
  | 'dailyTaskRewardToast'
  | 'coachToast'
  | 'actionToast';

export type WantsMap = Record<OverlayKey, boolean>;

export const OVERLAY_PRIORITY: readonly OverlayKey[] = [
  'update',
  'releaseNotes',
  'broadcast',
  'leagueBonusAvailable',
  'notifNudge',
  'introFullAccess',
  'loyaltyGift',
  'dailyPlan',
  'levelUp',
  'themedAlert',
  'premiumCelebration',
  'vipCelebration',
  'leagueResult',
  'streakRevive',
  'entitlementExpired',
  'referralWelcome',
  'mysteryMondayChest',
  'comebackDay',
  'perfectWeekReward',
  'compassBriefing',
  'lessonCompleteNotif',
  'arenaRoomConfirm',
  'shardsEarned',
  'matchFoundToastScreen',
  'matchFoundToast',
  'arenaInvite',
  'achievementToast',
  'dailyTaskRewardToast',
  'coachToast',
  'actionToast',
];

export const EMPTY_OVERLAY_WANTS: WantsMap = {
  update: false,
  releaseNotes: false,
  broadcast: false,
  leagueBonusAvailable: false,
  notifNudge: false,
  introFullAccess: false,
  loyaltyGift: false,
  dailyPlan: false,
  levelUp: false,
  themedAlert: false,
  premiumCelebration: false,
  vipCelebration: false,
  leagueResult: false,
  streakRevive: false,
  entitlementExpired: false,
  referralWelcome: false,
  mysteryMondayChest: false,
  comebackDay: false,
  perfectWeekReward: false,
  compassBriefing: false,
  lessonCompleteNotif: false,
  arenaRoomConfirm: false,
  shardsEarned: false,
  matchFoundToastScreen: false,
  matchFoundToast: false,
  arenaInvite: false,
  achievementToast: false,
  dailyTaskRewardToast: false,
  coachToast: false,
  actionToast: false,
};

export function resolveNextOverlay(
  current: OverlayKey | null,
  wantsMap: Partial<Record<OverlayKey, boolean>>,
): OverlayKey | null {
  if (current && wantsMap[current]) return current;
  for (const k of OVERLAY_PRIORITY) {
    if (wantsMap[k]) return k;
  }
  return null;
}

/**
 * Есть ли среди желающих кто-то, КРОМЕ текущего владельца слота. Используется
 * сторожем (H-ARBITER), чтобы понять, голодают ли нижеприоритетные оверлеи из-за
 * залипшего владельца.
 */
export function hasOtherWaiters(
  current: OverlayKey | null,
  wantsMap: Partial<Record<OverlayKey, boolean>>,
): boolean {
  for (const k of OVERLAY_PRIORITY) {
    if (k !== current && wantsMap[k]) return true;
  }
  return false;
}

/**
 * Следующий желающий оверлей, ИСКЛЮЧАЯ текущего владельца. Сторож вызывает это, когда
 * владелец держит слот слишком долго при наличии очереди — чтобы принудительно
 * передать слот дальше и не заморозить показ остальных. Возвращает null, если других
 * желающих нет (тогда форсить нечего — владельца не трогаем).
 */
export function resolveNextOverlayExcluding(
  current: OverlayKey | null,
  wantsMap: Partial<Record<OverlayKey, boolean>>,
): OverlayKey | null {
  for (const k of OVERLAY_PRIORITY) {
    if (k !== current && wantsMap[k]) return k;
  }
  return null;
}

/**
 * Решение, можно ли записать `wants` для ключа с учётом «карантина» зависших владельцев.
 *
 * Сторож (H-ARBITER) кладёт зависшего владельца в `forciblyReleased`. Пока он там, его
 * попытка снова занять слот (`wants:true`) ДОЛЖНА игнорироваться — иначе зависший владелец
 * каждые 15с забирает слот обратно (пинг-понг), голодя нижние модалки. Карантин снимается
 * только настоящим релизом (`wants:false`) — закрытием/размонтированием модалки.
 *
 * Чистая функция: возвращает следующее состояние множества карантина и применять ли запись.
 * Провайдер вызывает её в setWants, тесты — напрямую.
 */
export function decideWantsWrite(
  key: OverlayKey,
  wants: boolean,
  forciblyReleased: ReadonlySet<OverlayKey>,
): { apply: boolean; nextForciblyReleased: Set<OverlayKey> } {
  const next = new Set(forciblyReleased);
  if (forciblyReleased.has(key)) {
    if (wants) {
      // Зависший владелец пытается снова занять слот, не освободив его — игнорируем.
      return { apply: false, nextForciblyReleased: next };
    }
    // Настоящее освобождение — снимаем карантин, дальше запись применяется штатно.
    next.delete(key);
  }
  return { apply: true, nextForciblyReleased: next };
}

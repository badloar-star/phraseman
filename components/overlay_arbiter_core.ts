export type OverlayKey =
  | 'update'
  | 'releaseNotes'
  | 'releaseWave'
  | 'broadcast'
  | 'leagueBonusAvailable'
  | 'notifNudge'
  | 'firstLessonSheet'
  | 'dailyPlan'
  | 'levelUp'
  | 'themedAlert'
  | 'premiumCelebration'
  | 'vipCelebration'
  | 'leagueResult'
  | 'streakRevive'
  | 'entitlementExpired'
  | 'referralWelcome'
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
  'releaseWave',
  'broadcast',
  'leagueBonusAvailable',
  'notifNudge',
  'firstLessonSheet',
  'dailyPlan',
  'levelUp',
  'themedAlert',
  'premiumCelebration',
  'vipCelebration',
  'leagueResult',
  'streakRevive',
  'entitlementExpired',
  'referralWelcome',
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
  releaseWave: false,
  broadcast: false,
  leagueBonusAvailable: false,
  notifNudge: false,
  firstLessonSheet: false,
  dailyPlan: false,
  levelUp: false,
  themedAlert: false,
  premiumCelebration: false,
  vipCelebration: false,
  leagueResult: false,
  streakRevive: false,
  entitlementExpired: false,
  referralWelcome: false,
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

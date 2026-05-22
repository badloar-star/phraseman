export type OverlayKey =
  | 'update'
  | 'releaseNotes'
  | 'releaseWave'
  | 'broadcast'
  | 'leagueBonusAvailable'
  | 'notifNudge'
  | 'firstLessonSheet'
  | 'levelUp'
  | 'themedAlert'
  | 'premiumCelebration'
  | 'vipCelebration'
  | 'leagueResult'
  | 'streakRevive'
  | 'lessonCompleteNotif'
  | 'arenaRoomConfirm'
  | 'shardsEarned'
  | 'matchFoundToastScreen'
  | 'matchFoundToast'
  | 'arenaInvite'
  | 'achievementToast'
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
  'levelUp',
  'themedAlert',
  'premiumCelebration',
  'vipCelebration',
  'leagueResult',
  'streakRevive',
  'lessonCompleteNotif',
  'arenaRoomConfirm',
  'shardsEarned',
  'matchFoundToastScreen',
  'matchFoundToast',
  'arenaInvite',
  'achievementToast',
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
  levelUp: false,
  themedAlert: false,
  premiumCelebration: false,
  vipCelebration: false,
  leagueResult: false,
  streakRevive: false,
  lessonCompleteNotif: false,
  arenaRoomConfirm: false,
  shardsEarned: false,
  matchFoundToastScreen: false,
  matchFoundToast: false,
  arenaInvite: false,
  achievementToast: false,
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

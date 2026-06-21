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

// Транзиентный «тост-ярус»: оверлеи, которые сами по себе автозакрываются по таймеру
// и могут по ошибке «залипнуть» (ownState застрял true, слот не освобождён). ТОЛЬКО их
// сторож (H-ARBITER) имеет право принудительно выселять и карантинить.
//
// КРУПНЫЕ модалки (update/releaseNotes/broadcast/levelUp/подарки/праздники/intro/loyalty/
// dailyPlan/celebration/leagueResult/streakRevive/… — всё, чего здесь НЕТ) закрывает
// ПОЛЬЗОВАТЕЛЬ. Их НЕЛЬЗЯ выселять по таймеру: иначе если юзер просто читает окно >15с,
// а за ним ждёт мелкий тост, окно (и его награда, напр. сундук level-up) пропадёт на всю
// сессию. Это и был баг: сторож карантинил живую модалку как «зависшую».
// ВАЖНО: сюда входят ТОЛЬКО оверлеи, которые сами автозакрываются по таймеру и потому
// могут «залипнуть» при сбое. lessonCompleteNotif и arenaRoomConfirm СЮДА НЕ входят — их
// закрывает юзер тапом (их выселение по таймеру = та же болезнь, что и с level-up).
// arenaInvite оставлен: у него есть собственный авто-decline по таймеру, он транзиентен.
export const FORCE_EVICTABLE_KEYS: ReadonlySet<OverlayKey> = new Set<OverlayKey>([
  'shardsEarned',
  'matchFoundToastScreen',
  'matchFoundToast',
  'arenaInvite',
  'achievementToast',
  'dailyTaskRewardToast',
  'coachToast',
  'actionToast',
]);

/**
 * Можно ли сторожу (H-ARBITER) принудительно отобрать слот у этого владельца.
 * true — только для транзиентных тостов/уведомлений (см. FORCE_EVICTABLE_KEYS);
 * для всех крупных пользовательских модалок — false (их закрывает юзер, не таймер).
 */
export function isForceEvictable(key: OverlayKey | null): boolean {
  return key != null && FORCE_EVICTABLE_KEYS.has(key);
}

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

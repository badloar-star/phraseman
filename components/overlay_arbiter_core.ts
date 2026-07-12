export type OverlayKey =
  | 'onboardingWelcome'
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
  | 'arenaSeasonResult'
  | 'streakRevive'
  | 'entitlementExpired'
  | 'referralWelcome'
  | 'mysteryMondayChest'
  | 'comebackDay'
  | 'perfectWeekReward'
  | 'boonActivated'
  | 'compassBriefing'
  | 'lessonResultsSequence'
  | 'lessonCompleteNotif'
  | 'arenaRoomConfirm'
  | 'collectibleDrop'
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
  // onboardingWelcome — приветствие-«знакомство» сразу после онбординга. Должно идти
  // ПЕРВЫМ: новичок сначала осваивается, потом получает награды/обновления. Раньше оно
  // рендерилось мимо арбитра (полноэкранный <Modal>) и презентовалось ОДНОВРЕМЕННО с
  // наградной/update-модалкой, которую отдавал арбитр → на iOS два present подряд = первый
  // (welcome) схлопывался («мелькнул и пропал»), стек презентаций зависал (фриз). Через
  // арбитр welcome держит единственный слот первым, остальные ждут очереди.
  'onboardingWelcome',
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
  'arenaSeasonResult',
  'streakRevive',
  'entitlementExpired',
  'referralWelcome',
  'mysteryMondayChest',
  'comebackDay',
  'boonActivated',
  'compassBriefing',
  // lessonResultsSequence — полноэкранная секвенция наград на lesson_complete (FeedbackKit
  // §2.1). Стоит ВЫШЕ всего каскада этого экрана (lessonCompleteNotif → collectibleDrop →
  // coachToast): празднование играет ПЕРВЫМ, модалки наград ждут его завершения в очереди.
  'lessonResultsSequence',
  'lessonCompleteNotif',
  'arenaRoomConfirm',
  'collectibleDrop',
  'shardsEarned',
  'matchFoundToastScreen',
  'matchFoundToast',
  'arenaInvite',
  'achievementToast',
  'dailyTaskRewardToast',
  'coachToast',
  'actionToast',
  // perfectWeekReward — недельный бонус («Идеальная неделя»). По требованию показывается
  // САМЫМ ПОСЛЕДНИМ: дожидается, пока закроются ВСЕ остальные окна (приветствие, обновление,
  // «что нового», компас, праздники, тосты) — и только тогда занимает слот. Награда уже
  // начислена в PerfectWeekHost при eligibility (claim до рендера), поэтому ждать слот
  // безопасно: даже если юзер уйдёт раньше, осколки не теряются — модалка лишь сообщает.
  'perfectWeekReward',
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
//
// arenaInvite НАМЕРЕННО ИСКЛЮЧЁН (раньше был тут). Его собственный авто-decline = 60с
// (INVITE_TIMEOUT_MS), а окно сторожа = 15с (OVERLAY_MAX_HOLD_WITH_WAITERS_MS). Пока он
// был force-evictable, любой тост в очереди (achievement/action/coach/daily) заставлял
// сторож выселить ЖИВОЕ приглашение через 15с → попап пропадал у юзера за ~45с до
// авто-decline, и принять приглашение было уже нельзя («окно само закрылось»). У всех
// остальных force-evictable их авто-таймер < 15с, поэтому сторож их и не трогает.
// Исключение arenaInvite из этого списка НЕ создаёт залипания: его 60с авто-decline сам
// освободит слот (topInvite→null). Тосты ниже ждут максимум до принятия/отклонения/60с.
export const FORCE_EVICTABLE_KEYS: ReadonlySet<OverlayKey> = new Set<OverlayKey>([
  'shardsEarned',
  'matchFoundToastScreen',
  'matchFoundToast',
  'achievementToast',
  'dailyTaskRewardToast',
  'coachToast',
  'actionToast',
  // boonActivated — ИНФОРМАЦИОННАЯ плашка «бонус дня активирован» (бонус уже включён,
  // закрытие НЕ выдаёт награду — см. BoonActivatedHost.close: только markShown+wantShow=false).
  // Поэтому её ОБЯЗАТЕЛЬНО можно выселять сторожем: если юзер не нажал «Отлично», а свернул
  // приложение / ушёл навигацией, wantShow застревает true → слот занят → все тосты ниже по
  // приоритету мертвы до перезапуска (рецидив бага «все тосты глобально пропали»). В отличие
  // от сундуков (mystery/comeback/perfectWeek) тут терять нечего — плашка лишь информирует.
  'boonActivated',
]);

// ════════════════════════════════════════════════════════════════════════════
// NATIVE-MODAL HANDOFF GAP (защита от present-during-dismiss фриза на iOS)
//
// Эти оверлеи рендерятся нативным <Modal>. На iOS нельзя начинать present одного
// Modal, пока другой ещё закрывается (dismiss) — стек презентаций ломается: первый
// «мелькает и схлопывается», второй виснет полупрезентованным → ЗАВИСАНИЕ (скролл
// есть, кнопки/табы мертвы). Арбитр переключал active СИНХРОННО (в один кадр
// dismiss A + present B), поэтому КАЖДЫЙ переход нативная→нативная модалка был
// риском фриза. Решение: при переходе active с одной нативной модалки на ДРУГУЮ
// нативную сначала закрываем текущую (active=null), ждём докрытия, потом отдаём
// слот следующей. Переходы из/в НЕ-нативные оверлеи (тосты, in-place) и первый
// показ из null безопасны и идут мгновенно.
//
// Оверлеи НЕ из этого списка (streakRevive, тосты actionToast/coachToast и пр.)
// рендерятся обычными View поверх экрана, не нативным Modal — им зазор не нужен.
// ════════════════════════════════════════════════════════════════════════════
export const NATIVE_MODAL_KEYS: ReadonlySet<OverlayKey> = new Set<OverlayKey>([
  'onboardingWelcome',
  'update',
  'releaseNotes',
  'broadcast',
  'leagueBonusAvailable',
  'notifNudge',
  'introFullAccess',
  'loyaltyGift',
  'levelUp',
  'premiumCelebration',
  'vipCelebration',
  'leagueResult',
  'arenaSeasonResult',
  'entitlementExpired',
  'referralWelcome',
  'themedAlert',
  'mysteryMondayChest',
  'comebackDay',
  'perfectWeekReward',
  'boonActivated',
  'compassBriefing',
  'collectibleDrop',
  'achievementToast',
  // arenaRoomConfirm = ThemedChoiceModal = НАТИВНЫЙ <Modal> (как themedAlert). Без него
  // в этом списке передача слота из/в это окно шла без 360мс-зазора → на iOS present
  // поверх ещё закрывающегося нативного модала (напр. глобального update/introFullAccess
  // при заходе в комнату) ломал стек модалок (фриз / одно окно пропадало).
  'arenaRoomConfirm',
]);

/** Рендерится ли ключ нативным <Modal> (нужен ли зазор при передаче слота). */
export function isNativeModal(key: OverlayKey | null): boolean {
  return key != null && NATIVE_MODAL_KEYS.has(key);
}

/**
 * Нужен ли «зазор закрытия» при переходе слота prev → next. true только когда обе
 * стороны — нативные модалки и это РАЗНЫЕ ключи (т.е. реальная передача present от
 * одного Modal другому). Первый показ (prev=null), закрытие в никуда (next=null) и
 * любые переходы с участием не-нативного оверлея зазора НЕ требуют.
 */
export function needsHandoffGap(prev: OverlayKey | null, next: OverlayKey | null): boolean {
  return prev != null && next != null && prev !== next && isNativeModal(prev) && isNativeModal(next);
}

/**
 * Можно ли сторожу (H-ARBITER) принудительно отобрать слот у этого владельца.
 * true — только для транзиентных тостов/уведомлений (см. FORCE_EVICTABLE_KEYS);
 * для всех крупных пользовательских модалок — false (их закрывает юзер, не таймер).
 */
export function isForceEvictable(key: OverlayKey | null): boolean {
  return key != null && FORCE_EVICTABLE_KEYS.has(key);
}

export const EMPTY_OVERLAY_WANTS: WantsMap = {
  onboardingWelcome: false,
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
  arenaSeasonResult: false,
  streakRevive: false,
  entitlementExpired: false,
  referralWelcome: false,
  mysteryMondayChest: false,
  comebackDay: false,
  perfectWeekReward: false,
  boonActivated: false,
  compassBriefing: false,
  lessonResultsSequence: false,
  lessonCompleteNotif: false,
  arenaRoomConfirm: false,
  collectibleDrop: false,
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

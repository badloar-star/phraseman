import {
  decideWantsWrite,
  EMPTY_OVERLAY_WANTS,
  FORCE_EVICTABLE_KEYS,
  hasOtherWaiters,
  isForceEvictable,
  isNativeModal,
  NATIVE_MODAL_KEYS,
  needsHandoffGap,
  OVERLAY_PRIORITY,
  resolveNextOverlay,
  resolveNextOverlayExcluding,
  type OverlayKey,
} from '../components/overlay_arbiter_core';

function wants(...keys: OverlayKey[]): Partial<Record<OverlayKey, boolean>> {
  return Object.fromEntries(keys.map((key) => [key, true])) as Partial<Record<OverlayKey, boolean>>;
}

describe('OverlayArbiter queue resolution', () => {
  it('uses priority when no overlay owns the slot yet', () => {
    expect(resolveNextOverlay(null, wants('actionToast', 'achievementToast', 'update'))).toBe('update');
    expect(resolveNextOverlay(null, wants('actionToast', 'achievementToast'))).toBe('achievementToast');
  });

  it('does not preempt an active overlay while it still wants the slot', () => {
    expect(resolveNextOverlay('achievementToast', wants('achievementToast', 'update'))).toBe('achievementToast');
    expect(resolveNextOverlay('actionToast', wants('actionToast', 'themedAlert'))).toBe('actionToast');
  });

  it('advances to the next waiting overlay after the active one releases', () => {
    expect(resolveNextOverlay('achievementToast', wants('actionToast', 'themedAlert'))).toBe('themedAlert');
  });

  it('can route match-found toast through the screen host without sharing root state', () => {
    expect(resolveNextOverlay(null, wants('matchFoundToast', 'matchFoundToastScreen'))).toBe('matchFoundToastScreen');
  });

  it('returns null when nothing is waiting', () => {
    expect(resolveNextOverlay('achievementToast', {})).toBeNull();
    expect(resolveNextOverlay(null, {})).toBeNull();
  });

  it('onboardingWelcome выигрывает у наградных/update-модалок сразу после онбординга', () => {
    // Регрессия (iOS): welcome рендерился МИМО арбитра → презентовался одновременно с
    // perfectWeekReward/compassBriefing/update → первый схлопывался, стек виснул (фриз).
    // Теперь welcome — высший приоритет: при одновременном запросе берут именно его.
    expect(resolveNextOverlay(null, wants('onboardingWelcome', 'perfectWeekReward', 'update')))
      .toBe('onboardingWelcome');
    expect(resolveNextOverlay(null, wants('onboardingWelcome', 'compassBriefing')))
      .toBe('onboardingWelcome');
    // …а когда welcome закрылся (освободил слот) — слот уходит следующему по приоритету.
    expect(resolveNextOverlay(null, wants('perfectWeekReward', 'update', 'compassBriefing')))
      .toBe('update');
    // welcome — непреемптивный владелец: пока держит слот, другие ждут.
    expect(resolveNextOverlay('onboardingWelcome', wants('onboardingWelcome', 'update')))
      .toBe('onboardingWelcome');
  });

  it('perfectWeekReward (недельный бонус) показывается САМЫМ ПОСЛЕДНИМ из всего', () => {
    // Требование: недельный бонус не перебивает НИ ОДНО другое окно — он ждёт, пока
    // закроются все (приветствие, обновление, что-нового, компас, праздники, тосты).
    // Проверяем, что при конкуренции с любым другим ключом слот уходит НЕ ему.
    expect(resolveNextOverlay(null, wants('perfectWeekReward', 'actionToast'))).toBe('actionToast');
    expect(resolveNextOverlay(null, wants('perfectWeekReward', 'coachToast'))).toBe('coachToast');
    expect(resolveNextOverlay(null, wants('perfectWeekReward', 'compassBriefing'))).toBe('compassBriefing');
    expect(resolveNextOverlay(null, wants('perfectWeekReward', 'onboardingWelcome'))).toBe('onboardingWelcome');
    // perfectWeekReward = последний элемент приоритета → берётся, только когда он один.
    expect(OVERLAY_PRIORITY[OVERLAY_PRIORITY.length - 1]).toBe('perfectWeekReward');
    expect(resolveNextOverlay(null, wants('perfectWeekReward'))).toBe('perfectWeekReward');
  });

  it('slots entitlementExpired below streakRevive but above toasts', () => {
    expect(resolveNextOverlay(null, wants('entitlementExpired', 'streakRevive'))).toBe('streakRevive');
    expect(resolveNextOverlay(null, wants('entitlementExpired', 'actionToast', 'achievementToast'))).toBe('entitlementExpired');
    expect(resolveNextOverlay('entitlementExpired', wants('entitlementExpired', 'update'))).toBe('entitlementExpired');
  });
});

describe('OverlayArbiter starvation watchdog (H-ARBITER)', () => {
  it('hasOtherWaiters is false when only the active overlay wants the slot', () => {
    expect(hasOtherWaiters('update', wants('update'))).toBe(false);
    expect(hasOtherWaiters('update', {})).toBe(false);
    expect(hasOtherWaiters(null, {})).toBe(false);
  });

  it('hasOtherWaiters is true when something else is queued behind the holder', () => {
    expect(hasOtherWaiters('update', wants('update', 'achievementToast'))).toBe(true);
    // даже если активного нет, но кто-то ждёт — это «другие желающие»
    expect(hasOtherWaiters(null, wants('achievementToast'))).toBe(true);
  });

  it('resolveNextOverlayExcluding hands the slot to the next waiter past a stuck holder', () => {
    // update залип, но в очереди ждут achievementToast и actionToast → берём по приоритету
    expect(resolveNextOverlayExcluding('update', wants('update', 'achievementToast', 'actionToast'))).toBe('achievementToast');
  });

  it('resolveNextOverlayExcluding returns null when the holder is the only waiter', () => {
    // форсить нечего — владельца не трогаем (solo-модалку юзер просто долго читает)
    expect(resolveNextOverlayExcluding('update', wants('update'))).toBeNull();
    expect(resolveNextOverlayExcluding('update', {})).toBeNull();
  });
});

describe('OverlayArbiter forcibly-released quarantine (anti ping-pong)', () => {
  it('обычная запись wants проходит, когда ключ не в карантине', () => {
    const r = decideWantsWrite('update', true, new Set<OverlayKey>());
    expect(r.apply).toBe(true);
    expect(r.nextForciblyReleased.has('update')).toBe(false);
  });

  it('зависший владелец НЕ может вернуть себе слот (wants:true игнорируется в карантине)', () => {
    const quarantined = new Set<OverlayKey>(['update']);
    const r = decideWantsWrite('update', true, quarantined);
    expect(r.apply).toBe(false); // ← ключевое: пинг-понга не будет
    expect(r.nextForciblyReleased.has('update')).toBe(true); // остаётся в карантине
  });

  it('настоящий релиз (wants:false) снимает карантин и применяется', () => {
    const quarantined = new Set<OverlayKey>(['update']);
    const r = decideWantsWrite('update', false, quarantined);
    expect(r.apply).toBe(true);
    expect(r.nextForciblyReleased.has('update')).toBe(false); // карантин снят
  });

  it('после снятия карантина ключ снова может занять слот', () => {
    // релиз снимает карантин
    const released = decideWantsWrite('update', false, new Set<OverlayKey>(['update']));
    // следующая попытка занять слот уже проходит
    const reacquire = decideWantsWrite('update', true, released.nextForciblyReleased);
    expect(reacquire.apply).toBe(true);
  });

  it('карантин одного ключа не влияет на другие', () => {
    const quarantined = new Set<OverlayKey>(['update']);
    const r = decideWantsWrite('achievementToast', true, quarantined);
    expect(r.apply).toBe(true);
    expect(r.nextForciblyReleased.has('update')).toBe(true); // чужой карантин не тронут
  });

  it('не мутирует переданное множество (иммутабельность)', () => {
    const original = new Set<OverlayKey>(['update']);
    decideWantsWrite('update', false, original);
    expect(original.has('update')).toBe(true); // вход не изменён
  });
});

describe('OverlayArbiter watchdog scope (anti — выселение живой модалки)', () => {
  // Регрессия: сторож 15с НАВСЕГДА карантинил крупную модалку (level-up + сундук, праздники,
  // intro/loyalty, celebration…), если за ней ждал мелкий тост, а юзер читал окно >15с →
  // окно и его награда пропадали на всю сессию. Фикс: выселять можно ТОЛЬКО транзиентные тосты.

  it('крупные пользовательские модалки НЕ подлежат принудительному выселению', () => {
    const protectedKeys: OverlayKey[] = [
      'onboardingWelcome',
      'update', 'releaseNotes', 'broadcast', 'leagueBonusAvailable', 'notifNudge',
      'introFullAccess', 'loyaltyGift', 'dailyPlan', 'levelUp', 'themedAlert',
      'premiumCelebration', 'vipCelebration', 'leagueResult', 'streakRevive',
      'entitlementExpired', 'referralWelcome', 'mysteryMondayChest', 'comebackDay',
      'perfectWeekReward', 'compassBriefing', 'lessonCompleteNotif', 'arenaRoomConfirm',
      'arenaInvite',
    ];
    for (const k of protectedKeys) {
      expect(isForceEvictable(k)).toBe(false);
    }
  });

  it('транзиентные тосты/уведомления подлежат выселению (защита нижних от залипшего тоста)', () => {
    const evictable: OverlayKey[] = [
      'shardsEarned', 'matchFoundToastScreen', 'matchFoundToast',
      'achievementToast', 'dailyTaskRewardToast', 'coachToast', 'actionToast',
      // boonActivated — информационная плашка «бонус дня» (награды по тапу нет),
      // её можно выселять: иначе незакрытая плашка душит все тосты до перезапуска.
      'boonActivated',
    ];
    for (const k of evictable) {
      expect(isForceEvictable(k)).toBe(true);
    }
  });

  // Регрессия «приглашение в Арену само закрывается»: arenaInvite живёт 60с
  // (INVITE_TIMEOUT_MS), а сторож выселяет force-evictable владельца через 15с при
  // наличии waiter'а. Раньше arenaInvite был force-evictable → любой тост в очереди
  // выселял ЖИВОЕ приглашение через 15с, юзер не успевал принять. Теперь arenaInvite
  // защищён: сторож его не трогает, окно держится все 60с до принятия/отклонения, а
  // залипания нет — его собственный авто-decline освободит слот.
  it('arenaInvite НЕ выселяется сторожем (его 60с авто-decline > 15с окна сторожа)', () => {
    expect(isForceEvictable('arenaInvite')).toBe(false);
    expect(FORCE_EVICTABLE_KEYS.has('arenaInvite')).toBe(false);
    // Предусловие сторожа есть (waiter ниже), но т.к. arenaInvite не force-evictable —
    // сторож не запускается, приглашение остаётся на экране.
    expect(hasOtherWaiters('arenaInvite', wants('arenaInvite', 'achievementToast'))).toBe(true);
  });

  it('lessonCompleteNotif (закрывает юзер тапом) НЕ выселяется', () => {
    // это user-dismissed уведомление, не авто-тост — выселять нельзя
    expect(isForceEvictable('lessonCompleteNotif')).toBe(false);
    expect(FORCE_EVICTABLE_KEYS.has('lessonCompleteNotif')).toBe(false);
  });

  it('isForceEvictable(null) === false (нет активного владельца — нечего выселять)', () => {
    expect(isForceEvictable(null)).toBe(false);
  });

  it('сценарий бага: levelUp держит слот, actionToast ждёт — сторож НЕ трогает levelUp', () => {
    // Симуляция предусловия сторожа: есть владелец и есть waiter.
    expect(hasOtherWaiters('levelUp', wants('levelUp', 'actionToast'))).toBe(true);
    // …но т.к. levelUp НЕ force-evictable, сторож не запускается → модалка остаётся.
    expect(isForceEvictable('levelUp')).toBe(false);
  });

  // Регрессия «ВСЕ тосты пропали глобально»: информационная плашка boonActivated стоит
  // ВЫШЕ тостов и не несёт награды по тапу. Если юзер не закрыл её (свернул/ушёл), её
  // wantShow застревает true → слот занят. Раньше boonActivated НЕ был force-evictable →
  // сторож не выселял → achievementToast/dailyTaskRewardToast мертвы до перезапуска.
  it('сценарий рецидива: boonActivated залип, тост достижения ждёт — сторож ВЫСЕЛЯЕТ boonActivated', () => {
    // Предусловие сторожа выполнено: владелец + waiter ниже по приоритету.
    expect(hasOtherWaiters('boonActivated', wants('boonActivated', 'achievementToast'))).toBe(true);
    // boonActivated force-evictable → сторож запускается и освобождает слот.
    expect(isForceEvictable('boonActivated')).toBe(true);
    // Слот передаётся ждущему тосту, минуя залипшего владельца.
    expect(resolveNextOverlayExcluding('boonActivated', wants('boonActivated', 'achievementToast', 'dailyTaskRewardToast')))
      .toBe('achievementToast');
  });

  it('сундуки с наградой (mystery/comeback/perfectWeek) остаются НЕ-выселяемыми', () => {
    // Защита от регресса в обратную сторону: их закрывает юзер (там осколки), сторож не трогает.
    for (const k of ['mysteryMondayChest', 'comebackDay', 'perfectWeekReward'] as OverlayKey[]) {
      expect(isForceEvictable(k)).toBe(false);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// СТРАЖ ОТ РЕЦИДИВА: каждый overlay-ключ ОБЯЗАН быть осознанно классифицирован как
// выселяемый (транзиентный/информационный, без награды по тапу) ИЛИ защищённый
// (закрывает юзер: сундук с осколками / крупное окно). Именно ПРОПУСК классификации
// нового ключа `boonActivated` убил все тосты (он стал невыселяемым душителем по
// умолчанию). Эти списки — ЕДИНСТВЕННЫЙ источник правды; ниже проверяем, что они
// покрывают OVERLAY_PRIORITY РОВНО (без пропусков и лишних). Добавил новый ключ в
// арбитр → ДОБАВЬ его в ОДИН из списков, иначе этот тест упадёт и подскажет, что делать.
// ════════════════════════════════════════════════════════════════════════════
describe('OverlayArbiter: исчерпывающая классификация ключей (страж от рецидива)', () => {
  // Выселяемые сторожем: транзиентные авто-тосты + информационные плашки без награды-по-тапу.
  const EVICTABLE_REGISTRY: readonly OverlayKey[] = [
    'shardsEarned', 'matchFoundToastScreen', 'matchFoundToast',
    'achievementToast', 'dailyTaskRewardToast', 'coachToast', 'actionToast',
    'boonActivated',
  ];
  // Защищённые: закрывает ЮЗЕР (сундук с осколками / крупное окно / user-dismissed уведомление).
  // Выселять по таймеру нельзя — потеряется награда или окно, которое юзер читает.
  const PROTECTED_REGISTRY: readonly OverlayKey[] = [
    'onboardingWelcome',
    'update', 'releaseNotes', 'broadcast', 'leagueBonusAvailable', 'notifNudge',
    'introFullAccess', 'loyaltyGift', 'dailyPlan', 'levelUp', 'themedAlert',
    'premiumCelebration', 'vipCelebration', 'leagueResult', 'streakRevive',
    'entitlementExpired', 'referralWelcome', 'mysteryMondayChest', 'comebackDay',
    'perfectWeekReward', 'compassBriefing', 'lessonCompleteNotif', 'arenaRoomConfirm',
    'arenaInvite',
  ];

  it('каждый ключ OVERLAY_PRIORITY классифицирован РОВНО в одном реестре (нет пропущенных)', () => {
    const classified = new Set<OverlayKey>([...EVICTABLE_REGISTRY, ...PROTECTED_REGISTRY]);
    const missing = OVERLAY_PRIORITY.filter((k) => !classified.has(k));
    // Если упало: ты добавил overlay-ключ и НЕ решил, выселяемый он или защищённый.
    // Добавь его в EVICTABLE_REGISTRY (если транзиентный/без награды) или PROTECTED_REGISTRY.
    expect(missing).toEqual([]);
    const stale = [...classified].filter((k) => !OVERLAY_PRIORITY.includes(k));
    expect(stale).toEqual([]); // реестр не должен содержать удалённые ключи
  });

  it('реестры не пересекаются (ключ не может быть и выселяемым, и защищённым)', () => {
    const overlap = EVICTABLE_REGISTRY.filter((k) => PROTECTED_REGISTRY.includes(k));
    expect(overlap).toEqual([]);
  });

  it('EVICTABLE_REGISTRY точно соответствует FORCE_EVICTABLE_KEYS в коде', () => {
    // Реестр теста и реальный Set в core не должны разъезжаться.
    expect(new Set(EVICTABLE_REGISTRY)).toEqual(FORCE_EVICTABLE_KEYS);
  });

  it('PROTECTED_REGISTRY = ровно те ключи, что НЕ выселяемы', () => {
    for (const k of PROTECTED_REGISTRY) expect(isForceEvictable(k)).toBe(false);
    for (const k of EVICTABLE_REGISTRY) expect(isForceEvictable(k)).toBe(true);
  });

  it('EMPTY_OVERLAY_WANTS покрывает ровно OVERLAY_PRIORITY (рассинхрон ломал бы резолвер)', () => {
    const wantsKeys = new Set(Object.keys(EMPTY_OVERLAY_WANTS));
    const prioKeys = new Set<string>(OVERLAY_PRIORITY);
    expect(wantsKeys).toEqual(prioKeys);
    // и все дефолты — false (никто не «хочет» слот на старте)
    expect(Object.values(EMPTY_OVERLAY_WANTS).every((v) => v === false)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// NATIVE-MODAL HANDOFF GAP — защита от present-during-dismiss фриза на iOS.
// Зазор нужен ТОЛЬКО при переходе одной нативной модалки в ДРУГУЮ нативную.
// ════════════════════════════════════════════════════════════════════════════
describe('OverlayArbiter native-modal handoff gap', () => {
  it('isNativeModal: нативные модалки — да, тосты/in-place — нет', () => {
    for (const k of ['onboardingWelcome', 'update', 'introFullAccess', 'loyaltyGift', 'perfectWeekReward', 'compassBriefing', 'premiumCelebration', 'arenaRoomConfirm'] as OverlayKey[]) {
      // arenaRoomConfirm = ThemedChoiceModal = нативный <Modal> → нужен handoff-зазор.
      expect(isNativeModal(k)).toBe(true);
    }
    for (const k of ['actionToast', 'coachToast', 'streakRevive'] as OverlayKey[]) {
      expect(isNativeModal(k)).toBe(false);
    }
    expect(isNativeModal(null)).toBe(false);
  });

  it('needsHandoffGap: ДА только для разных нативных модалок', () => {
    // нативная → другая нативная = нужен зазор (present-after-dismiss)
    expect(needsHandoffGap('onboardingWelcome', 'introFullAccess')).toBe(true);
    expect(needsHandoffGap('update', 'releaseNotes')).toBe(true);
    expect(needsHandoffGap('leagueResult', 'perfectWeekReward')).toBe(true);
  });

  it('needsHandoffGap: НЕТ для первого показа, закрытия в никуда, тех же и не-нативных', () => {
    expect(needsHandoffGap(null, 'update')).toBe(false);            // первый показ
    expect(needsHandoffGap('update', null)).toBe(false);            // закрытие в никуда
    expect(needsHandoffGap('update', 'update')).toBe(false);        // тот же ключ
    expect(needsHandoffGap('actionToast', 'coachToast')).toBe(false); // оба не-нативные (in-place)
    expect(needsHandoffGap('update', 'actionToast')).toBe(false);   // нативная → тост (тост не present-stack)
    expect(needsHandoffGap('actionToast', 'update')).toBe(false);   // тост → нативная
    expect(needsHandoffGap(null, null)).toBe(false);
  });

  it('каждый NATIVE_MODAL_KEYS реально существует в OVERLAY_PRIORITY (нет опечаток/мусора)', () => {
    for (const k of NATIVE_MODAL_KEYS) expect(OVERLAY_PRIORITY).toContain(k);
  });
});

import {
  decideWantsWrite,
  FORCE_EVICTABLE_KEYS,
  hasOtherWaiters,
  isForceEvictable,
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
      'update', 'releaseNotes', 'broadcast', 'leagueBonusAvailable', 'notifNudge',
      'introFullAccess', 'loyaltyGift', 'dailyPlan', 'levelUp', 'themedAlert',
      'premiumCelebration', 'vipCelebration', 'leagueResult', 'streakRevive',
      'entitlementExpired', 'referralWelcome', 'mysteryMondayChest', 'comebackDay',
      'perfectWeekReward', 'compassBriefing', 'lessonCompleteNotif', 'arenaRoomConfirm',
    ];
    for (const k of protectedKeys) {
      expect(isForceEvictable(k)).toBe(false);
    }
  });

  it('транзиентные тосты/уведомления подлежат выселению (защита нижних от залипшего тоста)', () => {
    const evictable: OverlayKey[] = [
      'shardsEarned', 'matchFoundToastScreen', 'matchFoundToast', 'arenaInvite',
      'achievementToast', 'dailyTaskRewardToast', 'coachToast', 'actionToast',
    ];
    for (const k of evictable) {
      expect(isForceEvictable(k)).toBe(true);
    }
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
});

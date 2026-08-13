// Weekly Boons — контракт: новые OverlayKey согласованы во всех 3 структурах арбитра.
import {
  OVERLAY_PRIORITY,
  EMPTY_OVERLAY_WANTS,
  resolveNextOverlay,
  type OverlayKey,
} from '../components/overlay_arbiter_core';

const NEW_KEYS: OverlayKey[] = ['mysteryMondayChest', 'comebackDay', 'perfectWeekReward', 'boonActivated'];

describe('boon overlay keys — согласованность структур', () => {
  it('каждый новый ключ есть в OVERLAY_PRIORITY', () => {
    for (const k of NEW_KEYS) expect(OVERLAY_PRIORITY).toContain(k);
  });

  it('каждый новый ключ есть в EMPTY_OVERLAY_WANTS (=false)', () => {
    for (const k of NEW_KEYS) expect(EMPTY_OVERLAY_WANTS[k]).toBe(false);
  });

  it('OVERLAY_PRIORITY и EMPTY_OVERLAY_WANTS имеют одинаковый набор ключей', () => {
    const wantsKeys = Object.keys(EMPTY_OVERLAY_WANTS).sort();
    const prioKeys = [...OVERLAY_PRIORITY].sort();
    expect(prioKeys).toEqual(wantsKeys);
  });

  it('resolveNextOverlay выбирает желающий новый ключ', () => {
    expect(resolveNextOverlay(null, { mysteryMondayChest: true })).toBe('mysteryMondayChest');
  });

  it('comebackDay приоритетнее перехватчиков-тостов ниже по очереди', () => {
    const chosen = resolveNextOverlay(null, { comebackDay: true, achievementToast: true });
    expect(chosen).toBe('comebackDay');
  });
});

describe('intro overlay key — гейтится через арбитр (P1: anti-ANR)', () => {
  it('introFullAccess есть во всех 3 структурах арбитра', () => {
    for (const k of ['introFullAccess'] as OverlayKey[]) {
      expect(OVERLAY_PRIORITY).toContain(k);
      expect(EMPTY_OVERLAY_WANTS[k]).toBe(false);
    }
  });

  it('системные модалы (update) приоритетнее intro', () => {
    expect(resolveNextOverlay(null, { update: true, introFullAccess: true })).toBe('update');
  });

  it('intro приоритетнее levelUp (welcome-поток раньше награды)', () => {
    expect(resolveNextOverlay(null, { introFullAccess: true, levelUp: true })).toBe('introFullAccess');
  });

  it('удалённые мёртвые ключи отсутствуют в арбитре', () => {
    const all = new Set<string>(OVERLAY_PRIORITY);
    for (const dead of ['releaseWave', 'firstLessonSheet', 'boonEarlyPlashka', 'loyaltyGift']) {
      expect(all.has(dead)).toBe(false);
    }
  });
});

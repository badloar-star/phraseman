// Weekly Boons — контракт: новые OverlayKey согласованы во всех 3 структурах арбитра.
import {
  OVERLAY_PRIORITY,
  EMPTY_OVERLAY_WANTS,
  resolveNextOverlay,
  type OverlayKey,
} from '../components/overlay_arbiter_core';

const NEW_KEYS: OverlayKey[] = ['mysteryMondayChest', 'comebackDay', 'perfectWeekReward', 'boonEarlyPlashka'];

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

  it('reward-модалы приоритетнее ранней плашки', () => {
    const chosen = resolveNextOverlay(null, { boonEarlyPlashka: true, comebackDay: true });
    expect(chosen).toBe('comebackDay');
  });
});

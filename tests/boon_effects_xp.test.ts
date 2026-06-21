// Weekly Boons — XP-множители: «Двойной четверг» + «Ранняя пташка».
import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import { utcWeekdayFromTodayKey } from '../app/boons/boon_engine';
import {
  doubleXpMultiplier,
  earlyBirdMultiplier,
  boonXpMultiplierContribution,
  DOUBLE_XP_MULTIPLIER,
  EARLY_BIRD_MULTIPLIER,
  EARLY_BIRD_BEFORE_HOUR,
} from '../app/boons/boon_effects_xp';

const todayWd = utcWeekdayFromTodayKey();

function setConfig(cfg: object): void {
  applyRemoteConfigSnapshot({ texts: { weekly_boons_config: JSON.stringify(cfg) } });
}

afterEach(() => applyRemoteConfigSnapshot({}));

describe('doubleXpMultiplier', () => {
  it('×2, когда double_xp назначен на сегодня', () => {
    setConfig({ schedule: { [todayWd]: 'double_xp' }, enabled: {}, modifiersEnabled: {} });
    expect(doubleXpMultiplier()).toBe(DOUBLE_XP_MULTIPLIER);
  });
  it('×1, когда сегодня не double_xp', () => {
    setConfig({ schedule: { [todayWd]: 'turbo_regen' }, enabled: {}, modifiersEnabled: {} });
    expect(doubleXpMultiplier()).toBe(1);
  });
  it('×1, когда double_xp выключен глобально', () => {
    setConfig({ schedule: { [todayWd]: 'double_xp' }, enabled: { double_xp: false }, modifiersEnabled: {} });
    expect(doubleXpMultiplier()).toBe(1);
  });
});

describe('earlyBirdMultiplier', () => {
  it('×1.1 до 10:00, когда модификатор включён', () => {
    setConfig({ schedule: {}, enabled: {}, modifiersEnabled: {} }); // default = early_bird вкл
    expect(earlyBirdMultiplier(8)).toBe(EARLY_BIRD_MULTIPLIER);
    expect(earlyBirdMultiplier(EARLY_BIRD_BEFORE_HOUR - 1)).toBe(EARLY_BIRD_MULTIPLIER);
  });
  it('×1 в 10:00 и позже', () => {
    setConfig({ schedule: {}, enabled: {}, modifiersEnabled: {} });
    expect(earlyBirdMultiplier(EARLY_BIRD_BEFORE_HOUR)).toBe(1);
    expect(earlyBirdMultiplier(14)).toBe(1);
  });
  it('×1, когда модификатор early_bird выключен', () => {
    setConfig({ schedule: {}, enabled: {}, modifiersEnabled: { early_bird: false } });
    expect(earlyBirdMultiplier(8)).toBe(1);
  });
});

describe('boonXpMultiplierContribution', () => {
  it('стакается аддитивно: double_xp + early_bird до 10:00', () => {
    setConfig({ schedule: { [todayWd]: 'double_xp' }, enabled: {}, modifiersEnabled: {} });
    // (2-1) + (1.1-1) = 1.1
    expect(boonXpMultiplierContribution(8)).toBeCloseTo(1.1, 5);
  });
  it('0, когда нет ни double_xp, ни ранней пташки', () => {
    setConfig({ schedule: { [todayWd]: 'turbo_regen' }, enabled: {}, modifiersEnabled: { early_bird: false } });
    expect(boonXpMultiplierContribution(8)).toBe(0);
  });
  it('только early_bird (днём после 10 → 0)', () => {
    setConfig({ schedule: { [todayWd]: 'turbo_regen' }, enabled: {}, modifiersEnabled: {} });
    expect(boonXpMultiplierContribution(14)).toBe(0);
  });
});

// Weekly Boons — Speaking-суббота открывает speaking-гейт всем на день.
import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import { utcWeekdayFromTodayKey } from '../app/boons/boon_engine';
import { isFeatureGrantedByWeeklyBoon } from '../app/boons/boon_feature_grants';
import { shouldGateFeature, isFeaturePremiumGated } from '../app/feature_gates';

const todayWd = utcWeekdayFromTodayKey();

function setBoon(boon: string | null): void {
  applyRemoteConfigSnapshot({
    texts: {
      weekly_boons_config: JSON.stringify({
        schedule: boon ? { [todayWd]: boon } : {},
        enabled: {},
        modifiersEnabled: {},
      }),
    },
  });
}

afterEach(() => applyRemoteConfigSnapshot({}));

describe('isFeatureGrantedByWeeklyBoon', () => {
  it('speaking открыт, когда активна Speaking-суббота', () => {
    setBoon('speaking_saturday');
    expect(isFeatureGrantedByWeeklyBoon('speaking')).toBe(true);
  });
  it('speaking НЕ открыт при другом бонусе', () => {
    setBoon('double_xp');
    expect(isFeatureGrantedByWeeklyBoon('speaking')).toBe(false);
  });
  it('Speaking-суббота не открывает посторонние фичи', () => {
    setBoon('speaking_saturday');
    expect(isFeatureGrantedByWeeklyBoon('arena')).toBe(false);
  });
});

describe('shouldGateFeature — интеграция с бонусом', () => {
  it('базово speaking за премиумом (флаг по умолчанию gated)', () => {
    setBoon(null);
    expect(isFeaturePremiumGated('speaking')).toBe(true);
    expect(shouldGateFeature('speaking', false)).toBe(true);
  });
  it('в Speaking-субботу гейт снят для фри-юзера', () => {
    setBoon('speaking_saturday');
    expect(shouldGateFeature('speaking', false)).toBe(false);
  });
  it('премиум всегда без гейта (независимо от бонуса)', () => {
    setBoon(null);
    expect(shouldGateFeature('speaking', true)).toBe(false);
  });
});

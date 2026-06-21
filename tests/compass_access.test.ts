import { decidePlanAccess, canActivatePlan } from '../app/compass/compass_access';

// Управляем грантом бонуса недели, чтобы проверить паритет входа (useFeatureAccess) и
// активации (canActivatePlan) — аудит P3 #19.
jest.mock('../app/boons/boon_feature_grants', () => ({
  isFeatureGrantedByWeeklyBoon: jest.fn(() => false),
}));
import { isFeatureGrantedByWeeklyBoon } from '../app/boons/boon_feature_grants';
const mockBoonGrant = isFeatureGrantedByWeeklyBoon as jest.Mock;

describe('compass_access — премиум-гейт плана (чинит дыру)', () => {
  afterEach(() => mockBoonGrant.mockReturnValue(false));

  it('с premium-доступом план разрешён', () => {
    expect(decidePlanAccess({ hasPremiumAccess: true })).toEqual({ allowed: true });
    expect(canActivatePlan({ hasPremiumAccess: true })).toBe(true);
  });

  it('без premium-доступа план запрещён → premium_required', () => {
    expect(decidePlanAccess({ hasPremiumAccess: false })).toEqual({
      allowed: false,
      reason: 'premium_required',
    });
    expect(canActivatePlan({ hasPremiumAccess: false })).toBe(false);
  });

  it('паритет с useFeatureAccess: если бонус недели открыл план — активация тоже разрешена (P3 #19)', () => {
    // Раньше canActivatePlan игнорировал boon-грант → вход пускал, activate упирался в пейвол.
    mockBoonGrant.mockReturnValue(true);
    expect(canActivatePlan({ hasPremiumAccess: false })).toBe(true);
    expect(decidePlanAccess({ hasPremiumAccess: false })).toEqual({ allowed: true });
  });
});

import { decidePlanAccess, canActivatePlan } from '../app/compass/compass_access';

describe('compass_access — премиум-гейт плана (чинит дыру)', () => {
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
});

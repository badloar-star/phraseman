// Governance-ID: TG-58125260A0CF
import { spireMemberStepsUpdate, spirePlusTierOf } from './spire_groups';

// зачем (06.11, «Plus/Ultra», просьба сессии «Вход»): в участниках Пика — уровень подписки соседей, той же записью, что isPremium, 0 новых чтений.
const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const NEXT = { steps: 5, reachedAtMs: 1, totalMs: 1 };
const user = (progress: Record<string, unknown>) => ({ progress });

describe('spirePlusTierOf', () => {
  it('годовая → ultra, месячная → plus, пожизненная → plus, нет Plus → null', () => {
    expect(spirePlusTierOf(user({ premium_plan: 'yearly', premium_expiry: String(NOW + DAY) }), NOW)).toBe('ultra');
    expect(spirePlusTierOf(user({ premium_plan: 'monthly', premium_expiry: String(NOW + DAY) }), NOW)).toBe('plus');
    expect(spirePlusTierOf(user({ premium_plan: 'lifetime', premium_expiry: '0' }), NOW)).toBe('plus');
    expect(spirePlusTierOf(user({}), NOW)).toBeNull();
    expect(spirePlusTierOf(undefined, NOW)).toBeNull();
  });
});

describe('spireMemberStepsUpdate + уровень Plus', () => {
  it('уровень не передан — поле не пишется (старые вызовы не меняются)', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5 }, NEXT, 9)).toBeNull();
  });

  it('уровень совпадает с записанным — записи нет', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5, plusTier: 'ultra' }, NEXT, 9, null, null, null, 'ultra')).toBeNull();
    expect(spireMemberStepsUpdate('u1', { steps: 5 }, NEXT, 9, null, null, null, null)).toBeNull(); // у старой записи поля нет = null
  });

  it('смена уровня месяц → год пишет plusTier отдельной записью без новых ступеней', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5, isPremium: true, plusTier: 'plus' }, NEXT, 9, null, null, true, 'ultra'))
      .toEqual({ 'members.u1.plusTier': 'ultra', updatedAt: 9 });
  });

  it('первая запись уровня у участника без поля', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5, isPremium: true }, NEXT, 9, null, null, true, 'plus'))
      .toEqual({ 'members.u1.plusTier': 'plus', updatedAt: 9 });
  });

  it('Plus закончился — уровень становится null', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5, isPremium: true, plusTier: 'ultra' }, NEXT, 9, null, null, false, null))
      .toEqual({ 'members.u1.isPremium': false, 'members.u1.plusTier': null, updatedAt: 9 });
  });

  it('новые ступени несут уровень той же записью', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 3 }, NEXT, 9, null, null, true, 'ultra'))
      .toMatchObject({ 'members.u1.steps': 5, 'members.u1.isPremium': true, 'members.u1.plusTier': 'ultra', updatedAt: 9 });
  });
});

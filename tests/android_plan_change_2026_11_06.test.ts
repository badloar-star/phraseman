// Q8 (решение владельца 05.11): месячная подписка Android → годовая заменой, а не второй подпиской.
import fs from 'node:fs';
import path from 'node:path';
import { decideAndroidPlanChange, googleProductChangeInfoFor, googleSubscriptionIdOf } from '../app/android_plan_change';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const base = { platform: 'android', targetProductId: 'plus_yearly:yearly', targetIsYearly: true, monthlyProductIds: ['plus_monthly:monthly'], activeSubscriptions: ['plus_monthly:monthly'] } as const;

describe('decideAndroidPlanChange', () => {
  it('Android, активна месячная, выбран годовой → замена; идентификатор без базового плана', () => {
    expect(decideAndroidPlanChange(base)).toEqual({ change: true, oldProductIdentifier: 'plus_monthly', reason: 'monthly_to_yearly' });
  });
  it('идентификатор подписки без суффикса плана тоже совпадает', () => {
    expect(decideAndroidPlanChange({ ...base, monthlyProductIds: ['plus_monthly'], activeSubscriptions: ['plus_monthly'] })).toMatchObject({ change: true, oldProductIdentifier: 'plus_monthly' });
  });
  it.each([
    ['iOS — без замены', { platform: 'ios' }, 'not_android'],
    ['выбран месячный — без замены', { targetIsYearly: false }, 'target_not_yearly'],
    ['нет активных подписок — обычная покупка', { activeSubscriptions: [] }, 'no_active_monthly'],
    ['активна уже годовая — не заменяем', { activeSubscriptions: ['plus_yearly:yearly'] }, 'no_active_monthly'],
    ['месячных идентификаторов нет — осторожно, обычная покупка', { monthlyProductIds: [] }, 'no_monthly_ids'],
  ])('%s', (_name, patch, reason) => {
    expect(decideAndroidPlanChange({ ...base, ...patch } as never)).toEqual({ change: false, reason });
  });
  it('googleSubscriptionIdOf и параметры замены', () => {
    expect(googleSubscriptionIdOf(' a:b ')).toBe('a');
    expect(googleSubscriptionIdOf('a')).toBe('a');
    expect(googleSubscriptionIdOf('')).toBe('');
    expect(googleProductChangeInfoFor('a', 4)).toEqual({ oldProductIdentifier: 'a', prorationMode: 4 });
  });
});

describe('проводка', () => {
  it('«Управление подпиской»: параметры замены — ТРЕТИМ аргументом purchasePackage (второй — null)', () => {
    const src = read('app/manage_subscription_purchase.ts');
    expect(src).toContain('Purchases.purchasePackage(yearlyPackage, null, googleChange)');
    expect(src).not.toMatch(/purchasePackage\(yearlyPackage, opts/);
    expect(src).toContain('PRORATION_MODE.DEFERRED');
  });
  it('экран оплаты: замена только для Android + годовой, иначе прежняя обычная покупка', () => {
    const src = read('app/paywall_purchase.ts');
    expect(src).toContain("if (Platform.OS === 'android' && selected === 'yearly')");
    expect(src).toContain('googleChange ? Purchases.purchasePackage(pkg, null, googleChange) : Purchases.purchasePackage(pkg)');
    expect(src).toContain("'[PLAN-CHANGE]'");
  });
});

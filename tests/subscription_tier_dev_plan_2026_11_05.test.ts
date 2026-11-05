// зачем (150 №8): dev plan=yearly должен давать Ultra так же, как настоящая годовая подписка (по плану и по продукту магазина).
import fs from 'node:fs';
import path from 'node:path';
import { resolveTierFromKnown } from '../components/plus/use_subscription_tier';

const hook = fs.readFileSync(path.join(__dirname, '..', 'components/plus/use_subscription_tier.ts'), 'utf8').replace(/\r\n/g, '\n');
const k = (plan: string | null, productId: string | null) => ({ plan, productId, source: 't' });

describe('уровень подписки: dev-план и настоящая годовая', () => {
  it('годовая → Ultra по плану, по продукту и по RevenueCat-идентификатору', () => {
    expect(resolveTierFromKnown(k('yearly', null))).toBe('ultra');
    expect(resolveTierFromKnown(k(null, 'phraseman_plus_yearly'))).toBe('ultra');
    expect(resolveTierFromKnown(k(null, '$rc_annual'))).toBe('ultra');
    expect(resolveTierFromKnown(k('yearly', 'plus_annual:p1y'))).toBe('ultra');
  });
  it('месячная и пожизненная → Plus', () => {
    expect(resolveTierFromKnown(k('monthly', null))).toBe('plus');
    expect(resolveTierFromKnown(k(null, 'phraseman_plus_monthly'))).toBe('plus');
    expect(resolveTierFromKnown(k('lifetime', 'phraseman_lifetime'))).toBe('plus');
  });
  it('хук берёт dev-подмену плана первой и логирует источник dev', () => {
    expect(hook).toContain("source: 'dev'");
    expect(hook).toContain('devKnown ? resolveTierFromKnown(devKnown)');
    expect(hook).toContain('devKnown?.source ??');
  });
});

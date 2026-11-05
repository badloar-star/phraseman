// зачем (владелец 06.11, капсом: «ЦЕНЫ ИЗ СТОРОВ!»): цены пейволов — из магазина (RevenueCat priceString); справочные — только запасной вариант.
// Сторож: (1) store главнее кэша и справочной; (2) валютные литералы цен Plus живут только в разрешённых файлах; (3) журнал называет источник и причину.
import fs from 'node:fs';
import path from 'node:path';
import { pickPaywallPrice } from '../app/paywall_reference_prices';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('цены пейволов: магазин главнее', () => {
  it('store > cache > reference > dev_preview', () => {
    expect(pickPaywallPrice({ store: '$24.99', cache: '€39,99', reference: '€39,99' })).toEqual({ price: '$24.99', source: 'store' });
    expect(pickPaywallPrice({ store: '', cache: '₽2 990', reference: '€39,99' })).toEqual({ price: '₽2 990', source: 'cache' });
    expect(pickPaywallPrice({ store: '', cache: '', reference: '€39,99' })).toEqual({ price: '€39,99', source: 'reference' });
    expect(pickPaywallPrice({ store: '', devPreview: '€7,99' }).source).toBe('dev_preview');
  });

  it('экран оплаты берёт priceString магазина первым и пишет источник и причину', () => {
    const src = read('app/paywall_purchase.ts');
    expect(src).toContain('store: storePriceTrim(packages.yearly?.product?.priceString)');
    expect(src).toContain('store: storePriceTrim(packages.monthly?.product?.priceString)');
    expect(src).toContain("источник=${bothFromStore ? 'store' : 'fallback'} причина=${fallbackReason}");
  });

  it('справочные цены — только запасной вариант, в покупку не уходят', () => {
    const src = read('app/paywall_purchase.ts');
    expect(src).toMatch(/referencePrices = allowReferencePrice && !offeringsEverLoaded/);
    expect(read('app/paywall_reference_prices.ts')).toContain('В покупку справочная цена никогда не уходит');
  });

  it('валютные литералы цен Plus — только в справочных/dev-файлах', () => {
    const allowed = new Set([
      'app/paywall_reference_prices.ts', 'app/paywall_dev_preview.ts', 'app/dev_paywall_state.ts', 'app/dev_plus_splash.ts',
    ]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(path.join(root, dir))) {
        const rel = `${dir}/${name}`;
        const stat = fs.statSync(path.join(root, rel));
        if (stat.isDirectory()) { if (!/node_modules|__tests__/.test(name)) walk(rel); continue; }
        if (!/\.(ts|tsx)$/.test(name) || allowed.has(rel)) continue;
        const text = read(rel);
        // конкретные цены Plus, зашитые в код (39,99 / 7,99 / 3,33 в валюте): в комментариях пояснений они допустимы только в allowlist
        if (/['"`][^'"`\n]{0,6}(39[.,]99|7[.,]99)[^'"`\n]{0,4}['"`]/.test(text)) offenders.push(rel);
      }
    };
    walk('app');
    walk('components');
    expect(offenders).toEqual([]);
  });
});

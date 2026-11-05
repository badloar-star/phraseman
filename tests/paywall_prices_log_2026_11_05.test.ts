// зачем (150, риск отказа стора): одна строка [PAYWALL-PRICES] {source: store|fallback|none, ms} на смену источника цен — по ней видно, пришли ли цены магазина ревьюеру.
import { readSource } from './helpers/read_source';

describe('[PAYWALL-PRICES]: источник цен и время', () => {
  it('источник считается store/fallback/none и пишется один раз на смену с миллисекундами', () => {
    const s = readSource('app/paywall_purchase.ts');
    expect(s).toContain("const sourceNow = bothStore ? 'store' : anyPrice ? 'fallback' : 'none';");
    expect(s).toContain("console.log('[PAYWALL-PRICES]', JSON.stringify({ source: sourceNow, ms: Date.now() - pricesMountedAtRef.current");
    expect(s).toContain('if (lastPricesLogRef.current === sourceNow) return;');
  });
});

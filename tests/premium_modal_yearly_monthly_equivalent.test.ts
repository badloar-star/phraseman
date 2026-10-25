import fs from 'fs';
import path from 'path';

const purchase = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');
// 2026-09-30: единственный пейвол Plus (карточки A–G удалены).
const planCards = fs.readFileSync(path.join(process.cwd(), 'components', 'paywall', 'PaywallPlus.tsx'), 'utf8');

describe('Plus paywall yearly monthly equivalent display', () => {
  it('derives the monthly equivalent from RevenueCat store product pricing', () => {
    expect(purchase).toContain('storePricePerMonthTrim');
    expect(purchase).toContain('pricePerMonthString');
    expect(purchase).toContain('const yearlyPerMonth');
  });

  // Apple 3.1.2(c): списываемая сумма (billed amount) должна быть самым крупным и
  // заметным ценовым элементом, а расчётная цена за месяц — подчинённой подписью.
  // Поэтому у «Года» КРУПНАЯ цена — это yearlyFull (полная сумма за год), а
  // yearlyPerMonth уходит мелким текстом в yearSubParts под ценой.
  it('makes the annual billed amount the prominent price and per-month subordinate', () => {
    expect(planCards).toContain('yearlyPerMonth');
    // 25.10 (Ревизор, прогон 05:00): строки тарифов переехали в PaywallPlanRows (коммит 1359f5244, утверждённый макет 18.10). Правило Apple 3.1.2(c) то же и проверяется строже:
    // крупная цена «Года» — списываемая сумма за год (S.big), «≈ в месяц» — мелкая подпись под ней (S.per) и строго меньше по кеглю.
    const rows = fs.readFileSync(path.join(process.cwd(), 'components', 'paywall', 'PaywallPlanRows.tsx'), 'utf8');
    expect(rows).toContain('priceTestID="paywall-year-price"');
    expect(rows).toContain('<Text testID={priceTestID} style={[S.big, { color: g.text }]}>{shown}</Text>');
    expect(rows).toContain('<Text style={[S.per, { color: paint.secondaryInk }]}>{subPrice}</Text>');
    expect(rows).toContain('subPrice={yearlyPerMonth ? yearPerMonthApprox(lang, yearlyPerMonth) : pick(lang, COPY.perYear)}');
    const bigSize = Number(/big: \{ fontSize: (\d+)/u.exec(rows)?.[1]);
    const perSize = Number(/per: \{ marginTop: \d+, fontSize: (\d+)/u.exec(rows)?.[1]);
    expect(bigSize).toBeGreaterThanOrEqual(22);
    expect(perSize).toBeLessThan(bigSize);
    // «в месяц» у года считается из цен магазина, не придумывается
    expect(purchase).toContain('const yearlyPerMonth');
  });

  it('does not keep dev-only browser price injection in the retired premium_modal route', () => {
    const dispatcher = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');
    expect(dispatcher).not.toContain('params._mock_yearly_price');
    expect(dispatcher).not.toContain('params._mock_yearly_monthly');
  });
});

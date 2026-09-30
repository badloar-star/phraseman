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
    // Крупная цена «Года» = списываемая сумма за год (priceBig), «≈ в месяц» — мелкая подпись.
    expect(planCards).toContain('testID="paywall-year-price" style={[S.priceBig');
    expect(planCards).toContain('yearPerMonthApprox(lang, yearlyPerMonth)');
    expect(planCards).toContain("planSmall: { marginTop: 3, fontSize: 13.5");
    expect(planCards).toContain("priceBig: { fontSize: 22");
  });

  it('does not keep dev-only browser price injection in the retired premium_modal route', () => {
    const dispatcher = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');
    expect(dispatcher).not.toContain('params._mock_yearly_price');
    expect(dispatcher).not.toContain('params._mock_yearly_monthly');
  });
});

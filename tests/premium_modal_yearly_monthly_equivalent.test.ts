import fs from 'fs';
import path from 'path';

const purchase = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');
const planCards = fs.readFileSync(path.join(process.cwd(), 'components', 'paywall', 'PaywallPlanCards.tsx'), 'utf8');

describe('A/B/C paywall yearly monthly equivalent display', () => {
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
    expect(planCards).toContain('yearlyFull');
    expect(planCards).toContain('yearSubParts.push');
    // Крупная цена «Года» = списываемая сумма за год.
    expect(planCards).toContain('yearlyFull || yearlyPerMonth');
    // Расчётная цена за месяц — только в подчинённой подписи (sub-line).
    expect(planCards).toContain('yearSubParts.push(`${yearlyPerMonth} ${perMonthLabel}`)');
  });

  it('does not keep dev-only browser price injection in the retired premium_modal route', () => {
    const dispatcher = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');
    expect(dispatcher).not.toContain('params._mock_yearly_price');
    expect(dispatcher).not.toContain('params._mock_yearly_monthly');
  });
});

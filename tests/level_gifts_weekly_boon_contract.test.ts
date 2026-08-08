import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'level_gifts_inventory.tsx'), 'utf8');

describe('gifts screen reward hierarchy', () => {
  it('keeps bonus of day, active multipliers, and gifts as separate sections', () => {
    const bonusStart = source.indexOf('testID="level-gifts-bonus-of-day"');
    const multipliersStart = source.indexOf('testID="level-gifts-active-multipliers"');
    const inventoryStart = source.indexOf('testID="level-gifts-inventory"');

    expect(source).toContain("import TodaysBoonStrip from '../components/TodaysBoonStrip'");
    expect(bonusStart).toBeGreaterThan(-1);
    expect(multipliersStart).toBeGreaterThan(bonusStart);
    expect(inventoryStart).toBeGreaterThan(multipliersStart);
    expect(source).toContain('<TodaysBoonStrip marginTop={0} />');
    expect(source).toContain('getCurrentMultiplierBreakdown');
    expect(source).toContain("ru: 'Бонус дня'");
    expect(source).toContain("ru: 'Активные множители'");
  });
});

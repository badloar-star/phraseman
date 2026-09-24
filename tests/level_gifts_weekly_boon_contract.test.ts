import fs from 'fs';
import path from 'path';

// PM-055 (владелец: «убрать все множители опыта») — секция «Бонус дня»
// (TodaysBoonStrip / Weekly Boons) удалена целиком из экрана подарков: источник
// getTodaysBoons() уже был жёстко пуст (PM-050/051), секция рисовала заголовок
// без содержимого. Тест этого контракта переписан под новое поведение — гейт на
// возврат удалённой секции, а не на её наличие.
const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'level_gifts_inventory.tsx'), 'utf8');

describe('gifts screen reward hierarchy (post PM-055)', () => {
  it('keeps active multipliers and gifts as separate sections, without the removed bonus-of-day strip', () => {
    const multipliersStart = source.indexOf('testID="level-gifts-active-multipliers"');
    const inventoryStart = source.indexOf('testID="level-gifts-inventory"');

    expect(source).not.toContain("import TodaysBoonStrip from '../components/TodaysBoonStrip'");
    expect(source).not.toContain('<TodaysBoonStrip');
    expect(source).not.toContain('testID="level-gifts-bonus-of-day"');
    expect(multipliersStart).toBeGreaterThan(-1);
    expect(inventoryStart).toBeGreaterThan(multipliersStart);
    expect(source).toContain('getCurrentMultiplierBreakdown');
    expect(source).toContain("ru: 'Активные множители'");
  });
});

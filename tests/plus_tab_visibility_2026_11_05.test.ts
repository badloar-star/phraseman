// Governance-ID: TG-BF6A8ECE6C57
import { decidePlusTab } from '../app/plus_tab_visibility';

// зачем (слово владельца 05.11): вкладка Plus видна ТОЛЬКО при 4 иконках в панели и без подписки; пятая вкладка по рангу или покупка — вкладка исчезает.
describe('правило видимости вкладки Plus', () => {
  test('4 иконки и нет подписки → показана', () => {
    expect(decidePlusTab({ baseTabs: 4, tier: null })).toMatchObject({ visible: true, reason: 'shown', tabs: 4 });
  });

  test('открылась пятая вкладка по рангу → скрыта', () => {
    expect(decidePlusTab({ baseTabs: 5, tier: null })).toMatchObject({ visible: false, reason: 'hidden:tabs_not_4' });
  });

  test('меньше 4 иконок → скрыта', () => {
    expect(decidePlusTab({ baseTabs: 3, tier: null }).visible).toBe(false);
    expect(decidePlusTab({ baseTabs: 2, tier: null }).visible).toBe(false);
  });

  test('куплен Plus или Ultra → скрыта сразу, даже при 4 иконках', () => {
    expect(decidePlusTab({ baseTabs: 4, tier: 'plus' })).toMatchObject({ visible: false, reason: 'hidden:has_subscription', tier: 'plus' });
    expect(decidePlusTab({ baseTabs: 4, tier: 'ultra' })).toMatchObject({ visible: false, reason: 'hidden:has_subscription', tier: 'ultra' });
  });

  test('подписка важнее числа иконок в причине', () => {
    expect(decidePlusTab({ baseTabs: 5, tier: 'plus' }).reason).toBe('hidden:has_subscription');
  });
});

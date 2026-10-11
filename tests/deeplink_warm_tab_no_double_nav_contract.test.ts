// зачем (Сверка 11.10, падение Fabric «addViewAt: The specified child already has a parent» на тёплой
// phraseman://settings): роутер сам открывает тёплую ссылку по redirectSystemPath; немедленный router.replace на
// вкладку поверх него пересоздавал замороженную вкладку дважды. Сторож держит: ветка вкладок ждёт общей
// самопроверки и открывает сама только через navigate (повтор не пересоздаёт вкладку).
import fs from 'node:fs';
import path from 'node:path';

const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8').replace(/\r\n/g, '\n');

function warmOpenEffect(): string {
  const start = layout.indexOf("deeplinkSettingsTrace('open:start'");
  const end = layout.indexOf('}, WARM_DEEP_LINK_SELF_OPEN_WAIT_MS);', start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return layout.slice(start, end);
}

describe('тёплая ссылка на вкладку — без двойной навигации', () => {
  test('ветка вкладок не делает немедленный router.replace', () => {
    const effect = warmOpenEffect();
    const tabsBranch = effect.slice(effect.indexOf('const targetIsTab = isTabsGroupRoutePath(target);'), effect.indexOf('const targetPath ='));
    expect(tabsBranch).toContain("'open:tabs_deferred'");
    expect(tabsBranch).not.toMatch(/router\.replace\(/);
  });

  test('самооткрытие вкладки — navigate после проверки пути без групп', () => {
    const effect = warmOpenEffect();
    expect(effect).toMatch(/replace\(\/\\\/\\\(\[\^\/\)\]\+\\\)\(\?=\\\/\|\$\)\/g, ''\)/);
    expect(effect).toMatch(/if \(targetIsTab\) \{\s*deeplinkSettingsTrace\('open:tabs_navigate'[\s\S]*?router\.navigate\(target as Href\);\s*return;\s*\}/);
  });

  test('путь вкладки сравнивается без группы: /(tabs)/settings → /settings', () => {
    const strip = (t: string) => (t.split(/[?#]/)[0] ?? '').replace(/\/\([^/)]+\)(?=\/|$)/g, '').replace(/\/$/, '');
    expect(strip('/(tabs)/settings')).toBe('/settings');
    expect(strip('/(tabs)/settings?from=push')).toBe('/settings');
    expect(strip('/lesson1')).toBe('/lesson1');
  });
});

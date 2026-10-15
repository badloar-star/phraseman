// R14 (координатор 15.10, Сверка Б16r3): тап по пушу с целью-вкладкой делал router.push('/(tabs)/…') — поверх живых
// вкладок ложился ещё один экземпляр (tabs), и его «Сообщество» 12–14 с было пустым. Цели-вкладки — только через navTab
// (router.navigate в уже смонтированные вкладки).
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'notification_tap_handler.ts'), 'utf8');

describe('тап по пушу: вкладки через navigate, а не push', () => {
  it('нет router.push на маршрут вкладки; «Друзья» и Пик идут через navTab', () => {
    expect(src).not.toMatch(/router\.push\(\{\s*pathname:\s*'\/\(tabs\)\//);
    expect(src).toMatch(/navTab\(\{\s*pathname: '\/\(tabs\)\/friends'/);
    expect(src).toContain('navTab(route, String(data.type));');
    expect(src).toMatch(/const navTab = [\s\S]{0,400}if \(router\.navigate\) router\.navigate\(route\);/);
  });
});

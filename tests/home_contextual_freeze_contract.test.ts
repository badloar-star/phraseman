import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
// зачем: якорь — фактическое имя герой-модуля (renderHomeHeroStatus). Прошлый
// якорь ссылался на давно переименованную функцию, indexOf возвращал -1 и тест
// проверял пустую строку, то есть молча ничего не гарантировал.
const statusStart = source.indexOf('const renderHomeHeroStatus');
const statusEnd = source.indexOf('return (<BouncyScrollView', statusStart);
const statusSurface = source.slice(statusStart, statusEnd);

describe('Home contextual streak freeze', () => {
  it('anchors on the real hero status block', () => {
    expect(statusStart).toBeGreaterThan(-1);
    expect(statusEnd).toBeGreaterThan(statusStart);
  });

  it('puts the freeze shield inside the main streak status only when at risk', () => {
    expect(statusSurface).toContain('testID="home-streak-freeze-shield"');
    expect(statusSurface).toContain('streakAtRisk && !freezeActive');
    expect(statusSurface).toContain('event.stopPropagation?.()');
    expect(statusSurface).toContain('void handleFreezeStreak()');
  });

  it('keeps the shield a sibling of the streak count, not an overlay on the icon', () => {
    expect(statusSurface).not.toContain("position: 'absolute',\n                            right: -7");
    expect(statusSurface).toContain('hitSlop={10}');
  });
});

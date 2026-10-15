import fs from 'fs';
import path from 'path';

// зачем (владелец 11.10, капсом: «кнопки на таб-баре справа все обрезаны»; просьба Дизайна 12.10): срез справа может возникнуть не в
// слотах самой капсулы (их считает components/v2/tab_bar_geometry.ts), а в РОДИТЕЛЕ — контейнере таб-бара в app/(tabs)/_layout.tsx.
// Тест закрепляет свойства контейнера, от которых зависит, что капсула и её тень не обрезаются: обёртка на всю ширину окна без overflow,
// высота с запасом под тень, в режиме «таб-бар скрыт» обёртки нет вообще (ни пустой полосы, ни залипшей капсулы).
// Тест читает ИСХОДНИК и не запускает React Native; `_layout.tsx` правит Дизайн — при его правке можно обновить регэкспы вместе с кодом.
const src = fs
  .readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8')
  .replace(/\r\n/g, '\n');

const styleBlock = (name: string): string => {
  const start = src.indexOf(`${name}: {`);
  expect(start).toBeGreaterThan(-1);
  return src.slice(start, src.indexOf('},', start));
};

describe('контейнер таб-бара в _layout.tsx', () => {
  it('обёртка таб-бара — на всю ширину окна и без overflow (капсула и тень не обрезаются)', () => {
    const wrap = styleBlock('tabBarWrap');
    expect(wrap).toMatch(/position:\s*'absolute'/);
    expect(wrap).toMatch(/left:\s*0\b/);
    expect(wrap).toMatch(/right:\s*0\b/);
    expect(wrap).toMatch(/bottom:\s*0\b/);
    expect(wrap).not.toMatch(/overflow\s*:/);
    expect(wrap).not.toMatch(/(?:padding|margin)(?:Horizontal|Left|Right|Start|End)\s*:/);
    expect(wrap).not.toMatch(/\bwidth\s*:/);
  });

  it('высота обёртки = отступ снизу + высота капсулы + запас под тень, и касания проходят сквозь пустое место', () => {
    expect(src).toMatch(/const TAB_BAR_WRAP_SHADOW_ROOM = \d+;/);
    expect(src).toMatch(/height:\s*tabBarBottom \+ V2_TAB_BAR_HEIGHT \+ TAB_BAR_WRAP_SHADOW_ROOM/);
    expect(src).toMatch(/style=\{\[s\.tabBarWrap[^\n]*\n\s*pointerEvents="box-none"/);
  });

  it('отступ капсулы снизу не меньше минимума (панель жестов) и берётся из одной формулы', () => {
    // минимум и зазор — из общего источника геометрии капсулы (tab_bar_geometry), не локальные числа
    expect(src).toContain("from '../../components/v2/tab_bar_geometry'");
    expect(src).not.toMatch(/const TAB_DOCK_MIN_BOTTOM_PAD = \d+;/);
    expect(src).toMatch(/const tabBarBottom = Math\.max\(PB, TAB_DOCK_MIN_BOTTOM_PAD\) \+ FLOATING_PILL_BOTTOM_GAP;/);
    expect(src).toMatch(/bottomOffset=\{tabBarBottom\}/);
  });

  it('в режиме «таб-бар скрыт» обёртки нет вообще, а таб-бар получает список видимых вкладок', () => {
    expect(src).toMatch(/\{tabBarHidden \? null : \(\n\s*<View\n\s*style=\{\[s\.tabBarWrap/);
    expect(src).toMatch(/TAB_BAR_TABS\.filter\(\(tab\) => !isLogicalTabHidden\(tab\.logicalIdx, pageLayout\)\)/);
    expect(src).toMatch(/<V2TabBar\n\s*items=\{tabBarItems\}/);
  });
});

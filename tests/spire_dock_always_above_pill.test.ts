// зачем (координатор 15.10: «ничего и нигде под таббаром/доком»; вариант (б)): экран Пика прокручиваемый, запас под док считается от высоты дока и верха капсулы таб-бара. Гарантия: при ЛЮБОЙ высоте дока
// (кнопка, подпись причины, панель итога), на 360×640 при шрифте 1.0 и 1.3 и с любой системной полосой — на конце прокрутки нижний край последней карточки («Этаж N» / ряд друзей) выше верха дока
// не менее чем на зазор DOCK_GAP, а сам док выше верха капсулы не менее чем на DOCK_PILL_GAP. Числа сходятся с формулой в SpireHomeScreen (проверяется по исходнику).
import fs from 'node:fs';
import path from 'node:path';
import { tabPillTopOffset } from '../components/v2/tab_bar_geometry';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

const DOCK_PILL_GAP = 12; // как в SpireHomeScreen
const DOCK_GAP = 16;
const CONTENT_BREATHING_GAP = 16; // как в hooks/use-tab-content-bottom-pad.ts

function layout(bottomInset: number, dockH: number, scrollTailPad: number) {
  const pillTop = tabPillTopOffset(bottomInset);
  const bottomPad = pillTop + CONTENT_BREATHING_GAP;
  const dockBottom = pillTop + DOCK_PILL_GAP;
  const tailNeeded = dockH > 0 ? Math.ceil(dockBottom + dockH + DOCK_GAP - bottomPad) : 0;
  const tailPad = Math.max(scrollTailPad, tailNeeded);
  const paddingBottom = bottomPad + tailPad;
  return { pillTop, dockBottom, endClearance: paddingBottom - dockBottom - dockH, dockAbovePill: dockBottom - pillTop };
}

describe('Пик: док и последняя карточка всегда выше капсулы', () => {
  it('формула запаса в экране — та же, что в тесте (иначе тест слеп)', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('const DOCK_PILL_GAP = 12;');
    expect(home).toContain('const DOCK_GAP = 16;');
    expect(home).toContain('const tailNeeded = dockH > 0 ? Math.ceil(dockBottom + dockH + DOCK_GAP - bottomPad) : 0;');
    expect(home).toContain('const tailPad = Math.max(scrollTailPad, tailNeeded);');
    expect(home).toContain('style={[s.dock, { bottom: dockBottom }]}');
    expect(home).toContain('contentContainerStyle={[s.content, { paddingBottom: bottomPad + tailPad }]}');
    expect(read('hooks/use-tab-content-bottom-pad.ts')).toContain('export const CONTENT_BREATHING_GAP = 16;');
  });

  // 360×640: системная полоса 0 (кнопки), 24 (жесты), 48 (высокая); шрифт 1.0 и 1.3; док — кнопка 52, с подписью причины 100, панель итога 272 (замеры Сверки), умноженные на шрифт
  const insets = [0, 24, 48];
  const fonts = [1.0, 1.3];
  const docks: ReadonlyArray<readonly [string, number, number]> = [
    ['кнопка', 52, 120],
    ['с подписью причины', 100, 150],
    ['панель итога', 272, 300],
  ];
  for (const font of fonts) {
    for (const inset of insets) {
      for (const [name, baseH, floor] of docks) {
        it(`360×640, шрифт ${font}, полоса ${inset}, док «${name}»: карточка выше дока ≥ ${DOCK_GAP}, док выше капсулы ≥ ${DOCK_PILL_GAP}`, () => {
          const dockH = baseH * font;
          const l = layout(inset, dockH, floor);
          expect([name, font, inset, l.endClearance >= DOCK_GAP]).toEqual([name, font, inset, true]);
          expect([name, font, inset, l.dockAbovePill >= DOCK_PILL_GAP]).toEqual([name, font, inset, true]);
        });
      }
    }
  }
});

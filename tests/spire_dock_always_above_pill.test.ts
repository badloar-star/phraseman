// зачем (координатор 15.10: «ничего и нигде под таббаром/доком»; вариант (б)): экран Пика прокручиваемый, запас под док считается от высоты дока и верха капсулы таб-бара. Гарантия: при ЛЮБОЙ высоте дока
// (кнопка, подпись причины, панель итога), на 360×640 при шрифте 1.0 и 1.3 и с любой системной полосой — на конце прокрутки нижний край последней карточки («Этаж N» / ряд друзей) выше верха дока
// не менее чем на зазор DOCK_GAP, а сам док выше верха капсулы не менее чем на DOCK_PILL_GAP. Числа сходятся с формулой в SpireHomeScreen (проверяется по исходнику).
import fs from 'node:fs';
import path from 'node:path';
import { tabPillTopOffset } from '../components/v2/tab_bar_geometry';
import { SPIRE_WINDOW_MIN, SPIRE_WINDOW_MIN_TALL, spireTowerWindowHeight } from '../components/spire/spire_tower_window';

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

// Начальное положение (scroll = 0): на обычных телефонах карточка «Этаж N» целиком выше дока, при шрифте 1.0 и 1.3 (решение координатора 15.10; автопрокрутки нет).
// Модель верха окна башни — по замеру Сверки на Pixel 8 (верх окна 306 dp при шрифте 1.0, верхняя вставка 24): вставка + 66 (вкладки) + 216 (заголовок, «Комната недели», пьедестал); из 216 на системный шрифт
// масштабируются ≈ 130 (заголовки, подписи, имена), остальное (монеты, плиты пьедестала 88/66/50, кнопка «Все участники») фиксировано. Карточка этажа 110 и док 52 масштабируются целиком (пессимистично).
function initialPosition(screenH: number, insetTop: number, bottomInset: number, font: number) {
  const towerTop = insetTop + 66 + 86 + 130 * font;
  const infoH = 110 * font;
  const dockH = 52 * font;
  const pillTop = tabPillTopOffset(bottomInset);
  const dockTop = screenH - (pillTop + DOCK_PILL_GAP) - dockH;
  const windowH = spireTowerWindowHeight(towerTop, dockTop, DOCK_GAP + infoH, screenH);
  return { windowH, cardBottom: towerTop + windowH + infoH, dockTop };
}

describe('Пик: начальное положение — карточка этажа выше дока на обычных телефонах', () => {
  const devices: ReadonlyArray<readonly [string, number, number, number]> = [
    ['Pixel 8 412×915', 915, 24, 24],
    ['iPhone 390×844', 844, 47, 34],
    ['iPhone Pro Max 430×932', 932, 59, 34],
  ];
  for (const [name, h, insetTop, bottomInset] of devices) {
    for (const font of [1.0, 1.3]) {
      it(`${name}, шрифт ${font}: низ карточки «Этаж N» выше верха дока на ≥ ${DOCK_GAP}`, () => {
        const r = initialPosition(h, insetTop, bottomInset, font);
        expect([name, font, r.windowH >= SPIRE_WINDOW_MIN_TALL]).toEqual([name, font, true]);
        expect([name, font, r.cardBottom <= r.dockTop - DOCK_GAP + 0.5]).toEqual([name, font, true]);
      });
    }
  }

  it('малый экран 360×640: минимум окна 220, дальше обычная прокрутка (контент уходит под док с затуханием)', () => {
    const r = initialPosition(640, 24, 0, 1.0);
    expect(r.windowH).toBe(SPIRE_WINDOW_MIN);
  });

  it('затухание над доком: градиент затемнения стоит на 40 dp выше дока (между 24 и 40), не ступенькой', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('colors={[`${bgBottom}00`, `${bgBottom}FF`, `${bgBottom}FF`]} locations={[0, 0.32, 1]}');
    expect(home).toMatch(/scrim: \{ position: 'absolute', left: -V2\.screenPad, right: -V2\.screenPad, top: -40, bottom: -40 \}/);
  });
});

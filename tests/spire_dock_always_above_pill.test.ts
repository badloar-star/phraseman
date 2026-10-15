// зачем (координатор 15.10: «ничего и нигде под таббаром/доком»; вариант (б)): экран Пика прокручиваемый, запас под док считается от высоты дока и верха капсулы таб-бара. Гарантия: при ЛЮБОЙ высоте дока
// (кнопка, подпись причины, панель итога), на 360×640 при шрифте 1.0 и 1.3 и с любой системной полосой — на конце прокрутки нижний край последней карточки («Этаж N» / ряд друзей) выше верха дока
// не менее чем на зазор DOCK_GAP, а сам док выше верха капсулы не менее чем на DOCK_PILL_GAP. Числа сходятся с формулой в SpireHomeScreen (проверяется по исходнику).
import fs from 'node:fs';
import path from 'node:path';
import { tabPillTopOffset } from '../components/v2/tab_bar_geometry';
import {
  SPIRE_FLOOR_INFO_COMPACT_H, SPIRE_FLOOR_INFO_FULL_H, SPIRE_PODIUM_COMPACT_SAVE, SPIRE_WINDOW_MIN, SPIRE_WINDOW_MIN_FIT,
  spireCardCompact, spireLayoutLevel, spirePodiumCompact, spireScrollMode, spireTowerRawFit, spireTowerWindowHeight,
} from '../components/spire/spire_tower_window';

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

// Начальное положение (scroll = 0). Координатор 15.10, 🔴 кадр Pixel 8: прежняя модель верха окна (306 dp) была снята ДО загрузки подиума; с подиумом верх окна 554 dp (шрифт 1.0, вставка 24).
// Модель по замеру: вставка + 66 (вкладки) + 86 + 130·шрифт (заголовок, подписи «Комнаты недели») + подиум 158 + 90·шрифт (монеты и плиты 88/66/50 фиксированы, тексты масштабируются) → 554 при шрифте 1.0.
// Карточка этажа — 84 (полная) / 52 (компактная), умноженные на шрифт (пессимистично); док 52·шрифт; компактный подиум ниже на 40. Расчёт — теми же функциями, что в экране (use_spire_tower_budget).
function initialPosition(screenH: number, insetTop: number, bottomInset: number, font: number) {
  const fullTop = insetTop + 66 + 86 + 130 * font + 158 + 90 * font; // верх окна башни при полном подиуме
  const dockH = 52 * font;
  const pillTop = tabPillTopOffset(bottomInset);
  const dockTop = screenH - (pillTop + DOCK_PILL_GAP) - dockH;
  const rawFit = spireTowerRawFit(fullTop, dockTop, DOCK_GAP, SPIRE_FLOOR_INFO_FULL_H * font);
  const level = spireLayoutLevel(rawFit, 0);
  const towerTop = fullTop - (spirePodiumCompact(level) ? SPIRE_PODIUM_COMPACT_SAVE : 0);
  const infoH = (spireCardCompact(level) ? SPIRE_FLOOR_INFO_COMPACT_H : SPIRE_FLOOR_INFO_FULL_H) * font;
  const windowH = spireTowerWindowHeight(towerTop, dockTop, DOCK_GAP + infoH, spireScrollMode(level));
  return { windowH, level, rawFit, towerTop, fullTop, cardBottom: towerTop + windowH + infoH, dockTop };
}

describe('Пик: начальное положение — по реальной раскладке ПОСЛЕ загрузки подиума', () => {
  it('Pixel 8 412×915, шрифт 1.0 (кадр координатора): верх окна ≈ 554 при полном подиуме, ужатие включается, окно ≥ 120, низ карточки выше дока на ≥ зазор', () => {
    const r = initialPosition(915, 24, 24, 1.0);
    expect(Math.round(r.fullTop)).toBe(554);
    expect(r.level).toBeGreaterThanOrEqual(1);
    expect(r.level).toBeLessThanOrEqual(2);
    expect(r.windowH).toBeGreaterThanOrEqual(SPIRE_WINDOW_MIN_FIT);
    expect(r.cardBottom).toBeLessThanOrEqual(r.dockTop - DOCK_GAP + 0.5);
  });

  // Гарантия без полумер: либо всё (окно ≥ 120, карточка, зазор) на первом экране выше дока, либо режим прокрутки страницы с окном ≥ 220 — «сжатого окна с карточкой под доком» не бывает.
  const devices: ReadonlyArray<readonly [string, number, number, number]> = [
    ['Pixel 8 412×915', 915, 24, 24],
    ['iPhone 390×844', 844, 47, 34],
    ['iPhone Pro Max 430×932', 932, 59, 34],
    ['малый 360×640', 640, 24, 0],
    ['малый 360×800', 800, 24, 0],
  ];
  for (const [name, h, insetTop, bottomInset] of devices) {
    for (const font of [1.0, 1.15, 1.3]) {
      it(`${name}, шрифт ${font}: или всё выше дока с зазором ${DOCK_GAP} и окном ≥ ${SPIRE_WINDOW_MIN_FIT}, или режим прокрутки страницы (окно ≥ ${SPIRE_WINDOW_MIN}, всё полное)`, () => {
        const r = initialPosition(h, insetTop, bottomInset, font);
        const fitsAbove = r.cardBottom <= r.dockTop - DOCK_GAP + 0.5 && r.windowH >= SPIRE_WINDOW_MIN_FIT;
        const scrollMode = r.level === 3 && r.windowH >= SPIRE_WINDOW_MIN;
        expect([name, font, fitsAbove || scrollMode]).toEqual([name, font, true]);
      });
    }
  }

  it('малый экран 360×640: режим прокрутки, окно 220, всё полное (контент уходит под док с затуханием)', () => {
    const r = initialPosition(640, 24, 0, 1.0);
    expect(r.level).toBe(3);
    expect(r.windowH).toBe(SPIRE_WINDOW_MIN);
  });

  it('затухание над доком: градиент затемнения стоит на 40 dp выше дока (между 24 и 40), не ступенькой', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('colors={[`${bgBottom}00`, `${bgBottom}FF`, `${bgBottom}FF`]} locations={[0, 0.32, 1]}');
    expect(home).toMatch(/scrim: \{ position: 'absolute', left: -V2\.screenPad, right: -V2\.screenPad, top: -40, bottom: -40 \}/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_layout.ts — сетка «Сцены» Пика без пересечений на 360–430 dp: окно башни, колонка текста, ряд соперников у этажа.
//
// зачем (координатор 22.10 после съёмки Сверки: «нижние этажи перекрыты монетами жителей, «+4» налезает на подножие, монета первого
// места наезжает на башню — нужна сетка без пересечений на 360–430 dp»; эталон peak-scene-v2.html, V2 под замком): горизонталь сцены —
// доли ширины эталона (430), а текст не масштабируется, поэтому на узком экране всё сходилось вплотную. Здесь — чистый расчёт:
// - ряд соперников стоит между подписью этажа и телом башни; не влезает — монет меньше (2 → 1 → только «+N»), подпись не закрывается;
// - низ окна башни поднят так, чтобы ряд первого этажа кончался над монетой первого места (башня стоит на земле, как в эталоне);
// - окно прижато к низу башни (как в эталоне), на 13 этаже чуть выше сверху, чтобы своя метка влезла; на 14–15 — прежний показ вершины,
//   а ряды, ушедшие ниже монет пьедестала, прячутся (rowsClearBottom);
// - колонка текста и «своё место» кончаются левее подписей этажей.
// Тот же расчёт проверяет tests/spire_scene_layout.test.ts на каждой ширине 360–430 и шрифтах 1,0 и 1,3.
// ═══════════════════════════════════════════════════════════════════════════
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW, spireIsGuard } from '../spire_tower_model';

/** Ширина эталона: горизонтальные места сцены — доли от неё. */
export const SPIRE_SCENE_BASE_W = 430;
/** Высота сцены (эталон: сцена 760, из них 112 — строка статуса и вкладки «Сообщества», их рисует экран над сценой). */
export const SPIRE_SCENE_H = 648;

/** Пьедестал (эталон: блоки 124 / 100 / 80, третий выше на 6 под строки 13/17; монеты 48 / 38 / 38 заходят на блок на 47 %). */
export const SPIRE_SCENE_PODIUM = Object.freeze({
  bottom: 568,
  blockH: Object.freeze([124, 100, 86] as const),
  coin: Object.freeze([48, 38, 38] as const),
  coinOverlap: 0.47,
});

/** Верх монеты первого места — самая высокая точка пьедестала, ниже неё ряды соперников не опускаются. */
export const SPIRE_SCENE_COIN_BAND_TOP = SPIRE_SCENE_PODIUM.bottom - SPIRE_SCENE_PODIUM.blockH[0] - SPIRE_SCENE_PODIUM.coin[0]
  + Math.round(SPIRE_SCENE_PODIUM.coin[0] * SPIRE_SCENE_PODIUM.coinOverlap);

/** Окно башни эталона: верх 150 − 112, высота 450, ширина 240 из 430, правый край на 6 за краем экрана. */
const TOWER = Object.freeze({ top: 38, bottomMax: 488, w: 240, overRight: 6 });
/** Колонка текста слева: отступ эталона. */
export const SPIRE_SCENE_COPY_LEFT = 20;
/** Зазор между соседями в сетке (подпись — ряд — тело башни; текст — подписи), dp. */
const GAP = 2;
/** Зазор между рядом первого этажа и монетой первого места, dp. */
const BAND_GAP = 3;
/** Метка своего этажа справа (SpireTower MARKER_SIZE 40) и поле над ней, dp. */
const MARKER_HALF = 20;
const MARKER_MARGIN = 4;

/** Ряд соперников (SpireTower RivalsLayer): монета 22 и шаг 13 в единицах башни, «+N» — 13 жирным, строка 17, рост шрифта до 1,3. */
const RIVAL = Object.freeze({ coin: 22, step: 13, maxCoins: 2, textGap: 5, font: 13, line: 17, maxFontScale: 1.3, charEm: 0.64 });
/** Подписи этажей в SVG башни (SpireTowerSvg): номер — центр 14, кегль 14; «СТРАЖ» — центр 20, кегль 7,5, разрядка 0,5, заглавные. */
const LABEL = Object.freeze({ numX: 14, numDigitW: 8.4, guardX: 20, guardCharW: 5.9, guardSpacing: 0.5 });
/** Подписи этажа по вертикали в единицах башни от центра этажа: номер (кегль 14) от −10, слово «СТРАЖ» под ним до +14. */
const LABEL_BAND = Object.freeze({ above: 10, below: 14 });

const clampFloor = (floor: number): number => Math.min(Math.max(Math.trunc(floor) || 1, 1), SPIRE_FLOOR_COUNT);
const fontOf = (fontScale: number): number => Math.min(Math.max(fontScale, 1), RIVAL.maxFontScale);

/** Ширина «+N» соперников, dp (с запасом: 0,64 кегля на знак). */
export function spireSceneRivalTextW(text: string, fontScale: number): number {
  return text.length * RIVAL.font * RIVAL.charEm * fontOf(fontScale);
}

/** Половина высоты ряда соперников (монеты или строка «+N» — что выше), dp. */
export function spireSceneRowHalf(scale: number, fontScale: number): number {
  return Math.max((RIVAL.coin / 2) * scale, (RIVAL.line * fontOf(fontScale)) / 2);
}

/** Ширина надписи «СТРАЖ» в единицах башни (по числу знаков заглавными). */
const guardW = (guardChars: number): number => Math.max(0, guardChars * LABEL.guardCharW - LABEL.guardSpacing);

/** Правый край подписей этажа (номер и, у стража, слово под ним) в единицах башни. */
export function spireSceneLabelRight(floor: number, guardChars: number): number {
  const f = clampFloor(floor);
  const num = LABEL.numX + (String(f).length * LABEL.numDigitW) / 2;
  return spireIsGuard(f) ? Math.max(num, LABEL.guardX + guardW(guardChars) / 2) : num;
}

/** Левый край самой левой подписи этажей в единицах башни (не левее края окна). */
export function spireSceneLabelLeft(guardChars: number): number {
  const num = LABEL.numX - (String(SPIRE_FLOOR_COUNT).length * LABEL.numDigitW) / 2;
  return Math.max(0, Math.min(num, LABEL.guardX - guardW(guardChars) / 2));
}

/** Ширина ряда: монеты внахлёст и «+N». */
export function spireSceneRivalRowW(coins: number, extra: number, scale: number, fontScale: number): number {
  const coinsW = coins > 0 ? (RIVAL.coin + (coins - 1) * RIVAL.step) * scale : 0; // guard-ok: «монеты» — значки соперников в ряду у этажа, не баланс
  const textW = extra > 0 ? (coins > 0 ? RIVAL.textGap : 0) + spireSceneRivalTextW(`+${extra}`, fontScale) : 0;
  return coinsW + textW;
}

export type SpireSceneRivalsFit = Readonly<{
  /** Сколько монет показать (0 — только «+N»). */
  coins: number;
  /** Число в «+N»; 0 — без надписи. */
  extra: number;
  /** Правый край ряда от левого края рисунка башни, dp. */
  rightX: number;
  /** Левая граница, за которую ряд не заходит (правый край подписи этажа + зазор), dp. */
  leftLimitX: number;
}>;

/**
 * Ряд соперников у этажа на «Сцене»: между подписью этажа и телом башни. Влезают две монеты и «+N» — как в эталоне; нет — одна;
 * нет и её — только «+N» (сколько людей на этаже), чтобы монеты не закрывали номер этажа и «+N» не заходил на башню.
 */
export function spireSceneRivalsFit(i: Readonly<{ floor: number; count: number; scale: number; fontScale: number; guardChars: number }>): SpireSceneRivalsFit {
  const fl = SPIRE_TOWER_GEOM.floors[clampFloor(i.floor) - 1];
  const rightX = fl.x0 * i.scale - GAP;
  const leftLimitX = spireSceneLabelRight(fl.f, i.guardChars) * i.scale + GAP;
  const count = Math.max(0, Math.trunc(i.count) || 0);
  const room = rightX - leftLimitX;
  for (let coins = Math.min(count, RIVAL.maxCoins); coins >= 1; coins -= 1) { // guard-ok: число значков соперников в ряду, не баланс
    if (spireSceneRivalRowW(coins, count - coins, i.scale, i.fontScale) <= room) return { coins, extra: count - coins, rightX, leftLimitX };
  }
  if (spireSceneRivalRowW(0, count, i.scale, i.fontScale) <= room) return { coins: 0, extra: count, rightX, leftLimitX };
  // зачем: крайний случай (шрифт 1,3, длинное слово стража, узкий экран) — одна монета без числа, но ничего не налезает
  return { coins: Math.min(count, 1), extra: 0, rightX, leftLimitX };
}

export type SpireSceneFrame = Readonly<{
  towerW: number;
  /** Левый край окна башни на сцене, dp. */
  towerLeft: number;
  /** Масштаб рисунка башни (ширина окна / 390). */
  scale: number;
  windowTop: number;
  windowH: number;
  /** Ряды соперников с центром ниже этой высоты над низом окна прячутся (там монеты пьедестала), dp. */
  rowsClearBottom: number;
  /** Ширина колонки текста и «своего места»: до подписей этажей, dp. */
  copyW: number;
}>;

/**
 * Окно башни и колонка текста для ширины экрана. Низ окна — чтобы ряд первого этажа (при окне, прижатом к низу башни) кончался над
 * монетой первого места; верх — эталонный 38, на 13 этаже выше настолько, чтобы метка своего этажа влезла целиком (14–15 — показ вершины).
 */
export function spireSceneFrame(i: Readonly<{ width: number; fontScale: number; myFloor: number | null; guardChars: number }>): SpireSceneFrame {
  const towerW = Math.round((TOWER.w * i.width) / SPIRE_SCENE_BASE_W);
  const towerLeft = i.width + TOWER.overRight - towerW;
  const scale = towerW / SPIRE_TW;
  const contentH = SPIRE_TOWER_GEOM.height * scale;
  const f1 = SPIRE_TOWER_GEOM.floors[0];
  const floor1Depth = (SPIRE_TOWER_GEOM.height - (f1.y + f1.h / 2)) * scale;
  const rowHalf = spireSceneRowHalf(scale, i.fontScale);
  const rowsFloor = SPIRE_SCENE_COIN_BAND_TOP - BAND_GAP - rowHalf;
  const windowBottom = Math.min(TOWER.bottomMax, rowsFloor + floor1Depth);
  let windowTop: number = TOWER.top;
  let markerTopMax = Number.POSITIVE_INFINITY;
  if (i.myFloor !== null && i.myFloor < SPIRE_FLOOR_COUNT - 1) {
    const fl = SPIRE_TOWER_GEOM.floors[clampFloor(i.myFloor) - 1];
    const markTop = (fl.y + fl.h / 2) * scale - Math.max((fl.h / 2) * scale, MARKER_HALF) - MARKER_MARGIN;
    markerTopMax = windowBottom - (contentH - markTop);
    windowTop = Math.max(0, Math.min(TOWER.top, markerTopMax));
  }
  // зачем (Сверка r3: «в макете сверху 13, в приложении 14»): край окна не режет номер этажа — опускается под подпись, а если мешает своя метка, поднимается над ней
  windowTop = spireSceneTopClearOfLabels(windowTop, windowBottom, scale, markerTopMax);
  const labelLeftX = towerLeft + spireSceneLabelLeft(i.guardChars) * scale;
  return {
    towerW,
    towerLeft,
    scale,
    windowTop,
    windowH: windowBottom - windowTop,
    rowsClearBottom: windowBottom - rowsFloor,
    copyW: Math.floor(labelLeftX - GAP - SPIRE_SCENE_COPY_LEFT),
  };
}

/** Верх окна башни, прижатого к низу башни, который не проходит по подписи этажа: если прошёл бы — опускается до низа подписи. */
export function spireSceneTopClearOfLabels(windowTop: number, windowBottom: number, scale: number, maxTop: number = Number.POSITIVE_INFINITY): number {
  const topUnit = SPIRE_TOWER_GEOM.height - (windowBottom - windowTop) / scale;
  for (const fl of SPIRE_TOWER_GEOM.floors) {
    const c = fl.y + fl.h / 2;
    if (topUnit <= c - LABEL_BAND.above || topUnit >= c + LABEL_BAND.below) continue;
    const below = windowTop + (c + LABEL_BAND.below + 1 - topUnit) * scale;
    if (below <= maxTop) return below;
    return Math.max(0, windowTop - (topUnit - (c - LABEL_BAND.above - 1)) * scale);
  }
  return windowTop;
}

/**
 * Сколько нижних этажей прячут ряд соперников: их центр ниже границы над монетами пьедестала (окно прокручено к вершине или вручную).
 * Этажи идут снизу вверх, поэтому спрятанные — сплошь с первого.
 */
export function spireSceneHiddenRows(i: Readonly<{ offsetY: number; windowH: number; clearBottom: number; scale: number }>): number {
  const cut = i.offsetY + i.windowH - i.clearBottom + 0.5;
  let hidden = 0;
  for (const fl of SPIRE_TOWER_GEOM.floors) {
    if ((fl.y + fl.h / 2) * i.scale <= cut) break;
    hidden = fl.f;
  }
  return hidden;
}

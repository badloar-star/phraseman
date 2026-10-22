// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_layout.ts — сетка «Сцены» Пика без пересечений на 360–430 dp: высота сцены, окно башни, колонка текста, ряд соперников у этажа.
//
// зачем (координатор 22.10 после съёмки Сверки: «нижние этажи перекрыты монетами жителей — нужна сетка без пересечений на 360–430 dp»;
// владелец 22.10 выбрал вариант 2 scenes-compact.html: «сцены не должны быть такими огромными», высота всех сцен 46 %):
// - сцена — 392 из 844 вместе со строкой статуса и вкладками «Сообщества» (доля высоты экрана); пьедестал и своё место — в панели под ней;
// - окно башни справа во всю высоту сцены (188 из 390), прижато к низу башни; ряды соперников кончаются над панелью, которая наезжает на 22;
// - ряд соперников стоит между подписью этажа и телом башни; не влезает — монет меньше (2 → 1 → только «+N»), подпись не закрывается;
// - башня шире доли эталона только там, где длинное слово «страж» иначе отняло бы у 5-го этажа «+29» (vi на 360–378 dp);
// - верх окна не режет номер этажа; колонка текста кончается левее подписей этажей.
// Тот же расчёт проверяет tests/spire_scene_layout.test.ts на каждой ширине 360–430, высотах 640–960 и шрифтах 1,0 и 1,3.
// ═══════════════════════════════════════════════════════════════════════════
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW, spireIsGuard } from '../spire_tower_model';
import { SPIRE_ROOM_SIZE } from '../../../modules/spire/residents';

/** Ширина варианта 2 (scenes-compact.html): горизонтальные места сцены — доли от неё. */
export const SPIRE_SCENE_BASE_W = 390;
/** Доля экрана под сцену вместе со строкой статуса и вкладками «Сообщества» (владелец 22.10, вариант 2: 392 из 844). */
export const SPIRE_SCENE_SCREEN_SHARE = 392 / 844;
/** Строка вкладок «Сообщества» над сценой (community.tsx: header minHeight 58). */
export const SPIRE_SCENE_HEADER_H = 58;
/** Сцена не ниже этого на очень низких экранах: башне и тексту нужно место (текст сцены при шрифте 1,3 — до ~250 вместе с отступом снизу). */
const SCENE_MIN_H = 280;
/** Панель «Комната недели» под сценой наезжает на 22 (как «Сегодня» на Главной). */
export const SPIRE_SCENE_PANEL_OVERLAP = 22;
/** Низ текста сцены над её низом: наезд панели 22 и зазор 22. */
export const SPIRE_SCENE_COPY_BOTTOM = 44;
/** Пьедестал в панели «Комната недели»: блоки 96 / 86 / 84, монеты 40 / 32 / 32 заходят на блок на 47 %. */
export const SPIRE_SCENE_PODIUM = Object.freeze({
  blockH: Object.freeze([96, 86, 84] as const),
  coin: Object.freeze([40, 32, 32] as const),
  coinOverlap: 0.47,
});

/** Окно башни варианта 2: 188 из 390 по ширине, правый край на 6 за краем экрана; по высоте — вся сцена. */
const TOWER = Object.freeze({ w: 188, overRight: 6 });
/** Колонка текста слева: отступ эталона. */
export const SPIRE_SCENE_COPY_LEFT = 20;
/** Зазор между соседями в сетке (ряд — тело башни; текст — подписи), dp. Между подписью и рядом зазора нет: обе ширины — с запасом. */
const GAP = 2;
/** Зазор между рядом первого этажа и монетой первого места, dp. */
const BAND_GAP = 3;
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
  /** Левая граница, за которую ряд не заходит (правый край подписи этажа), dp. */
  leftLimitX: number;
}>;

/**
 * Ряд соперников у этажа на «Сцене»: между подписью этажа и телом башни. Влезают две монеты и «+N» — как в эталоне; нет — одна;
 * нет и её — только «+N» (сколько людей на этаже), чтобы монеты не закрывали номер этажа и «+N» не заходил на башню.
 */
export function spireSceneRivalsFit(i: Readonly<{ floor: number; count: number; scale: number; fontScale: number; guardChars: number }>): SpireSceneRivalsFit {
  const fl = SPIRE_TOWER_GEOM.floors[clampFloor(i.floor) - 1];
  const rightX = fl.x0 * i.scale - GAP;
  // зачем (22.10, компактная башня 188): слева зазор 0 — подпись считается по 5,9 на знак при кегле 7,5, «+N» по 0,64 кегля на знак,
  // живой зазор остаётся ~3 dp; так «+29» у стража влезает без ужатия шрифта. До тела башни — прежние GAP.
  const leftLimitX = spireSceneLabelRight(fl.f, i.guardChars) * i.scale;
  const count = Math.max(0, Math.trunc(i.count) || 0);
  const room = rightX - leftLimitX;
  for (let coins = Math.min(count, RIVAL.maxCoins); coins >= 1; coins -= 1) { // guard-ok: число значков соперников в ряду, не баланс
    if (spireSceneRivalRowW(coins, count - coins, i.scale, i.fontScale) <= room) return { coins, extra: count - coins, rightX, leftLimitX };
  }
  if (spireSceneRivalRowW(0, count, i.scale, i.fontScale) <= room) return { coins: 0, extra: count, rightX, leftLimitX };
  // зачем: крайний случай (шрифт 1,3, длинное слово стража, узкий экран) — одна монета без числа, но ничего не налезает
  return { coins: Math.min(count, 1), extra: 0, rightX, leftLimitX };
}

/**
 * Ширина окна башни, при которой «+N» всей комнаты (до 29 соперников) при обычном шрифте встаёт между подписью и телом башни на любом
 * этаже — сколько людей на этаже, не теряется. Шире доли эталона только для длинного слова «страж»: vi «NGƯỜI CANH» на 360–378 dp.
 */
function rivalMinTowerW(guardChars: number): number {
  let roomUnits = Number.POSITIVE_INFINITY;
  for (const fl of SPIRE_TOWER_GEOM.floors) roomUnits = Math.min(roomUnits, fl.x0 - spireSceneLabelRight(fl.f, guardChars));
  const needDp = spireSceneRivalRowW(0, SPIRE_ROOM_SIZE - 1, 1, 1) + GAP;
  return Math.ceil((needDp / roomUnits) * SPIRE_TW);
}

export type SpireSceneFrame = Readonly<{
  /** Высота сцены (без строки статуса и вкладок над ней), dp. */
  sceneH: number;
  towerW: number;
  /** Левый край окна башни на сцене, dp. */
  towerLeft: number;
  /** Масштаб рисунка башни (ширина окна / 390). */
  scale: number;
  windowTop: number;
  windowH: number;
  /** Ряды соперников с центром ниже этой высоты над низом окна прячутся (там панель «Комната недели»), dp. */
  rowsClearBottom: number;
  /** Ширина колонки текста: до подписей этажей, dp. */
  copyW: number;
}>;

/**
 * Сцена, окно башни и колонка текста для экрана. Высота — доля экрана за вычетом строки статуса и вкладок; окно башни во всю высоту сцены
 * (верх не режет номер этажа), ряды соперников кончаются над панелью «Комната недели», текст — левее подписей этажей.
 */
export function spireSceneFrame(i: Readonly<{ width: number; windowH: number; topInset: number; fontScale: number; guardChars: number }>): SpireSceneFrame {
  const sceneH = Math.max(SCENE_MIN_H, Math.round(i.windowH * SPIRE_SCENE_SCREEN_SHARE) - i.topInset - SPIRE_SCENE_HEADER_H);
  const towerW = Math.max(Math.round((TOWER.w * i.width) / SPIRE_SCENE_BASE_W), rivalMinTowerW(i.guardChars));
  const towerLeft = i.width + TOWER.overRight - towerW;
  const scale = towerW / SPIRE_TW;
  const rowsFloor = sceneH - SPIRE_SCENE_PANEL_OVERLAP - BAND_GAP - spireSceneRowHalf(scale, i.fontScale);
  const windowTop = spireSceneTopClearOfLabels(0, sceneH, scale);
  const labelLeftX = towerLeft + spireSceneLabelLeft(i.guardChars) * scale;
  return {
    sceneH,
    towerW,
    towerLeft,
    scale,
    windowTop,
    windowH: sceneH - windowTop,
    rowsClearBottom: sceneH - rowsFloor,
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

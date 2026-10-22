// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_layout.ts — сетка «Сцены» Пика: высота сцены, окно башни целиком, колонка текста, ряд соперников у этажа.
//
// зачем (владелец 22.10 кнопкой: «Сцена выше, башня крупнее»; координатор: Пик — исключение из правила 46 %): сцена почти на весь экран,
// башня видна ЦЕЛИКОМ и крупно — все 15 этажей, корона и ореол; масштаб как у эталона V2 (колонка 240 из 430), не меньше; меньше — только
// если иначе башня от короны до низа 1-го этажа не встаёт над закреплённой «Играть». «Комната недели» и пьедестал — ниже сцены, прокруткой.
// - ряд соперников стоит между подписью этажа и телом башни; не влезает — монет меньше (2 → 1 → только «+N»), подпись не закрывается;
// - слова под номерами мельче 4 dp («страж», вершина, «над облаками») не рисуются — ряд меряется от номера, число людей не теряется;
// - колонка текста кончается левее подписей этажей.
// Тот же расчёт проверяет tests/spire_scene_layout.test.ts: ширины 360–430, высоты экрана, шрифты 1,0 и 1,3, запас короны любой лиги.
// ═══════════════════════════════════════════════════════════════════════════
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW, spireIsGuard } from '../spire_tower_model';

/** Ширина эталона V2: колонка башни — доля от неё. */
export const SPIRE_SCENE_BASE_W = 430;
/** Шапка «Сообщества» без зоны часов (community.tsx: поле 12, вкладка 6 + 22 + 8 + 3, поле 4) и её наименьшая высота, dp. */
export const SPIRE_SCENE_HEADER_CONTENT = 55;
export const SPIRE_SCENE_HEADER_MIN = 58;
/** Панель «Комната недели» под сценой наезжает на её низ на 22 (как карточки под сценами Главной и «Сегодня»). */
export const SPIRE_SCENE_PANEL_OVERLAP = 22;
/** Пьедестал в панели «Комната недели»: блоки 96 / 86 / 84, монеты 40 / 32 / 32 заходят на блок на 47 %. */
export const SPIRE_SCENE_PODIUM = Object.freeze({
  blockH: Object.freeze([96, 86, 84] as const),
  coin: Object.freeze([40, 32, 32] as const),
  coinOverlap: 0.47,
});
/** Колонка башни эталона V2: 240 из 430, правый край на 6 за краем экрана; рисунок башни целиком стоит по её оси. */
const TOWER = Object.freeze({ w: 240, overRight: 6 });
/** Колонка текста слева: отступ эталона. */
export const SPIRE_SCENE_COPY_LEFT = 20;
/** Зазор между соседями в сетке (подпись — ряд — тело башни; текст — подписи), dp. */
const GAP = 2;
/** Поле над короной у верха сцены и зазор между низом 1-го этажа и верхом «Играть», dp. */
const TOP_GAP = 8;
const DOCK_GAP = 6;
/** Видимая часть сцены не меньше этого (низкие экраны): ниже низ башни уходит под «Играть», а масштаб не мельчает дальше, dp. */
export const SPIRE_SCENE_MIN_VISIBLE = 440;
/** Слова-подписи этажей в SVG башни: «СТРАЖ» и вершина — кегль 7,5 (у «НАД ОБЛАКАМИ» 11, он прячется вместе с ними). */
const LABEL_WORD_FONT = 7.5;
/** Мельче этого слова под номерами на сцене не рисуются — их не прочесть, номер этажа остаётся, dp. */
export const SPIRE_SCENE_WORD_MIN_DP = 4;

/** Ряд соперников (SpireTower RivalsLayer): монета 22 и шаг 13 в единицах башни, «+N» — 13 жирным, строка 17, рост шрифта до 1,3. */
const RIVAL = Object.freeze({ coin: 22, step: 13, maxCoins: 2, textGap: 5, font: 13, line: 17, maxFontScale: 1.3, charEm: 0.64 });
/** Подписи этажей в SVG башни (SpireTowerSvg): номер — центр 14, кегль 14; «СТРАЖ» — центр 20, кегль 7,5, разрядка 0,5, заглавные. */
const LABEL = Object.freeze({ numX: 14, numDigitW: 8.4, guardX: 20, guardCharW: 5.9, guardSpacing: 0.5 });

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

/** Видимая под шапкой «Сообщества» высота экрана до верха закреплённой «Играть» (dockClear — от низа экрана до верха кнопки), dp. */
export function spireSceneVisibleH(windowH: number, topInset: number, dockClear: number): number {
  return windowH - Math.max(SPIRE_SCENE_HEADER_MIN, SPIRE_SCENE_HEADER_CONTENT + Math.max(0, topInset)) - Math.max(0, dockClear);
}

export type SpireSceneFrame = Readonly<{
  /** Высота сцены: до низа рисунка башни (подножие уходит под «Играть», ниже — «Комната недели»), dp. */
  sceneH: number;
  /** Ширина рисунка башни и её окна, dp. */
  towerW: number;
  /** Левый край окна башни на сцене, dp. */
  towerLeft: number;
  /** Масштаб рисунка башни (ширина окна / 390). */
  scale: number;
  windowTop: number;
  windowH: number;
  /** Ряды соперников с центром ниже этой высоты над низом окна прячутся; на высокой сцене их нечем закрыть — 0. */
  rowsClearBottom: number;
  /** Ширина колонки текста: до подписей этажей, dp. */
  copyW: number;
  /** Слова под номерами этажей мельче 4 dp — на сцене не рисуются. */
  wordsHidden: boolean;
  /** Сколько знаков слова «страж» учитывает сетка: 0, когда слова не рисуются. */
  guardChars: number;
}>;

/** Слова-подписи этажей при этом масштабе мельче 4 dp: не рисуются (их не прочесть), номер этажа остаётся. */
export function spireSceneWordsHidden(scale: number): boolean {
  return scale * LABEL_WORD_FONT < SPIRE_SCENE_WORD_MIN_DP;
}

/**
 * Высокая сцена Пика (владелец 22.10: «Сцена выше, башня крупнее»): башня целиком — от верха границы короны лиги (headroom: острие,
 * навершие, ореол и поле — spire_tower_bounds) до низа 1-го этажа, который стоит над верхом «Играть»; подножие уходит под кнопку.
 * Масштаб — колонки эталона V2 (240 из 430), меньше — только если иначе башня не встаёт в видимую часть экрана.
 */
export function spireSceneFrame(i: Readonly<{ width: number; visibleH: number; fontScale: number; guardChars: number; headroom: number }>): SpireSceneFrame {
  const colW = (TOWER.w * i.width) / SPIRE_SCENE_BASE_W;
  const colLeft = i.width + TOWER.overRight - colW;
  const f1 = SPIRE_TOWER_GEOM.floors[0];
  const floor1Bottom = f1.y + f1.h;
  const crownTop = SPIRE_TOWER_GEOM.top - Math.max(0, i.headroom);
  const visible = Math.max(SPIRE_SCENE_MIN_VISIBLE, i.visibleH);
  const fit = Math.min(colW / SPIRE_TW, (visible - TOP_GAP - DOCK_GAP) / (floor1Bottom - crownTop));
  const towerW = Math.floor(SPIRE_TW * fit);
  const scale = towerW / SPIRE_TW;
  const floor1Y = visible - DOCK_GAP;
  const windowTop = floor1Y - (floor1Bottom - crownTop) * scale;
  const windowBottom = floor1Y + (SPIRE_TOWER_GEOM.height - floor1Bottom) * scale;
  const towerLeft = Math.round(colLeft + (colW - towerW) / 2);
  const wordsHidden = spireSceneWordsHidden(scale);
  const guardChars = wordsHidden ? 0 : i.guardChars;
  const labelLeftX = towerLeft + spireSceneLabelLeft(guardChars) * scale;
  return {
    sceneH: Math.ceil(windowBottom),
    towerW,
    towerLeft,
    scale,
    windowTop,
    windowH: windowBottom - windowTop,
    rowsClearBottom: 0,
    copyW: Math.floor(labelLeftX - GAP - SPIRE_SCENE_COPY_LEFT),
    wordsHidden,
    guardChars,
  };
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

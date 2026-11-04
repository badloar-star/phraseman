// peak_tour_core.ts — чистая логика тура первого входа в Пик (утверждён владельцем 04.11, макет peak-tour-2026-11-04/peak_tour_B.html).
// зачем: геометрия «окон» в затемнении, стрелки «поднимаются» у топ-5 и выбор текстов вынесены из экрана — их можно проверить без телефона.
// Окна считаются от ИЗМЕРЕННЫХ прямоугольников экрана Пика (а не от зашитых dp макета), поэтому тур совпадает с экраном на любом размере телефона.
import type { SpireGameStringKey } from '../spire_game_strings';

export type PeakTourRect = Readonly<{ x: number; y: number; width: number; height: number }>;
/** Измеренные в координатах окна блоки экрана: шапка (этаж + пилюля), пилюля, башня, строки топ-5. null — блок не измерился. */
export type PeakTourRects = Readonly<{ head: PeakTourRect | null; pill: PeakTourRect | null; rail: PeakTourRect | null; top: PeakTourRect | null }>;
/** soft — окно большое/декоративное (башня): карточке можно его перекрыть; hard — то, о чём говорит текст (строки топ-5, шапка, пилюля): карточка не должна его закрывать. */
export type PeakTourHole = PeakTourRect & Readonly<{ radius: number; soft?: boolean }>;
export type PeakTourPage = 0 | 1 | 2;
export const PEAK_TOUR_PAGES = 3;
/** Запас окна вокруг блока, dp (макет: окно чуть шире блока). */
export const PEAK_TOUR_HOLE_PAD = 8;
/** Высота «верхушки» башни, подсвечиваемой на 3-й странице (макет: 120 dp). */
export const PEAK_TOUR_RAIL_TOP_HEIGHT = 120;
export const PEAK_TOUR_ARROW_SIZE = 18;

export const peakTourPage = (n: number): PeakTourPage => {
  const r = Math.round(Number.isFinite(n) ? n : 0);
  return r <= 0 ? 0 : r >= 2 ? 2 : 1;
};

type Origin = Readonly<{ x: number; y: number }>;

function hole(rect: PeakTourRect | null, origin: Origin, radius: number, soft = false): PeakTourHole | null {
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;
  const pad = PEAK_TOUR_HOLE_PAD;
  return { x: rect.x - origin.x - pad, y: rect.y - origin.y - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, radius, soft };
}

/**
 * Окна затемнения страницы тура (макет): 1 — этаж и пилюля; 2 — вся башня и пилюля; 3 — строки топ-5 и верхушка башни.
 * origin — левый верхний угол окна-оверлея в координатах окна (на Android с полупрозрачной строкой состояния он может отличаться от нуля).
 */
export function peakTourHoles(page: PeakTourPage, rects: PeakTourRects, origin: Origin): readonly PeakTourHole[] {
  const railTop = rects.rail ? { ...rects.rail, height: Math.min(rects.rail.height, PEAK_TOUR_RAIL_TOP_HEIGHT) } : null;
  const list = page === 0
    ? [hole(rects.head, origin, 22)]
    : page === 1
      ? [hole(rects.rail, origin, 26, true), hole(rects.pill, origin, 14)]
      : [hole(rects.top, origin, 22), hole(railTop, origin, 26, true)];
  return list.filter((h): h is PeakTourHole => h !== null);
}

/** Стрелки «поднимаются» (3-я страница): по одной слева от каждой из первых `upCount` строк топ-5, по центру строки. */
export function peakTourArrows(rects: PeakTourRects, rowCount: number, upCount: number, origin: Origin): readonly Origin[] {
  const top = rects.top;
  if (!top || !(top.height > 0) || rowCount <= 0 || upCount <= 0) return [];
  const rowH = top.height / rowCount;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < Math.min(upCount, rowCount); i += 1) {
    out.push({ x: Math.max(2, top.x - origin.x - PEAK_TOUR_ARROW_SIZE - 4), y: top.y - origin.y + i * rowH + rowH / 2 - PEAK_TOUR_ARROW_SIZE / 2 });
  }
  return out;
}

/** Ключи заголовка и текста страницы: в режиме монет — «…Coins» (макет), в режиме ступеней — прежние. */
export function peakTourKeys(page: PeakTourPage, rankBy: 'steps' | 'coins'): Readonly<{ title: SpireGameStringKey; text: SpireGameStringKey }> {
  const coins = rankBy === 'coins';
  if (page === 0) return { title: 'tour1Title', text: coins ? 'tour1TextCoins' : 'tour1Text' };
  if (page === 1) return { title: 'tour2Title', text: 'tour2Text' };
  return { title: coins ? 'tour3TitleCoins' : 'tour3Title', text: coins ? 'tour3TextCoins' : 'tour3Text' };
}

/** Ключ флага «тур показан»: стираемое семейство story_events_v1: (cloud_sync WIPE_ONLY_ACCOUNT_KEY_PREFIXES), по аккаунту. */
export const PEAK_TOUR_KEY_PREFIX = 'story_events_v1:peak_tour';
export const peakTourKey = (owner: string): string => `${PEAK_TOUR_KEY_PREFIX}:${owner}`;

export const PEAK_TOUR_CARD_GAP = 12;
export const PEAK_TOUR_CARD_EDGE = 16;
export type PeakTourCardPlacement = Readonly<{ top: number; where: 'bottom' | 'below' | 'above' | 'overlap' }>;

/**
 * Где поставить карточку тура (ревизор 04.11: на 375×667 / крупном шрифте / длинном языке карточка закрывала подсвеченные строки топ-5).
 * Правило: у нижнего края экрана, если она не закрывает «жёсткие» окна; иначе НАД самым верхним жёстким окном, если там хватает места;
 * иначе остаётся внизу (перекрытие неизбежно — where: 'overlap', экран пишет в журнал). «Мягкие» окна (башня) карточка может перекрывать.
 */
export function peakTourCardPlacement(i: Readonly<{ holes: readonly PeakTourHole[]; screenHeight: number; cardHeight: number; insetTop: number; insetBottom: number }>): PeakTourCardPlacement {
  const bottomTop = i.screenHeight - Math.max(i.insetBottom, 12) - PEAK_TOUR_CARD_EDGE - i.cardHeight;
  const hard = i.holes.filter((h) => !h.soft);
  if (hard.length === 0) return { top: bottomTop, where: 'bottom' };
  const lowest = Math.max(...hard.map((h) => h.y + h.height));
  const highest = Math.min(...hard.map((h) => h.y));
  if (bottomTop >= lowest + PEAK_TOUR_CARD_GAP) return { top: bottomTop, where: 'bottom' };
  const aboveTop = highest - PEAK_TOUR_CARD_GAP - i.cardHeight;
  if (aboveTop >= i.insetTop + PEAK_TOUR_CARD_EDGE) return { top: aboveTop, where: 'above' };
  return { top: bottomTop, where: 'overlap' };
}

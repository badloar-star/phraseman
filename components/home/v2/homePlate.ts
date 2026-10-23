// зачем: приказ владельца 11.10 19:2x (через координатора 14.10) — «блок Сегодня — задник прозрачным, и все остальные элементы — прозрачность 50 процентов»,
// ВСЯ Главная, ВО ВСЕХ темах. Плашки Главной красятся ФОНОМ с альфой 0.5 (альфа цвета, а НЕ opacity всего элемента — текст, значки и картинки остаются
// 100 %). Общий хук стекла остальных экранов не меняется: остальные экраны остаются как были, а у Главной свой вариант.
import { useEffect, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import { plateBoxShadow, raisedBoxShadow, useShadowGlass } from '../../v2/ShadowSurface';
import type { BoxShadowValue } from 'react-native';

/** Прозрачность фона плашек Главной (приказ владельца). */
export const HOME_PLATE_ALPHA = 0.5;

/**
 * зачем (светлая тема, решение координатора п.69, 15.10): при заливке 50 % (приказ владельца — альфу не трогаем) край плашки на светлом фоне почти не виден
 * (разница светлоты 1,2–1.9 из 3 нужных), поэтому в светлой теме усиливаем ТЕНЬ плашек Главной в 1,35 раза (альфа цвета тени, не размер).
 */
export const HOME_LIGHT_SHADOW_BOOST = 1.35;
/** Альфа цвета #RRGGBBAA × factor (не выше FF); другой формат — как есть. Одна математика для boxShadow и масок тени сцены. */
export function boostColorAlpha(color: string, factor: number): string {
  const m = /^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})$/.exec(color);
  if (!m) return color;
  const alpha = Math.min(255, Math.round(parseInt(m[2]!, 16) * factor));
  return `#${m[1]}${alpha.toString(16).padStart(2, '0').toUpperCase()}`;
}
export function boostShadowAlpha(layers: readonly BoxShadowValue[], factor: number): BoxShadowValue[] {
  return layers.map((layer) => (typeof layer.color === 'string' && /^#[0-9A-Fa-f]{8}$/.test(layer.color) ? { ...layer, color: boostColorAlpha(layer.color, factor) } : layer));
}

/** Цвет → rgba с альфой плашек Главной (по умолчанию 0.5). */
export const homeAlpha = (color: string, alpha: number = HOME_PLATE_ALPHA): string => colorWithAlpha(color, alpha);

/** Цвет фона плашки Главной: цвет плашки темы («Тень») с альфой 0.5. raised — приподнятые строки внутри блока. */
export function homePlateFill(g: Pick<GlassTokens, 'plateFillFrom' | 'raisedFillFrom'>, raised = false): string {
  return homeAlpha(raised ? g.raisedFillFrom : g.plateFillFrom, HOME_PLATE_ALPHA);
}

/**
 * Стиль плашки Главной: полупрозрачный фон + мягкая внешняя тень «Тени» (внутрь плашки тень не заходит — она снаружи; блика и дымки (V2 sheen) нет).
 * raised — для строк внутри «Сегодня».
 */
export function useHomePlateStyle(raised = false): ViewStyle {
  const g = useShadowGlass();
  return useMemo(() => ({
    backgroundColor: homePlateFill(g, raised),
    boxShadow: g.isLight
      ? boostShadowAlpha(raised ? raisedBoxShadow(g) : plateBoxShadow(g), HOME_LIGHT_SHADOW_BOOST)
      : (raised ? raisedBoxShadow(g) : plateBoxShadow(g)),
    overflow: 'hidden',
  }), [g, raised]);
}

/** Один раз на показ Главной: тема, светлая ли, насыщенность и итоговая заливка плашки (для сверки кадра с логом). */
export function useHomePlateLog(): void {
  const g = useShadowGlass();
  useEffect(() => {
    console.log(`[HOME-PLATE] mount isLight=${String(g.isLight)} level=${g.level} intensity=${String(g.intensity)} bgAlpha=${HOME_PLATE_ALPHA} plate=${homePlateFill(g)} raised=${homePlateFill(g, true)} source=${g.plateFillFrom}/${g.raisedFillFrom} todayCard=no-fill sheen=off`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: «один раз на маунт»
  }, []);
}

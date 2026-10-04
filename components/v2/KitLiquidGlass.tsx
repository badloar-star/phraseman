import React, { memo } from 'react';
import { StyleSheet, View, type BoxShadowValue } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';

/**
 * «Жидкое стекло» макетов 2.0 — один в один с docs/design/v2-app/kit.css (блок «LIQUID GLASS»):
 *   --lg-sheen: linear-gradient(150deg, белый .10 → .035 → 0 → .02 → .055)
 *   --lg-rim:   inset 1px 1.5px 0 -.2px белый .22, inset -1px -1.5px 0 -.2px чёрный .45, inset 0 0 0 1px белый .055
 *   --lg-drop:  0 10px 28px -12px чёрный .7 (только крупные поверхности: карточки, шторки, панели)
 *
 * зачем (владелец 04.10, сверка «только 100%»): в макетах КАЖДАЯ карточка, пилюля, круглая кнопка и вариант
 * ответа — стекло с бликом по верхне-левой кромке и тёмной нижней (толщина стекла), а в приложении они были
 * плоскими. Слой ложится поверх заливки, но ПОД содержимым (ставить первым ребёнком), ничего не перекрывает.
 * Статично: ноль работы после первого кадра (без размытия — Android BlurView даёт артефакты).
 */

// зачем: CSS 150deg = направление вниз-вправо (sin150, cos150 по оси Y вниз) → точки начала/конца в долях блока.
const SHEEN_START = { x: 0.25, y: 0.067 } as const;
const SHEEN_END = { x: 0.75, y: 0.933 } as const;
const SHEEN_COLORS = [
  'rgba(255,255,255,0.10)',
  'rgba(255,255,255,0.035)',
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.02)',
  'rgba(255,255,255,0.055)',
] as const;
const SHEEN_LOCATIONS = [0, 0.26, 0.52, 0.78, 1] as const;

export const KIT_GLASS_RIM: BoxShadowValue[] = [
  { inset: true, offsetX: 1, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: 'rgba(255,255,255,0.22)' },
  { inset: true, offsetX: -1, offsetY: -1.5, blurRadius: 0, spreadDistance: -0.2, color: 'rgba(0,0,0,0.45)' },
  { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: 'rgba(255,255,255,0.055)' },
];

/** Тень крупных поверхностей (`--lg-drop`). Ставить на САМ контейнер: `boxShadow: KIT_GLASS_DROP`. */
export const KIT_GLASS_DROP: BoxShadowValue[] = [
  { offsetX: 0, offsetY: 10, blurRadius: 28, spreadDistance: -12, color: 'rgba(0,0,0,0.7)' },
];

/** Главная белая кнопка (`.cta`): светлее сверху, блик по верхней кромке, тень снизу. */
export const KIT_CTA_GRADIENT = ['#FFFFFF', '#F2F1F6', '#E3E2E8'] as const;
export const KIT_CTA_GRADIENT_LOCATIONS = [0, 0.48, 1] as const;
export const KIT_CTA_SHADOW: BoxShadowValue[] = [
  { inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,1)' },
  { inset: true, offsetX: 0, offsetY: -1.5, blurRadius: 0, spreadDistance: 0, color: 'rgba(0,0,0,0.10)' },
  { offsetX: 0, offsetY: 10, blurRadius: 26, spreadDistance: -10, color: 'rgba(0,0,0,0.75)' },
];

/**
 * Слой стекла: блик + кромка. Первым ребёнком контейнера с `overflow: 'hidden'` и тем же скруглением.
 * `rim={false}` — только блик (для элементов, у которых своя цветная кромка, например «верно/неверно»).
 */
export const KitGlassLayer = memo(function KitGlassLayer({ radius, rim = true }: { radius: number; rim?: boolean }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <LinearGradient
        colors={SHEEN_COLORS}
        locations={SHEEN_LOCATIONS}
        start={SHEEN_START}
        end={SHEEN_END}
        style={StyleSheet.absoluteFill}
      />
      {rim ? <View style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: KIT_GLASS_RIM }]} /> : null}
    </View>
  );
});

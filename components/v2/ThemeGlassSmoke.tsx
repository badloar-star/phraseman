import React, { memo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';

type Props = {
  glass: Pick<GlassTokens, 'level' | 'cardSmoke' | 'isLight'>;
  /** Скругление карточки: слой обрезает СЕБЯ по нему (контейнер без overflow, чтобы не резать тень). */
  radius: number;
};

const solid = (hex: string) => (hex.length === 9 ? hex.slice(0, 7) : hex);
const opacityOf = (hex: string) => (hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : 1);

let smokeSeq = 0;

/**
 * Цветная дымка ВНУТРИ стеклянной карточки — только уровень «Максимум» (темы 2.0).
 * Макет themes-v2-proposals (.vv .ph .card): пятно цвета темы от левого верхнего угла и
 * второе, второго оттенка, от правого нижнего. Кладётся первым ребёнком карточки поверх её
 * непрозрачной заливки — стекло остаётся непрозрачным, дымка лишь подкрашивает его.
 * Статично: ноль работы после первого кадра; в «Спокойно» и «Акценте» не рисуется вовсе.
 */
export const ThemeGlassSmoke = memo(function ThemeGlassSmoke({ glass, radius }: Props) {
  // id градиента уникален на экземпляр: у SVG общее пространство имён id.
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) idRef.current = `lgsmoke${smokeSeq++}`;
  if (glass.level !== 'max' || !glass.cardSmoke) return null;
  // зачем (приказ владельца 14.10: «тёмные пятна в светлых темах проявляются на белом»): цветная дымка на белой плашке всегда темнее неё
  // (серо-голубое пятно в углу). Правило светлых тем — внутри плашки ничего темнее неё, поэтому в светлом оформлении дымка не рисуется. Тёмные темы без изменений.
  if (glass.isLight) return null;
  const [a, b] = glass.cardSmoke;
  const id = idRef.current;
  return (
    // зачем (проверка в эмуляторе 30.09): у карточек есть padding, а width="100%" у Svg считался от
    // области БЕЗ отступов — дымка ложилась прямоугольником с жёсткими краями, не доходя до правого
    // и нижнего края. Обёртка absoluteFill без отступов даёт Svg полный размер карточки.
    // зачем (владелец 18.10 «слева сверху и справа снизу торчит острый угол»): пятна лежат в углах, а Rect квадратный — без скругления слоя
    // за круглой карточкой торчали квадратные уголки цвета темы. Обрезаем СВОЮ обёртку тем же радиусом, тень контейнера не трогаем.
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id={`${id}a`} cx="0%" cy="0%" rx="95%" ry="120%" fx="0%" fy="0%">
          <Stop offset="0" stopColor={solid(a)} stopOpacity={opacityOf(a)} />
          <Stop offset="0.62" stopColor={solid(a)} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}b`} cx="100%" cy="100%" rx="80%" ry="100%" fx="100%" fy="100%">
          <Stop offset="0" stopColor={solid(b)} stopOpacity={opacityOf(b)} />
          <Stop offset="0.7" stopColor={solid(b)} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}a)`} />
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}b)`} />
    </Svg>
    </View>
  );
});

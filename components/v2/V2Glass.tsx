import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from '../SafeLinearGradient';
import { useV2Palette } from './useV2Palette';
import { nestedBoxShadow, plateBoxShadow, raisedBoxShadow, useShadowGlass } from './ShadowSurface';
import { colorWithAlpha } from './plateAlpha';
import { logPlateToneOnce, plateToneFor } from './plateTone';
import { useTheme } from '../ThemeContext';

/**
 * «Дымка» стекла — вторая серия референсов владельца 24.09 («вот такую
 * прозрачность»). В каждой карточке примера лежит мягкое размытое светлое
 * пятно, у каждой карточки — в своём месте (строки Lay / Claim / Convince,
 * «Продолжить», «Словарь»…). Ровный диагональный перелив это НЕ передаёт —
 * первая попытка владелец отверг: «это не то».
 *
 * Рецепт: тихий вертикальный перелив (верх чуть светлее) + одно большое
 * радиальное пятно тёплого света, положение которого задаёт seed.
 * Статично: ноль работы после первого кадра.
 */
const SMOKE_SPOTS: ReadonlyArray<Readonly<{ cx: string; cy: string; r: string; o: number }>> = [
  { cx: '62%', cy: '38%', r: '58%', o: 0.1 },
  { cx: '30%', cy: '70%', r: '62%', o: 0.08 },
  { cx: '78%', cy: '20%', r: '55%', o: 0.09 },
  { cx: '48%', cy: '55%', r: '66%', o: 0.07 },
  { cx: '18%', cy: '28%', r: '52%', o: 0.08 },
];

let smokeId = 0;

export const V2GlassSheen = memo(function V2GlassSheen({ seed = 0 }: { seed?: number }) {
  const p = useV2Palette();
  const shadowGlass = useShadowGlass();
  const { liquidGlassThemeId } = useTheme();
  // зачем (приказ владельца 14.10: «тёмные пятна в светлых темах проявляются на белом»): в светлых темах дымка только белая и без усиления,
  // тёмные темы — как задала палитра. Лог [PLATE-TONE] — один раз на сочетание тема/оформление/уровень/насыщенность.
  const tone = plateToneFor(shadowGlass, p);
  React.useEffect(() => {
    logPlateToneOnce(liquidGlassThemeId, shadowGlass, p, tone);
  }, [liquidGlassThemeId, shadowGlass, p]); // eslint-disable-line react-hooks/exhaustive-deps -- tone выводится из shadowGlass и p
  // id градиента уникален на экземпляр: у SVG общее пространство имён id.
  const idRef = React.useRef(`v2smoke${smokeId++}`);
  const spot = SMOKE_SPOTS[Math.abs(Math.trunc(seed)) % SMOKE_SPOTS.length]!;
  // зачем (темы 2.0): в «Максимуме» дымка цвета темы заметнее (smokeBoost), в остальных — как было.
  const o = Math.min(0.5, spot.o * tone.smokeBoost);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[p.sheenFrom, p.sheenTo]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={idRef.current} cx={spot.cx} cy={spot.cy} r={spot.r} fx={spot.cx} fy={spot.cy}>
            <Stop offset="0" stopColor={tone.smoke} stopOpacity={o} />
            <Stop offset="0.55" stopColor={tone.smoke} stopOpacity={o * 0.35} />
            <Stop offset="1" stopColor={tone.smoke} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${idRef.current})`} />
      </Svg>
    </View>
  );
});

/**
 * Стиль карточки: плашка стиля «Тень» — заливка и тень из токенов темы, БЕЗ обводки (владелец 12.10, «второй вариант делаем»).
 * Выбранное/главное (`raised`) — заливка raised и большая тень; сдвиг вверх делает хозяин через transform (высота ряда не меняется).
 */
export function useV2GlassStyle(raised = false): ViewStyle {
  const g = useShadowGlass();
  return {
    backgroundColor: raised ? g.raisedFillFrom : g.plateFillFrom,
    boxShadow: raised ? raisedBoxShadow(g) : plateBoxShadow(g),
    overflow: 'hidden',
  };
}

type IconTileProps = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  iconSize?: number;
  /** 'square' — скруглённый квадрат (строки списков), 'circle' — круг. */
  shape?: 'square' | 'circle';
  style?: StyleProp<ViewStyle>;
  /** Абсолютная альфа фона плитки (0..1). Нет — как раньше (непрозрачный). Только фон: значок остаётся 100 %. Нужен Главной (приказ владельца 11.10 19:2x). */
  bgAlpha?: number;
};

/** Стеклянная плашка со значком тёплого оттенка — как у строк референса. */
export const V2IconTile = memo(function V2IconTile({ name, size = 44, iconSize = 22, shape = 'square', style, bgAlpha }: IconTileProps) {
  const p = useV2Palette();
  const g = useShadowGlass();
  const radius = shape === 'circle' ? size / 2 : Math.round(size * 0.3);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bgAlpha === undefined ? p.glassRaised : colorWithAlpha(p.glassRaised, bgAlpha),
          boxShadow: nestedBoxShadow(g), // стиль «Тень»: вложенная плитка — малая тень, без кольца
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={bgAlpha === undefined ? [p.tileFrom, p.tileTo] : [colorWithAlpha(p.tileFrom, bgAlpha), colorWithAlpha(p.tileTo, bgAlpha)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name={name} size={iconSize} color={p.iconTint} />
    </View>
  );
});

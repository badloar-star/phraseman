import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from '../SafeLinearGradient';
import { useV2Palette } from './useV2Palette';

/**
 * Перелив стекла (владелец 24.09, вторая серия референсов: «чтобы не казалось
 * бедным — вот такую прозрачность»). Кладётся первым ребёнком в карточку с
 * overflow: 'hidden' и полупрозрачной заливкой p.glass: светлый угол сверху-слева
 * гаснет к низу-справа, сквозь карточку видны пятна света фона.
 * Статичный градиент — ноль работы после первого кадра.
 */
export const V2GlassSheen = memo(function V2GlassSheen() {
  const p = useV2Palette();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[p.sheenFrom, p.sheenTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
});

/** Стиль стеклянной карточки: полупрозрачная заливка + светлая кромка. */
export function useV2GlassStyle(raised = false): ViewStyle {
  const p = useV2Palette();
  return {
    backgroundColor: raised ? p.glassRaised : p.glass,
    borderColor: p.stroke,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43 кромка стекла
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
};

/** Стеклянная плашка со значком тёплого оттенка — как у строк референса. */
export const V2IconTile = memo(function V2IconTile({ name, size = 44, iconSize = 22, shape = 'square', style }: IconTileProps) {
  const p = useV2Palette();
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
          backgroundColor: p.glassRaised,
          borderColor: p.stroke,
          borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <V2GlassSheen />
      <Ionicons name={name} size={iconSize} color={p.iconTint} />
    </View>
  );
});

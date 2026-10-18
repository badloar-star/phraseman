// ═══════════════════════════════════════════════════════════════════════════
// HomeV2SeeAllButton.tsx — кнопка-иконка «Смотреть все» у заголовков блоков Главной (Видео, Сегодня).
//
// зачем (прямая просьба владельца через координатора 18.10): вместо текстовой ссылки «Смотреть все» — круглая кнопка без текста: плитка тоном buttonFill,
// шеврон Ionicons 20 цветом text. Зона нажатия 44×44 (круг 32 внутри), без обводки; отделение от фона — тоном buttonFill (≥ 1,5 к фону Главной во всех
// 138 сочетаниях тем, сторож tests/home_see_all_button.test.ts) и мягкой тенью. Название для читалки — «Смотреть все» (accessibilityLabel, 9 языков у вызывающего).
// Строка заголовка не прыгает: зона 44 уравнена отрицательными отступами до прежней высоты строки (rowHeight), круг выступает за строку симметрично.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { nestedBoxShadow, useShadowGlass } from '../../v2/ShadowSurface';

/** Видимый круг и зона нажатия. */
export const HOME_SEE_ALL_CIRCLE = 32;
export const HOME_SEE_ALL_HIT = 44;
export const HOME_SEE_ALL_ICON = 20;

export type HomeV2SeeAllButtonProps = Readonly<{
  /** Подпись для читалки («Смотреть все»). */
  label: string;
  onPress: () => void;
  /** Высота строки заголовка, в которой стоит кнопка: зона 44 не должна её растягивать. */
  rowHeight: number;
  testID?: string;
}>;

function HomeV2SeeAllButtonBase({ label, onPress, rowHeight, testID }: HomeV2SeeAllButtonProps) {
  const g = useShadowGlass();
  const extra = Math.max(0, HOME_SEE_ALL_HIT - rowHeight);
  const marginTop = -Math.floor(extra / 2);
  const marginBottom = -Math.ceil(extra / 2);
  return (
    <Pressable
      testID={testID ?? 'home-v2-see-all'}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={0}
      style={[s.hit, { marginTop, marginBottom }]}
    >
      {({ pressed }) => (
        <View style={[s.circle, { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) }, pressed ? s.pressed : null]}>
          <Ionicons name="chevron-forward" size={HOME_SEE_ALL_ICON} color={g.text} />
        </View>
      )}
    </Pressable>
  );
}
export const HomeV2SeeAllButton = memo(HomeV2SeeAllButtonBase);
export default HomeV2SeeAllButton;

const s = StyleSheet.create({
  // круг 32 по центру зоны 44; правый край круга ровно на прежней линии ссылки (зона выступает на 6 вправо)
  hit: { width: HOME_SEE_ALL_HIT, height: HOME_SEE_ALL_HIT, alignItems: 'center', justifyContent: 'center', marginRight: -(HOME_SEE_ALL_HIT - HOME_SEE_ALL_CIRCLE) / 2 },
  circle: { width: HOME_SEE_ALL_CIRCLE, height: HOME_SEE_ALL_CIRCLE, borderRadius: HOME_SEE_ALL_CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.85 },
});

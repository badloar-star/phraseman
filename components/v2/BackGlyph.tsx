import React, { memo } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';

/**
 * Значок «назад» приложения — один на все экраны.
 *
 * зачем (слово владельца 17.10 через координатора: «у кнопки назад вообще-то есть ассет — его надо поставить; должна быть проверена работоспособность во всех местах»):
 * в приложении было ~67 мест с системной стрелкой Ionicons (`chevron-back` 61, `arrow-back` 6) разной толщины и размера. Растрового значка «назад» в проекте нет
 * (папка assets/images/header_glyphs/theme-accent-buttons пуста, в истории git там только значки «почта» и «видео» июня 2026), а макеты рисуют его контуром:
 * docs/design/v2-app/kit.js `back` = `M15 5l-7 7 7 7`, толщина 1,8, скругление концов (kit.css `svg.i`). Здесь тот же контур, рисуется react-native-svg:
 * размер и цвет приходят от места использования (как у Ionicons — замена один в один по сигнатуре), цвет берёт тема, толщина масштабируется вместе с размером.
 */
type BackGlyphProps = Readonly<{
  size?: number;
  color: string;
  /** Толщина в единицах сетки 24 (макет — 1,8). */
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityElementsHidden?: boolean;
}>;

/** Контур макета (kit.js `back`). Экспортируется для сторожа: контур не должен разъехаться с эталоном. */
export const BACK_GLYPH_PATH = 'M15 5l-7 7 7 7';

function BackGlyphBase({ size = 22, color, strokeWidth = 1.8, style }: BackGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} accessibilityElementsHidden importantForAccessibility="no">
      <Path d={BACK_GLYPH_PATH} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const BackGlyph = memo(BackGlyphBase);
export default BackGlyph;

/** Имена системных стрелок «назад», которые заменяет общий значок. */
export const BACK_ICON_NAMES: readonly string[] = ['chevron-back', 'chevron-back-outline', 'arrow-back', 'arrow-back-outline'];

export const isBackIconName = (name: string | undefined): boolean => name !== undefined && BACK_ICON_NAMES.includes(name);

type NavIconProps = Readonly<{
  name: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Значок кнопки по имени: «назад» — общий контур, всё остальное — Ionicons как было.
 * Нужен общим китам, куда имя значка приходит пропом (`icon="chevron-back"`): так одна правка покрывает все их экраны.
 */
export function NavIcon({ name, size = 22, color, style }: NavIconProps) {
  if (isBackIconName(name)) return <BackGlyph size={size} color={color} style={style} />;
  return <Ionicons name={name} size={size} color={color} style={style as never} />;
}

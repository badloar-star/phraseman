/**
 * PremiumCard — объёмная карточка в стиле high-end hardware UI.
 *
 * Логика объёма:
 *   • Внешний View несёт тень (тёмная / светящаяся в зависимости от темы).
 *   • LinearGradient имитирует освещение: сверху-слева чуть светлее, снизу-справа темнее.
 *   • Граница сверху и слева — светлый highlight (имитация блика от источника света).
 *   • Граница снизу и справа — тёмная (тень).
 *
 * Props:
 *   onPress      — если передан, карточка интерактивна (TouchableOpacity)
 *   level        — глубина рельефа: 1 (тонкий) | 2 (стандартный) | 3 (максимальный)
 *   active       — подсвечивает рамку цветом correct (для «выбрано» / «верно»)
 *   style        — стиль внешнего контейнера
 *   innerStyle   — стиль LinearGradient (padding и т.п.)
 *   borderRadius — радиус скругления (по умолчанию 16)
 */
import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticTap } from '../hooks/use-haptics';
import { useTheme, getVolumetricShadow } from './ThemeContext';

interface PremiumCardProps {
  children:     React.ReactNode;
  onPress?:     () => void;
  activeOpacity?: number;
  style?:       ViewStyle;
  innerStyle?:  ViewStyle;
  level?:       1 | 2 | 3;
  active?:      boolean;
  disabled?:    boolean;
  borderRadius?: number;
  testID?: string;
  accessibilityLabel?: string;
  accessible?: boolean;
}

export default function PremiumCard({
  children,
  onPress,
  activeOpacity = 0.85,
  style,
  innerStyle,
  level = 2,
  active = false,
  disabled = false,
  borderRadius = 16,
  testID,
  accessibilityLabel,
  accessible,
}: PremiumCardProps) {
  const { theme: t, themeMode } = useTheme();

  const shadow = getVolumetricShadow(themeMode, t, level);

  const outerStyle: ViewStyle = {
    borderRadius,
    opacity: disabled ? 0.48 : 1,
    ...shadow,
    ...(style || {}),
  };

  const gradientStyle: ViewStyle = {
    borderRadius,
    // Асимметричные рамки: сверху-слева = блик, снизу-справа = тень
    borderTopWidth:    0.5,
    borderLeftWidth:   0.5,
    borderRightWidth:  0.5,
    borderBottomWidth: 0.5,
    borderTopColor:    active ? t.correct : t.borderHighlight,
    borderLeftColor:   active ? t.correct : t.borderHighlight,
    borderRightColor:  active ? t.correct : t.border,
    borderBottomColor: active ? t.correct : t.border,
    ...(innerStyle || {}),
  };

  const content = (
    <LinearGradient
      colors={t.cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={gradientStyle}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    const handlePress = () => {
      hapticTap();
      onPress();
    };
    return (
      <TouchableOpacity
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessible={accessible !== undefined ? accessible : !!(testID || accessibilityLabel)}
        style={outerStyle}
        onPress={handlePress}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={outerStyle}>{content}</View>;
}

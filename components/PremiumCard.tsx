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
import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { hapticTap } from '../hooks/use-haptics';
import { useTheme, getVolumetricShadow } from './ThemeContext';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS } from '../constants/goldTheme';
import GoldBevel from './GoldBevel';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS } from '../constants/compassTheme';

interface PremiumCardProps {
  children:     React.ReactNode;
  onPress?:     () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
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

function PremiumCard({
  children,
  onPress,
  onLongPress,
  delayLongPress,
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
  const longPressFiredRef = React.useRef(false);
  const isGoldTheme = themeMode === 'gold';
  const isCompassTheme = false;
  const effectiveBorderRadius = isGoldTheme && borderRadius === 16
    ? 14
    : isCompassTheme && borderRadius === 16
      ? 10
      : borderRadius;

  const shadow = getVolumetricShadow(themeMode, t, level);

  const disabledOpacity = 0.48;
  const outerStyle: ViewStyle = {
    borderRadius: effectiveBorderRadius,
    opacity: disabled ? disabledOpacity : 1,
    ...shadow,
    ...(style || {}),
  };

  const gradientStyle: ViewStyle = {
    borderRadius: effectiveBorderRadius,
    // Асимметричные рамки: сверху-слева = блик, снизу-справа = тень
    borderTopWidth:    0,
    borderLeftWidth:   0,
    borderRightWidth:  0,
    borderBottomWidth: 0,
    borderTopColor:    isGoldTheme ? (active ? GOLD_RICH.champagne : GOLD_RICH.hairlineStrong) : isCompassTheme ? (active ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.edgeLight) : active ? t.correct : t.borderHighlight,
    borderLeftColor:   isGoldTheme ? (active ? GOLD_RICH.paleGold : GOLD_RICH.hairline) : isCompassTheme ? (active ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairline) : active ? t.correct : t.borderHighlight,
    borderRightColor:  isGoldTheme ? (active ? GOLD_RICH.antiqueGold : GOLD_RICH.hairlineQuiet) : isCompassTheme ? (active ? COMPASS_RICH.edgeSoft : COMPASS_RICH.hairlineQuiet) : active ? t.correct : t.border,
    borderBottomColor: isGoldTheme ? (active ? GOLD_RICH.bronze : GOLD_RICH.hairlineDark) : isCompassTheme ? COMPASS_RICH.edgeShade : active ? t.correct : t.border,
    ...(isCompassTheme ? { overflow: 'hidden' as const } : null),
    ...(innerStyle || {}),
  };

  const content = (
    <LinearGradient
      colors={isGoldTheme
        ? (active ? GOLD_GRADIENTS.selectedTile : GOLD_GRADIENTS.premiumPanel)
        : isCompassTheme
          ? (active ? COMPASS_GRADIENTS.selectedTile : COMPASS_GRADIENTS.raisedTile)
          : t.cardGradient}
      locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={gradientStyle}
    >
      {isGoldTheme && <GoldBevel radius={effectiveBorderRadius} intensity={active ? 'strong' : level >= 2 ? 'normal' : 'quiet'} />}
      {isCompassTheme && (
        <CompassDepthSurface
          radius={effectiveBorderRadius}
          selected={active}
          quiet={level <= 1}
          cream={active}
        />
      )}
      {children}
    </LinearGradient>
  );

  if (onPress) {
    const handlePress = () => {
      if (longPressFiredRef.current) {
        longPressFiredRef.current = false;
        return;
      }
      hapticTap();
      onPress();
    };
    const handleLongPress = onLongPress
      ? () => {
          longPressFiredRef.current = true;
          hapticTap();
          onLongPress();
        }
      : undefined;
    return (
      <TouchableOpacity
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessible={accessible !== undefined ? accessible : !!(testID || accessibilityLabel)}
        style={outerStyle}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={delayLongPress}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={outerStyle}>{content}</View>;
}

export default memo(PremiumCard);

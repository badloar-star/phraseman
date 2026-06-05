import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { GOLD_GRADIENTS, GOLD_RICH, goldShadow } from '../../constants/goldTheme';
import GoldBevel from '../GoldBevel';
import CompassDepthSurface from '../CompassDepthSurface';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS, compassShadow } from '../../constants/compassTheme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export default function PrimaryButton({ label, onPress, disabled, loading, style }: PrimaryButtonProps) {
  const { theme: t, f, ds, themeMode } = useTheme();
  const isDisabled = !!disabled || !!loading;
  const isGoldTheme = themeMode === 'gold';
  const isCompassTheme = themeMode === 'compass';
  const hasLuxuryGradient = !isDisabled && (isGoldTheme || isCompassTheme);
  const foreground = isGoldTheme && !isDisabled
    ? t.textOnGold
    : isCompassTheme && !isDisabled
      ? COMPASS_RICH.textDark
    : t.correctText;
  const radius = isCompassTheme ? 9 : ds.radius.lg;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.9}
      style={[
        styles.button,
        isGoldTheme && !isDisabled ? goldShadow(2) : isCompassTheme && !isDisabled ? compassShadow(2) : ds.shadow.soft,
        {
          minHeight: ds.buttonHeight,
          borderRadius: radius,
          backgroundColor: isDisabled || !hasLuxuryGradient ? (isDisabled ? t.bgSurface2 : t.accent) : 'transparent',
          borderTopWidth: hasLuxuryGradient ? 1 : 0,
          borderLeftWidth: hasLuxuryGradient ? 1 : 0,
          borderRightWidth: hasLuxuryGradient ? StyleSheet.hairlineWidth : 0,
          borderBottomWidth: hasLuxuryGradient ? 1 : 0,
          borderColor: isDisabled ? t.border : isCompassTheme ? COMPASS_RICH.hairlineStrong : GOLD_RICH.hairlineStrong,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {isGoldTheme && !isDisabled && (
        <LinearGradient
          colors={GOLD_GRADIENTS.primaryButton}
          locations={[0, 0.34, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {isCompassTheme && !isDisabled && (
        <LinearGradient
          colors={COMPASS_GRADIENTS.primaryButton}
          locations={COMPASS_SURFACE_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {isGoldTheme && !isDisabled && <GoldBevel radius={ds.radius.lg} intensity="strong" />}
      {isCompassTheme && !isDisabled && <CompassDepthSurface radius={radius} cream />}
      <Text style={{ color: foreground, fontSize: f.bodyLg, fontWeight: hasLuxuryGradient ? '800' : '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { GOLD_GRADIENTS, GOLD_RICH, goldShadow } from '../../constants/goldTheme';
import GoldBevel from '../GoldBevel';

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
  const hasLuxuryGradient = !isDisabled && isGoldTheme;
  const foreground = isGoldTheme && !isDisabled
    ? t.textOnGold
    : t.correctText;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.9}
      style={[
        styles.button,
        isGoldTheme && !isDisabled ? goldShadow(2) : ds.shadow.soft,
        {
          minHeight: ds.buttonHeight,
          borderRadius: ds.radius.lg,
          backgroundColor: isDisabled || !hasLuxuryGradient ? (isDisabled ? t.bgSurface2 : t.accent) : 'transparent',
          borderTopWidth: hasLuxuryGradient ? 1 : 0,
          borderLeftWidth: hasLuxuryGradient ? 1 : 0,
          borderRightWidth: hasLuxuryGradient ? StyleSheet.hairlineWidth : 0,
          borderBottomWidth: hasLuxuryGradient ? 1 : 0,
          borderColor: isDisabled ? t.border : GOLD_RICH.hairlineStrong,
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
      {isGoldTheme && !isDisabled && <GoldBevel radius={ds.radius.lg} intensity="strong" />}
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

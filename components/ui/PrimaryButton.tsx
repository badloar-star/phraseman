import React, { memo } from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { GOLD_GRADIENTS, GOLD_RICH, goldShadow } from '../../constants/goldTheme';
import { OLIVE_GRADIENTS, OLIVE_RICH, oliveShadow } from '../../constants/oliveTheme';
import GoldBevel from '../GoldBevel';
import PressableScale from '../PressableScale';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

function PrimaryButton({ label, onPress, disabled, loading, style }: PrimaryButtonProps) {
  const { theme: t, f, ds, themeMode } = useTheme();
  const isDisabled = !!disabled || !!loading;
  const isGoldTheme = themeMode === 'gold';
  const isOliveTheme = themeMode === 'olive';
  const hasLuxuryGradient = !isDisabled && (isGoldTheme || isOliveTheme);
  const foreground = isOliveTheme && isDisabled
    ? t.textMuted
    : (isGoldTheme || isOliveTheme) && !isDisabled
    ? (isOliveTheme ? OLIVE_RICH.piano : t.textOnGold)
    : t.correctText;
  const radius = ds.radius.lg;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      busy={loading}
      variant="primary"
      style={styles.pressable}
      contentStyle={[
        styles.button,
        isGoldTheme && !isDisabled ? goldShadow(2) : isOliveTheme && !isDisabled ? oliveShadow(2) : ds.shadow.soft,
        {
          minHeight: ds.buttonHeight,
          borderRadius: radius,
          backgroundColor: isDisabled || !hasLuxuryGradient ? (isDisabled ? t.bgSurface2 : t.accent) : 'transparent',
          borderTopWidth: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderColor: isDisabled ? t.border : GOLD_RICH.hairlineStrong,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {hasLuxuryGradient && (
        <LinearGradient
          colors={isOliveTheme ? OLIVE_GRADIENTS.primaryButton : GOLD_GRADIENTS.primaryButton}
          locations={isGoldTheme ? [0, 0.34, 1] : undefined}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {isGoldTheme && !isDisabled && <GoldBevel radius={ds.radius.lg} intensity="strong" />}
      <Text style={{ color: foreground, fontSize: f.bodyLg, fontWeight: hasLuxuryGradient ? '800' : '700' }}>{label}</Text>
    </PressableScale>
  );
}

export default memo(PrimaryButton);

const styles = StyleSheet.create({
  pressable: { width: '100%' },
  button: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

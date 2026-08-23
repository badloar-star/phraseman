import React, { memo } from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { GOLD_GRADIENTS, GOLD_RICH, goldShadow } from '../../constants/goldTheme';
import { OLIVE_GRADIENTS, OLIVE_RICH, oliveShadow } from '../../constants/oliveTheme';
import GoldBevel from '../GoldBevel';
import DuoPressable from '../DuoPressable';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

// зачем: владелец 2026-08-16 — GoldBevel рисовал фальшивую «подошву» градиентом
// ВНУТРИ лица, а физика нажатия (PressableScale) сжимала весь блок целиком —
// кромка ужималась вместе с лицом и читалась как второй слой под кнопкой.
// Перевели на DuoPressable: настоящая статичная подошва ниже лица + лицо едет
// вниз на edgeHeight, GoldBevel остаётся чисто декоративным бликом на лице.
function PrimaryButton({ label, onPress, disabled, loading, style, accessibilityLabel, accessibilityHint }: PrimaryButtonProps) {
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
  const edgeColor = isDisabled
    ? t.shadowDark
    : isGoldTheme
    ? GOLD_RICH.bronzeDark
    : isOliveTheme
    ? OLIVE_RICH.piano
    : t.shadowDark;

  return (
    <DuoPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      edgeColor={edgeColor}
      edgeHeight={5}
      wrapStyle={styles.pressable}
      style={[
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
    </DuoPressable>
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

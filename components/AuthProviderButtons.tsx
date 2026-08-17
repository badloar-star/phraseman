// ════════════════════════════════════════════════════════════════════════════
// AuthProviderButtons.tsx — готовые Sign-In кнопки Google и Apple.
//
// Стили следуют официальным гайдлайнам:
//   • Google: белый фон + чёрный текст + цветной логотип (light variant).
//     Альтернативно — чёрный фон + белый текст + белый монохром логотипа (dark).
//     Вариант выбирается через prop `variant`.
//   • Apple: чёрный фон + белый текст + белое яблоко (стандарт Apple HIG).
//
// Размер: 56pt height, full-width, rounded 14.
// Не модифицировать брендинг — это требование review process.
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { GoogleIcon, AppleIcon, GoogleIconMono } from './AuthProviderIcons';
import { softShadow } from '../constants/androidGlow';

const HEIGHT = 56;
const RADIUS = 14;
// зачем: онбординг по макету Bevel рисует кнопки входа таблетками 58/30; остальные
// экраны остаются на прежней геометрии 56/14 — форма выбирается пропом shape.
const PILL_HEIGHT = 58;
const PILL_RADIUS = 30;

interface ProviderButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Текст кнопки. Локализуется на стороне вызывающего. */
  label: string;
  /** 'default' — 56/14 (как везде), 'pill' — таблетка 58/30 (онбординг Bevel). */
  shape?: 'default' | 'pill';
}

interface GoogleButtonProps extends ProviderButtonProps {
  /** 'light' = белый фон (для светлого UI), 'dark' = тёмный фон (для тёмного UI). */
  variant?: 'light' | 'dark';
}

export function GoogleSignInButton({ onPress, loading, disabled, label, variant = 'light', shape = 'default' }: GoogleButtonProps) {
  const isDark = variant === 'dark';
  const bg = isDark ? '#1F1F1F' : '#FFFFFF';
  const fg = isDark ? '#FFFFFF' : '#1F1F1F';
  const border = isDark ? '#3A3A3A' : '#DADCE0';
  const isPill = shape === 'pill';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        isPill && styles.pill,
        // Белая таблетка на светлом фоне — мягкая тень вместо обводки.
        isPill && !isDark && styles.pillLightShadow,
        { backgroundColor: bg, borderColor: border, borderWidth: 0},
        (loading || disabled) && styles.disabled,
      ]}
      testID="auth-google-button"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : isDark ? (
          <GoogleIconMono size={20} color={fg} />
        ) : (
          <GoogleIcon size={20} />
        )}
      </View>
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {/* Spacer чтобы текст был визуально по центру, компенсируя ширину иконки слева */}
      <View style={styles.iconWrap} />
    </TouchableOpacity>
  );
}

export function AppleSignInButton({ onPress, loading, disabled, label, shape = 'default' }: ProviderButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        shape === 'pill' && styles.pill,
        { backgroundColor: '#000000', borderColor: '#000000', borderWidth: 0},
        (loading || disabled) && styles.disabled,
      ]}
      testID="auth-apple-button"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <AppleIcon size={22} color="#FFFFFF" />}
      </View>
      <Text style={[styles.label, { color: '#FFFFFF' }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.iconWrap} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: HEIGHT,
    borderRadius: RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    width: '100%',
  },
  pill: {
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
  },
  pillLightShadow: {
    ...softShadow({ color: '#0C111B', radius: 10, opacity: 0.08, offsetY: 3, backgroundColor: '#FFFFFF' }),
  },
  disabled: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});

export default { GoogleSignInButton, AppleSignInButton };

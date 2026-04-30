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

const HEIGHT = 56;
const RADIUS = 14;

interface ProviderButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Текст кнопки. Локализуется на стороне вызывающего. */
  label: string;
}

interface GoogleButtonProps extends ProviderButtonProps {
  /** 'light' = белый фон (для светлого UI), 'dark' = тёмный фон (для тёмного UI). */
  variant?: 'light' | 'dark';
}

export function GoogleSignInButton({ onPress, loading, disabled, label, variant = 'light' }: GoogleButtonProps) {
  const isDark = variant === 'dark';
  const bg = isDark ? '#1F1F1F' : '#FFFFFF';
  const fg = isDark ? '#FFFFFF' : '#1F1F1F';
  const border = isDark ? '#3A3A3A' : '#DADCE0';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor: border, borderWidth: 1 },
        (loading || disabled) && styles.disabled,
      ]}
      testID="auth-google-button"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator color={fg} />
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

export function AppleSignInButton({ onPress, loading, disabled, label }: ProviderButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        { backgroundColor: '#000000', borderColor: '#000000', borderWidth: 1 },
        (loading || disabled) && styles.disabled,
      ]}
      testID="auth-apple-button"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <AppleIcon size={22} color="#FFFFFF" />}
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

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

import React, { useEffect } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { GoogleIcon, AppleIcon, GoogleIconMono } from './AuthProviderIcons';
import { softShadow } from '../constants/androidGlow';
import { appleButtonColors, type AppleButtonVariant } from './auth_apple_button_style'; // зачем: стиль Apple по фону места (координатор 13.10)

const HEIGHT = 56;
const RADIUS = 14;
// зачем: онбординг по макету Bevel рисует кнопки входа таблетками 58/30; остальные
// экраны остаются на прежней геометрии 56/14 — форма выбирается пропом shape.
const PILL_HEIGHT = 58;
const PILL_RADIUS = 30;
// зачем (overlays.html `.ov-provider` + `.cta`): в шторке входа кнопки 54 высотой и радиусом 24. Меняется только
// геометрия — логотип Google на белом и чёрная кнопка Apple остаются по фирменным правилам (проверка в сторах).
const SHEET_HEIGHT = 54;
const SHEET_RADIUS = 24;

interface ProviderButtonProps {
  onPress: () => void;
  loading?: boolean;
  /** Подпись для экранного диктора, пока идёт вход (на экране текста нет - только индикатор на кнопке). */
  busyLabel?: string;
  disabled?: boolean;
  /** Текст кнопки. Локализуется на стороне вызывающего. */
  label: string;
  /** 'default' — 56/14 (как везде), 'pill' — таблетка 58/30 (онбординг Bevel), 'sheet' — 54/24 (шторка входа 2.0). */
  shape?: 'default' | 'pill' | 'sheet';
}

interface GoogleButtonProps extends ProviderButtonProps {
  /** 'light' = белый фон (для светлого UI), 'dark' = тёмный фон (для тёмного UI). */
  variant?: 'light' | 'dark';
}


export function GoogleSignInButton({ onPress, loading, disabled, label, busyLabel, variant = 'light', shape = 'default' }: GoogleButtonProps) {
  const isDark = variant === 'dark';
  const bg = isDark ? '#1F1F1F' : '#FFFFFF'; // theme-exempt: брендовые цвета кнопок входа (Google/Apple и др.)
  const fg = isDark ? '#FFFFFF' : '#1F1F1F'; // theme-exempt: брендовые цвета кнопок входа (Google/Apple и др.)
  const border = isDark ? '#3A3A3A' : '#DADCE0'; // theme-exempt: брендовые цвета кнопок входа (Google/Apple и др.)
  const isPill = shape === 'pill';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        isPill && styles.pill,
        shape === 'sheet' && styles.sheet,
        // Белая таблетка на светлом фоне — мягкая тень вместо обводки.
        isPill && !isDark && styles.pillLightShadow,
        { backgroundColor: bg, borderColor: border, borderWidth: 0},
        (loading || disabled) && styles.disabled,
      ]}
      testID="auth-google-button"
      accessibilityRole="button"
      accessibilityLabel={loading && busyLabel ? busyLabel : label}
      accessibilityState={{ busy: !!loading, disabled: !!(loading || disabled) }}
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

export function AppleSignInButton({ onPress, loading, disabled, label, busyLabel, shape = 'default', variant = 'light' }: ProviderButtonProps & { variant?: AppleButtonVariant }) {
  const colors = appleButtonColors(variant);
  useEffect(() => {
    if (__DEV__) console.log(`[AUTH-APPLE-BTN] variant=${variant} background=${colors.background} shape=${shape}`); // guard-ok: одна строка на монтирование
  }, [variant, shape, colors.background]);
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        shape === 'pill' && styles.pill,
        shape === 'sheet' && styles.sheet,
        { backgroundColor: colors.background, borderWidth: 0 },
        (loading || disabled) && styles.disabled,
      ]}
      testID="auth-apple-button"
      accessibilityRole="button"
      accessibilityLabel={loading && busyLabel ? busyLabel : label}
      accessibilityState={{ busy: !!loading, disabled: !!(loading || disabled) }}
    >
      <View style={styles.iconWrap}>
        {loading ? <ActivityIndicator size="small" color={colors.ink} /> : <AppleIcon size={22} color={colors.ink} />}
      </View>
      <Text style={[styles.label, { color: colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.iconWrap} />
    </TouchableOpacity>
  );
}

/** Высота кнопки входа по форме — для резерва места до ответа о доступности провайдера. */
export const AUTH_PROVIDER_BUTTON_HEIGHT: Readonly<Record<'default' | 'pill' | 'sheet', number>> = {
  default: HEIGHT,
  pill: PILL_HEIGHT,
  sheet: SHEET_HEIGHT,
};

/**
 * Невидимая заглушка ровно под кнопку входа.
 *
 * зачем (TG-AA6EC9A6D998, Performance Bible «первый кадр = финальная геометрия»):
 * доступность Apple на iOS приходит асинхронно; без заглушки кнопка «вставлялась»
 * вторым кадром и сдвигала всё ниже. Заглушка не видна, не нажимается и не читается
 * экранным диктором — она только держит высоту.
 */
export function AuthProviderButtonPlaceholder({ shape = 'default', testID }: { shape?: 'default' | 'pill' | 'sheet'; testID?: string }) {
  return (
    <View
      testID={testID ?? 'auth-provider-button-placeholder'}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ height: AUTH_PROVIDER_BUTTON_HEIGHT[shape], width: '100%' }}
    />
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
  sheet: {
    height: SHEET_HEIGHT,
    borderRadius: SHEET_RADIUS,
  },
  pillLightShadow: {
    ...softShadow({ color: '#0C111B', radius: 10, opacity: 0.08, offsetY: 3, backgroundColor: '#FFFFFF' }), // theme-exempt: брендовые цвета кнопок входа (Google/Apple и др.)
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

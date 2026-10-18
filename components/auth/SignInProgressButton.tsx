// ═══════════════════════════════════════════════════════════════════════════
// SignInProgressButton.tsx — кнопка «Войти через Google / Apple» с живым откликом на нажатие.
//
// зачем (координатор 18.10, приоритет владельца «все ресурсы на вход»; макет docs/design/v2-app/auth-states.html, блок 2): вход длится секунды, и человек
// должен сразу видеть, что тап принят. Нажатая кнопка: на месте значка тонкое кольцо, надпись остаётся, размер не меняется (54, радиус 27), кнопка в полную
// силу и не нажимается повторно. Остальные кнопки и элементы окна на это время приглушены до 38 % (`dimmed`) и тоже не нажимаются — это решает вызывающий.
// Отклик ставится на том же тапе, до любого ответа (Optimistic UI): busy приходит от окна входа синхронно с setLoadingProvider.
// Брендовые цвета и значки — по правилам Google/Apple (значок Google цветной на светлой кнопке; Apple — белая на тёмной шторке, чёрная на светлой).
// Не заменяет AuthProviderButtons (его использует онбординг) — подключает Авторизация.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { AppleIcon, GoogleIcon } from '../AuthProviderIcons';
import { appleButtonColors } from '../auth_apple_button_style';
import { googleButtonPaintForSurface } from '../auth_google_button_style';

export type SignInProgressProvider = 'google' | 'apple';

export type SignInProgressButtonProps = Readonly<{
  provider: SignInProgressProvider;
  /** Подпись кнопки («Войти через Google»); остаётся и во время входа. */
  label: string;
  /** Подпись для читалки, пока идёт вход. */
  busyLabel?: string;
  /** Вход идёт именно этим способом: кольцо на месте значка, кнопка в полную силу, не нажимается. */
  busy?: boolean;
  /** Идёт вход другим способом: кнопка приглушена до 38 % и не нажимается. */
  dimmed?: boolean;
  /** Яркость шторки: тёмная → Apple белая, светлая → Apple чёрная (как в AuthProviderButtons). */
  surface: 'dark' | 'light';
  /** Цвет шторки под кнопкой (glass.opaqueSheet): Google всегда белая с цветной G; на светлой шторке её отделяет тонкая линия (hairline) — [BLEND-AUTH], кнопки не сливаются. */
  sheetColor: string;
  onPress: () => void;
  testID?: string;
}>;

/** Приглушённое состояние из макета: `.dim { opacity: .38 }`, переход 200 мс. */
export const SIGN_IN_DIM_OPACITY = 0.38;
const DIM_MS = 200;
const BUTTON_HEIGHT = 54;

type BrandLook = Readonly<{ background: string; ink: string; mono: boolean; shadow: ReadonlyArray<Record<string, unknown>> }>;

const SHADOW_DROP = [{ offsetX: 0, offsetY: 10, blurRadius: 24, spreadDistance: -14, color: 'rgba(0,0,0,0.55)' }];
const SHADOW_LIT = [{ offsetX: 0, offsetY: 1, blurRadius: 0, color: '#FFFFFF', inset: true }, ...SHADOW_DROP];

// зачем: цвета те же, что у AuthProviderButtons (бренд Google/Apple) и у сторожа контраста blend_auth_1018 — кнопки не сливаются со шторкой ни в одном из 138 сочетаний тем
function brandLook(provider: SignInProgressProvider, surface: 'dark' | 'light', sheetColor: string): BrandLook {
  if (provider === 'google') {
    // зачем (Макеты A1.1, координатор 18.10): эталон auth-states — белая Google с цветной G во всех темах; тёмная #1F1F1F рядом с чёрной Apple давала две чёрные кнопки подряд.
    // Где белая заливка не отделяется от шторки — тонкая линия 1 px (внутреннее кольцо, размер кнопки не меняется) и тень; альфу линии считает googleButtonPaintForSurface под ЭТУ шторку.
    const paint = googleButtonPaintForSurface(sheetColor);
    const edgeRing = paint.edge ? [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: paint.edge, inset: true }] : [];
    return { background: '#FFFFFF', ink: '#1F1F1F', mono: false, shadow: paint.edge ? [...edgeRing, ...SHADOW_DROP] : SHADOW_LIT }; // theme-exempt: брендовая светлая кнопка Google
  }
  const colors = appleButtonColors(surface === 'dark' ? 'dark' : 'light');
  return { background: colors.background, ink: colors.ink, mono: true, shadow: SHADOW_DROP };
}

function SignInProgressButton({ provider, label, busyLabel, busy = false, dimmed = false, surface, sheetColor, onPress, testID }: SignInProgressButtonProps) {
  const reduceMotion = useReduceMotion();
  const look = brandLook(provider, surface, sheetColor);
  const opacity = useSharedValue(dimmed ? SIGN_IN_DIM_OPACITY : 1);

  useEffect(() => {
    // зачем: приглушение — плавно (200 мс, кривая «ящика»), при «Меньше движения» — сразу
    opacity.value = withTiming(dimmed ? SIGN_IN_DIM_OPACITY : 1, { duration: reduceMotion ? 0 : DIM_MS, easing: Easing.bezier(0.23, 1, 0.32, 1) });
  }, [dimmed, opacity, reduceMotion]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const inert = busy || dimmed;
  const handlePress = () => {
    if (inert) {
      console.log('[AUTH-PROGRESS-UI] button tap ignored', JSON.stringify({ provider, busy, dimmed })); // guard-ok: ранний выход называет причину
      return;
    }
    hapticTap();
    onPress();
  };

  return (
    <Animated.View style={dimStyle}>
      <Pressable
        testID={testID ?? `sign-in-progress-${provider}`}
        accessibilityRole="button"
        accessibilityLabel={busy && busyLabel ? busyLabel : label}
        accessibilityState={{ busy, disabled: inert }}
        disabled={inert}
        onPress={handlePress}
        style={({ pressed }) => [s.button, { backgroundColor: look.background, boxShadow: look.shadow as never }, pressed && !inert ? s.pressed : null]}
      >
        <View style={s.iconSlot}>
          {busy ? (
            <ActivityIndicator testID="sign-in-progress-ring" size="small" color={look.ink} />
          ) : provider === 'google' ? (
            <GoogleIcon size={20} />
          ) : (
            <AppleIcon size={20} color={look.ink} />
          )}
        </View>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[s.label, { color: look.ink }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default memo(SignInProgressButton);

// макет `.prov`: высота 54, радиус 27, зазор 10, текст 16/700; значок 20
const s = StyleSheet.create({
  button: { height: BUTTON_HEIGHT, borderRadius: BUTTON_HEIGHT / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  iconSlot: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.98 }] },
});

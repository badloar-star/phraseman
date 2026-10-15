// VoiceAllowanceBadge.tsx — пилюля-цифра «осталось голосовых попыток сегодня» в правом верхнем углу кнопки микрофона (макет D194, learning-v2-voice-limit.html).
// зачем (решение владельца D194, 15.10): остаток виден ДО нажатия; 0 → «PLUS» (тап ведёт на пейвол); при списании цифра «тикает» (масштаб 1 → 1,25 → 1, 420 мс).
// Размеры текста по D145 (< 19 только 13 и 16): цифра 16/20 вместо 15 в макете, «PLUS» 13 вместо 12. Цвета приходят от хоста (токены темы), своих цветов нет.
import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

export type VoiceAllowanceColors = Readonly<{
  /** Фон цифры (в тёмной теме — тёмная пилюля на светлом микрофоне). */
  fill: string;
  ink: string;
  /** Кольцо вокруг пилюли — цвет фона страницы (отделяет её от микрофона). */
  ring: string;
  plusFill: string;
  plusInk: string;
  /** Приглушённый микрофон при 0. */
  spentFill: string;
  spentInk: string;
}>;

export type VoiceAllowanceBadgeProps = Readonly<{
  /** Сколько попыток осталось; 0 и меньше — «PLUS». */
  remaining: number;
  colors: VoiceAllowanceColors;
  reduceMotion?: boolean;
  /** md — на большой кнопке (28 pt, цифра 16); sm — на малой кнопке в поле ввода диалогов (22 pt, цифра 13, D145: меньше 13 нельзя). */
  size?: 'md' | 'sm';
  testID?: string;
}>;

const TICK_UP_MS = 170;
const TICK_DOWN_MS = 250; // вместе 420 мс, как vbTick в макете
const EASE = Easing.bezier(0.3, 1.5, 0.5, 1);

function VoiceAllowanceBadge({ remaining, colors, reduceMotion = false, size = 'md', testID = 'voice-allowance-badge' }: VoiceAllowanceBadgeProps) {
  const prev = useRef(remaining);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion && remaining < prev.current) {
      scale.value = withSequence(withTiming(1.25, { duration: TICK_UP_MS, easing: EASE }), withTiming(1, { duration: TICK_DOWN_MS, easing: EASE }));
    }
    prev.current = remaining;
  }, [remaining, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const plus = remaining <= 0;
  return (
    <Reanimated.View
      pointerEvents="none"
      testID={testID}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        s.badge,
        size === 'sm' ? s.badgeSm : null,
        // кольцо вокруг пилюли — тень без размытия цвета фона страницы (в макете box-shadow 0 0 0 2px var(--bg)), не обводка
        { backgroundColor: plus ? colors.plusFill : colors.fill, boxShadow: `0 0 0 2px ${colors.ring}` },
        style,
      ]}
    >
      <Text style={[plus ? s.plusText : s.digit, size === 'sm' ? s.textSm : null, { color: plus ? colors.plusInk : colors.ink }]} testID={`${testID}-text`}>
        {plus ? 'PLUS' : String(remaining)}
      </Text>
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  // малая кнопка (поле ввода диалогов, макет .rbtn 52): пилюля 22, цифра 13 (в макете 12 — D145 запрещает меньше 13)
  badgeSm: { top: -5, right: -8, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11 },
  textSm: { fontSize: 13, lineHeight: 17 },
  digit: { fontSize: 16, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  plusText: { fontSize: 13, lineHeight: 20, fontWeight: '800', letterSpacing: 0.4 },
});

export default memo(VoiceAllowanceBadge);

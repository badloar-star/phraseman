import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { KitGlassLayer } from '../v2/KitLiquidGlass';

// зачем (владелец 2026-09-30): тренировки карточек переносятся 1 в 1 по макету practice.html
// (Liquid Glass). Шапка занятия (круглая «‹» 34 в области нажатия 44, заголовок 20/700,
// подзаголовок 15), пилюля таймера, круглая кнопка-иконка и отметка верно/неверно на ответе
// собраны здесь один раз для Блица / «Вспомни» / «Устно» / «Правда-Ложь». Только ВИД:
// логика квоты, энергии, оценки и наград остаётся в экранах. Обводки — только 1 px
// полупрозрачные (glassEdge), как в макете; цвета верно/неверно задаёт вызывающий.

export type PracticeGlass = ReturnType<typeof liquidGlassTokens>;

export const PRACTICE_TOUCH = 44;
export const PRACTICE_ROUND = 34;

const HIT = { top: 4, bottom: 4, left: 4, right: 4 } as const;

/** Круглая кнопка «‹» шапки занятия: круг 34 внутри области нажатия 44 dp. */
export function PracticeBackButton({
  glass, color, onPress, testID, accessibilityLabel, disabled, large = false,
}: {
  glass: PracticeGlass;
  color: string;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** зачем (practice.html `.hd .rb.l`): в шапке тренировки круг 48 — он сам больше области нажатия 44. */
  large?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      hitSlop={HIT}
      style={({ pressed }) => [styles.touch, large ? styles.touchLarge : null, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      <View style={[styles.round, large ? styles.roundLarge : null, { backgroundColor: glass.opaqueControl, borderColor: glass.glassEdge }]}>
        {/* зачем (сверка 04.10, kit.css `.rb::after`): круг — стекло с бликом и кромкой, а не плоский. */}
        <KitGlassLayer radius={large ? 24 : PRACTICE_ROUND / 2} />
        <Ionicons name="chevron-back" size={20} color={color} />
      </View>
    </Pressable>
  );
}

/** Круглая кнопка-иконка справа в шапке (выбор наборов и т. п.). */
export function PracticeRoundIconButton({
  glass, color, icon, onPress, testID, accessibilityLabel, disabled,
}: {
  glass: PracticeGlass;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={HIT}
      style={({ pressed }) => [styles.touch, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.round, { backgroundColor: glass.opaqueControl, borderColor: glass.glassEdge }]}>
        <KitGlassLayer radius={PRACTICE_ROUND / 2} />
        <Ionicons name={icon} size={18} color={color} />
      </View>
    </Pressable>
  );
}

/** Заголовок занятия 20/700 и необязательный подзаголовок 15 (`.hd .tt` / `.hd .su`). */
export function PracticeHeaderTitle({
  title, subtitle, glass, align = 'left', children,
}: {
  title: string;
  subtitle?: string;
  glass: PracticeGlass;
  align?: 'left' | 'center';
  /** Слот под подзаголовок (скелет или прокрутка длинного названия набора). */
  children?: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Text style={[styles.title, { color: glass.text }]}>{title}</Text>
      {children ?? (subtitle ? (
        <Text style={[styles.subtitle, { color: glass.secondary }]}>{subtitle}</Text>
      ) : null)}
    </View>
  );
}

/** Пилюля таймера в центре строки прогресса (`.pill.timer`): высота 38, 18/700. */
export function PracticeTimerPill({
  text, color, glass, testID,
}: {
  text: string;
  color: string;
  glass: PracticeGlass;
  testID?: string;
}) {
  return (
    <View style={[styles.timer, { backgroundColor: glass.opaqueControl }]}>
      {/* зачем (сверка 04.10, kit.css `.pill::after`): пилюля таймера — стекло, как в макете. */}
      <KitGlassLayer radius={19} />
      <Text testID={testID} style={[styles.timerText, { color }]}>{text}</Text>
    </View>
  );
}

/** Значок верно/неверно у правого края варианта ответа (`.opt .mk`). */
export function PracticeAnswerMark({ kind, color, style }: { kind: 'correct' | 'wrong'; color: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.mark, style]}>
      <Ionicons name={kind === 'correct' ? 'checkmark' : 'close'} size={20} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { width: PRACTICE_TOUCH, height: PRACTICE_TOUCH, alignItems: 'center', justifyContent: 'center' },
  round: {
    width: PRACTICE_ROUND, height: PRACTICE_ROUND, borderRadius: PRACTICE_ROUND / 2,
    alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  touchLarge: { width: 48, height: 48 },
  roundLarge: { width: 48, height: 48, borderRadius: 24 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  subtitle: { fontSize: 16, lineHeight: 22, marginTop: 2 },
  timer: { minHeight: 38, borderRadius: 19, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  timerText: { fontSize: 18, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }, // d145-mockup: cards-section.html .timer 18 (решение 4)
  mark: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
});

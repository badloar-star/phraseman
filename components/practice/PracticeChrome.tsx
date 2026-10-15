import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { KitGlassLayer } from '../v2/KitLiquidGlass';
import { nestedBoxShadow } from '../v2/ShadowSurface';

// зачем (владелец 2026-09-30): тренировки карточек переносятся 1 в 1 по макету practice.html
// (Liquid Glass). Шапка занятия (круглая «‹» 34 в области нажатия 44, заголовок 20/700,
// подзаголовок 15), пилюля таймера, круглая кнопка-иконка и отметка верно/неверно на ответе
// собраны здесь один раз для Блица / «Вспомни» / «Устно» / «Правда-Ложь». Только ВИД:
// логика квоты, энергии, оценки и наград остаётся в экранах. Обводок нет (стиль «Тень», владелец 12.10):
// круглая кнопка — плашка с малой тенью (nestedBoxShadow); цвета верно/неверно задаёт вызывающий.

export type PracticeGlass = ReturnType<typeof liquidGlassTokens>;

export const PRACTICE_TOUCH = 44;
export const PRACTICE_ROUND = 34;

const HIT = { top: 4, bottom: 4, left: 4, right: 4 } as const;

/** Круглая кнопка «‹» шапки занятия: круг 34 внутри области нажатия 44 dp. */
export function PracticeBackButton({
  glass, color, onPress, testID, accessibilityLabel, disabled, large = false, icon = 'chevron-back',
}: {
  glass: PracticeGlass;
  color: string;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** зачем (practice.html `.hd .rb.l`): в шапке тренировки круг 48 — он сам больше области нажатия 44. */
  large?: boolean;
  /** зачем (Карточки 2.0 12.10, cards-v2.html `sessHdr`): в сессиях Карточек вместо «‹» стоит ✕ (`close`); по умолчанию «‹», как у остальных занятий. */
  icon?: 'chevron-back' | 'close';
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
      <View style={[styles.round, large ? styles.roundLarge : null, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }]}>
        {/* зачем (сверка 04.10; «Тень» 12.10): круг — плашка с градиентом и малой тенью, без кромки. */}
        <KitGlassLayer radius={large ? 24 : PRACTICE_ROUND / 2} />
        <Ionicons name={icon} size={20} color={color} />
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
      <View style={[styles.round, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }]}>
        <KitGlassLayer radius={PRACTICE_ROUND / 2} />
        <Ionicons name={icon} size={18} color={color} />
      </View>
    </Pressable>
  );
}

/** Заголовок занятия 20/700 и необязательный подзаголовок 15 (`.hd .tt` / `.hd .su`). */
export function PracticeHeaderTitle({
  title, subtitle, glass, align = 'left', children, oneLine
}: {
  title: string;
  subtitle?: string;
  glass: PracticeGlass;
  align?: 'left' | 'center';
  /** Слот под подзаголовок (скелет или прокрутка длинного названия набора). */
  children?: React.ReactNode;
  /**
   * Короткий заголовок в одну строку по своей ширине: не сжимается и не переносится — место отдаёт правый блок шапки.
   * зачем (Сверка моментов v3, 15.10): с `flex: 1` у заголовка нулевая база, и «Урок 1» переносилось на две строки, как только справа
   * появлялось кольцо серии m08 — шапка прыгала. По умолчанию выключено: остальные 23 места не меняются.
   */
  oneLine?: boolean;
}) {
  return (
    <View style={oneLine
      ? { flexGrow: 1, flexShrink: 0, alignItems: align === 'center' ? 'center' : 'flex-start' }
      : { flex: 1, minWidth: 0, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Text numberOfLines={oneLine ? 1 : undefined} style={[styles.title, { color: glass.text }]}>{title}</Text>
      {children ?? (subtitle ? (
        <Text style={[styles.subtitle, { color: glass.secondary }]}>{subtitle}</Text>
      ) : null)}
    </View>
  );
}

/**
 * Шапка занятия одной строкой (practice.html `.hd`): круглая «‹» · заголовок (+подзаголовок) · справа сердца и монеты.
 * зачем (координатор 11.10, «дизайн везде»): swipe-сессия без макета стояла рыхлым стеком (сердца и монеты отдельной строкой
 * над «назад»); теперь та же шапка, что у Блица и «Вспомни», собрана один раз здесь. Действия и testID остаются у вызывающего.
 */
export function PracticeSessionHeader({
  glass, color, onBack, backLabel, backTestID, title, subtitle, children, tools, compact = false, backIcon,
}: {
  glass: PracticeGlass;
  color: string;
  onBack?: () => void;
  backLabel?: string;
  backTestID?: string;
  title: string;
  subtitle?: string;
  /** Вместо подзаголовка: произвольный слот под заголовком (например, отметка серии). */
  children?: React.ReactNode;
  /** Правая группа: сердца и счётчик монет (через 6). */
  tools?: React.ReactNode;
  compact?: boolean;
  /** Значок кнопки слева: «‹» по умолчанию, ✕ в сессиях Карточек 2.0. */
  backIcon?: 'chevron-back' | 'close';
}) {
  return (
    <View style={[styles.sessionHeader, compact ? styles.sessionHeaderCompact : null]}>
      <View style={{ marginRight: 6 }}>
        <PracticeBackButton large={!compact} glass={glass} color={color} onPress={onBack} testID={backTestID} accessibilityLabel={backLabel} icon={backIcon} />
      </View>
      <PracticeHeaderTitle glass={glass} title={title} subtitle={subtitle}>{children}</PracticeHeaderTitle>
      {tools ? <View style={styles.sessionTools}>{tools}</View> : null}
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
    alignItems: 'center', justifyContent: 'center', // зачем («Тень» 12.10): без overflow hidden — иначе обрежет тень круга; градиент уже со скруглением
  },
  touchLarge: { width: 48, height: 48 },
  roundLarge: { width: 48, height: 48, borderRadius: 24 },
  sessionHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  sessionHeaderCompact: { minHeight: 38 },
  sessionTools: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  subtitle: { fontSize: 16, lineHeight: 22, marginTop: 2 },
  timer: { minHeight: 38, borderRadius: 19, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  timerText: { fontSize: 16, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  mark: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
});

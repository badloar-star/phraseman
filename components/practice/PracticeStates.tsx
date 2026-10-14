import KitProgressFill from '../KitProgressFill';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { PracticeGlass } from './PracticeChrome';
import { KitCtaGloss, KitGlassLayer } from '../v2/KitLiquidGlass';
import { plateBoxShadow } from '../v2/ShadowSurface';

// зачем (владелец 2026-09-30, второй проход practice.html): служебные состояния тренировок
// (пусто / мало карточек / ошибка загрузки / данные тренировки не открылись), строка
// прогресса «a ─ таймер ─ b», карточка вопроса `.qc` и кнопка `.cta` макета собраны здесь
// один раз для Блица / «Вспомни» / «Устно» / Свайпа и «Правды-Лжи». Только ВИД: что
// нажатие делает, решает экран. Обводки — только 1 px полупрозрачные (glassEdge/line),
// как в макете; цифры строки прогресса передаёт экран — здесь ничего не выдумывается.

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface PracticeCtaProps {
  glass: PracticeGlass;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** `.cta .ar` — стрелка справа у «Продолжить». */
  trailingArrow?: boolean;
  /** `.cta.sm` — компактная кнопка по центру (служебные состояния). */
  size?: 'full' | 'small';
  icon?: IconName;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Главная кнопка макета: 48/24 (`.cta`) или 42/21 (`.cta.sm`); выключенная — `.cta.dis`. */
export function PracticeCta({
  glass, label, onPress, disabled, trailingArrow, size = 'full', icon, testID, accessibilityLabel, style,
}: PracticeCtaProps) {
  const small = size === 'small';
  const ink = disabled ? glass.mutedText : glass.ctaInk;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        small ? styles.ctaSmall : styles.cta,
        {
          backgroundColor: disabled ? glass.buttonFill : glass.cta,
          opacity: disabled ? 0.72 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {/* зачем (координатор 05.10): кнопка всегда цвета cta — глянец .cta макета в тёмных темах; в светлых cta тёмная, глянец не нужен. */}
      {!disabled && !glass.isLight ? <KitCtaGloss cta={glass.cta} radius={small ? 22 : 24} /> : null}
      {icon ? <Ionicons name={icon} size={18} color={ink} /> : null}
      <Text style={[small ? styles.ctaSmallText : styles.ctaText, { color: ink }]}>{label}</Text>
      {trailingArrow ? (
        <View pointerEvents="none" style={styles.ctaArrow}>
          <Ionicons name="arrow-forward" size={20} color={ink} />
        </View>
      ) : null}
    </Pressable>
  );
}

export interface PracticeStateAction {
  label: string;
  onPress: () => void;
  icon?: IconName;
  testID?: string;
  accessibilityLabel?: string;
}

export interface PracticeStatePanelProps {
  glass: PracticeGlass;
  icon: IconName;
  /** Заголовок 20/700 — только если он уже есть в экране (setupEmpty); сообщение тогда 15 вторичным. */
  title?: string;
  message: string;
  /** Цвет сообщения об ошибке — токен экрана (t.wrong); иначе основной текст. */
  messageColor?: string;
  action?: PracticeStateAction;
  testID?: string;
  children?: React.ReactNode;
}

/**
 * Служебное состояние по центру экрана (`setupEmpty` / `setupError` из cards.html):
 * плитка 61 со значком, сообщение 17/600, компактная кнопка 42. Прокрутка не нужна —
 * сообщение переносится; при крупном шрифте блок растёт вниз.
 */
export function PracticeStatePanel({
  glass, icon, title, message, messageColor, action, testID, children,
}: PracticeStatePanelProps) {
  return (
    <View testID={testID} style={styles.panel}>
      <View style={[styles.panelTile, { backgroundColor: glass.opaqueControl }]}>
        <Ionicons name={icon} size={26} color={glass.text} />
      </View>
      {title ? <Text accessibilityRole="header" style={[styles.panelTitle, { color: glass.text }]}>{title}</Text> : null}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            title ? styles.panelSub : styles.panelMessage,
            { color: messageColor ?? (title ? glass.secondary : glass.text) },
          ]}
        >
          {message}
        </Text>
      ) : null}
      {children}
      {action ? (
        <PracticeCta
          glass={glass}
          size="small"
          label={action.label}
          icon={action.icon}
          onPress={action.onPress}
          testID={action.testID}
          accessibilityLabel={action.accessibilityLabel}
          style={styles.panelAction}
        />
      ) : null}
    </View>
  );
}

export interface PracticeProgressRowProps {
  glass: PracticeGlass;
  /** Доля 0…1 — считает экран из реальных чисел. */
  progress: number;
  left?: string;
  right?: string;
  /** Узел по центру строки (пилюля таймера у Блица). */
  center?: React.ReactNode;
  fillColor?: string;
  testID?: string;
  leftTestID?: string;
  rightTestID?: string;
  /** Экран с собственными полями (Правда/Ложь) снимает внутренний отступ 16. */
  flush?: boolean;
}

/** Полоса 6 px + строка «a … b» под ней (`.trk` + `.prog`), 15/600 вторичным цветом. */
export function PracticeProgressRow({
  glass, progress, left, right, center, fillColor, testID, leftTestID, rightTestID, flush,
}: PracticeProgressRowProps) {
  const ratio = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const hasRow = left != null || right != null || center != null;
  return (
    <View testID={testID} style={flush ? null : styles.progressWrap}>
      <View style={[styles.track, { backgroundColor: glass.opaqueControl }]}>
        <KitProgressFill ratio={ratio} style={[styles.fill, { backgroundColor: fillColor ?? glass.cta }]} />
      </View>
      {hasRow ? (
        <View style={styles.progressRow}>
          <Text testID={leftTestID} style={[styles.progressLabel, { color: glass.secondary }]}>{left ?? ''}</Text>
          {center ?? null}
          <Text testID={rightTestID} style={[styles.progressLabel, styles.progressRight, { color: glass.secondary }]}>{right ?? ''}</Text>
        </View>
      ) : null}
    </View>
  );
}

export interface PracticeQuestionCardProps {
  glass: PracticeGlass;
  kicker?: string;
  children: React.ReactNode;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Карточка вопроса `.qc`: радиус 16, плашка с тенью без кромки, подпись 16 вторичным цветом над текстом. */
export function PracticeQuestionCard({
  glass, kicker, children, minHeight = 160, style, testID,
}: PracticeQuestionCardProps) {
  return (
    <View
      testID={testID}
      style={[styles.qc, { minHeight, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) }, style]}
    >
      {/* зачем (Сверка practice-001; «Тень» 12.10): карточка вопроса — плашка с градиентом и тенью, без кромки. */}
      <KitGlassLayer radius={16} />
      {kicker ? <Text style={[styles.qcKicker, { color: glass.secondary }]}>{kicker}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cta: {
    minHeight: 48, borderRadius: 24, width: '100%', paddingHorizontal: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  ctaSmall: {
    minHeight: 44, borderRadius: 22, paddingHorizontal: 18, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaSmallText: { fontSize: 16, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  ctaArrow: { position: 'absolute', right: 22, top: 0, bottom: 0, justifyContent: 'center' },
  panel: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 },
  panelTile: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  panelMessage: { marginTop: 18, fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  panelTitle: { marginTop: 18, fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  panelSub: { marginTop: 8, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  panelAction: { marginTop: 22 },
  progressWrap: { paddingHorizontal: 16 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { width: '100%', height: '100%', borderRadius: 3, transformOrigin: 'left' },
  progressRow: { minHeight: 22, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  progressLabel: { minWidth: 44, fontSize: 16, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  progressRight: { textAlign: 'right' },
  qc: {
    // зачем («Тень» 12.10): без overflow hidden — он обрезал бы тень плашки; слой стекла уже со скруглением
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 22, paddingHorizontal: 28,
  },
  qcKicker: { fontSize: 16, lineHeight: 21, textAlign: 'center' },
});

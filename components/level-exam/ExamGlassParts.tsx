import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { PracticeAnswerMark, type PracticeGlass } from '../practice/PracticeChrome';
import { SCREEN_BACK_SIZE, ScreenBackSlot, SafeTopBackButton } from '../v2/ScreenBackButton';
import { plateBoxShadow, raisedBoxShadow, RAISED_LIFT } from '../v2/ShadowSurface';

// зачем (владелец 2026-09-30): диагностика, зачёт уровня и финальный экзамен переносятся
// 1 в 1 по макету learn.html (Liquid Glass, блоки J/K/L). Общие детали — шапка, кольцо
// таймера, карточка «kv», плитка-герой, тройка цифр `.pc3`, вариант ответа `.opt` и
// подвал с кнопкой — собраны здесь один раз для трёх экранов. Только ВИД: логику
// ответов, таймеров, энергии и наград решают экраны. Обводок у контейнеров нет (стиль «Тень», владелец 12.10):
// плашку отделяют заливка и тень из components/v2/ShadowSurface; цвета верно/неверно передаёт экран (токены темы).

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CARD_RADIUS = 20;

/**
 * Шапка `.dhead`: «‹», заголовок 20/700 с подзаголовком 15, справа слот.
 * зачем (закон владельца 22.10 «назад в одном месте»): «‹» — общая кнопка экрана (SafeTopBackButton), а не своя; шапка всегда стоит
 * первым ребёнком под безопасным верхом (SafeAreaView / ContentWrap) — кнопка встаёт в общую точку, в строке остаётся её место.
 */
export function ExamHeader({
  glass, title, subtitle, onBack, backLabel, right, leading, testID, screen = 'exam',
}: {
  glass: PracticeGlass;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  /** Вместо круглой «‹» (например, текст «Отмена» при входе из онбординга). */
  leading?: React.ReactNode;
  testID?: string;
  /** Ключ экрана для журнала [BACK-BTN]. */
  screen?: string;
}) {
  const sharedBack = !leading && onBack;
  return (
    <>
    {sharedBack ? <SafeTopBackButton screen={screen} onPress={onBack} accessibilityLabel={backLabel} /> : null}
    <View testID={testID} style={[styles.header, sharedBack ? styles.headerWithBack : null]}>
      {leading ?? (sharedBack ? <ScreenBackSlot /> : null)}
      <View style={styles.headerText}>
        <Text style={[styles.headerTitle, { color: glass.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSub, { color: glass.secondary }]}>{subtitle}</Text> : null}
      </View>
      {right ?? null}
    </View>
    </>
  );
}

/** Пилюля `.pill.s`: значок + число (счётчик верных, таймер экзамена). */
export function ExamPill({
  glass, icon, text, color, testID,
}: { glass: PracticeGlass; icon: IconName; text: string; color?: string; testID?: string }) {
  const ink = color ?? glass.text;
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: glass.opaqueControl }]}>
      <Ionicons name={icon} size={16} color={ink} />
      <Text style={[styles.pillText, { color: ink }]}>{text}</Text>
    </View>
  );
}

/** Кольцо таймера `.tring` 56: дуга по доле оставшегося времени и число внутри. */
export function GlassTimerRing({
  glass, seconds, total, low, lowColor, testID,
}: { glass: PracticeGlass; seconds: number; total: number; low?: boolean; lowColor: string; testID?: string }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const stroke = low ? lowColor : glass.text;
  return (
    <View testID={testID} style={styles.ring} accessibilityRole="timer">
      <Svg width={56} height={56} viewBox="0 0 56 56" style={StyleSheet.absoluteFill}>
        <Circle cx={28} cy={28} r={r} fill="none" stroke={glass.opaqueControl} strokeWidth={4} />
        <Circle
          cx={28} cy={28} r={r} fill="none" stroke={stroke} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${c}`} strokeDashoffset={c * (1 - ratio)} rotation={-90} originX={28} originY={28}
        />
      </Svg>
      <Text style={[styles.ringText, { color: low ? lowColor : glass.text }]}>{Math.max(0, seconds)}</Text>
    </View>
  );
}

/** Полоса прогресса `.trk` 6 px. */
export function ExamTrack({ glass, ratio, style }: { glass: PracticeGlass; ratio: number; style?: StyleProp<ViewStyle> }) {
  const r = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  return (
    <View style={[styles.track, { backgroundColor: glass.opaqueControl }, style]}>
      <View style={[styles.trackFill, { backgroundColor: glass.accentGraphic, width: `${r * 100}%` }]} />
    </View>
  );
}

/** Карточка `.kv`: подпись-заголовок, крупное значение и необязательная строка. */
export function ExamKvCard({
  glass, label, value, valueStyle, note, right, children, style,
}: {
  glass: PracticeGlass;
  label?: string;
  value?: string;
  valueStyle?: 'normal' | 'muted';
  note?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) }, style]}>
      <View style={styles.cardRow}>
        <View style={styles.cardMain}>
          {label ? <Text style={[styles.kvLabel, { color: glass.secondary }]}>{label}</Text> : null}
          {value ? (
            <Text style={[styles.kvValue, { color: valueStyle === 'muted' ? glass.secondary : glass.text, fontSize: valueStyle === 'muted' ? 18 : 22 }]}>
              {value}
            </Text>
          ) : null}
          {note ? <Text style={[styles.kvNote, { color: glass.secondary }]}>{note}</Text> : null}
          {children}
        </View>
        {right ?? null}
      </View>
    </View>
  );
}

/** Плитка 46 со значком (`.tile.t46`). */
export function ExamTile({ glass, icon, size = 46 }: { glass: PracticeGlass; icon: IconName; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: glass.opaqueControl }]}>
      <Ionicons name={icon} size={size > 50 ? 34 : 22} color={glass.text} />
    </View>
  );
}

/** Герой-блок `.big`: плитка 61, заголовок 20/700 и пояснение 15 по центру. */
export function ExamHero({
  glass, icon, title, message, titleSize = 20, iconTint,
}: {
  glass: PracticeGlass;
  icon: IconName;
  title: string;
  message?: string;
  titleSize?: number;
  iconTint?: string;
}) {
  return (
    <View style={styles.hero}>
      <View style={[styles.heroTile, { backgroundColor: glass.opaqueControl }]}>
        <Ionicons name={icon} size={30} color={iconTint ?? glass.text} />
      </View>
      <Text accessibilityRole="header" style={[styles.heroTitle, { color: glass.text, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.3) }]}>
        {title}
      </Text>
      {message ? <Text style={[styles.heroSub, { color: glass.secondary }]}>{message}</Text> : null}
    </View>
  );
}

/** Тройка цифр `.pc3`: значение 22/700 и подпись 13 под ним. */
export function ExamStatRow({
  glass, items,
}: { glass: PracticeGlass; items: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <View style={[styles.stats, { backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) }]}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={styles.statCell}>
          <Text style={[styles.statValue, { color: glass.text }]}>{it.value}</Text>
          <Text style={[styles.statLabel, { color: glass.secondary }]}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

export type ExamOptionState = 'idle' | 'pressed' | 'ok' | 'no';

/** Вариант ответа `.opt`: высота от 56, отметка верно/неверно справа. Хаптика нет намеренно. */
export function ExamOption({
  glass, label, state = 'idle', onPress, disabled, okColor, okBg, noColor, noBg, testID, accessibilityLabel,
}: {
  glass: PracticeGlass;
  label: string;
  state?: ExamOptionState;
  onPress?: () => void;
  disabled?: boolean;
  okColor: string;
  okBg: string;
  noColor: string;
  noBg: string;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const ink = state === 'ok' ? okColor : state === 'no' ? noColor : glass.text;
  const bg = state === 'ok' ? okBg : state === 'no' ? noBg : glass.plateFillFrom;
  // зачем (владелец 12.10, «Тень»): вариант без обводки; выбранный (`pressed`) приподнят тенью и сдвигом вверх, остальные — плашка
  const lifted = state === 'pressed';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, selected: state === 'pressed' }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.opt,
        {
          backgroundColor: state === 'pressed' ? glass.selected : bg,
          boxShadow: lifted ? raisedBoxShadow(glass) : plateBoxShadow(glass),
          transform: lifted ? [{ translateY: RAISED_LIFT }] : [],
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.optText, { color: ink }]}>{label}</Text>
      {state === 'ok' || state === 'no' ? (
        <PracticeAnswerMark kind={state === 'ok' ? 'correct' : 'wrong'} color={ink} style={styles.optMark} />
      ) : null}
    </Pressable>
  );
}

/** Строка-вердикт `.verdict`: значок и текст (например, «Время вышло»). */
export function ExamVerdict({ icon, text, color }: { icon: IconName; text: string; color: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.verdict}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.verdictText, { color }]}>{text}</Text>
    </View>
  );
}

/** Тихая текстовая кнопка `.quiet` (44 dp). */
export function ExamQuietButton({
  glass, label, onPress, testID,
}: { glass: PracticeGlass; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quiet, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.quietText, { color: glass.secondary }]}>{label}</Text>
    </Pressable>
  );
}

/** Нижний закреплённый блок `.fx`: кнопки друг под другом, отступ по safe area. */
export function ExamFooter({
  bottomInset, children, testID,
}: { bottomInset: number; children: React.ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={[styles.footer, { paddingBottom: Math.max(16, bottomInset + 8) }]}>
      {children}
    </View>
  );
}

/** Общий стиль карточки для экранов (радиус 20, заливка и тень плашки, без обводки). */
export function examCardStyle(glass: PracticeGlass): ViewStyle {
  return {
    backgroundColor: glass.plateFillFrom,
    borderRadius: CARD_RADIUS,
    boxShadow: plateBoxShadow(glass),
  };
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingTop: 4 },
  // строка с местом общей кнопки: от безопасного верха, поле слева 20 как у кнопки, высота круга 48
  headerWithBack: { minHeight: SCREEN_BACK_SIZE, paddingTop: 0, paddingLeft: 20 },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  headerSub: { fontSize: 16, lineHeight: 21, marginTop: 2, fontVariant: ['tabular-nums'] },
  pill: { minHeight: 34, borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pillText: { fontSize: 16, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ring: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 16, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3 },
  card: { borderRadius: CARD_RADIUS, padding: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardMain: { flex: 1, minWidth: 0 },
  kvLabel: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  kvValue: { fontWeight: '700', marginTop: 6, lineHeight: 28 },
  kvNote: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  tile: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', paddingHorizontal: 20 },
  heroTile: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { marginTop: 18, fontWeight: '700', textAlign: 'center' },
  heroSub: { marginTop: 8, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  stats: { marginTop: 18, borderRadius: CARD_RADIUS, flexDirection: 'row', paddingVertical: 14 },
  statCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statValue: { fontSize: 22, lineHeight: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13, lineHeight: 18, marginTop: 2, textAlign: 'center' },
  opt: {
    minHeight: 56, borderRadius: 16,
    paddingVertical: 14, paddingLeft: 18, paddingRight: 52, justifyContent: 'center',
  },
  optText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  optMark: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, minHeight: 28 },
  verdictText: { fontSize: 16, lineHeight: 22, fontWeight: '600', flexShrink: 1 },
  quiet: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  quietText: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingTop: 10, gap: 4 },
});

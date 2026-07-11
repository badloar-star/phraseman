/**
 * Компас — ЕДИНЫЙ дизайн-язык модалов. Волна «плоский лист» (2026-07-03).
 *
 * Все модалы Компаса (брифинг: обычный/первый день/возврат; вечерний ритуал:
 * полный/запертый/награда; соц-сток) строятся из ЭТИХ примитивов, а не из
 * собственных StyleSheet-рамок. Принцип: секции делит ВОЗДУХ и тонкая линия
 * (0.5px hairline), НЕ рамка-коробка. Голос Компаса — крупный заголовок-герой.
 * Один акцент на модал (берётся из активной темы t.accent, чтобы работать во
 * всех темах приложения, а не только в тёмно-зелёной).
 *
 * ПЕРФ-КАНОН: примитивы чисто презентационные, без фоновых циклов анимации.
 * Анимации показа/награды живут в конкретных модалах (одноразовые, по событию).
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { hapticTap } from '../../hooks/use-haptics';
import type { Theme } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Хват-полоска сверху листа — универсальный сигнал «можно смахнуть вниз». */
export function CompassGrabber({ t }: { t: Theme }) {
  return <View style={[styles.grabber, { backgroundColor: t.textMuted + '4D' }]} />;
}

/**
 * Цвет текста НА акцентной подложке: светлый акцент → тёмные чернила, тёмный
 * акцент → белый. Раньше #10131b был прошит на все темы — на тёмном акценте
 * контраст проседал.
 */
export function compassOnAccentColor(accent: string): string {
  const hex = (accent ?? '').replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
  if (full.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(full)) return '#10131b';
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  // Быстрая аппроксимация относительной люминантности sRGB.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#10131b' : '#ffffff';
}

/**
 * Надзаголовок-строка: иконка-марка + текст («Компас · день N» / «Итог дня») +
 * необязательный правый слот (пилюля серии, глиф темы). ЗАМЕНЯЕТ старую шапку с
 * бейджем-в-рамке и глифом темы.
 */
export function CompassEyebrow({
  t,
  icon,
  iconSource,
  text,
  accent,
  right,
}: {
  t: Theme;
  icon: IoniconName;
  /** Настоящий ассет-иконка компаса (по теме). Если задан — рисуется вместо Ionicon. */
  iconSource?: ImageSourcePropType;
  text: string;
  accent: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.eyebrow}>
      {iconSource ? (
        <Image source={iconSource} style={styles.markImage} contentFit="contain" />
      ) : (
        <View style={[styles.mark, { backgroundColor: accent + '1F' }]}>
          <Ionicons name={icon} size={17} color={accent} />
        </View>
      )}
      <Text style={[styles.eyebrowText, { color: accent }]} numberOfLines={1}>
        {text}
      </Text>
      {right ? <View style={styles.eyebrowRight}>{right}</View> : null}
    </View>
  );
}

/** Пилюля серии дней (в правом слоте надзаголовка вечернего ритуала). */
export function CompassStreakPill({ t, accent, text }: { t: Theme; accent: string; text: string }) {
  return (
    <View style={[styles.streakPill, { backgroundColor: accent + '1A', borderColor: accent + '3A' }]}>
      <Ionicons name="flame-outline" size={12} color={accent} />
      <Text style={[styles.streakPillText, { color: accent }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** Голос Компаса — крупный заголовок-герой (комментарий дня / приветствие). */
export function CompassVoice({ t, children }: { t: Theme; children: React.ReactNode }) {
  return <Text style={[styles.voice, { color: t.textPrimary }]}>{children}</Text>;
}

/** Подзаголовок-лид под голосом (тёплая строка-приглашение). */
export function CompassLede({ t, children, center }: { t: Theme; children: React.ReactNode; center?: boolean }) {
  return <Text style={[styles.lede, { color: t.textSecond }, center && styles.center]}>{children}</Text>;
}

/**
 * Список-ВЫБОР (задачи дня / первые шаги) в мягкой подложке БЕЗ обводки: единый
 * контейнер со сменой фона (лёгкий акцентный тон), строки внутри разделены тонкой
 * линией. Даёт блоку визуальные границы без рамки-коробки — текст не «слипается».
 */
export function CompassPickList({
  t,
  accent,
  children,
  style,
}: {
  t: Theme;
  accent?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const fill = (accent ?? t.textPrimary) + '14';
  return <View style={[styles.pickList, { backgroundColor: fill }, style]}>{children}</View>;
}

export function CompassPickRow({
  t,
  accent,
  icon,
  title,
  meta,
  onPress,
  showArrow = true,
  first = false,
  testID,
}: {
  t: Theme;
  accent: string;
  icon: IoniconName;
  title: string;
  meta?: string;
  onPress?: () => void;
  showArrow?: boolean;
  /** Первая строка в подложке — без верхней линии-разделителя. */
  first?: boolean;
  testID?: string;
}) {
  const interactive = !!onPress;
  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={interactive ? 0.7 : 1}
      disabled={!interactive}
      onPressIn={interactive ? () => hapticTap() : undefined}
      onPress={onPress}
      style={[styles.pickRow, first ? styles.pickRowFirst : { borderTopColor: t.border }]}
    >
      <Ionicons name={icon} size={20} color={accent} style={styles.pickIcon} />
      <View style={styles.pickBody}>
        <Text style={[styles.pickTitle, { color: t.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={[styles.pickMeta, { color: t.textMuted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {interactive && showArrow ? <Ionicons name="arrow-forward" size={17} color={t.textMuted} /> : null}
    </TouchableOpacity>
  );
}

/**
 * Мягкая секция (соц-сводка «Кстати», напоминание аккаунта, индакшн) в подложке
 * БЕЗ обводки: лёгкий акцентный фон вместо рамки-коробки. Даёт блоку границы,
 * чтобы текст не «слипался» с соседними секциями.
 */
export function CompassSoftSection({
  t,
  accent,
  eyebrow,
  eyebrowIcon,
  children,
  testID,
}: {
  t: Theme;
  accent: string;
  eyebrow?: string;
  eyebrowIcon?: IoniconName;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.soft, { backgroundColor: accent + '14' }]}>
      {eyebrow ? (
        <View style={styles.softHead}>
          {eyebrowIcon ? <Ionicons name={eyebrowIcon} size={14} color={accent} /> : null}
          <Text style={[styles.softLabel, { color: accent }]}>{eyebrow}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Крупная акцентная кнопка (Закрыть день / Открыть доступ). */
export function CompassPrimaryButton({
  t,
  accent,
  label,
  onPress,
  disabled,
  testID,
  style,
}: {
  t: Theme;
  accent: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.85}
      disabled={disabled}
      onPressIn={disabled ? undefined : () => hapticTap()}
      onPress={onPress}
      style={[styles.cta, { backgroundColor: accent, opacity: disabled ? 0.55 : 1 }, style]}
    >
      <Text style={[styles.ctaText, { color: compassOnAccentColor(accent) }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** «Позже» — маленький серый нажимаемый ТЕКСТ по центру. НЕ кнопка (правило юзера). */
export function CompassLaterLink({ t, label, onPress }: { t: Theme; label: string; onPress: () => void }) {
  return (
    <View style={styles.laterWrap}>
      <TouchableOpacity
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        onPressIn={() => hapticTap()}
        onPress={onPress}
      >
        <Text style={[styles.laterText, { color: t.textMuted }]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  grabber: { width: 38, height: 5, borderRadius: 999, alignSelf: 'center', marginBottom: 16 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  markImage: { width: 30, height: 30, borderRadius: 9 },
  eyebrowText: { flexShrink: 1, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  eyebrowRight: { marginLeft: 'auto' },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 0, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, maxWidth: 165 },
  streakPillText: { flexShrink: 1, fontSize: 11.5, fontWeight: '800' },
  voice: { fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -0.2, marginTop: 15 },
  lede: { fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 11 },
  center: { textAlign: 'center' },
  pickList: { marginTop: 20, borderRadius: 16, overflow: 'hidden', paddingHorizontal: 4 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth },
  pickRowFirst: { borderTopWidth: 0 },
  pickIcon: { width: 22, textAlign: 'center' },
  pickBody: { flex: 1, minWidth: 0, gap: 2 },
  pickTitle: { fontSize: 15, fontWeight: '700' },
  pickMeta: { fontSize: 12.5, fontWeight: '500' },
  soft: { marginTop: 18, padding: 16, borderRadius: 16 },
  softHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  softLabel: { flexShrink: 1, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  cta: { marginTop: 24, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '800' },
  laterWrap: { alignItems: 'center', marginTop: 14 },
  laterText: { fontSize: 13, fontWeight: '600', paddingVertical: 4, paddingHorizontal: 6 },
});

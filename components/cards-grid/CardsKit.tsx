/**
 * Общие части экранов «Карточек» по макету docs/design/v2-app/cards-section.html: карточка-строка, плитка с иконкой,
 * пилюля-счётчик, заголовок раздела и «пустой» блок.
 *
 * зачем (владелец: «в приложении запрещены любые различия с одобренными макетами»): размеры сняты замером макета (430×932):
 * карточка r14, строка 9/16/9/18, плитка 41 r10, пилюля 24 r12, заголовок раздела 20/700; границ нет — кромка это внутренние тени.
 * Одни и те же части нужны спискам «Мои наборы», «Наборы сообщества», «Из видео», поэтому живут здесь, а не в экране.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { LinearGradient } from '../SafeLinearGradient';
import { bevelShadow, mixDark, themePair } from '../mistakes-panel/panelPaint';

const DROP = [{ offsetX: 0, offsetY: 10, blurRadius: 28, spreadDistance: -12, color: 'rgba(0,0,0,0.7)' }] as const;
const SHEEN_COLORS = ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.035)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.055)'] as const;
const SHEEN_AT = [0, 0.26, 0.52, 0.78, 1] as const;
const SHEEN_START = { x: 0.25, y: 0.067 } as const;
const SHEEN_END = { x: 0.75, y: 0.933 } as const;
const EDGE = bevelShadow('rgba(255,255,255,0.22)', 'rgba(255,255,255,0.055)');

/** Блик 150° и кромка — слои поверх содержимого (внутренние тени лежат под детьми, поэтому отдельным слоем). */
function Sheen({ radius }: Readonly<{ radius: number }>) {
  return (
    <>
      <LinearGradient pointerEvents="none" colors={SHEEN_COLORS} locations={SHEEN_AT} start={SHEEN_START} end={SHEEN_END} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: EDGE }]} />
    </>
  );
}

/** «.card» макета: заливка 150° из цветов темы, тень вниз, блик и кромка. */
export const KitCard = memo(function KitCard({ g, children, onPress, onLongPress, testID, accessibilityLabel, disabled, style, solid, radius = 14 }: Readonly<{
  g: GlassTokens;
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Сплошная заливка вместо градиента темы (например, кнопки-плитки «Изменить / Удалить»: #202022). */
  solid?: string;
  /** Скругление: 14 у обычных карточек, 20 у строк фраз набора из видео. */
  radius?: number;
}>) {
  const [a, b] = themePair(g);
  const colors = [`${mixDark(a, '#0E0E12', 0.17)}B0`, 'rgba(14,14,18,0.58)', `${mixDark(b, '#0E0E12', 0.17)}A3`] as const;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || !onPress}
      accessibilityState={{ disabled: !!(disabled || !onPress) }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, { borderRadius: radius, boxShadow: DROP as never }, pressed && styles.pressed, style]}>
      {solid ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: solid }]} /> : <LinearGradient pointerEvents="none" colors={colors} locations={[0, 0.6, 1]} start={SHEEN_START} end={SHEEN_END} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />}
      {children}
      <Sheen radius={radius} />
    </Pressable>
  );
});

/** Плоская поверхность без тени и нажатия (`.field`, `.seg3`): заливка 150° из цветов темы, блик, кромка. */
export const KitSurface = memo(function KitSurface({ g, children, radius = 14, style }: Readonly<{ g: GlassTokens; children?: React.ReactNode; radius?: number; style?: StyleProp<ViewStyle> }>) {
  const [a, b] = themePair(g);
  const colors = [`${mixDark(a, '#0E0E12', 0.17)}B0`, 'rgba(14,14,18,0.58)', `${mixDark(b, '#0E0E12', 0.17)}A3`] as const;
  return (
    <View style={[{ borderRadius: radius }, style]}>
      <LinearGradient pointerEvents="none" colors={colors} locations={[0, 0.6, 1]} start={SHEEN_START} end={SHEEN_END} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      {children}
      <Sheen radius={radius} />
    </View>
  );
});

/** «.tile» макета 41×41 r10: градиент 145° из цветов темы, блик, кромка, иконка 20. */
export const KitIconTile = memo(function KitIconTile({ g, icon }: Readonly<{ g: GlassTokens; icon: keyof typeof Ionicons.glyphMap }>) {
  const [a, b] = themePair(g);
  return (
    <View style={styles.tile}>
      <LinearGradient pointerEvents="none" colors={[mixDark(a, '#1E1E20', 0.6), mixDark(b, '#08080B', 0.32)]} start={{ x: 0.21, y: 0.09 }} end={{ x: 0.79, y: 0.91 }} style={StyleSheet.absoluteFill} />
      <Ionicons name={icon} size={20} color="#FFFFFF" />
      <Sheen radius={10} />
    </View>
  );
});

/** «.cntp» макета: пилюля с числом, 24 высотой. */
export const CountPill = memo(function CountPill({ g, value }: Readonly<{ g: GlassTokens; value: number }>) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillText, { color: g.text }]}>{value}</Text>
      <Sheen radius={12} />
    </View>
  );
});

/** Строка-карточка списка наборов: плитка, название, подпись, число, шеврон. */
export const KitPackRow = memo(function KitPackRow({ g, icon, title, subtitle, count, onPress, onLongPress, testID, accessibilityLabel, disabled }: Readonly<{
  g: GlassTokens;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  count: number;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
}>) {
  return (
    <KitCard g={g} onPress={onPress} onLongPress={onLongPress} testID={testID} accessibilityLabel={accessibilityLabel ?? `${title}, ${subtitle}, ${count}`} disabled={disabled}>
      <View style={styles.row}>
        <KitIconTile g={g} icon={icon} />
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: g.text }]}>{title}</Text>
          <Text style={[styles.rowSub, { color: g.secondary }]}>{subtitle}</Text>
        </View>
        <CountPill g={g} value={count} />
        <Ionicons name="chevron-forward" size={20} color={g.secondary} />
      </View>
    </KitCard>
  );
});

/** «.sec»: название раздела 20/700 и число рядом 20/600 приглушённым. */
export const KitSectionHead = memo(function KitSectionHead({ g, title, count, hideCount }: Readonly<{ g: GlassTokens; title: string; count: number; hideCount?: boolean }>) {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={hideCount ? title : `${title}, ${count}`} style={styles.sec}>
      <Text style={[styles.secTitle, { color: g.text }]}>{title}</Text>
      {hideCount ? null : <Text style={styles.secCount}>{count}</Text>}
    </View>
  );
});

/** Заголовок экрана 40/46 и необязательная подпись 16/22. */
export const KitTitle = memo(function KitTitle({ g, title, subtitle, testID }: Readonly<{ g: GlassTokens; title: string; subtitle?: string | null; testID?: string }>) {
  return (
    <View>
      <Text testID={testID} accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: g.secondary }]}>{subtitle}</Text> : null}
    </View>
  );
});

/** «.cta» макета: мятная кнопка 48 высотой, свечение снизу, блик сверху; иконка слева необязательна. */
export const KitCta = memo(function KitCta({ g, label, icon, trailingIcon, onPress, testID, accessibilityLabel }: Readonly<{
  g: GlassTokens;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Иконка после подписи (стрелка «→»). */
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
}>) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -12, color: `${g.accent}B3` }] },
        pressed && styles.pressed,
      ]}>
      {icon ? <Ionicons name={icon} size={20} color={g.accentInk} /> : null}
      <Text style={[styles.ctaText, { color: g.accentInk }]}>{label}</Text>
      {trailingIcon ? <Ionicons name={trailingIcon} size={20} color={g.accentInk} /> : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 24, boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.7)' }] }]} />
    </Pressable>
  );
});

/** Поле поиска-капсула (`.srch`): лупа, ввод 16, крестик очистки; 46 высотой r23. */
export const KitSearchField = memo(function KitSearchField({ g, value, onChangeText, placeholder, clearLabel, testID }: Readonly<{
  g: GlassTokens;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  clearLabel: string;
  testID?: string;
}>) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color="#6E6E72" />
      <TextInput
        testID={testID}
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6E6E72"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[styles.searchInput, { color: g.text }]}
      />
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} hitSlop={10} onPress={() => onChangeText('')}>
          <Ionicons name="close" size={18} color="#A6A6A8" />
        </Pressable>
      ) : null}
    </View>
  );
});

/** «Найдено · N» — мятная строка 12/700 с разрядкой над результатами поиска (`.ov`). */
export const KitFound = memo(function KitFound({ g, label }: Readonly<{ g: GlassTokens; label: string }>) {
  return <Text testID="fc-search-found" style={[styles.found, { color: g.accent }]}>{label}</Text>;
});

/** Переключатель из N сегментов (`.seg3`): плашка 50, сегменты 40, активный — мятный. */
export const KitSegment = memo(function KitSegment({ g, options, value, onChange, testIDPrefix }: Readonly<{
  g: GlassTokens;
  options: readonly Readonly<{ id: string; label: string }>[];
  value: string;
  onChange: (id: string) => void;
  testIDPrefix?: string;
}>) {
  return (
    <KitSurface g={g} style={styles.segWrap}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Pressable
            key={option.id}
            testID={testIDPrefix ? `${testIDPrefix}-${option.id}` : undefined}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.id)}
            style={[styles.seg, on && { backgroundColor: g.accent, boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.12)' }, { offsetX: 0, offsetY: 4, blurRadius: 12, spreadDistance: -6, color: 'rgba(0,0,0,0.8)' }] }]}>
            <Text style={[styles.segText, { color: on ? g.accentInk : g.secondary }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </KitSurface>
  );
});

/** Круглый индикатор выбора 26: выбран — светлый круг с галочкой, не выбран — тонкое кольцо. */
export const KitCheck = memo(function KitCheck({ on }: Readonly<{ on: boolean }>) {
  return (
    <View style={[styles.check, on ? styles.checkOn : styles.checkOff]}>
      {on ? <Ionicons name="checkmark" size={16} color="#0B0C0E" /> : null}
    </View>
  );
});

const EMPTY_BLOCK_H = 217;

/**
 * Блок «Пусто»: плитка 61, заголовок 24/30, подпись, кнопка — по ЦЕНТРУ ЭКРАНА (top:50%, translateY(-46%) макета),
 * а не под заголовком. Верх родителя меряем в окне, чтобы центрировать именно по экрану.
 */
export const KitEmpty = memo(function KitEmpty({ g, icon, title, detail, action, actionIcon, onAction, testID, actionTestID, hideAction }: Readonly<{
  g: GlassTokens;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  action: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction: () => void;
  testID?: string;
  actionTestID?: string;
  /** Без кнопки (например, «Лимит исчерпан»). */
  hideAction?: boolean;
}>) {
  const { height } = useWindowDimensions();
  const holder = useRef<View>(null);
  const [pageTop, setPageTop] = useState<number | null>(null);
  const measure = useCallback(() => {
    holder.current?.measureInWindow((_x, y) => { setPageTop((prev) => (prev === y ? prev : y)); });
  }, []);
  return (
    <View ref={holder} onLayout={measure} testID={testID} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={[styles.emptyBlock, { top: Math.round(height / 2 - 0.46 * EMPTY_BLOCK_H - (pageTop ?? 0)), opacity: pageTop === null ? 0 : 1 }]}>
        <View style={styles.emptyTile}>
          <Ionicons name={icon} size={28} color="#E9E9EB" />
        </View>
        <Text accessibilityRole="header" style={[styles.emptyTitle, { color: g.text }]}>{title}</Text>
        <Text style={[styles.emptyDetail, { color: g.secondary }]}>{detail}</Text>
        {hideAction ? null : (
          <View style={styles.emptyCtaWrap}>
            <KitCta g={g} label={action} icon={actionIcon} onPress={onAction} testID={actionTestID} />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.82 },
  card: { minHeight: 65, borderRadius: 14, justifyContent: 'center' },
  cardFill: { borderRadius: 14 },
  tile: { width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pill: { minWidth: 36, height: 24, borderRadius: 12, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10, paddingLeft: 19, paddingRight: 16 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  rowSub: { fontSize: 15, lineHeight: 19 },
  sec: { marginTop: 30, marginBottom: 14, marginHorizontal: 2, flexDirection: 'row', alignItems: 'center', gap: 9 },
  secTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  secCount: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: '#6E6E72' },
  title: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { marginTop: 6, fontSize: 16, lineHeight: 22, letterSpacing: 0.15 },
  search: { height: 46, borderRadius: 23, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.07)' },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 0 },
  found: { marginTop: 22, marginBottom: 12, marginLeft: 4, fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase' },
  segWrap: { height: 50, padding: 4, flexDirection: 'row' },
  seg: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#E9E9EB' },
  checkOff: { boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: 'rgba(255,255,255,0.3)' }] },
  emptyBlock: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 40 },
  emptyTile: { width: 61, height: 61, borderRadius: 16, backgroundColor: '#28282A', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center', marginTop: 22 },
  emptyDetail: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  emptyCtaWrap: { marginTop: 26 },
  cta: { height: 48, borderRadius: 24, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  ctaText: { fontSize: 17, fontWeight: '700' },
});

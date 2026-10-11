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
import { bevelShadow, glassFillColors, iconTileColors, themePair } from '../mistakes-panel/panelPaint';
import { useLineScale } from '../../hooks/useLineScale';

// зачем (замечание владельца 10.10): цвета блика, кромки и тени — токены выбранной темы (mediaInk/bevelHi/hairlineSoft/dropShadow), не литералы под «Аврору».
const dropOf = (g: GlassTokens) => [{ offsetX: 0, offsetY: 10, blurRadius: 28, spreadDistance: -12, color: g.dropShadow }] as const;
const sheenColors = (g: GlassTokens) => [`${g.mediaInk}1A`, `${g.mediaInk}09`, `${g.mediaInk}00`, `${g.mediaInk}05`, `${g.mediaInk}0E`] as const;
const SHEEN_AT = [0, 0.26, 0.52, 0.78, 1] as const;
const SHEEN_START = { x: 0.25, y: 0.067 } as const;
const SHEEN_END = { x: 0.75, y: 0.933 } as const;
const edgeOf = (g: GlassTokens) => bevelShadow(g.bevelHi, g.hairlineSoft, g.bevelLo);

/** Блик 150° и кромка — слои поверх содержимого (внутренние тени лежат под детьми, поэтому отдельным слоем). */
function Sheen({ g, radius }: Readonly<{ g: GlassTokens; radius: number }>) {
  return (
    <>
      <LinearGradient pointerEvents="none" colors={sheenColors(g)} locations={SHEEN_AT} start={SHEEN_START} end={SHEEN_END} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: edgeOf(g) }]} />
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
  const colors = glassFillColors(g, a, b);
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || !onPress}
      accessibilityState={{ disabled: !!(disabled || !onPress) }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, { borderRadius: radius, boxShadow: dropOf(g) as never }, pressed && styles.pressed, style]}>
      {solid ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: solid }]} /> : <LinearGradient pointerEvents="none" colors={colors} locations={[0, 0.6, 1]} start={SHEEN_START} end={SHEEN_END} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />}
      {children}
      <Sheen g={g} radius={radius} />
    </Pressable>
  );
});

/** Плоская поверхность без тени и нажатия (`.field`, `.seg3`): заливка 150° из цветов темы, блик, кромка. */
export const KitSurface = memo(function KitSurface({ g, children, radius = 14, style }: Readonly<{ g: GlassTokens; children?: React.ReactNode; radius?: number; style?: StyleProp<ViewStyle> }>) {
  const [a, b] = themePair(g);
  const colors = glassFillColors(g, a, b);
  return (
    <View style={[{ borderRadius: radius }, style]}>
      <LinearGradient pointerEvents="none" colors={colors} locations={[0, 0.6, 1]} start={SHEEN_START} end={SHEEN_END} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      {children}
      <Sheen g={g} radius={radius} />
    </View>
  );
});

/** «.tile» макета 41×41 r10: градиент 145° из цветов темы, блик, кромка, иконка 20. */
export const KitIconTile = memo(function KitIconTile({ g, icon }: Readonly<{ g: GlassTokens; icon: keyof typeof Ionicons.glyphMap }>) {
  const [a, b] = themePair(g);
  return (
    <View style={styles.tile}>
      <LinearGradient pointerEvents="none" colors={iconTileColors(g, a, b)} start={{ x: 0.21, y: 0.09 }} end={{ x: 0.79, y: 0.91 }} style={StyleSheet.absoluteFill} />
      <Ionicons name={icon} size={20} color={g.mediaInk} />
      <Sheen g={g} radius={10} />
    </View>
  );
});

/** «.cntp» макета: пилюля с числом, 24 высотой. */
export const CountPill = memo(function CountPill({ g, value }: Readonly<{ g: GlassTokens; value: number }>) {
  const lh = useLineScale();
  return (
    <View style={[styles.pill, { backgroundColor: g.hairlineSoft }]}>
      <Text style={[styles.pillText, { color: g.text, lineHeight: lh(18) }]}>{value}</Text>
      <Sheen g={g} radius={12} />
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
  const lh = useLineScale();
  const { fontScale } = useWindowDimensions();
  const rowLines = (max: number): number | undefined => (fontScale > 1 ? undefined : max);
  return (
    <KitCard g={g} onPress={onPress} onLongPress={onLongPress} testID={testID} accessibilityLabel={accessibilityLabel ?? `${title}, ${subtitle}, ${count}`} disabled={disabled}>
      <View style={styles.row}>
        <KitIconTile g={g} icon={icon} />
        <View style={styles.rowText}>
          {/* зачем (крайние случаи 10.10): название набора может быть очень длинным — 2 строки с «…», подпись в одну; при крупном системном шрифте без обрезки */}
          <Text numberOfLines={rowLines(2)} style={[styles.rowTitle, { color: g.text, lineHeight: lh(22) }]}>{title}</Text>
          <Text numberOfLines={rowLines(1)} style={[styles.rowSub, { color: g.secondary, lineHeight: lh(19) }]}>{subtitle}</Text>
        </View>
        <CountPill g={g} value={count} />
        <Ionicons name="chevron-forward" size={20} color={g.secondary} />
      </View>
    </KitCard>
  );
});

/** «.sec»: название раздела 20/700 и число рядом 20/600 приглушённым. */
export const KitSectionHead = memo(function KitSectionHead({ g, title, count, hideCount }: Readonly<{ g: GlassTokens; title: string; count: number; hideCount?: boolean }>) {
  const lh = useLineScale();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={hideCount ? title : `${title}, ${count}`} style={styles.sec}>
      <Text style={[styles.secTitle, { color: g.text, lineHeight: lh(26) }]}>{title}</Text>
      {hideCount ? null : <Text style={[styles.secCount, { color: g.mutedText, lineHeight: lh(26) }]}>{count}</Text>}
    </View>
  );
});

/** Заголовок экрана 40/46 и необязательная подпись 16/22. */
export const KitTitle = memo(function KitTitle({ g, title, subtitle, testID }: Readonly<{ g: GlassTokens; title: string; subtitle?: string | null; testID?: string }>) {
  const lh = useLineScale();
  return (
    <View>
      <Text testID={testID} accessibilityRole="header" style={[styles.title, { color: g.text, lineHeight: lh(46) }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: g.secondary, lineHeight: lh(22) }]}>{subtitle}</Text> : null}
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
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 24, boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: `${g.mediaInk}B3` }] }]} />
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
    <View style={[styles.search, { backgroundColor: g.hairlineSoft }]}>
      <Ionicons name="search" size={18} color={g.mutedText} />
      <TextInput
        testID={testID}
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={g.mutedText}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[styles.searchInput, { color: g.text }]}
      />
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} hitSlop={10} onPress={() => onChangeText('')}>
          <Ionicons name="close" size={18} color={g.secondary} />
        </Pressable>
      ) : null}
    </View>
  );
});

/** «Найдено · N» — мятная строка 12/700 с разрядкой над результатами поиска (`.ov`). */
export const KitFound = memo(function KitFound({ g, label }: Readonly<{ g: GlassTokens; label: string }>) {
  const lh = useLineScale();
  return <Text testID="fc-search-found" style={[styles.found, { color: g.accent, lineHeight: lh(16) }]}>{label}</Text>;
});

/** Переключатель из N сегментов (`.seg3`): плашка 50, сегменты 40, активный — мятный. */
export const KitSegment = memo(function KitSegment({ g, options, value, onChange, testIDPrefix }: Readonly<{
  g: GlassTokens;
  options: readonly Readonly<{ id: string; label: string }>[];
  value: string;
  onChange: (id: string) => void;
  testIDPrefix?: string;
}>) {
  const lh = useLineScale();
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
            style={[styles.seg, on && { backgroundColor: g.accent, boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: `${g.mediaInk}1F` }, { offsetX: 0, offsetY: 4, blurRadius: 12, spreadDistance: -6, color: g.dropShadow }] }]}>
            <Text style={[styles.segText, { color: on ? g.accentInk : g.secondary, lineHeight: lh(20) }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </KitSurface>
  );
});

/** Круглый индикатор выбора 26: выбран — светлый круг с галочкой, не выбран — тонкое кольцо. */
export const KitCheck = memo(function KitCheck({ g, on }: Readonly<{ g: GlassTokens; on: boolean }>) {
  return (
    <View style={[styles.check, on ? { backgroundColor: g.cta } : { boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: `${g.text}4D` }] }]}>
      {on ? <Ionicons name="checkmark" size={16} color={g.ctaInk} /> : null}
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
  const lh = useLineScale();
  const holder = useRef<View>(null);
  const [pageTop, setPageTop] = useState<number | null>(null);
  const measure = useCallback(() => {
    holder.current?.measureInWindow((_x, y) => { setPageTop((prev) => (prev === y ? prev : y)); });
  }, []);
  return (
    <View ref={holder} onLayout={measure} testID={testID} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={[styles.emptyBlock, { top: Math.round(height / 2 - 0.46 * EMPTY_BLOCK_H - (pageTop ?? 0)), opacity: pageTop === null ? 0 : 1 }]}>
        <View style={[styles.emptyTile, { backgroundColor: g.opaqueControl }]}>
          <Ionicons name={icon} size={28} color={g.text} />
        </View>
        <Text accessibilityRole="header" style={[styles.emptyTitle, { color: g.text, lineHeight: lh(30) }]}>{title}</Text>
        <Text style={[styles.emptyDetail, { color: g.secondary, lineHeight: lh(22) }]}>{detail}</Text>
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
  pill: { minWidth: 36, minHeight: 24, borderRadius: 12, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 13, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10, paddingLeft: 19, paddingRight: 16 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  rowSub: { fontSize: 16, lineHeight: 21 },
  sec: { marginTop: 30, marginBottom: 14, marginHorizontal: 2, flexDirection: 'row', alignItems: 'center', gap: 9 },
  secTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  secCount: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  title: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { marginTop: 6, fontSize: 16, lineHeight: 22, letterSpacing: 0.15 },
  search: { minHeight: 46, borderRadius: 23, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 0 },
  found: { marginTop: 22, marginBottom: 12, marginLeft: 4, fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase' },
  segWrap: { minHeight: 50, padding: 4, flexDirection: 'row' },
  seg: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  emptyBlock: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 40 },
  emptyTile: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center', marginTop: 22 },
  emptyDetail: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  emptyCtaWrap: { marginTop: 26 },
  cta: { minHeight: 48, paddingVertical: 6, borderRadius: 24, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});

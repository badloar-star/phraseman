/**
 * Общие части экранов «Карточек» по макету docs/design/v2-app/cards-section.html: карточка-строка, плитка с иконкой,
 * пилюля-счётчик, заголовок раздела и «пустой» блок.
 *
 * зачем (владелец: «в приложении запрещены любые различия с одобренными макетами»): размеры сняты замером макета (430×932):
 * карточка r14, строка 9/16/9/18, плитка 41 r10, пилюля 24 r12, заголовок раздела 20/700.
 *
 * зачем (владелец 12.10, «второй вариант делаем»): стиль «Тень» — НИ ОДНОЙ обводки и внутренней кромки; плашку отделяют градиент 180° и тень
 * (docs/design/v2-app/SHADOW_STYLE_SPEC.md, эталоны shadow-style-etalon*.html), числа — из токенов темы через components/v2/ShadowSurface.
 * Одни и те же части нужны спискам «Мои наборы», «Наборы сообщества», «Из видео», поэтому живут здесь, а не в экране.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../v2/ShadowSurface';
import { useLineScale } from '../../hooks/useLineScale';

/** «.card» макета: плашка стиля «Тень» — градиент 180° и тень вниз, без обводки и кромки. */
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
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || !onPress}
      accessibilityState={{ disabled: !!(disabled || !onPress) }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, { borderRadius: radius, boxShadow: plateBoxShadow(g) }, pressed && styles.pressed, style]}>
      {solid ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: solid }]} /> : <PlateFill g={g} radius={radius} />}
      {children}
    </Pressable>
  );
});

/** Поверхность (`.field`, `.seg3`): та же плашка «Тень» — градиент 180° и тень, без обводки. */
export const KitSurface = memo(function KitSurface({ g, children, radius = 14, style }: Readonly<{ g: GlassTokens; children?: React.ReactNode; radius?: number; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[{ borderRadius: radius, boxShadow: plateBoxShadow(g) }, style]}>
      <PlateFill g={g} radius={radius} />
      {children}
    </View>
  );
});

/** «.tile» макета 41×41 r10: вложенная плитка стиля «Тень» — тон `dividerTone` и малая тень, иконка 20. */
export const KitIconTile = memo(function KitIconTile({ g, icon }: Readonly<{ g: GlassTokens; icon: keyof typeof Ionicons.glyphMap }>) {
  return (
    <View style={[styles.tile, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
      <Ionicons name={icon} size={20} color={g.text} />
    </View>
  );
});

/** «.cntp» макета: пилюля с числом, 24 высотой. */
export const CountPill = memo(function CountPill({ g, value }: Readonly<{ g: GlassTokens; value: number }>) {
  const lh = useLineScale();
  return (
    <View style={[styles.pill, { backgroundColor: g.dividerTone }]}>
      <Text style={[styles.pillText, { color: g.text, lineHeight: lh(18) }]}>{value}</Text>
    </View>
  );
});

// зачем (владелец, журнал 9/29, 11.10): строка набора «KitPackRow» переехала в общий components/packs/PackRow —
// одна строка набора на все места (каталог, «Мои наборы», тренировка), фиксированная высота под 2 строки названия.

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

/** «.cta» макета: кнопка действия 48 высотой — цвет темы и цветная тень (стиль «Тень», без блика-кромки); иконка слева необязательна. */
// зачем (Сверка 11.10, светлая, настройка тренировки): выключенная кнопка была обычной мятной с opacity .45 — сквозь неё просвечивал
// текст нижних секций (подпись «Направление» под кнопкой). По макету `.cta.dis` — плотная заливка контрола и приглушённый текст, без свечения.
export const KitCta = memo(function KitCta({ g, label, icon, trailingIcon, onPress, testID, accessibilityLabel, disabled = false }: Readonly<{
  g: GlassTokens;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Иконка после подписи (стрелка «→»). */
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
  /** Вид «недоступно» (`.cta.dis`): плотная заливка, приглушённый текст; нажатие остаётся — экран сам объяснит причину. */
  disabled?: boolean;
}>) {
  const ink = disabled ? g.mutedText : g.accentInk;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={disabled ? { disabled: true } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        disabled
          ? { backgroundColor: g.opaqueControl }
          : { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) },
        pressed && styles.pressed,
      ]}>
      {icon ? <Ionicons name={icon} size={20} color={ink} /> : null}
      <Text style={[styles.ctaText, { color: ink }]}>{label}</Text>
      {trailingIcon ? <Ionicons name={trailingIcon} size={20} color={ink} /> : null}
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
    <View style={[styles.search, { boxShadow: plateBoxShadow(g) }]}>
      <PlateFill g={g} radius={23} />
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
  return <Text testID="fc-search-found" style={[styles.found, { color: g.accentText, lineHeight: lh(16) }]}>{label}</Text>;
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
            style={[styles.seg, on && { boxShadow: nestedBoxShadow(g) }]}>
            {on ? <PlateFill g={g} radius={10} raised /> : null}
            <Text style={[styles.segText, { color: on ? g.text : g.secondary, fontWeight: on ? '700' : '600', lineHeight: lh(20) }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </KitSurface>
  );
});

/** Круглый индикатор выбора 26: выбран — светлый круг с галочкой, не выбран — кольцо (индикатор состояния, не обводка контейнера). */
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

/**
 * Общие элементы «Панели» раздела «Мои ошибки» (макет docs/design/v2-app/mistakes-panel.html, вариант Б, одобрен владельцем 04.10).
 *
 * зачем (владелец: «1 в 1, без малейших потерь»): размеры взяты замером макета (430×932): кнопка «назад» 42, заголовок 40/46,
 * кольцо 236 (толщина 16) и малое 150 (12), ленты-фильтры высотой 38, панель радиусом 24 с рядами от 64, кнопка 52.
 * Границ нет — «кромка» это внутренняя тень (boxShadow inset, новая архитектура включена).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';

import type { Lv2Glass } from '../learning-v2/LearningV2Glass';
import { LinearGradient } from '../SafeLinearGradient';
import { DIAG_150, MP_COLORS, mixDark, ringShadow, themePair } from './panelPaint';

export const BackButton = memo(function BackButton({ g, onPress, label }: Readonly<{ g: Lv2Glass; onPress: () => void; label: string }>) {
  return (
    <Pressable
      testID="mp-back"
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.back, { backgroundColor: g.opaqueControl }, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={20} color={g.text} />
    </Pressable>
  );
});

export const ScreenTitle = memo(function ScreenTitle({ g, text }: Readonly<{ g: Lv2Glass; text: string }>) {
  return <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{text}</Text>;
});

/** Кольцо прогресса: большое 236 (хаб, итог) и малое 150 (вход). Внутри — центр (проценты и подпись). */
export const PanelRing = memo(function PanelRing({ g, progress, big = true, children }: Readonly<{ g: Lv2Glass; progress: number; big?: boolean; children?: React.ReactNode }>) {
  const size = big ? 236 : 150;
  const r = big ? 100 : 62;
  const w = big ? 16 : 12;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.ring, { width: size, height: size }, big && styles.ringBig]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={MP_COLORS.track} strokeWidth={w} />
        {p > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={g.accent}
            strokeWidth={w}
            strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">{children}</View>
    </View>
  );
});

export type PanelChip = Readonly<{ id: string; label: string }>;

/** Лента-фильтр: чипы 38 высотой, активный на цвете акцента; лента листается вбок и уходит за край экрана, как в макете. */
export const FilterChips = memo(function FilterChips({ g, chips, activeId, onChange, testIDPrefix }: Readonly<{ g: Lv2Glass; chips: readonly PanelChip[]; activeId: string; onChange: (id: string) => void; testIDPrefix: string }>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
      {/* guard-ok: лента из 3–5 коротких чипов, виртуализация не нужна */ chips.map((chip) => {
        const on = chip.id === activeId;
        return (
          <Pressable
            key={chip.id}
            testID={`${testIDPrefix}-${chip.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(chip.id)}
            style={({ pressed }) => [styles.chip, { backgroundColor: on ? g.accent : MP_COLORS.chip }, pressed && styles.pressed]}>
            <Text style={[styles.chipText, { color: on ? g.accentInk : g.secondary }]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

/** Панель: одна карточка-список с градиентом цвета темы и внутренним кольцом 1px. */
export const Panel = memo(function Panel({ g, children, style }: Readonly<{ g: Lv2Glass; children: React.ReactNode; style?: StyleProp<ViewStyle> }>) {
  const [a] = themePair(g);
  return (
    <View style={[styles.panel, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${mixDark(a, '#18181E', 0.14)}B3`, 'rgba(14,14,18,0.7)']}
        start={DIAG_150.start}
        end={DIAG_150.end}
        style={StyleSheet.absoluteFill}
      />
      {children}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.panelEdge, { boxShadow: ringShadow(MP_COLORS.hairline) }]} />
    </View>
  );
});

/** Три полоски прогресса дней (14×6): закрашены те, что уже «верные». */
export const MiniDots = memo(function MiniDots({ g, n }: Readonly<{ g: Lv2Glass; n: number }>) {
  return (
    <View style={styles.mini}>
      {/* guard-ok: ровно три полоски */ [0, 1, 2].map((i) => <View key={i} style={[styles.miniDot, { backgroundColor: i < n ? g.accent : 'rgba(255,255,255,0.14)' }]} />)}
    </View>
  );
});

/** Ряд панели: слово 18/700, под ним перевод 14, справа — произвольное (полоски, число). Между рядами — тонкая линия. */
export const PanelRow = memo(function PanelRow({ g, title, subtitle, right, first, onPress, testID, danger }: Readonly<{ g: Lv2Glass; title: string; subtitle?: string | null; right?: React.ReactNode; first?: boolean; onPress?: () => void; testID?: string; danger?: boolean }>) {
  const body = (
    <>
      {first ? null : <View pointerEvents="none" style={styles.rowLine} />}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: danger ? MP_COLORS.bad : g.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: g.secondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </>
  );
  return onPress ? (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{body}</Pressable>
  ) : (
    <View testID={testID} style={styles.row}>{body}</View>
  );
});

/** Главная кнопка: 52 высотой, цвет акцента, внутренняя подсветка сверху и свечение снизу (как «ac-cta» макета). */
export const PanelCta = memo(function PanelCta({ g, label, onPress, testID, disabled, flex, ghost, trailing }: Readonly<{ g: Lv2Glass; label: string; onPress: () => void; testID?: string; disabled?: boolean; flex?: boolean; ghost?: boolean; trailing?: React.ReactNode }>) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        flex && styles.ctaFlex,
        ghost
          ? { backgroundColor: 'rgba(255,255,255,0.1)', boxShadow: ringShadow('rgba(255,255,255,0.12)') }
          : { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -12, color: `${g.accent}B3` }] },
        disabled && styles.ctaDisabled,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.ctaText, { color: ghost ? '#FFFFFF' : g.accentInk }]}>{label}</Text>
      {trailing}
      {ghost ? null : <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ctaEdge, { boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.7)' }] }]} />}
    </Pressable>
  );
});

/** Нижняя панель экрана: кнопки поверх плавного затемнения (макет «.bot2»). */
export const PanelDock = memo(function PanelDock({ children }: Readonly<{ children: React.ReactNode }>) {
  const insets = useStableSafeAreaInsets();
  return (
    <View style={styles.dock} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(12,12,13,0)', 'rgba(12,12,13,0.92)', 'rgba(12,12,13,0.92)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ paddingBottom: Math.max(20, insets.bottom + 12) }}>{children}</View>
    </View>
  );
});

/** Строка шторки-меню: плитка с иконкой и название (макет «.gl.opt»). */
export function SheetRow({ g, icon, title, danger, onPress, testID }: Readonly<{ g: Lv2Glass; icon: keyof typeof Ionicons.glyphMap; title: string; danger?: boolean; onPress: () => void; testID: string }>) {
  const [a] = themePair(g);
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <LinearGradient pointerEvents="none" colors={[`${mixDark(a, '#18181E', 0.14)}B3`, 'rgba(14,14,18,0.7)']} start={{ x: 0.25, y: 0.07 }} end={{ x: 0.75, y: 0.93 }} style={StyleSheet.absoluteFill} />
      <View style={styles.menuTile}>
        <Ionicons name={icon} size={20} color={danger ? MP_COLORS.bad : g.text} />
      </View>
      <Text style={[styles.menuText, { color: danger ? MP_COLORS.bad : g.text }]}>{title}</Text>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.menuEdge, { boxShadow: ringShadow(MP_COLORS.hairline) }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.82 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 8, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6 },
  ring: { alignSelf: 'center' },
  ringBig: { marginTop: 14 },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  chipsScroll: { marginHorizontal: -20, flexGrow: 0, marginTop: 22, marginBottom: 8 },
  chips: { paddingHorizontal: 20, gap: 8 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  panel: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 4, overflow: 'hidden' },
  panelEdge: { borderRadius: 24 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: MP_COLORS.hairline },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 18, lineHeight: 21, fontWeight: '700' },
  rowSub: { marginTop: 2, fontSize: 14, lineHeight: 17 },
  mini: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  miniDot: { width: 14, height: 6, borderRadius: 3 },
  cta: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 24 },
  ctaFlex: { flex: 1 },
  ctaDisabled: { opacity: 0.5 },
  ctaEdge: { borderRadius: 26 },
  ctaText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  menuRow: { minHeight: 62, marginTop: 10, borderRadius: 20, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingLeft: 10, paddingRight: 16 },
  menuEdge: { borderRadius: 20 },
  menuTile: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  menuText: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 20 },
});

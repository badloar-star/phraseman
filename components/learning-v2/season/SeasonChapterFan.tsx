// ════════════════════════════════════════════════════════════════════════════
// SeasonChapterFan.tsx — «Вся глава»: карты главы веером (эталон course-hybrid-1-4.html, `h2Chapter`, `fan`, `.c4fan`, `.fcard`, `pills`, `sel12`).
//
// зачем (владелец 21.10): «Вся глава» раскладывает все карты главы (8 эпизодов + экзамен) веером, выбранная приподнята и крупнее, под веером — выбранный
// эпизод и кнопка; сверху — выбор главы пилюлями (пройдена ✓ / текущая / закрыта 🔒). Тап по карте веера выбирает её; тап по уже выбранной возвращает в карусель.
// Веер статичный (без жеста): 9 карт по 7,5° от −30°, transformOrigin 50% 220% — как в эталоне. Размеры и цвета карт — те же, что у карусели.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LinearGradient } from '../../SafeLinearGradient';
import { useLv2Glass } from '../LearningV2Glass';
import type { SeasonArt } from './season_art';
import type { SeasonCardState } from './season_course_model';

const WHITE = '#FFFFFF'; // theme-exempt: текст на градиентной карте белый в обеих темах (эталон `.fcard { color: #fff }`)
const MUTE = 'rgba(8,10,18,0.38)'; // theme-exempt: затемнение закрытой карты, эталон `.fcard.lock::after`
const SHADOW = '0 14px 30px -14px rgba(0,0,0,0.55)'; // theme-exempt: тень карты веера, эталон `.fcard`
const EXAM_LIGHT = ['#262447', '#12142A'] as const; // theme-exempt: фон карты экзамена, эталон `.c4exam`
const EXAM_DARK = ['#0B3442', '#04141C'] as const; // theme-exempt: фон карты экзамена, эталон `.th-marine .c4exam`

export type SeasonFanCard = Readonly<{
  key: string;
  kind: 'episode' | 'exam';
  state: SeasonCardState;
  ordinal: number;
  art: SeasonArt;
  /** Текст на выбранной карте: фраза эпизода или «Экзамен главы». */
  phrase: string;
}>;

export type SeasonFanChapterPill = Readonly<{ ordinal: number; label: string; state: 'done' | 'open' | 'current' | 'locked' }>;

export type SeasonChapterFanProps = Readonly<{
  dark: boolean;
  lessonTitle: string;
  topPadding: number;
  avatarSlot?: React.ReactNode;
  sectionKicker: string;
  sectionTitle: string;
  sectionRight: string;
  pills: readonly SeasonFanChapterPill[];
  onPickChapter: (ordinal: number) => void;
  onPickChapterTitle: () => void;
  cards: readonly SeasonFanCard[];
  selected: number;
  onSelect: (index: number) => void;
  /** Тап по уже выбранной карте — вернуться в карусель на ней. */
  onReturn: (index: number) => void;
  selKicker: string;
  selTitle: string;
  primary: Readonly<{ label: string; onPress: () => void }> | null;
}>;

const FAN_STEP_DEG = 7.5;
const FAN_START_DEG = -30;

function FanCard({ card, index, selected, dark, onPress }: Readonly<{ card: SeasonFanCard; index: number; selected: boolean; dark: boolean; onPress: () => void }>) {
  const rotate = `${FAN_START_DEG + index * FAN_STEP_DEG}deg`;
  const style = [
    styles.fcard,
    selected ? styles.fcardSel : null,
    { zIndex: selected ? 20 : index, transform: [{ rotate }, { translateY: selected ? -40 : 0 }] },
  ];
  return (
    <Pressable hitSlop={4} accessibilityRole="button" onPress={onPress} style={style} testID={`season-fan-card-${index}`}>
      {card.kind === 'exam'
        ? <LinearGradient colors={dark ? EXAM_DARK : EXAM_LIGHT} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
        : <LinearGradient colors={[card.art.from, card.art.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />}
      <View style={styles.n}>
        {card.kind === 'exam' ? <Ionicons name="trophy" size={14} color={WHITE} /> : selected ? <Ionicons name="play" size={12} color={WHITE} /> : null}
        {card.kind === 'exam' ? null : <Text style={styles.nText}>{card.ordinal}</Text>}
      </View>
      {selected ? <Text style={styles.p} numberOfLines={3}>{card.phrase}</Text> : null}
      {card.state === 'locked' ? <View style={styles.mute} pointerEvents="none" /> : null}
    </Pressable>
  );
}

function SeasonChapterFan(props: SeasonChapterFanProps) {
  const g = useLv2Glass();
  return (
    <View testID="season-fan">
      <View style={{ height: props.topPadding }} />
      <View style={styles.nav}>
        <Text accessibilityRole="header" style={[styles.navTitle, { color: g.text }]} numberOfLines={1}>{props.lessonTitle}</Text>
        {props.avatarSlot ?? null}
      </View>
      <View style={styles.section}>
        <Pressable hitSlop={8} accessibilityRole="button" onPress={props.onPickChapterTitle} style={styles.sectionLeft}>
          <Text style={[styles.sectionKicker, { color: g.secondary }]}>{props.sectionKicker}</Text>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: g.text }]} numberOfLines={2}>{props.sectionTitle}</Text>
            <Ionicons name="chevron-down" size={14} color={g.secondary} />
          </View>
        </Pressable>
        <Text style={[styles.sectionRight, { color: g.secondary }]}>{props.sectionRight}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} style={styles.pillsScroll} testID="season-fan-pills">
        {/* guard-ok: пилюль глав не больше семи, виртуализация не нужна */}
        {props.pills.map((pill) => (
          <Pressable
            key={pill.ordinal}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: pill.state === 'current' }}
            onPress={() => props.onPickChapter(pill.ordinal)}
            style={[styles.pill, { backgroundColor: pill.state === 'current' ? g.ctaFill : g.opaqueControl }]}
          >
            {pill.state === 'done' ? <Ionicons name="checkmark" size={13} color={g.text} /> : pill.state === 'locked' ? <Ionicons name="lock-closed" size={13} color={g.secondary} /> : null}
            <Text style={[styles.pillText, { color: pill.state === 'current' ? g.ctaFillInk : pill.state === 'locked' ? g.secondary : g.text }]}>{pill.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.fan}>
        {props.cards.map((card, index) => (
          <FanCard
            key={card.key}
            card={card}
            index={index}
            selected={index === props.selected}
            dark={props.dark}
            onPress={() => (index === props.selected ? props.onReturn(index) : props.onSelect(index))}
          />
        ))}
      </View>
      <View style={styles.sel}>
        <Text style={[styles.selKicker, { color: g.secondary }]}>{props.selKicker}</Text>
        <Text style={[styles.selTitle, { color: g.text }]} numberOfLines={3}>{props.selTitle}</Text>
        {props.primary ? (
          <Pressable hitSlop={6} accessibilityRole="button" onPress={props.primary.onPress} style={[styles.solid, { backgroundColor: g.ctaFill }]} testID="season-fan-primary">
            <Ionicons name="play" size={18} color={g.ctaFillInk} />
            <Text style={[styles.solidText, { color: g.ctaFillInk }]}>{props.primary.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingHorizontal: 20 },
  navTitle: { flex: 1, fontSize: 19, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  section: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 20, paddingTop: 22 },
  sectionLeft: { flex: 1, minWidth: 0 },
  sectionKicker: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { flexShrink: 1, fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  sectionRight: { paddingBottom: 3, fontSize: 16, lineHeight: 21, fontVariant: ['tabular-nums'] },
  pillsScroll: { marginTop: 16, flexGrow: 0 },
  pills: { gap: 8, paddingHorizontal: 20 },
  pill: { height: 40, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  fan: { height: 300, marginTop: 18 },
  fcard: { position: 'absolute', left: '50%', bottom: 52, width: 88, height: 132, marginLeft: -44, borderRadius: 16, overflow: 'hidden', padding: 10, boxShadow: SHADOW, transformOrigin: '50% 220%' },
  fcardSel: { width: 112, height: 160, marginLeft: -56 },
  n: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: WHITE },
  p: { marginTop: 'auto', fontSize: 13, lineHeight: 17, fontWeight: '700', color: WHITE },
  mute: { ...StyleSheet.absoluteFillObject, backgroundColor: MUTE },
  sel: { alignItems: 'center', paddingHorizontal: 20 },
  selKicker: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
  selTitle: { marginTop: 2, fontSize: 21, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  solid: { marginTop: 14, alignSelf: 'stretch', height: 54, borderRadius: 27, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  solidText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
});

export default memo(SeasonChapterFan);

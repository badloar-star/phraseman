// ════════════════════════════════════════════════════════════════════════════
// SeasonExpandedCard.tsx — раскрытая карта эпизода или экзамена поверх экрана (эталон course-hybrid-1-4.html `.h2zoom` + `c4front`, chapter-exam-season.html `zoomX`).
//
// зачем (владелец 21.10): тап по центральной карте карусели раскрывает её крупно: метка «Эпизод N», справа число заданий (у закрытого — «просмотр» и крестик),
// крупная фраза, перевод, название эпизода, слова чипами, у закрытого — строка «Откроется после эпизода N» и кнопки «К эпизоду N» / «Открыть экзаменом главы».
// Действие экзамена («Открыть экзаменом главы», «Сдать экзамен») показывается ТОЛЬКО при включённом флаге SEASON_CHAPTER_EXAM_ENABLED: логики экзамена в коде
// ещё нет (её сделает Learning V2), а карта не должна вести в пустоту. Закрытие мгновенное (тап по затемнению, крестик); вход — один спокойный ease-out 220 мс.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import V2Pressable from '../../v2/V2Pressable';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LinearGradient } from '../../SafeLinearGradient';
import type { SeasonArt } from './season_art';
import type { SeasonCardState } from './season_course_model';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const WHITE = '#FFFFFF'; // theme-exempt: текст на градиентной карте белый в обеих темах (эталон `.c4card { color: #fff }`)
const WHITE_SOFT = 'rgba(255,255,255,0.86)'; // theme-exempt: вторичный текст на карте, эталон `.c4card .ru`
const GLYPH = 'rgba(255,255,255,0.11)'; // theme-exempt: крупный значок главы, эталон `.c4card .gl`
const GLASS = 'rgba(255,255,255,0.16)'; // theme-exempt: стеклянные чипы и кнопки на карте, эталон `.qchip.glass`
const MUTE = 'rgba(8,10,18,0.32)'; // theme-exempt: затемнение закрытой карты, эталон `.c4card.mute::before`
const INK = '#121318'; // theme-exempt: текст белой кнопки, эталон `.qbtn.white`
const DIM_LIGHT = 'rgba(23,24,30,0.38)'; // theme-exempt: затемнение экрана под раскрытой картой, эталон `--dimc` (Сумерки)
const DIM_DARK = 'rgba(0,0,0,0.5)'; // theme-exempt: затемнение экрана под раскрытой картой, эталон `--dimc` (Океан)
const EXAM_LIGHT = ['#262447', '#12142A'] as const; // theme-exempt: фон карты экзамена, эталон `.c4exam`
const EXAM_DARK = ['#0B3442', '#04141C'] as const; // theme-exempt: фон карты экзамена, эталон `.th-marine .c4exam`
const SHADOW = '0 26px 50px -22px rgba(0,0,0,0.6)'; // theme-exempt: тень раскрытой карты, эталон `--sh2`

export type SeasonExpandedAction = Readonly<{ label: string; icon: IonName; onPress: () => void }>;

export type SeasonExpandedCardProps = Readonly<{
  kind: 'episode' | 'exam';
  state: SeasonCardState;
  dark: boolean;
  art: SeasonArt;
  glyph: IonName;
  /** Метка в левом верхнем углу: «Эпизод 14» или «Экзамен главы». */
  chipLabel: string;
  /** Справа сверху: «20 заданий» (доступная карта) или «просмотр» (закрытая, вместе с крестиком). */
  rightLabel: string | null;
  /** Крупная фраза (эпизод) или название экзамена. */
  phrase: string;
  translation: string | null;
  title: string | null;
  words: readonly string[];
  /** Строка «Откроется после эпизода N» у закрытой карты. */
  lockLine: string | null;
  primary: SeasonExpandedAction | null;
  secondary: SeasonExpandedAction | null;
  closeLabel: string;
  onClose: () => void;
  reducedMotion: boolean;
}>;

function SeasonExpandedCard(p: SeasonExpandedCardProps) {
  const enter = useRef(new Animated.Value(p.reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (p.reducedMotion) { enter.setValue(1); return; }
    Animated.timing(enter, { toValue: 1, duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }).start();
  }, [enter, p.reducedMotion]);

  const locked = p.state === 'locked';
  const cardStyle = { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] };
  return (
    <View style={styles.root} testID="season-expanded">
      <Pressable style={[styles.dim, { backgroundColor: p.dark ? DIM_DARK : DIM_LIGHT }]} onPress={p.onClose} accessibilityRole="button" accessibilityLabel={p.closeLabel} />
      <Animated.View style={[styles.card, cardStyle]}>
        {p.kind === 'exam' ? (
          <LinearGradient colors={p.dark ? EXAM_DARK : EXAM_LIGHT} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : (
          <>
            <LinearGradient colors={[p.art.from, p.art.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={[p.art.glow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.6 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={styles.glyph} pointerEvents="none"><Ionicons name={p.glyph} size={230} color={GLYPH} /></View>
          </>
        )}
        <View style={styles.top}>
          {p.kind === 'exam' ? <View style={styles.seal}><Ionicons name="trophy" size={24} color={WHITE} /></View> : (
            <View style={styles.chip}>
              {locked ? <Ionicons name="lock-closed" size={13} color={WHITE} /> : null}
              <Text style={styles.chipText}>{p.chipLabel}</Text>
            </View>
          )}
          <View style={styles.flex} />
          {p.rightLabel ? <Text style={styles.right}>{p.rightLabel}</Text> : null}
          {locked ? (
            <V2Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={p.closeLabel} onPress={p.onClose} style={styles.round} testID="season-expanded-close">
              <Ionicons name="close" size={16} color={WHITE} />
            </V2Pressable>
          ) : null}
        </View>
        <Text style={styles.big} numberOfLines={4}>{p.phrase}</Text>
        {p.translation ? <Text style={styles.sub}>{p.translation}</Text> : null}
        {p.title ? <Text style={styles.title}>{p.title}</Text> : null}
        {p.words.length > 0 ? (
          <View style={styles.chips}>{p.words.map((w) => <View key={w} style={styles.wordChip}><Text style={styles.wordText}>{w}</Text></View>)}</View>
        ) : null}
        {p.lockLine ? (
          <View style={styles.lockRow}><Ionicons name="lock-closed" size={16} color={WHITE_SOFT} /><Text style={styles.lockText}>{p.lockLine}</Text></View>
        ) : null}
        {p.primary ? (
          <V2Pressable hitSlop={6} accessibilityRole="button" onPress={p.primary.onPress} style={styles.primary} testID="season-expanded-primary">
            <Ionicons name={p.primary.icon} size={18} color={INK} />
            <Text style={styles.primaryText}>{p.primary.label}</Text>
          </V2Pressable>
        ) : null}
        {p.secondary ? (
          <V2Pressable hitSlop={6} accessibilityRole="button" onPress={p.secondary.onPress} style={styles.secondary} testID="season-expanded-secondary">
            <Ionicons name={p.secondary.icon} size={18} color={WHITE} />
            <Text style={styles.secondaryText}>{p.secondary.label}</Text>
          </V2Pressable>
        ) : null}
        {locked ? <View style={styles.mute} pointerEvents="none" /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { ...StyleSheet.absoluteFillObject, zIndex: 40 },
  dim: { ...StyleSheet.absoluteFillObject },
  card: { position: 'absolute', left: 24, right: 24, top: 128, maxHeight: 560, minHeight: 440, borderRadius: 32, overflow: 'hidden', padding: 18, boxShadow: SHADOW },
  glyph: { position: 'absolute', right: -40, top: 40, transform: [{ rotate: '-8deg' }] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: GLASS },
  chipText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: WHITE },
  seal: { width: 46, height: 46, borderRadius: 14, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  right: { fontSize: 13, lineHeight: 17, color: WHITE_SOFT },
  round: { width: 34, height: 34, borderRadius: 17, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  big: { marginTop: 40, fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6, color: WHITE },
  sub: { marginTop: 6, fontSize: 16, lineHeight: 21, color: WHITE_SOFT },
  title: { marginTop: 14, fontSize: 19, lineHeight: 24, fontWeight: '700', color: WHITE },
  chips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordChip: { height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  wordText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: WHITE },
  lockRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockText: { flex: 1, fontSize: 16, lineHeight: 21, color: WHITE_SOFT },
  primary: { marginTop: 16, height: 54, borderRadius: 27, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: WHITE },
  primaryText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: INK },
  secondary: { marginTop: 12, height: 50, borderRadius: 25, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: GLASS },
  secondaryText: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: WHITE },
  mute: { ...StyleSheet.absoluteFillObject, backgroundColor: MUTE },
});

export default memo(SeasonExpandedCard);

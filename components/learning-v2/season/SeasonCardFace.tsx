// ════════════════════════════════════════════════════════════════════════════
// SeasonCardFace.tsx — лицо одной карты карусели «Сезона» (эталон course-hybrid-1-4.html, `.h2c`, `flowCard`).
//
// зачем (владелец 21.10): карта эпизода — градиентная обложка оттенка своей главы: крупный значок главы за текстом, метка «✓/▶/🔒 N»,
// ключевая фраза эпизода внизу; текущий эпизод — полоска прогресса по нижнему краю; закрытый — приглушён затемнением. Карта экзамена — фиолетовая
// «печать» с трофеем и названием. Размеры — из SEASON_CAROUSEL; цвета градиента приходят готовыми (season_art), текст на карте белый в обеих темах.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LinearGradient } from '../../SafeLinearGradient';
import type { SeasonArt } from './season_art';
import { SEASON_CAROUSEL } from './season_carousel_layout';
import type { SeasonCardState } from './season_course_model';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const WHITE = '#FFFFFF'; // theme-exempt: текст и значки на градиентной обложке белые в обеих темах (эталон `.h2c { color: #fff }`)
const GLYPH = 'rgba(255,255,255,0.12)'; // theme-exempt: крупный значок главы за текстом, эталон `.h2c .gl`
const CHIP = 'rgba(0,0,0,0.24)'; // theme-exempt: метка с номером, эталон `.h2c .n`
const TRACK = 'rgba(255,255,255,0.26)'; // theme-exempt: дорожка прогресса на карте, эталон `.h2c .prog`
const MUTE = 'rgba(8,10,18,0.36)'; // theme-exempt: затемнение закрытой карты, эталон `.h2c.mute::after`
const SEAL = 'rgba(255,255,255,0.16)'; // theme-exempt: печать экзамена, эталон `.h2c.cx .seal`
const EXAM_FROM_LIGHT = ['#262447', '#12142A'] as const; // theme-exempt: фон карты экзамена, эталон `.c4exam` (Сумерки)
const EXAM_FROM_DARK = ['#0B3442', '#04141C'] as const; // theme-exempt: фон карты экзамена, эталон `.th-marine .c4exam` (Океан)
const SHADOW = '0 22px 40px -20px rgba(0,0,0,0.65)'; // theme-exempt: тень карты, эталон `.h2c { box-shadow }`

export type SeasonCardFaceProps = Readonly<{
  kind: 'episode' | 'exam';
  state: SeasonCardState;
  /** Номер для метки (эпизод) или для названия (экзамен главы N). */
  ordinal: number;
  art: SeasonArt;
  dark: boolean;
  /** Значок главы (Ionicons) за текстом. */
  glyph: IonName;
  /** Ключевая фраза эпизода (внизу карты) или название экзамена. */
  phrase: string;
  /** Доля пройденного текущего эпизода 0…1 — полоска внизу; null — полоски нет. */
  progress: number | null;
}>;

function SeasonCardFace({ kind, state, ordinal, art, dark, glyph, phrase, progress }: SeasonCardFaceProps) {
  if (kind === 'exam') {
    const colors = dark ? EXAM_FROM_DARK : EXAM_FROM_LIGHT;
    return (
      <View style={[styles.card, styles.examCard]}>
        <LinearGradient colors={colors} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.seal}><Ionicons name="trophy" size={24} color={WHITE} /></View>
        <Text style={styles.phrase} numberOfLines={3}>{phrase}</Text>
        {state === 'locked' ? <View style={styles.mute} pointerEvents="none" /> : null}
      </View>
    );
  }
  const markIcon: IonName = state === 'locked' ? 'lock-closed' : state === 'done' ? 'checkmark' : 'play';
  return (
    <View style={styles.card}>
      <LinearGradient colors={[art.from, art.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[art.glow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.6 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.glyph} pointerEvents="none"><Ionicons name={glyph} size={150} color={GLYPH} /></View>
      <View style={styles.mark}>
        <Ionicons name={markIcon} size={12} color={WHITE} />
        <Text style={styles.markText}>{ordinal}</Text>
      </View>
      <Text style={styles.phrase} numberOfLines={3}>{phrase}</Text>
      {state === 'current' && progress !== null ? (
        <View style={styles.progTrack}><View style={[styles.progFill, { width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }]} /></View>
      ) : null}
      {state === 'locked' ? <View style={styles.mute} pointerEvents="none" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SEASON_CAROUSEL.cardWidth,
    height: SEASON_CAROUSEL.cardHeight,
    borderRadius: SEASON_CAROUSEL.cardRadius,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    justifyContent: 'space-between',
    boxShadow: SHADOW,
  },
  examCard: { padding: 14 },
  glyph: { position: 'absolute', right: -26, top: -14, transform: [{ rotate: '-8deg' }] },
  mark: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: CHIP },
  markText: { fontSize: 13, lineHeight: 17, fontWeight: '700', color: WHITE },
  phrase: { fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3, color: WHITE },
  seal: { width: 46, height: 46, borderRadius: 14, backgroundColor: SEAL, alignItems: 'center', justifyContent: 'center' },
  progTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: TRACK },
  progFill: { height: 4, backgroundColor: WHITE },
  mute: { ...StyleSheet.absoluteFillObject, backgroundColor: MUTE },
});

export default memo(SeasonCardFace);

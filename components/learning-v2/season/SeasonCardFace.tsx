// ════════════════════════════════════════════════════════════════════════════
// SeasonCardFace.tsx — лицо одной карты карусели «Сезона» (эталон course-hybrid-1-4.html, `.h2c`, `flowCard`).
//
// зачем (владелец 21.10): карта эпизода — градиентная обложка оттенка своей главы: крупный значок главы за текстом, метка «✓/▶/🔒 N»,
// ключевая фраза эпизода внизу; текущий эпизод — полоска прогресса по нижнему краю; закрытый — приглушён затемнением. Карта экзамена — фиолетовая
// «печать» с трофеем и названием. Размеры — из SEASON_CAROUSEL; цвета градиента приходят готовыми (season_art), текст на карте белый в обеих темах.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LinearGradient } from '../../SafeLinearGradient';
import type { SeasonArt } from './season_art';
import { SEASON_CAROUSEL } from './season_carousel_layout';
import type { SeasonCardState } from './season_course_model';
import type { SeasonStarTones } from './season_star_tones';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const WHITE = '#FFFFFF'; // theme-exempt: текст и значки на градиентной обложке белые в обеих темах (эталон `.h2c { color: #fff }`)
const CHIP = 'rgba(0,0,0,0.24)'; // theme-exempt: метка с номером, эталон `.h2c .n`
const TRACK = 'rgba(255,255,255,0.26)'; // theme-exempt: дорожка прогресса на карте, эталон `.h2c .prog`
const MUTE = 'rgba(8,10,18,0.36)'; // theme-exempt: затемнение закрытой карты, эталон `.h2c.mute::after`
const SEAL = 'rgba(255,255,255,0.16)'; // theme-exempt: печать экзамена, эталон `.h2c.cx .seal`
const STARS_FADE_MS = 180; // мягкое появление звёзд после готовности (координатор 22.10: 150–200 мс)
const SHADOW = '0 22px 40px -20px rgba(0,0,0,0.65)'; // theme-exempt: тень карты, эталон `.h2c { box-shadow }`

export type SeasonCardFaceProps = Readonly<{
  kind: 'episode' | 'exam';
  state: SeasonCardState;
  /** Номер для метки (эпизод) или для названия (экзамен главы N). */
  ordinal: number;
  art: SeasonArt;
  dark: boolean;
  /** Не рисуется (владелец 22.10: «текстурки убирай»); проп оставлен, чтобы не менять вызовы. */
  glyph: IonName;
  /** Ключевая фраза эпизода (внизу карты) или название экзамена. */
  phrase: string;
  /** Доля пройденного текущего эпизода 0…1 — полоска внизу; null — полоски нет. */
  progress: number | null;
  /** Звёзды результата 0–3 пройденного эпизода: ряд по центру карточки сразу под крупным номером (владелец 22.10); null — звёзд нет (текущий, закрытый). */
  /** 'pending' — звёзды занятий ещё не подняты в память: звёзд нет (не «1»), после готовности они проявляются мягко. */
  stars?: number | 'pending' | null;
  starTones?: SeasonStarTones;
  /** Растёт на каждый тап по закрытой карте: плашка с замком коротко трясётся (UI-тред). 0 — не трясти. */
  shakeSeq?: number;
}>;

function SeasonCardFace({ kind, state, ordinal, art, dark, phrase, progress, stars = null, starTones, shakeSeq = 0 }: SeasonCardFaceProps) {
  // зачем (координатор 22.10): звёзды — мягкий fade 180 мс, когда подняты в память (без «прыжка» 1 → 3)
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «звёздочки даже если не пройдено — просто пустые» — три звезды на КАЖДОЙ карточке; у закрытых и текущей пустые (контур, seasonStarTones.empty), у пройденных заполнены по результату;
  // 'pending' (звёзды занятий ещё не подняты в память) — ряд скрыт и проявляется мягко, чтобы не было «прыжка» пустые → заполненные
  const starsShown = stars !== 'pending' && starTones !== undefined;
  const starsFilled = typeof stars === 'number' ? stars : 0;
  const starsOpacity = useSharedValue(starsShown ? 1 : 0);
  useEffect(() => { starsOpacity.value = withTiming(starsShown ? 1 : 0, { duration: STARS_FADE_MS }); }, [starsOpacity, starsShown]);
  const starsFade = useAnimatedStyle(() => ({ opacity: starsOpacity.value }));
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «просто пусть вибрирует и замочек трясется!» — тап по закрытому эпизоду: вибрация (в SeasonCourse) + короткая тряска плашки с замком здесь, на UI-треде; модала нет
  const reducedMotion = useReducedMotion();
  const lockX = useSharedValue(0);
  useEffect(() => {
    if (shakeSeq <= 0 || reducedMotion) return;
    lockX.value = withSequence(withTiming(-5, { duration: 50 }), withTiming(5, { duration: 80 }), withTiming(-4, { duration: 80 }), withTiming(3, { duration: 70 }), withTiming(0, { duration: 60 }));
  }, [lockX, reducedMotion, shakeSeq]);
  const lockShake = useAnimatedStyle(() => ({ transform: [{ translateX: lockX.value }] }));
  if (kind === 'exam') {
    const colors = [art.from, art.to] as const; // зачем (закон владельца 22.10): печать экзамена — тёмный оттенок текущей темы, не фиксированный фиолетовый/бирюзовый
    return (
      <View style={[styles.card, styles.examCard]}>
        <LinearGradient colors={colors} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.seal} testID="season-exam-seal"><Ionicons name="trophy" size={24} color={WHITE} /></View>
        <Text style={styles.phrase} numberOfLines={3}>{phrase}</Text>
        {/* зачем (координатор 24.10, замки владельца 22.10 «замки справа сверху» и «замочек трясётся»): у закрытого экзамена — та же плашка замка, что у эпизода,
            и трясётся именно она; кубок остаётся эмблемой. Плашка под приглушением, как у эпизода, и не в потоке — печать и название не сдвигаются */}
        {state === 'locked' ? (
          <Animated.View style={[styles.mark, styles.examMark, lockShake]} testID="season-exam-lock" pointerEvents="none">
            <Ionicons name="lock-closed" size={12} color={WHITE} />
          </Animated.View>
        ) : null}
        {state === 'locked' ? <View style={styles.mute} pointerEvents="none" /> : null}
      </View>
    );
  }
  // зачем (Learning V2 84d5b73d0, владелец 21.10 №8/№10 «ПРОСТО ОТКРЫТЫ»): 'open' — эпизод открыт экзаменом или входным тестом: играбельный, но не пройден — без замка и без галочки, плашка только с номером, звёзды пустые;
  // замок — ТОЛЬКО у 'locked', ✓ — у 'done', ▶ — у 'current'
  const markIcon: IonName | null = state === 'locked' ? 'lock-closed' : state === 'done' ? 'checkmark' : state === 'current' ? 'play' : null;
  return (
    <View style={styles.card}>
      <LinearGradient colors={[art.from, art.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[art.glow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.6 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Animated.View style={[styles.mark, lockShake]} testID="season-card-mark">
        {markIcon ? <Ionicons name={markIcon} size={12} color={WHITE} /> : null}
        <Text style={styles.markText}>{ordinal}</Text>
      </Animated.View>
      {/* зачем (владелец 22.10, выбор варианта 3): по центру карточки крупный номер, под ним звёзды результата (у пройденных, в том числе у боковых; у текущей — полоска прогресса внизу, у закрытых звёзд нет);
          название эпизода и «Эпизод N» — под каруселью. Строка звёзд занимает место на всех карточках, чтобы номера стояли на одной высоте и не прыгали, когда звёзды проявляются */}
      <View style={styles.centerWrap} pointerEvents="none">
        <Text style={styles.bigNumber}>{ordinal}</Text>
        <Animated.View style={[styles.stars, starsFade]} testID="season-card-stars" accessibilityElementsHidden importantForAccessibility="no">
          {starTones ? [1, 2, 3].map((i) => <Ionicons key={i} name={i <= starsFilled ? 'star' : 'star-outline'} size={18} color={i <= starsFilled ? starTones.filled : starTones.empty} />) : null}
        </Animated.View>
      </View>
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
  examMark: { position: 'absolute', top: 14, right: 14 },
  // зачем (владелец 22.10 по скриншоту карусели: «замочки справа, а не слева»): плашка «🔒 / ✓ / ▶ + номер» — в правом верхнем углу, одно место для всех карточек (центральной и боковых, закрытых, пройденных и текущей)
  mark: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 5, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: CHIP },
  markText: { fontSize: 13, lineHeight: 17, fontWeight: '700', color: WHITE },
  centerWrap: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center', justifyContent: 'center' },
  bigNumber: { fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -1, color: WHITE },
  stars: { marginTop: 6, height: 18, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  phrase: { fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3, color: WHITE },
  seal: { width: 46, height: 46, borderRadius: 14, backgroundColor: SEAL, alignItems: 'center', justifyContent: 'center' },
  progTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: TRACK },
  progFill: { height: 4, backgroundColor: WHITE },
  mute: { ...StyleSheet.absoluteFillObject, backgroundColor: MUTE },
});

export default memo(SeasonCardFace);

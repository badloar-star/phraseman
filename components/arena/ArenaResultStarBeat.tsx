import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTournamentPalette } from '../ui/v2_theme';
import { useLang } from '../LangContext';
import { arenaText } from '../../modules/arena/copy';
import { CHK, SUITE } from '../../constants/motionHybrid';
import { ArenaStarGlyph } from './ArenaStarGlyph';
import { GoldDustFall } from './ArenaImpactFx';
import { arenaRankView } from '../../modules/arena/rank_engine';

/**
 * Звёздный такт на экране итога (без смены ранга).
 *
 * зачем: владелец (2026-08-23), премиум-макет phraseman-arena-stars.html,
 * сцены A/B/C. Победа: звезда прилетает сверху и садится ударом (нимб,
 * кольцо, пыль, отдача ряда). Поражение: звезда «выдыхает» — сжимается и
 * гаснет, без красного и без звука. Ничья: ряд один раз дышит.
 *
 * Смены ранга здесь НЕ бывает — те случаи забирает полноэкранная сцена
 * ArenaRankChangeHybrid; этот такт живёт в карточке объявления.
 */
export function ArenaResultStarBeat({ ratingAfter, ratingDelta, rankLabel, isDraw, reduceMotion, onImpact }: Readonly<{
  ratingAfter: number;
  /** +1 победа, −1 поражение, 0 ничья. */
  ratingDelta: number;
  rankLabel: string;
  isDraw: boolean;
  reduceMotion: boolean;
  /** Момент посадки победной звезды — родитель вешает звук/хаптику/вспышку. */
  onImpact?: () => void;
}>) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const after = arenaRankView(ratingAfter);
  const to = after.starsInRank;
  const win = ratingDelta > 0;
  const loss = ratingDelta < 0;
  const from = Math.max(0, Math.min(3, win ? to - 1 : loss ? to + 1 : to));
  // зачем: на ранг-апе to===0 (счётчик обнулился при переходе в новый ранг) —
  // без клампа beatIndex уходил в -1, ни один из 3 слотов не совпадал, и удар
  // (звук/хаптика/вспышка через onImpact) молча не срабатывал именно в момент
  // повышения ранга. Клампим в последний слот: звезда переполнилась через край.
  const beatIndex = win ? Math.max(0, Math.min(2, to - 1)) : loss ? to : -1;
  const [filled, setFilled] = useState(reduceMotion ? to : from);
  const [landed, setLanded] = useState(false);

  const rowScale = useSharedValue(1);
  const rowY = useSharedValue(0);
  const beatY = useSharedValue(0);
  const beatScaleX = useSharedValue(1);
  const beatScaleY = useSharedValue(1);
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(0.55);
  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.55);
  const deltaOpacity = useSharedValue(0);
  const deltaY = useSharedValue(10);
  const onImpactRef = useRef(onImpact);
  onImpactRef.current = onImpact;

  useEffect(() => {
    if (reduceMotion) { setFilled(to); deltaOpacity.value = 1; deltaY.value = 0; return; }
    setFilled(from);
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Строка ±1 — первой: она объясняет, что сейчас произойдёт со звездой.
    deltaOpacity.value = withDelay(170, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }));
    deltaY.value = withDelay(170, withSpring(0, SUITE.pulse));
    if (win) {
      timers.push(setTimeout(() => {
        setFilled(to);
        // Полёт: звезда рождается над рядом и падает в слот с ускорением.
        beatY.value = withSequence(
          withTiming(-30, { duration: 0 }),
          withTiming(-34, { duration: CHK.anticipMs, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: CHK.fallMs, easing: Easing.bezier(...CHK.fallBezier) }),
        );
      }, 430));
      timers.push(setTimeout(() => {
        setLanded(true);
        onImpactRef.current?.();
        beatScaleY.value = withSequence(withTiming(0.72, { duration: 0 }), withSpring(1, CHK.squash));
        beatScaleX.value = withSequence(withTiming(1.3, { duration: 0 }), withSpring(1, CHK.squash));
        haloOpacity.value = withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 680, easing: Easing.linear }));
        haloScale.value = withSequence(withTiming(0.55, { duration: 0 }), withTiming(2.3, { duration: 680, easing: Easing.out(Easing.quad) }));
        ringOpacity.value = withSequence(withTiming(0.9, { duration: 0 }), withTiming(0, { duration: CHK.ringPrimaryMs, easing: Easing.linear }));
        ringScale.value = withSequence(withTiming(0.55, { duration: 0 }), withTiming(2.4, { duration: CHK.ringPrimaryMs, easing: Easing.out(Easing.quad) }));
        rowY.value = withSequence(withTiming(4, { duration: 0 }), withSpring(0, SUITE.pulse));
      }, 430 + CHK.anticipMs + CHK.fallMs));
    } else if (loss) {
      timers.push(setTimeout(() => {
        setFilled(to);
        // «Выдох»: тихое сжатие без красного — потеря спокойная.
        beatScaleX.value = withSequence(withTiming(0.72, { duration: 140, easing: Easing.out(Easing.quad) }), withSpring(1, SUITE.pulse));
        beatScaleY.value = withSequence(withTiming(0.72, { duration: 140, easing: Easing.out(Easing.quad) }), withSpring(1, SUITE.pulse));
      }, 430));
    } else if (isDraw) {
      // Ничья: ряд один раз дышит — «увидено, без изменений».
      rowScale.value = withDelay(380, withSequence(
        withTiming(1.02, { duration: 170, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 250, easing: Easing.inOut(Easing.ease) }),
      ));
    }
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      cancelAnimation(rowScale); cancelAnimation(rowY);
      cancelAnimation(beatY); cancelAnimation(beatScaleX); cancelAnimation(beatScaleY);
      cancelAnimation(haloOpacity); cancelAnimation(haloScale);
      cancelAnimation(ringOpacity); cancelAnimation(ringScale);
      cancelAnimation(deltaOpacity); cancelAnimation(deltaY);
    };
    // зачем: хореография собирается один раз на монтирование карточки итога.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: rowY.value }, { scale: rowScale.value }] }));
  const beatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: beatY.value }, { scaleX: beatScaleX.value }, { scaleY: beatScaleY.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: haloOpacity.value, transform: [{ scale: haloScale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ringOpacity.value, transform: [{ scale: ringScale.value }] }));
  const deltaStyle = useAnimatedStyle(() => ({ opacity: deltaOpacity.value, transform: [{ translateY: deltaY.value }] }));

  const deltaLabel = win ? '+1 ★' : loss ? '−1 ★' : arenaText(lang, 'starsIntact');
  const deltaColor = win ? P.accent : loss ? P.danger : P.muted;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${rankLabel}. ${arenaText(lang, 'rankStars')}: ${to}/3. ${deltaLabel}`}>
      <Text style={[styles.rankLabel, { color: P.muted }]}>{rankLabel}</Text>
      <Reanimated.View style={[styles.row, rowStyle]}>
        {[0, 1, 2].map((index) => {
          const icon = <ArenaStarGlyph lit={index < filled} size={24} />;
          if (index !== beatIndex) return <View key={index}>{icon}</View>; // guard-ok: три фиксированных слота
          return (
            <View key={index} style={styles.beatWrap}>{/* guard-ok: три фиксированных слота, порядок не меняется */}
              <Reanimated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
              <Reanimated.View pointerEvents="none" style={[styles.ring, ringStyle]}>
                <View style={[styles.ringHole, { backgroundColor: P.card }]} />
              </Reanimated.View>
              <Reanimated.View style={beatStyle}>{icon}</Reanimated.View>
              {landed ? <GoldDustFall delayMs={120} count={10} reduceMotion={reduceMotion} /> : null}
            </View>
          );
        })}
      </Reanimated.View>
      <Reanimated.Text style={[styles.delta, isDraw ? styles.deltaQuiet : null, deltaStyle, { color: deltaColor }]}>
        {deltaLabel}
      </Reanimated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  rankLabel: { fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  beatWrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 34, height: 34, borderRadius: 17, opacity: 0, backgroundColor: '#FFD43B' },
  ring: { position: 'absolute', width: 36, height: 36, borderRadius: 18, opacity: 0, backgroundColor: '#FFE082', alignItems: 'center', justifyContent: 'center' },
  ringHole: { width: 32, height: 32, borderRadius: 16 },
  // Высота строки зарезервирована с первого кадра: без прыжка вёрстки.
  delta: { fontSize: 19, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -0.3, minHeight: 24 },
  deltaQuiet: { fontSize: 13, fontWeight: '800' },
});

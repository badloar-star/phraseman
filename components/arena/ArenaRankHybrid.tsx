// ════════════════════════════════════════════════════════════════════════════
//  ArenaRankHybrid — гибридная (Световод + Чекан) подача смены ранга/тира на
//  экране итогов матча Арены. Три сцены — точная копия макета-эталона
//  .motion-mockups/phraseman-arena-hybrid.html (варианты A/B/C):
//
//   A «Штамп ранга» (tier_up)   — ПОЛНЫЙ гибрид: блум → карточка из света
//     (posadka 150/22 без отскока) → щит переходит в замах и падает ударом
//     Чекана (squash 260/5, отдача карточки 6px, два кольца, 10 частиц света
//     по кромке). Единственная кульминация — герой удара.
//   B «Шаг ранга» (rank_up)     — ТОЛЬКО база Световода: тихий баннер на
//     самом экране итогов (без модалки), число дивизиона тикает на UI-потоке,
//     блик пробегает один раз, баннер уходит сам (exit короче входа).
//   C «Тихая ступень» (tier_down) — обратный Световод: вуаль сверху вместо
//     блума снизу, карточка ОСЕДАЕТ с короткой контролируемой отдачей,
//     приглушённые частицы уходят вниз. Тёплая бронза, не траур; CTA «Реванш».
//
//  Терминология экрана — РАНГ (владелец, D-40), не «лига»: тир = золотой щит
//  Арены, а не клубная лига.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import Reanimated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';
import DuoPressable from '../DuoPressable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTournamentPalette } from '../ui/v2_theme';
import { ARENA_TIER_KEYS, type ArenaTierKey } from '../../modules/arena/rank_engine';
import { arenaText } from '../../modules/arena/copy';
import { useLang } from '../LangContext';
import { LUM, CHK, SUITE } from '../../constants/motionHybrid';
import { ARENA_RANK_HYBRID_COLORS } from '../../constants/motionHybridPalettes';
import { noAndroidOutline } from '../../constants/androidGlow';
import { hapticLightImpact, hapticSuccess, hapticWarning } from '../../hooks/use-haptics';
import { useArenaSound } from '../../hooks/use_arena_sound';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { ArenaRankAnnounce } from '../../modules/arena/result_view';
import PressableHybrid from '../PressableHybrid';

const TIER_COPY: Record<ArenaTierKey, 'tierBronze' | 'tierSilver' | 'tierGold' | 'tierPlatinum' | 'tierDiamond' | 'tierMaster' | 'tierGrandmaster' | 'tierLegend'> = {
  bronze: 'tierBronze',
  silver: 'tierSilver',
  gold: 'tierGold',
  platinum: 'tierPlatinum',
  diamond: 'tierDiamond',
  master: 'tierMaster',
  grandmaster: 'tierGrandmaster',
  legend: 'tierLegend',
};

const DIVISION_ROMAN: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' };

/**
 * Звёзды ранга в сцене итога — «удар» по изменившейся звезде.
 *
 * Владелец (2026-08-23): победа +1 звезда, поражение −1, три звезды — новый
 * ранг. Сцена обязана ПОКАЗАТЬ звезду, а не только сменившийся номер деления:
 * выигранная вспыхивает пружиной с золотым нимбом, потерянная гаснет.
 *
 * Переход через границу ранга — двумя тактами: сначала ряд СТАРОГО ранга
 * дожимается (третья звезда встаёт / последняя гаснет), затем ряд мягко
 * перезаряжается под новый ранг. Так игрок видит и «за что», и «где я теперь».
 *
 * Вся хореография на shared values + два setTimeout — как в соседних сценах
 * файла; JS-поток не тикает по кадрам.
 */
function RankStarsBeat({ fromFilled, toFilled, direction, startDelayMs, reduceMotion, size = 20 }: {
  fromFilled: number;
  toFilled: number;
  direction: 'up' | 'down';
  startDelayMs: number;
  reduceMotion: boolean;
  size?: number;
}) {
  const P = useTournamentPalette();
  const from = Math.max(0, Math.min(3, Math.trunc(fromFilled)));
  const to = Math.max(0, Math.min(3, Math.trunc(toFilled)));
  // Через границу ранга: вверх ряд сначала ДОПОЛНЯЕТСЯ до трёх, вниз —
  // опустошается до нуля, и только потом перезаряжается под новый ранг.
  const crossing = direction === 'up' ? to <= from : to >= from;
  const beatFilled = direction === 'up' ? (crossing ? 3 : to) : (crossing ? 0 : to);
  const beatIndex = direction === 'up' ? beatFilled - 1 : beatFilled;
  const [filled, setFilled] = useState(reduceMotion ? to : from);
  const rowOpacity = useSharedValue(1);
  const beatScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(0.6);

  useEffect(() => {
    if (reduceMotion) { setFilled(to); return; }
    setFilled(from);
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      setFilled(beatFilled);
      if (direction === 'up') {
        beatScale.value = withSequence(withTiming(1.45, { duration: 0 }), withSpring(1, SUITE.pulse));
        haloOpacity.value = withSequence(withTiming(0.85, { duration: 0 }), withTiming(0, { duration: 640, easing: Easing.linear }));
        haloScale.value = withSequence(withTiming(0.6, { duration: 0 }), withTiming(2.4, { duration: 640, easing: Easing.out(Easing.quad) }));
      } else {
        beatScale.value = withSequence(withTiming(0.72, { duration: 140, easing: Easing.out(Easing.quad) }), withSpring(1, SUITE.pulse));
      }
    }, startDelayMs));
    if (crossing) {
      // Второй такт: ряд гаснет, под затемнением меняется на счёт нового
      // ранга и проявляется обратно.
      timers.push(setTimeout(() => {
        rowOpacity.value = withSequence(
          withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
        );
      }, startDelayMs + 780));
      timers.push(setTimeout(() => setFilled(to), startDelayMs + 980));
    }
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      cancelAnimation(rowOpacity); cancelAnimation(beatScale);
      cancelAnimation(haloOpacity); cancelAnimation(haloScale);
    };
    // зачем: хореография собирается один раз на монтирование сцены — как в
    // соседних сценах этого файла.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const rowStyle = useAnimatedStyle(() => ({ opacity: rowOpacity.value }));
  const beatStyle = useAnimatedStyle(() => ({ transform: [{ scale: beatScale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: haloOpacity.value, transform: [{ scale: haloScale.value }] }));

  return (
    <Reanimated.View style={[styles.starsRow, rowStyle]}>
      {[0, 1, 2].map((index) => {
        const lit = index < filled;
        const icon = (
          <Ionicons
            name={lit ? 'star' : 'star-outline'}
            size={size}
            color={lit ? P.gold : P.muted}
            style={lit ? undefined : styles.starDim}
          />
        );
        if (index !== beatIndex) return <View key={index}>{icon}</View>; // guard-ok: три фиксированных слота
        return (
          <View key={index} style={styles.starBeatWrap}>{/* guard-ok: три фиксированных слота, порядок не меняется */}
            <Reanimated.View pointerEvents="none" style={[styles.starHalo, haloStyle, { backgroundColor: P.gold }]} />
            <Reanimated.View style={beatStyle}>{icon}</Reanimated.View>
          </View>
        );
      })}
    </Reanimated.View>
  );
}

/** Метал щита по тиру — бронза для нижних, серебро/золото для остальных. Ровно как в макете. */
function shieldMetal(tierIndex: number): { a: string; b: string; c: string; edge: string; spark: string } {
  return tierIndex === 0
    ? ARENA_RANK_HYBRID_COLORS.bronzeShield
    : ARENA_RANK_HYBRID_COLORS.lightShield;
}

/** Эмблема ранга — тот же геральдический щит, что на макете, чистый SVG (не эмодзи). */
const RankShield = memo(function RankShield({ tierIndex, size = 82 }: { tierIndex: number; size?: number }) {
  const M = shieldMetal(tierIndex);
  const h = Math.round((size * 108) / 96);
  return (
    <Svg width={size} height={h} viewBox="0 0 96 108">
      <Defs>
        <SvgLinearGradient id="m" x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor={M.a} />
          <Stop offset="0.45" stopColor={M.b} />
          <Stop offset="1" stopColor={M.c} />
        </SvgLinearGradient>
        <SvgLinearGradient id="e" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={M.b} />
          <Stop offset="1" stopColor={M.edge} />
        </SvgLinearGradient>
        <SvgLinearGradient id="s" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={M.spark} stopOpacity={0.9} />
          <Stop offset="0.5" stopColor={M.spark} stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <Path d="M48 4 L86 16 V52 C86 76 70 94 48 104 C26 94 10 76 10 52 V16 Z" fill="url(#e)" />
      <Path d="M48 9 L81 19.5 V52 C81 73 67 89.5 48 98.5 C29 89.5 15 73 15 52 V19.5 Z" fill="url(#m)" />
      <Path d="M48 9 L81 19.5 V38 C60 46 36 46 15 38 V19.5 Z" fill="url(#s)" opacity={0.55} />
      <Path
        d="M48 30 L54.5 43.5 L69 45.5 L58.5 55.5 L61 70 L48 63 L35 70 L37.5 55.5 L27 45.5 L41.5 43.5 Z"
        fill={M.edge}
        opacity={0.5}
      />
    </Svg>
  );
});

interface RankHybridProps {
  reduceMotion: boolean;
  onDone?: () => void;
  transitionLabel: string;
}

// ─── A. «Штамп ранга» (tier_up) — полный гибрид ────────────────────────────

export interface ArenaTierUpHybridProps extends RankHybridProps {
  tierIndex: number;
  starsAwarded: number;
  chestUnlocked: boolean;
  /** Звёзды ранга до и после матча — для ряда из трёх пипсов. */
  fromStars: number;
  toStars: number;
}

/** Порядок и число частиц-искр по кромке при ударе — как в макете (10 штук). */
const DUST_COUNT = 10;
const DUST_INDICES = Array.from({ length: DUST_COUNT }, (_, i) => i);

function ArenaTierUpHybridImpl({ tierIndex, starsAwarded, chestUnlocked, fromStars, toStars, reduceMotion, onDone, transitionLabel }: ArenaTierUpHybridProps) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const playSound = useArenaSound();

  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.82);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1.06);
  const cardY = useSharedValue(0);
  const embY = useSharedValue(-150);
  const embScale = useSharedValue(1.42);
  const embOpacity = useSharedValue(0);
  const embScaleX = useSharedValue(1);
  const embScaleY = useSharedValue(1);
  const kickerOpacity = useSharedValue(0);
  const kickerY = useSharedValue(10);
  const headlineOpacity = useSharedValue(0);
  const headlineY = useSharedValue(10);
  const bodyOpacity = useSharedValue(0);
  const bodyY = useSharedValue(10);
  const rimOpacity = useSharedValue(0);
  const ring0Scale = useSharedValue(0.5);
  const ring0Opacity = useSharedValue(0);
  const ring1Scale = useSharedValue(0.5);
  const ring1Opacity = useSharedValue(0);
  const rewardsOpacity = useSharedValue(0);
  const rewardsX = useSharedValue(-12);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(12);
  const dustOpacity = useSharedValue(0);

  useEffect(() => {
    const L = LUM.ladder;
    const CL = CHK.ladder;

    if (reduceMotion) {
      bloomOpacity.value = 0;
      cardOpacity.value = 1; cardScale.value = 1; cardY.value = 0;
      embOpacity.value = 1; embY.value = 0; embScale.value = 1; embScaleX.value = 1; embScaleY.value = 1;
      kickerOpacity.value = 1; kickerY.value = 0;
      headlineOpacity.value = 1; headlineY.value = 0;
      bodyOpacity.value = 1; bodyY.value = 0;
      rewardsOpacity.value = 1; rewardsX.value = 0;
      ctaOpacity.value = 1; ctaY.value = 0;
      rimOpacity.value = 0; dustOpacity.value = 0;
      playSound('rankUp');
      void hapticSuccess();
      return;
    }

    bloomOpacity.value = withTiming(1, { duration: LUM.bloomMs, easing: Easing.out(Easing.quad) });
    bloomScale.value = withTiming(1.28, { duration: 900, easing: Easing.out(Easing.quad) });

    cardOpacity.value = withDelay(L[1], withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.quad) }));
    cardScale.value = withDelay(L[1], withSpring(1, LUM.settle));

    const anticipDelay = L[2] + 140;
    embOpacity.value = withDelay(anticipDelay, withTiming(1, { duration: 110, easing: Easing.linear }));

    function onImpact() {
      playSound('rankUp');
      void hapticSuccess();
      embScaleY.value = withSpring(1, CHK.squash);
      embScaleX.value = withSequence(withTiming(1.16, { duration: 0 }), withSpring(1, CHK.squash));
      cardY.value = withSequence(withTiming(6, { duration: 0 }), withSpring(0, CHK.recoil));

      ring0Opacity.value = withSequence(withTiming(0.8, { duration: 0 }), withTiming(0, { duration: 720, easing: Easing.linear }));
      ring0Scale.value = withTiming(3.2, { duration: 720, easing: Easing.out(Easing.quad) });
      ring1Opacity.value = withDelay(90, withSequence(withTiming(0.5, { duration: 0 }), withTiming(0, { duration: 920, easing: Easing.linear })));
      ring1Scale.value = withDelay(90, withTiming(4.2, { duration: 920, easing: Easing.out(Easing.quad) }));

      dustOpacity.value = withSequence(withTiming(0.9, { duration: 0 }), withTiming(0, { duration: 820, easing: Easing.linear }));

      rimOpacity.value = withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: LUM.rimMs, easing: Easing.linear }));

      kickerOpacity.value = withDelay(80, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }));
      kickerY.value = withDelay(80, withSpring(0, SUITE.text));
      const headDelay = CL[2] - CL[1] + 80;
      headlineOpacity.value = withDelay(headDelay, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }));
      headlineY.value = withDelay(headDelay, withSpring(0, SUITE.text));
      const bodyDelay = CL[3] - CL[1] + 80;
      bodyOpacity.value = withDelay(bodyDelay, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }));
      bodyY.value = withDelay(bodyDelay, withSpring(0, SUITE.text));

      const rewardsDelay = CL[3];
      rewardsOpacity.value = withDelay(rewardsDelay, withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }));
      rewardsX.value = withDelay(rewardsDelay, withSpring(0, SUITE.row));

      const ctaDelay = CL[4] + 60;
      ctaOpacity.value = withDelay(ctaDelay, withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }));
      ctaY.value = withDelay(ctaDelay, withSpring(0, SUITE.row));

    }

    embY.value = withDelay(anticipDelay, withSequence(
      withTiming(-176, { duration: CHK.anticipMs, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: CHK.fallMs, easing: Easing.bezier(...CHK.fallBezier) }, (finished) => {
        if (finished) runOnJS(onImpact)();
      }),
    ));
    embScale.value = withDelay(anticipDelay + CHK.anticipMs, withTiming(1, { duration: CHK.fallMs, easing: Easing.bezier(...CHK.fallBezier) }));

    return () => {
      cancelAnimation(bloomOpacity); cancelAnimation(bloomScale);
      cancelAnimation(cardOpacity); cancelAnimation(cardScale); cancelAnimation(cardY);
      cancelAnimation(embY); cancelAnimation(embScale); cancelAnimation(embOpacity);
      cancelAnimation(embScaleX); cancelAnimation(embScaleY);
      cancelAnimation(kickerOpacity); cancelAnimation(kickerY);
      cancelAnimation(headlineOpacity); cancelAnimation(headlineY);
      cancelAnimation(bodyOpacity); cancelAnimation(bodyY);
      cancelAnimation(rimOpacity); cancelAnimation(ring0Scale); cancelAnimation(ring0Opacity);
      cancelAnimation(ring1Scale); cancelAnimation(ring1Opacity);
      cancelAnimation(rewardsOpacity); cancelAnimation(rewardsX);
      cancelAnimation(ctaOpacity); cancelAnimation(ctaY); cancelAnimation(dustOpacity);
    };
    // зачем: хореография собирается один раз на монтирование сцены (тир не
    // меняется в рамках одного показа) — не на каждый ре-рендер темы/языка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, tierIndex]);

  const bloomStyle = useAnimatedStyle(() => ({ opacity: bloomOpacity.value, transform: [{ scale: bloomScale.value }] }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value, transform: [{ scale: cardScale.value }, { translateY: cardY.value }] }));
  const embStyle = useAnimatedStyle(() => ({
    opacity: embOpacity.value,
    transform: [{ translateY: embY.value }, { scale: embScale.value }, { scaleX: embScaleX.value }, { scaleY: embScaleY.value }],
  }));
  const kickerStyle = useAnimatedStyle(() => ({ opacity: kickerOpacity.value, transform: [{ translateY: kickerY.value }] }));
  const headlineStyle = useAnimatedStyle(() => ({ opacity: headlineOpacity.value, transform: [{ translateY: headlineY.value }] }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOpacity.value, transform: [{ translateY: bodyY.value }] }));
  const rimStyle = useAnimatedStyle(() => ({ opacity: rimOpacity.value }));
  const ring0Style = useAnimatedStyle(() => ({ opacity: ring0Opacity.value, transform: [{ scale: ring0Scale.value }] }));
  const ring1Style = useAnimatedStyle(() => ({ opacity: ring1Opacity.value, transform: [{ scale: ring1Scale.value }] }));
  const rewardsStyle = useAnimatedStyle(() => ({ opacity: rewardsOpacity.value, transform: [{ translateX: rewardsX.value }] }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value, transform: [{ translateY: ctaY.value }] }));

  const dustLayers = useMemo(() => DUST_INDICES.map((i) => {
    const ang = -Math.PI + (i / (DUST_COUNT - 1)) * Math.PI;
    const dist = 42 + (i % 4) * 20;
    return { key: i, dx: Math.cos(ang) * dist, dy: -(46 + (i % 4) * 14) };
  }), []);

  const tierName = arenaText(lang, TIER_COPY[ARENA_TIER_KEYS[Math.max(0, Math.min(7, tierIndex))]]);

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <Reanimated.View pointerEvents="none" style={[styles.bloom, bloomStyle, { backgroundColor: P.gold }]} />
      <Reanimated.View style={[styles.card, cardStyle, { backgroundColor: P.card }, noAndroidOutline]}>
        <View style={styles.embWrap}>
          {dustLayers.map((d) => (
            <DustSpark key={d.key} dx={d.dx} dy={d.dy} opacity={dustOpacity} color={P.gold} />
          ))}
          {/* Ударные кольца: тонкое кольцо рисуем ДВУМЯ вложенными закрашенными
              кругами (внешний тон минус внутренняя "дыра" фона карточки),
              а не обводкой — так же дёшево, но без borderWidth/borderColor. */}
          <Reanimated.View pointerEvents="none" style={[styles.ring, ring0Style, { backgroundColor: P.gold }]}>
            <View style={[styles.ringHole, { backgroundColor: P.card }]} />
          </Reanimated.View>
          <Reanimated.View pointerEvents="none" style={[styles.ring, ring1Style, { backgroundColor: P.gold }]}>
            <View style={[styles.ringHole, { backgroundColor: P.card }]} />
          </Reanimated.View>
          <Reanimated.View pointerEvents="none" style={[styles.rimGlow, rimStyle, { backgroundColor: P.gold }]} />
          <Reanimated.View style={embStyle}>
            <RankShield tierIndex={tierIndex} />
          </Reanimated.View>
        </View>
        <Reanimated.View style={kickerStyle}>
          <View style={[styles.pill, { backgroundColor: P.gold + '26' }]}>
            <Text style={[styles.pillText, { color: P.gold }]}>{arenaText(lang, 'resultTierUp')}</Text>
          </View>
        </Reanimated.View>
        <Reanimated.Text style={[styles.headline, headlineStyle, { color: P.text }]}>{tierName}</Reanimated.Text>
        <Text style={[styles.transitionText, { color: P.text }]}>{transitionLabel}</Text>
        {/* Звезда победы бьёт в такт удару щита: третья встаёт — ряд
            перезаряжается под новый ранг. */}
        <RankStarsBeat
          fromFilled={fromStars}
          toFilled={toStars}
          direction="up"
          startDelayMs={LUM.ladder[2] + 140 + CHK.anticipMs + CHK.fallMs + 140}
          reduceMotion={reduceMotion}
          size={22}
        />
        <Reanimated.Text style={[styles.body, bodyStyle, { color: P.muted }]}>
          {arenaText(lang, 'tierUpBody')}
        </Reanimated.Text>
        <Reanimated.View style={[styles.rewardsCol, rewardsStyle]}>
          <RewardRow icon="star" color={P.gold} title={arenaText(lang, 'tierUpStarsTitle').replace('{n}', String(starsAwarded))} sub={arenaText(lang, 'tierUpStarsSub')} P={P} />
          {chestUnlocked ? (
            <RewardRow icon="gift" color={P.accent} title={arenaText(lang, 'tierUpChestTitle')} sub={arenaText(lang, 'tierUpChestSub')} P={P} />
          ) : null}
        </Reanimated.View>
        <Reanimated.View style={ctaStyle}>
          <DuoPressable onPress={onDone} edgeColor={P.card} edgeHeight={4} style={[styles.cta, { backgroundColor: P.gold }]}>
            <Text style={[styles.ctaText, { color: ARENA_RANK_HYBRID_COLORS.tierUpCtaText }]}>{arenaText(lang, 'tierUpCta')}</Text>
          </DuoPressable>
        </Reanimated.View>
      </Reanimated.View>
    </View>
  );
}

const DustSpark = memo(function DustSpark({ dx, dy, opacity, color }: {
  dx: number; dy: number; opacity: SharedValue<number>; color: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: opacity.value > 0 ? dx * (1 - opacity.value + 0.001) : dx },
      { translateY: opacity.value > 0 ? dy * (1 - opacity.value + 0.001) : dy },
    ],
  }));
  return <Reanimated.View pointerEvents="none" style={[styles.dust, style, { backgroundColor: color }]} />;
});

function RewardRow({ icon, color, title, sub, P }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; color: string; title: string; sub: string;
  P: ReturnType<typeof useTournamentPalette>;
}) {
  return (
    <View style={[styles.rewardRow, { backgroundColor: P.elev }]}>
      <View style={[styles.rewardIcon, { backgroundColor: color + '26' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rewardTitle, { color: P.text }]}>{title}</Text>
        <Text style={[styles.rewardSub, { color: P.muted }]}>{sub}</Text>
      </View>
    </View>
  );
}

export const ArenaTierUpHybrid = memo(ArenaTierUpHybridImpl);

// ─── B. «Шаг ранга» (rank_up) — только база ────────────────────────────────

export interface ArenaRankStepHybridProps extends RankHybridProps {
  tierIndex: number;
  fromDivision: 1 | 2 | 3;
  toDivision: 1 | 2 | 3;
  direction: 'up' | 'down';
  /** Звёзды ранга до и после матча — для ряда из трёх пипсов. */
  fromStars: number;
  toStars: number;
}

function ArenaRankStepHybridImpl({ tierIndex, fromDivision, toDivision, direction, fromStars, toStars, reduceMotion, onDone, transitionLabel }: ArenaRankStepHybridProps) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const playSound = useArenaSound();

  const bannerOpacity = useSharedValue(0);
  const bannerY = useSharedValue(14);
  const sweepX = useSharedValue(-70);
  const sweepOpacity = useSharedValue(0);
  const numScale = useSharedValue(1);
  const numOpacity = useSharedValue(1);
  const [displayDivision, setDisplayDivision] = useState<1 | 2 | 3>(fromDivision);

  useEffect(() => {
    const L = LUM.ladder;

    if (reduceMotion) {
      bannerOpacity.value = 1; bannerY.value = 0;
      sweepOpacity.value = 0;
      setDisplayDivision(toDivision);
      playSound(direction === 'up' ? 'rankUp' : 'rankDown');
      void (direction === 'up' ? hapticLightImpact() : hapticWarning());
      return;
    }

    setDisplayDivision(fromDivision);
    bannerOpacity.value = withDelay(L[1], withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.quad) }));
    bannerY.value = withDelay(L[1], withSpring(0, LUM.settle));

    sweepOpacity.value = withDelay(L[2], withTiming(1, { duration: 10, easing: Easing.linear }));
    sweepX.value = withDelay(L[2], withTiming(300, { duration: 520, easing: Easing.bezier(0.32, 0.72, 0, 1) }, (finished) => {
      if (finished) sweepOpacity.value = 0;
    }));

    const tickAt = L[2] + 250;
    const tickTimer = setTimeout(() => {
      setDisplayDivision(toDivision);
      numOpacity.value = 0.4;
      numOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
      numScale.value = withSequence(withTiming(1.06, { duration: 0 }), withSpring(1, SUITE.pulse));
      playSound(direction === 'up' ? 'rankUp' : 'rankDown');
      void (direction === 'up' ? hapticLightImpact() : hapticWarning());
    }, tickAt);

    const exitAt = 2050;
    const exitTimer = setTimeout(() => {
      bannerOpacity.value = withTiming(0, { duration: LUM.exitMs, easing: Easing.out(Easing.quad) });
      bannerY.value = withTiming(-10, { duration: LUM.exitMs, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      });
    }, exitAt);

    return () => {
      clearTimeout(tickTimer);
      clearTimeout(exitTimer);
      cancelAnimation(bannerOpacity); cancelAnimation(bannerY);
      cancelAnimation(sweepX); cancelAnimation(sweepOpacity);
      cancelAnimation(numScale); cancelAnimation(numOpacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, fromDivision, playSound, reduceMotion, tierIndex, toDivision]);

  const bannerStyle = useAnimatedStyle(() => ({ opacity: bannerOpacity.value, transform: [{ translateY: bannerY.value }] }));
  const sweepStyle = useAnimatedStyle(() => ({ opacity: sweepOpacity.value, transform: [{ translateX: sweepX.value }] }));
  const numStyle = useAnimatedStyle(() => ({ opacity: numOpacity.value, transform: [{ scale: numScale.value }] }));

  const tierName = arenaText(lang, TIER_COPY[ARENA_TIER_KEYS[Math.max(0, Math.min(7, tierIndex))]]);

  return (
    <Reanimated.View style={[styles.rankBanner, bannerStyle, { backgroundColor: P.card }, noAndroidOutline]}>
      <View style={styles.rankBannerEmb}>
        <RankShield tierIndex={tierIndex} size={38} />
      </View>
      <View style={styles.rankBannerText}>
        <Text style={[styles.rankBannerTitle, { color: P.text }]}>{tierName} {DIVISION_ROMAN[toDivision]}</Text>
        <Text style={[styles.rankBannerSub, { color: P.muted }]}>
          {arenaText(lang, direction === 'up' ? 'resultRankUp' : 'resultRankDown')}
        </Text>
        <Text style={[styles.rankBannerSub, { color: P.text }]}>{transitionLabel}</Text>
        {/* Звезда бьёт в такт тику номера деления. */}
        <RankStarsBeat
          fromFilled={fromStars}
          toFilled={toStars}
          direction={direction}
          startDelayMs={LUM.ladder[2] + 250}
          reduceMotion={reduceMotion}
          size={15}
        />
      </View>
      <Reanimated.Text style={[numStyle, styles.rankBannerNum, { color: P.gold }]}>
        {DIVISION_ROMAN[displayDivision]}
      </Reanimated.Text>
      <Reanimated.View pointerEvents="none" style={[styles.sweepMask, sweepStyle]}>
        <LinearGradient
          colors={['transparent', P.gold + '55', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Reanimated.View>
    </Reanimated.View>
  );
}

export const ArenaRankStepHybrid = memo(ArenaRankStepHybridImpl);

// ─── C. «Тихая ступень» (tier_down) ─────────────────────────────────────────

export interface ArenaTierDownHybridProps extends RankHybridProps {
  tierIndex: number;
  starsSaved: number;
  /** Звёзды ранга до и после матча — для ряда из трёх пипсов. */
  fromStars: number;
  toStars: number;
  onRevenge?: () => void;
}

function ArenaTierDownHybridImpl({ tierIndex, starsSaved, fromStars, toStars, reduceMotion, onDone, onRevenge, transitionLabel }: ArenaTierDownHybridProps) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const playSound = useArenaSound();
  const BRONZE = ARENA_RANK_HYBRID_COLORS.bronze;

  const bgOpacity = useSharedValue(0);
  const veilOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(-12);
  const cardX = useSharedValue(0);
  const embOpacity = useSharedValue(0);
  const embScale = useSharedValue(0.94);
  const kickerOpacity = useSharedValue(0);
  const kickerY = useSharedValue(8);
  const headlineOpacity = useSharedValue(0);
  const headlineY = useSharedValue(8);
  const bodyOpacity = useSharedValue(0);
  const bodyY = useSharedValue(8);
  const rewardsOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(8);
  const dustOpacity = useSharedValue(0);

  useEffect(() => {
    const L = LUM.ladder;

    if (reduceMotion) {
      bgOpacity.value = 1; veilOpacity.value = 1;
      cardOpacity.value = 1; cardY.value = 0; cardX.value = 0;
      embOpacity.value = 1; embScale.value = 1;
      kickerOpacity.value = 1; kickerY.value = 0;
      headlineOpacity.value = 1; headlineY.value = 0;
      bodyOpacity.value = 1; bodyY.value = 0;
      rewardsOpacity.value = 1;
      ctaOpacity.value = 1; ctaY.value = 0; dustOpacity.value = 0;
      playSound('rankDown');
      void hapticWarning();
      return;
    }

    playSound('rankDown');
    void hapticWarning();

    bgOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
    veilOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) });

    cardOpacity.value = withDelay(L[1], withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.quad) }));
    cardY.value = withDelay(L[1], withSpring(0, LUM.settle));

    embOpacity.value = withDelay(L[2], withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }));
    embScale.value = withDelay(L[2], withSpring(1, LUM.settle));
    cardX.value = withDelay(L[2], withSequence(
      withTiming(-4, { duration: 54 }),
      withTiming(4, { duration: 72 }),
      withTiming(-2, { duration: 62 }),
      withSpring(0, LUM.settle),
    ));
    dustOpacity.value = withDelay(L[2], withSequence(
      withTiming(0.42, { duration: 0 }),
      withTiming(0, { duration: 720, easing: Easing.linear }),
    ));

    kickerOpacity.value = withDelay(L[2], withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }));
    kickerY.value = withDelay(L[2], withSpring(0, LUM.settle));
    headlineOpacity.value = withDelay(L[3], withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }));
    headlineY.value = withDelay(L[3], withSpring(0, LUM.settle));
    bodyOpacity.value = withDelay(L[4], withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }));
    bodyY.value = withDelay(L[4], withSpring(0, LUM.settle));

    rewardsOpacity.value = withDelay(L[4] + 92, withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }));

    ctaOpacity.value = withDelay(L[5], withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }));
    ctaY.value = withDelay(L[5], withSpring(0, LUM.settle));

    return () => {
      cancelAnimation(bgOpacity); cancelAnimation(veilOpacity);
      cancelAnimation(cardOpacity); cancelAnimation(cardY); cancelAnimation(cardX);
      cancelAnimation(embOpacity); cancelAnimation(embScale); cancelAnimation(dustOpacity);
      cancelAnimation(kickerOpacity); cancelAnimation(kickerY);
      cancelAnimation(headlineOpacity); cancelAnimation(headlineY);
      cancelAnimation(bodyOpacity); cancelAnimation(bodyY);
      cancelAnimation(rewardsOpacity); cancelAnimation(ctaOpacity); cancelAnimation(ctaY);
    };
  }, [
    bgOpacity,
    bodyOpacity,
    bodyY,
    cardOpacity,
    cardX,
    cardY,
    ctaOpacity,
    ctaY,
    dustOpacity,
    embOpacity,
    embScale,
    headlineOpacity,
    headlineY,
    kickerOpacity,
    kickerY,
    onDone,
    playSound,
    reduceMotion,
    rewardsOpacity,
    tierIndex,
    veilOpacity,
  ]);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veilOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardX.value }, { translateY: cardY.value }],
  }));
  const embStyle = useAnimatedStyle(() => ({ opacity: embOpacity.value, transform: [{ scale: embScale.value }] }));
  const kickerStyle = useAnimatedStyle(() => ({ opacity: kickerOpacity.value, transform: [{ translateY: kickerY.value }] }));
  const headlineStyle = useAnimatedStyle(() => ({ opacity: headlineOpacity.value, transform: [{ translateY: headlineY.value }] }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOpacity.value, transform: [{ translateY: bodyY.value }] }));
  const rewardsStyle = useAnimatedStyle(() => ({ opacity: rewardsOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value, transform: [{ translateY: ctaY.value }] }));

  const tierName = arenaText(lang, TIER_COPY[ARENA_TIER_KEYS[Math.max(0, Math.min(7, tierIndex))]]);
  const dustLayers = useMemo(() => DUST_INDICES.slice(0, 8).map((i) => ({
    key: i,
    dx: ((i % 4) - 1.5) * 24,
    dy: 48 + (i % 3) * 16,
  })), []);

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, bgStyle, { backgroundColor: ARENA_RANK_HYBRID_COLORS.scrim }]} />
      <Reanimated.View pointerEvents="none" style={[styles.veil, veilStyle, { backgroundColor: BRONZE }]} />
      <Reanimated.View style={[styles.card, cardStyle, { backgroundColor: P.card }, noAndroidOutline]}>
        <View style={styles.embWrap}>
          {dustLayers.map((d) => (
            <DustSpark key={d.key} dx={d.dx} dy={d.dy} opacity={dustOpacity} color={BRONZE} />
          ))}
          <Reanimated.View style={embStyle}>
            <RankShield tierIndex={tierIndex} />
          </Reanimated.View>
        </View>
        <Reanimated.View style={kickerStyle}>
          <View style={[styles.pill, { backgroundColor: BRONZE + '26' }]}>
            <Text style={[styles.pillText, { color: BRONZE }]}>{arenaText(lang, 'resultTierDown')}</Text>
          </View>
        </Reanimated.View>
        <Reanimated.Text style={[styles.headline, headlineStyle, { color: P.text }]}>{tierName}</Reanimated.Text>
        <Text style={[styles.transitionText, { color: P.text }]}>{transitionLabel}</Text>
        {/* Потерянная звезда гаснет — ряд перезаряжается под нижний ранг. */}
        <RankStarsBeat
          fromFilled={fromStars}
          toFilled={toStars}
          direction="down"
          startDelayMs={LUM.ladder[2] + 220}
          reduceMotion={reduceMotion}
          size={22}
        />
        <Reanimated.Text style={[styles.body, bodyStyle, { color: P.muted }]}>
          {arenaText(lang, 'tierDownBody')}
        </Reanimated.Text>
        <Reanimated.View style={[styles.rewardsCol, rewardsStyle]}>
          <RewardRow icon="ribbon" color={BRONZE} title={arenaText(lang, 'tierDownSavedTitle').replace('{n}', String(starsSaved))} sub={arenaText(lang, 'tierDownSavedSub')} P={P} />
          <RewardRow icon="return-up-forward" color={P.accent} title={arenaText(lang, 'tierDownRevengeTitle')} sub={arenaText(lang, 'tierDownRevengeSub')} P={P} />
        </Reanimated.View>
        <Reanimated.View style={ctaStyle}>
          {/* зачем: CTA — настоящая клавиша с кромкой и хаптикой (стандарт отклика
              владельца), а не голый View с onTouchEnd без отклика */}
          <DuoPressable
            onPress={onRevenge}
            edgeColor={P.card}
            edgeHeight={4}
            style={[styles.cta, styles.ctaQuiet, { backgroundColor: P.elev }]}
          >
            <Text style={[styles.ctaText, { color: P.text }]}>{arenaText(lang, 'tierDownCta')}</Text>
          </DuoPressable>
        </Reanimated.View>
      </Reanimated.View>
    </View>
  );
}

export const ArenaTierDownHybrid = memo(ArenaTierDownHybridImpl);

export type ArenaRankChangeHybridProps = Readonly<{
  transition: Exclude<ArenaRankAnnounce, { kind: 'none' }>;
  starsAwarded: number;
  chestUnlocked: boolean;
  onDone: () => void;
  onRevenge?: () => void;
}>;

function ArenaRankChangeHybridBase({
  transition,
  starsAwarded,
  chestUnlocked,
  onDone,
  onRevenge,
}: ArenaRankChangeHybridProps) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const rankLabel = (rank: typeof transition.before): string => {
    const tier = arenaText(lang, TIER_COPY[ARENA_TIER_KEYS[rank.tierIndex]]);
    return `${tier} ${DIVISION_ROMAN[rank.division]}`;
  };
  const transitionLabel = `${rankLabel(transition.before)} → ${rankLabel(transition.after)}`;
  const eventLabel = arenaText(lang,
    transition.kind === 'tier_up' ? 'resultTierUp'
      : transition.kind === 'tier_down' ? 'resultTierDown'
        : transition.kind === 'rank_up' ? 'resultRankUp' : 'resultRankDown');
  const announcement = `${eventLabel}. ${transitionLabel}`;

  return (
    <View
      style={styles.overlayRoot}
      pointerEvents="box-none"
      accessibilityViewIsModal
      importantForAccessibility="yes"
    >
      <Text style={styles.srOnly} accessibilityLiveRegion="assertive">{announcement}</Text>
      {transition.kind === 'tier_up' ? (
        <ArenaTierUpHybrid
          tierIndex={transition.after.tierIndex}
          starsAwarded={starsAwarded}
          chestUnlocked={chestUnlocked}
          fromStars={transition.before.starsInRank}
          toStars={transition.after.starsInRank}
          transitionLabel={transitionLabel}
          reduceMotion={reduceMotion}
          onDone={onDone}
        />
      ) : transition.kind === 'tier_down' ? (
        <ArenaTierDownHybrid
          tierIndex={transition.after.tierIndex}
          starsSaved={starsAwarded}
          fromStars={transition.before.starsInRank}
          toStars={transition.after.starsInRank}
          transitionLabel={transitionLabel}
          reduceMotion={reduceMotion}
          onDone={onDone}
          onRevenge={onRevenge}
        />
      ) : (
        <ArenaRankStepHybrid
          tierIndex={transition.after.tierIndex}
          fromDivision={transition.before.division}
          toDivision={transition.after.division}
          direction={transition.kind === 'rank_up' ? 'up' : 'down'}
          fromStars={transition.before.starsInRank}
          toStars={transition.after.starsInRank}
          transitionLabel={transitionLabel}
          reduceMotion={reduceMotion}
          onDone={onDone}
        />
      )}
      <PressableHybrid
        variant="icon"
        accessibilityRole="button"
        accessibilityLabel={arenaText(lang, 'tierUpCta')}
        onPress={onDone}
        style={styles.closeHitbox}
        contentStyle={[styles.closeButton, { backgroundColor: P.elev }]}
      >
        <Ionicons name="close" size={23} color={P.text} />
      </PressableHybrid>
    </View>
  );
}

export const ArenaRankChangeHybrid = memo(ArenaRankChangeHybridBase);

const styles = StyleSheet.create({
  overlayRoot: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  bloom: { position: 'absolute', width: 260, height: 260, borderRadius: 130, opacity: 0 },
  veil: { position: 'absolute', left: 0, right: 0, top: 0, height: 140, opacity: 0.14 },
  card: {
    width: '92%', maxWidth: 380, borderRadius: 26, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18,
    alignItems: 'center', gap: 4,
    // Перф-потолок проекта — shadowRadius ~16 (см. androidGlow.ts); elevation
    // безопасен, т.к. фон карточки непрозрачный (P.card задаётся инлайн).
    shadowColor: ARENA_RANK_HYBRID_COLORS.shadow, shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  embWrap: { width: 96, height: 108, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  ring: { position: 'absolute', width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  ringHole: { width: 88, height: 88, borderRadius: 44 },
  rimGlow: { position: 'absolute', width: 108, height: 108, borderRadius: 54, opacity: 0 },
  dust: { position: 'absolute', width: 5, height: 5, borderRadius: 3, top: 50 },
  starsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  starDim: { opacity: 0.45 },
  starBeatWrap: { alignItems: 'center', justifyContent: 'center' },
  starHalo: { position: 'absolute', width: 30, height: 30, borderRadius: 15, opacity: 0 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 6 },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  headline: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  transitionText: { fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  body: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 2, marginBottom: 10, maxWidth: 300 },
  rewardsCol: { width: '100%', gap: 8, marginBottom: 14 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 10 },
  rewardIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rewardTitle: { fontSize: 13, fontWeight: '700' },
  rewardSub: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  cta: { width: '100%', minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaQuiet: {},
  ctaText: { fontSize: 15, fontWeight: '700' },

  rankBanner: {
    position: 'absolute', left: 18, right: 18, top: 96,
    flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, padding: 12,
    overflow: 'hidden',
    shadowColor: ARENA_RANK_HYBRID_COLORS.shadow, shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  rankBannerEmb: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  rankBannerText: { flex: 1 },
  rankBannerTitle: { fontSize: 15, fontWeight: '700' },
  rankBannerSub: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  rankBannerNum: { fontSize: 21, fontWeight: '700', letterSpacing: -0.4, minWidth: 30, textAlign: 'right' },
  sweepMask: { position: 'absolute', top: 0, bottom: 0, width: 70 },
  closeHitbox: { position: 'absolute', right: 18, top: 48, width: 44, height: 44, zIndex: 3, alignSelf: 'auto' },
  closeButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});

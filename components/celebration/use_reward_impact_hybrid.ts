// ─── ГИБРИД «Световод + Чекан»: общий движок наград-кульминаций ────────────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена M3
// «Сундук-награда» (celebration-семья: BoonChest/LevelGift/SeasonGift/…).
// Перенесено ВТОЧНОСТИ: блум → карточка выходит из света (LUM.settle, без
// отскока) → герой-награда падает и БЬЁТ (CHK.squash + отдача карточки
// CHK.recoil, закон №1 «удар только у героя кульминации») → кольца+пыль
// (rarity задаёт силу: common — тихая база без колец/пыли, rare/epic —
// bloom сильнее и удар читается) → каскад строк/CTA лестницей LUM/CHK.ladder.
// Один хук на все 11 celebration-модалок — чтобы хореография не разъезжалась
// от файла к файлу и isLowEndDevice/Reduce Motion гейтились в одном месте.
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CHK, LUM } from '../../constants/motionHybrid';
import { isLowEndDevice } from '../../hooks/device_perf_tier';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { hapticSuccess } from '../../hooks/use-haptics';
import { soundDirector } from '../../modules/audio/sound_director';

export type RewardImpactRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Сила блума/колец по редкости — common тише, epic/legendary читаются сильнее (закон владельца). */
const RARITY_STRENGTH: Record<RewardImpactRarity, { bloomTo: number; rings: boolean; dust: number }> = {
  common: { bloomTo: 1.1, rings: false, dust: 0 },
  rare: { bloomTo: 1.2, rings: true, dust: 8 },
  epic: { bloomTo: 1.32, rings: true, dust: 12 },
  legendary: { bloomTo: 1.4, rings: true, dust: 12 },
};

export interface RewardImpactHybridOptions {
  visible: boolean;
  /**
   * зачем: сундуку нужен раздельный сценарий — «карточка входит из света сразу,
   * а удар героя — только по тапу». armed = момент удара; по умолчанию равен
   * visible (вход и удар одной последовательностью — как у остальных наград).
   */
  armed?: boolean;
  rarity?: RewardImpactRarity;
  /** Проигрывается на ударе героя. По умолчанию — сундук/подарок (закон семьи). */
  impactSoundId?: 'pm.reward.chest_open';
  /** Дедуп-ключ для soundDirector — по умолчанию берётся из scope. */
  scope: string;
}

const DUST_SLOTS = 12;

export function useRewardImpactHybrid({
  visible,
  armed,
  rarity = 'common',
  impactSoundId = 'pm.reward.chest_open',
  scope,
}: RewardImpactHybridOptions) {
  const reduceMotion = useReduceMotion();
  const lowEnd = isLowEndDevice(Platform);
  const strength = RARITY_STRENGTH[rarity];
  const dustCount = lowEnd ? 0 : strength.dust;

  const backdropOpacity = useSharedValue(0);
  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.82);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1.06);
  const cardRecoilY = useSharedValue(0);
  const heroY = useSharedValue(-150);
  const heroScale = useSharedValue(1.42);
  const heroOpacity = useSharedValue(0);
  const heroScaleX = useSharedValue(1.16);
  const heroScaleY = useSharedValue(0.84);
  const ring0Scale = useSharedValue(0.5);
  const ring0Opacity = useSharedValue(0.8);
  const ring1Scale = useSharedValue(0.5);
  const ring1Opacity = useSharedValue(0.5);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(10);
  const rowsOpacity = useSharedValue(0);
  const rowsY = useSharedValue(10);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(8);

  const onImpactRef = useRef<() => void>(() => {});

  const handleImpact = useCallback(() => {
    'worklet';
    heroScaleY.value = withSpring(1, CHK.squash);
    heroScaleX.value = withSpring(1, CHK.squash);
    cardRecoilY.value = withSequence(
      withTiming(CHK.recoilShiftPx, { duration: 0 }),
      withSpring(0, CHK.recoil),
    );
    if (strength.rings && !lowEnd) {
      ring0Scale.value = withTiming(3.2, { duration: 720, easing: Easing.out(Easing.cubic) });
      ring0Opacity.value = withTiming(0, { duration: 720, easing: Easing.linear });
      ring1Scale.value = withDelay(90, withTiming(4.2, { duration: 920, easing: Easing.out(Easing.cubic) }));
      ring1Opacity.value = withDelay(90, withTiming(0, { duration: 920, easing: Easing.linear }));
    }
    runOnJS(hapticSuccess)();
    runOnJS(onImpactRef.current)();

    textOpacity.value = withDelay(80, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
    textY.value = withDelay(80, withSpring(0, { mass: 0.7, damping: 14, stiffness: 160 }));
    rowsOpacity.value = withDelay(CHK.ladder[3], withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
    rowsY.value = withDelay(CHK.ladder[3], withSpring(0, { mass: 0.7, damping: 14, stiffness: 160 }));
    ctaOpacity.value = withDelay(CHK.ladder[4] + 60, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
    ctaY.value = withDelay(CHK.ladder[4] + 60, withSpring(0, { mass: 0.7, damping: 14, stiffness: 160 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowEnd, strength.rings]);

  useEffect(() => {
    if (!visible) return undefined;

    if (reduceMotion) {
      // зачем: закон Motion DNA — Reduce Motion = один финальный кадр, без удара/колец.
      backdropOpacity.value = 1;
      bloomOpacity.value = 0;
      cardOpacity.value = 1;
      cardScale.value = 1;
      heroOpacity.value = 1;
      heroY.value = 0;
      heroScale.value = 1;
      heroScaleX.value = 1;
      heroScaleY.value = 1;
      textOpacity.value = 1;
      textY.value = 0;
      rowsOpacity.value = 1;
      rowsY.value = 0;
      ctaOpacity.value = 1;
      ctaY.value = 0;
      void hapticSuccess();
      onImpactRef.current();
      return undefined;
    }

    backdropOpacity.value = 0;
    bloomOpacity.value = 0;
    bloomScale.value = 0.82;
    cardOpacity.value = 0;
    cardScale.value = 1.06;
    cardRecoilY.value = 0;
    heroY.value = -150;
    heroScale.value = 1.42;
    heroOpacity.value = 0;
    heroScaleX.value = 1.16;
    heroScaleY.value = 0.84;
    ring0Scale.value = 0.5;
    ring0Opacity.value = 0.8;
    ring1Scale.value = 0.5;
    ring1Opacity.value = 0.5;
    textOpacity.value = 0;
    textY.value = 10;
    rowsOpacity.value = 0;
    rowsY.value = 10;
    ctaOpacity.value = 0;
    ctaY.value = 8;

    // ── фаза 1: блум (LUM.bloomMs) + карточка выходит из света (LUM.settle) ──
    backdropOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    bloomOpacity.value = withTiming(1, { duration: LUM.bloomMs, easing: Easing.out(Easing.cubic) });
    bloomScale.value = withTiming(strength.bloomTo, { duration: 900, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withDelay(LUM.ladder[1], withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    cardScale.value = withDelay(LUM.ladder[1], withSpring(1, LUM.settle));

    return () => {
      cancelAnimation(backdropOpacity);
      cancelAnimation(bloomOpacity);
      cancelAnimation(bloomScale);
      cancelAnimation(cardOpacity);
      cancelAnimation(cardScale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, rarity, impactSoundId, scope]);

  // ── фаза 2: замах героя (CHK.anticipMs) → падение (CHK.fallMs, bezier) → УДАР ──
  // зачем: отдельный эффект — удар может наступать позже входа (сундук: по тапу).
  const armedNow = armed === undefined ? visible : (visible && armed);
  useEffect(() => {
    if (!armedNow || reduceMotion) return undefined;

    const soundTimer = setTimeout(() => {
      soundDirector.request(impactSoundId, { scope, dedupeKey: scope });
    }, LUM.ladder[2]);

    const impactDelay = LUM.ladder[2] + 140;
    heroOpacity.value = withDelay(impactDelay, withTiming(1, { duration: 110, easing: Easing.linear }));
    heroY.value = withDelay(
      impactDelay,
      withSequence(
        withTiming(-176, { duration: CHK.anticipMs, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: CHK.fallMs, easing: Easing.bezier(...CHK.fallBezier) }, (finished) => {
          if (finished) handleImpact();
        }),
      ),
    );
    heroScale.value = withDelay(
      impactDelay,
      withSequence(
        withTiming(1.42, { duration: 0 }),
        withTiming(1, { duration: CHK.anticipMs + CHK.fallMs, easing: Easing.bezier(...CHK.fallBezier) }),
      ),
    );

    return () => {
      clearTimeout(soundTimer);
      cancelAnimation(cardRecoilY);
      cancelAnimation(heroY);
      cancelAnimation(heroScale);
      cancelAnimation(heroOpacity);
      cancelAnimation(heroScaleX);
      cancelAnimation(heroScaleY);
      cancelAnimation(ring0Scale);
      cancelAnimation(ring0Opacity);
      cancelAnimation(ring1Scale);
      cancelAnimation(ring1Opacity);
      cancelAnimation(textOpacity);
      cancelAnimation(textY);
      cancelAnimation(rowsOpacity);
      cancelAnimation(rowsY);
      cancelAnimation(ctaOpacity);
      cancelAnimation(ctaY);
    };
    // зачем: пересобираем последовательность заново при каждом показе —
    // shared values нельзя мутировать вне эффекта (нет setState в кадрах).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armedNow, reduceMotion, rarity, impactSoundId, scope, handleImpact]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.value,
    transform: [{ scale: bloomScale.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }, { translateY: cardRecoilY.value }],
  }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [
      { translateY: heroY.value },
      { scale: heroScale.value },
      { scaleX: heroScaleX.value },
      { scaleY: heroScaleY.value },
    ],
  }));
  const ring0Style = useAnimatedStyle(() => ({
    opacity: ring0Opacity.value,
    transform: [{ scale: ring0Scale.value }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));
  const rowsStyle = useAnimatedStyle(() => ({
    opacity: rowsOpacity.value,
    transform: [{ translateY: rowsY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));

  return {
    reduceMotion,
    showRings: strength.rings && !lowEnd,
    dustCount,
    /** Регистрирует колбэк, выполняемый ровно на ударе героя (напр. начисление/навигация). */
    setOnImpact: (fn: () => void) => { onImpactRef.current = fn; },
    styles: {
      backdrop: backdropStyle,
      bloom: bloomStyle,
      card: cardStyle,
      hero: heroStyle,
      ring0: ring0Style,
      ring1: ring1Style,
      text: textStyle,
      rows: rowsStyle,
      cta: ctaStyle,
    },
  };
}

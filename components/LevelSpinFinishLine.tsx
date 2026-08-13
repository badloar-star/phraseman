import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from './ThemeContext';
import { LinearGradient } from './SafeLinearGradient';
import { FlowText } from './text-integrity/FlowText';
import { getLevelGiftRewardIcon } from '../constants/levelGiftRewardIcons';
import { triLang, type Lang } from '../constants/i18n';
import {
  ALL_LEVEL_GIFT_DEFS,
  giftDisplayDescForLang,
  giftDisplayTitleForLang,
  giftRarityUiLabel,
  type GiftDef,
} from '../app/level_gift_system';
import type { LocalLevelSpinReceipt as LevelSpinReceipt } from '../app/level_spin_local_contract';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { soundDirector } from '../modules/audio/sound_director';
import { noAndroidOutline } from '../constants/androidGlow';
import { isLightThemeMode, type Theme, type ThemeMode } from '../constants/theme';
import {
  createLevelSpinLandingPlan,
  createLevelSpinOvershootPlan,
  levelSpinReceiptWaitMs,
  LEVEL_SPIN_ACCELERATION_BEZIER_X2,
  LEVEL_SPIN_ACCELERATION_BEZIER_Y2,
  LEVEL_SPIN_ACCELERATION_MS as SPIN_ACCELERATION_MS,
  LEVEL_SPIN_CYCLE_MS as SPIN_CYCLE_MS,
  LEVEL_SPIN_DECELERATION_MS as SPIN_DECELERATION_MS,
  LEVEL_SPIN_SETTLE_MS as SPIN_SETTLE_MS,
  type LevelSpinLandingPlan,
} from '../app/level_reward_spin_motion';

const REWARD_STREAM_IDS = [
  'energy_full', 'xp_100', 'xp_250', 'hint_1', 'xp_bank_150',
  'xp_2x_24h', 'energy_plus2', 'chain_shield_1', 'hint_3', 'xp_bank_300',
  'cosmetic_avatar_common', 'xp_2x_48h', 'energy_plus3', 'xp_bank_600', 'choice_3_level',
] as const;
const SPIN_ROLLBACK_MS = 160;
const DEFAULT_REWARD_GRADIENT: [string, string, string] = ['#15473C', '#0E2B28', '#081918'];
export type LevelSpinFinishLinePhase = 'recovering' | 'idle' | 'spinning' | 'revealed' | 'error' | 'empty';

type Props = {
  lang: Lang;
  phase: LevelSpinFinishLinePhase;
  balance: number | null;
  receipt: LevelSpinReceipt | null;
  onSpin: () => void;
  onRetry: () => void;
  onAgain: () => void;
  onRevealed: (requestId: string) => void;
};

function giftForId(id: string | null | undefined): GiftDef | null {
  return id ? ALL_LEVEL_GIFT_DEFS.find((gift) => gift.id === id) ?? null : null;
}

function rarityColor(gift: GiftDef, themeMode: ThemeMode, theme: Theme): string {
  if (isLightThemeMode(themeMode)) {
    if (gift.rarity === 'epic') return theme.gold;
    if (gift.rarity === 'rare') return '#1F5E8C';
    return theme.correct;
  }
  if (gift.rarity === 'epic') return '#F3C85C';
  if (gift.rarity === 'rare') return '#79B8FF';
  return '#7BD9CB';
}

const HIGH_VALUE_COMMON_GIFT_IDS = new Set([
  'xp_250', 'xp_bank_150', 'focus_10m_25', 'shards_3',
]);

/** A reward's surface communicates rarity first, then the stronger common rewards. */
function rewardGradientForGift(gift: GiftDef, themeMode: ThemeMode, theme: Theme): [string, string, string] {
  if (isLightThemeMode(themeMode)) return [theme.cardGradient[0], theme.cardGradient[1], theme.bgCard];
  if (gift.rarity === 'epic') return ['#4D1E67', '#2A123D', '#150A20'];
  if (gift.rarity === 'rare') return ['#164C72', '#102B49', '#091727'];
  if (HIGH_VALUE_COMMON_GIFT_IDS.has(gift.id)) return ['#574015', '#30230D', '#181208'];
  return DEFAULT_REWARD_GRADIENT;
}

export default function LevelSpinFinishLine({
  lang,
  phase,
  balance,
  receipt,
  onSpin,
  onRetry,
  onAgain,
  onRevealed,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const compact = windowHeight < 720 || fontScale > 1.25;
  const cardHeight = compact ? 94 : 106;
  const cardGap = compact ? 9 : 12;
  const rowPitch = cardHeight + cardGap;
  const [machineHeight, setMachineHeight] = useState<number | null>(null);
  const selectorCenterY = (machineHeight ?? 0) / 2;
  const reducedMotion = useReducedMotion();
  const isFocused = useIsScreenFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const reelOffset = useSharedValue(0);
  const resultOpacity = useSharedValue(0);
  const [resultVisible, setResultVisible] = useState(false);
  const [settledRequestId, setSettledRequestId] = useState<string | null>(null);
  const [landingIndex, setLandingIndex] = useState<number | null>(null);
  const [motionRequestId, setMotionRequestId] = useState<string | null>(null);
  const resultViewRef = useRef<View | null>(null);
  const activeReceiptRef = useRef<string | null>(receipt?.requestId ?? null);
  const motionReceiptRef = useRef<string | null>(null);
  const revealedRequestRef = useRef<string | null>(null);
  const announcedRequestRef = useRef<string | null>(null);
  const spinStartedAtRef = useRef<number | null>(null);
  const decelerationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLandingRef = useRef<(LevelSpinLandingPlan & { requestId: string; liveOffset: number }) | null>(null);
  activeReceiptRef.current = receipt?.requestId ?? null;
  const resultGift = giftForId(receipt?.baseGiftId);
  const premiumGift = giftForId(receipt?.premiumGiftId);

  const streamIds = useMemo(() => {
    const ids = Array.from({ length: 3 }, () => [...REWARD_STREAM_IDS]).flat();
    if (receipt?.baseGiftId && landingIndex !== null) {
      ids[landingIndex] = receipt.baseGiftId as typeof REWARD_STREAM_IDS[number];
    }
    return ids;
  }, [landingIndex, receipt?.baseGiftId]);

  const reelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: reelOffset.value }] }));
  const finalStyle = useAnimatedStyle(() => ({ opacity: resultOpacity.value }));

  const resultAccessibilityLabel = resultGift
    ? [
      triLang(lang, { ru: 'Твоя награда', uk: 'Твоя нагорода', es: 'Tu recompensa', 'pt-BR': 'Sua recompensa', vi: 'Phần thưởng', id: 'Hadiahmu', tr: 'Ödülün', pl: 'Twoja nagroda' }),
      giftDisplayTitleForLang(resultGift, lang),
      giftDisplayDescForLang(resultGift, lang),
      premiumGift ? 'PLUS' : '',
      premiumGift ? giftDisplayTitleForLang(premiumGift, lang) : '',
      premiumGift ? giftDisplayDescForLang(premiumGift, lang) : '',
    ].filter(Boolean).join('. ')
    : '';

  const completeLanding = useCallback((requestId: string) => {
    if (activeReceiptRef.current !== requestId) return;
    revealedRequestRef.current = requestId;
    setSettledRequestId(requestId);
    // The parent owns the full-screen winner modal. Invoke it from the final
    // rollback frame, rather than waiting for a later effect that can be
    // invalidated by the phase change itself.
    onRevealed(requestId);
  }, [onRevealed]);

  const startRevealSettle = useCallback((requestId: string, duration = SPIN_SETTLE_MS) => {
    if (activeReceiptRef.current !== requestId) return;
    setResultVisible(true);
    // This is scheduled from the terminal rollback frame, so the winner
    // surface is never held hostage by a post-animation render effect.
    completeLanding(requestId);
    resultOpacity.value = withTiming(1, { duration });
  }, [completeLanding, resultOpacity]);

  const playReelLoop = useCallback(() => {
    soundDirector.request('pm.spin.reel_loop', {
      scope: 'level-spin-reel',
      dedupeKey: 'reel-loop',
      rateLimit: { maxStarts: 6, windowMs: 4_000 },
    });
  }, []);

  useEffect(() => {
    if (!resultVisible || settledRequestId !== receipt?.requestId || !receipt || !isFocused || !appActive) return;
    if (revealedRequestRef.current !== receipt.requestId) {
      revealedRequestRef.current = receipt.requestId;
      onRevealed(receipt.requestId);
    }
    if (announcedRequestRef.current === receipt.requestId) return;
    announcedRequestRef.current = receipt.requestId;
    void hapticSuccess();
    const focusTimer = setTimeout(() => {
      const node = findNodeHandle(resultViewRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 0);
    return () => clearTimeout(focusTimer);
  }, [appActive, isFocused, onRevealed, receipt, resultGift, resultVisible, settledRequestId]);

  useEffect(() => {
    if (!isFocused || phase !== 'spinning') return undefined;
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, [isFocused, phase]);

  const startReelMotion = useCallback(() => {
    if (machineHeight === null) return;
    if (spinStartedAtRef.current === null) spinStartedAtRef.current = Date.now();
    setResultVisible(false);
    setLandingIndex(null);
    resultOpacity.value = 0;
    if (reducedMotion) return;
    const startOffset = selectorCenterY - cardHeight / 2 - rowPitch * 4;
    const accelerationTarget = startOffset - rowPitch * 4;
    const loopDistance = REWARD_STREAM_IDS.length * rowPitch;
    reelOffset.value = startOffset;
    reelOffset.value = withSequence(
      withTiming(accelerationTarget, {
        duration: SPIN_ACCELERATION_MS,
        easing: Easing.bezier(0.4, 0, LEVEL_SPIN_ACCELERATION_BEZIER_X2, LEVEL_SPIN_ACCELERATION_BEZIER_Y2),
      }, (finished) => {
        if (finished) scheduleOnRN(playReelLoop);
      }),
      withRepeat(withTiming(accelerationTarget - loopDistance, { duration: SPIN_CYCLE_MS, easing: Easing.linear }), -1, false),
    );
  }, [cardHeight, machineHeight, playReelLoop, reducedMotion, reelOffset, resultOpacity, rowPitch, selectorCenterY]);

  useEffect(() => {
    if (phase !== 'spinning' || receipt || !isFocused || !appActive) return;
    startReelMotion();
  }, [appActive, isFocused, phase, receipt, startReelMotion]);

  useEffect(() => {
    if (isFocused && appActive && phase === 'spinning') return;
    if (decelerationTimerRef.current) clearTimeout(decelerationTimerRef.current);
    decelerationTimerRef.current = null;
    pendingLandingRef.current = null;
    cancelAnimation(reelOffset);
    spinStartedAtRef.current = null;
    if (phase !== 'revealed') {
      setLandingIndex(null);
      setResultVisible(false);
      setSettledRequestId(null);
      resultOpacity.value = 0;
    }
  }, [appActive, isFocused, phase, reelOffset, resultOpacity]);

  useEffect(() => () => {
    if (decelerationTimerRef.current) clearTimeout(decelerationTimerRef.current);
    cancelAnimation(reelOffset);
  }, [reelOffset]);

  useEffect(() => {
    if (!receipt) {
      motionReceiptRef.current = null;
      setMotionRequestId(null);
      revealedRequestRef.current = null;
      announcedRequestRef.current = null;
      pendingLandingRef.current = null;
      spinStartedAtRef.current = null;
      setSettledRequestId(null);
      setResultVisible(false);
      setLandingIndex(null);
      return;
    }
    if (motionReceiptRef.current !== receipt.requestId) {
      const activeSpinAlreadyRunning = motionReceiptRef.current === null
        && spinStartedAtRef.current !== null
        && phase === 'spinning';
      if (decelerationTimerRef.current) clearTimeout(decelerationTimerRef.current);
      decelerationTimerRef.current = null;
      if (!activeSpinAlreadyRunning) cancelAnimation(reelOffset);
      motionReceiptRef.current = receipt.requestId;
      pendingLandingRef.current = null;
      if (!activeSpinAlreadyRunning) spinStartedAtRef.current = null;
      revealedRequestRef.current = null;
      announcedRequestRef.current = null;
      resultOpacity.value = 0;
      setSettledRequestId(null);
      setResultVisible(false);
      setLandingIndex(null);
      setMotionRequestId(receipt.requestId);
      return;
    }
    if (motionRequestId !== receipt.requestId) return;
    if (revealedRequestRef.current === receipt.requestId) return;
    if (!isFocused || !appActive || phase !== 'spinning' || machineHeight === null) return;
    if (reducedMotion) {
      if (landingIndex === null) {
        setLandingIndex(8);
        return;
      }
      reelOffset.value = selectorCenterY - cardHeight / 2 - landingIndex * rowPitch;
      startRevealSettle(receipt.requestId, 160);
      return;
    }
    if (spinStartedAtRef.current === null) {
      startReelMotion();
      if (spinStartedAtRef.current === null) return;
    }
    const pendingLanding = pendingLandingRef.current;
    if (pendingLanding?.requestId === receipt.requestId
      && landingIndex === pendingLanding.landingIndex) {
      pendingLandingRef.current = null;
      reelOffset.value = pendingLanding.liveOffset;
      const overshoot = createLevelSpinOvershootPlan({
        targetOffset: pendingLanding.targetOffset,
        rowPitch,
      });
      reelOffset.value = withSequence(
        withTiming(overshoot.overshootOffset, {
          duration: SPIN_DECELERATION_MS - SPIN_ROLLBACK_MS,
          easing: Easing.bezier(0.25, 0.25, 0.5, 1),
        }),
        withTiming(overshoot.rollbackOffset, {
          duration: SPIN_ROLLBACK_MS,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          if (finished) scheduleOnRN(startRevealSettle, receipt.requestId, SPIN_SETTLE_MS);
        }),
      );
      return;
    }
    if (decelerationTimerRef.current) return;
    const elapsedMs = Date.now() - (spinStartedAtRef.current ?? Date.now());
    const waitMs = levelSpinReceiptWaitMs(0, elapsedMs);
    const beginDeceleration = () => {
      decelerationTimerRef.current = null;
      if (activeReceiptRef.current !== receipt.requestId || !isFocused || !appActive) return;
      soundDirector.request('pm.spin.reel_stop_rollback', {
        scope: 'level-spin-reel',
        dedupeKey: `reel-stop:${receipt.requestId}`,
        rateLimit: { maxStarts: 6, windowMs: 4_000 },
      });
      cancelAnimation(reelOffset);
      const liveOffset = reelOffset.value;
      const plan = createLevelSpinLandingPlan({
        liveOffset,
        selectorTop: selectorCenterY - cardHeight / 2,
        rowPitch,
        streamLength: streamIds.length,
      });
      pendingLandingRef.current = { ...plan, requestId: receipt.requestId, liveOffset };
      setLandingIndex(plan.landingIndex);
    };
    decelerationTimerRef.current = setTimeout(beginDeceleration, waitMs);
    return () => {
      if (decelerationTimerRef.current) clearTimeout(decelerationTimerRef.current);
      decelerationTimerRef.current = null;
    };
  }, [appActive, cardHeight, isFocused, landingIndex, machineHeight, motionRequestId, phase, receipt, reducedMotion, reelOffset, resultOpacity, rowPitch, selectorCenterY, startReelMotion, startRevealSettle, streamIds.length]);

  const ctaTestID = resultVisible
    ? (balance ?? 0) > 0 ? 'level-spin-next' : 'level-spin-done'
    : phase === 'error'
      ? 'level-spin-retry'
      : 'level-spin-start';
  const ctaDisabled = phase === 'spinning' || phase === 'recovering' || phase === 'empty'
    || (resultVisible && settledRequestId !== receipt?.requestId);
  const ctaLabel = resultVisible
    ? (balance ?? 0) > 0
      ? triLang(lang, { ru: 'ЕЩЁ СПИН', uk: 'ЩЕ СПІН', es: 'OTRO GIRO', 'pt-BR': 'GIRAR DE NOVO', vi: 'QUAY TIẾP', id: 'PUTAR LAGI', tr: 'BİR DAHA ÇEVİR', pl: 'LOSUJ PONOWNIE' })
      : triLang(lang, { ru: 'ГОТОВО', uk: 'ГОТОВО', es: 'LISTO', 'pt-BR': 'PRONTO', vi: 'XONG', id: 'SELESAI', tr: 'BİTTİ', pl: 'GOTOWE' })
    : phase === 'error'
      ? triLang(lang, { ru: 'КРУТИТЬ', uk: 'КРУТИТИ', es: 'GIRAR', 'pt-BR': 'GIRAR', vi: 'QUAY', id: 'PUTAR', tr: 'ÇEVİR', pl: 'ZAKRĘĆ' })
      : phase === 'spinning' || phase === 'recovering'
        ? triLang(lang, { ru: 'КРУТИТЬ', uk: 'КРУТИТИ', es: 'GIRAR', 'pt-BR': 'GIRAR', vi: 'QUAY', id: 'PUTAR', tr: 'ÇEVİR', pl: 'ZAKRĘĆ' })
        : phase === 'empty'
          ? triLang(lang, { ru: 'СПИНОВ НЕТ', uk: 'СПІНІВ НЕМАЄ', es: 'SIN GIROS', 'pt-BR': 'SEM GIROS', vi: 'HẾT LƯỢT', id: 'PUTARAN HABIS', tr: 'ÇEVİRME YOK', pl: 'BRAK SPINÓW' })
          : triLang(lang, { ru: 'КРУТИТЬ', uk: 'КРУТИТИ', es: 'GIRAR', 'pt-BR': 'GIRAR', vi: 'QUAY', id: 'PUTAR', tr: 'ÇEVİR', pl: 'ZAKRĘĆ' });

  const fineCopy = phase === 'error'
    ? ''
    : phase === 'empty'
      ? triLang(lang, { ru: 'Спины закончились', uk: 'Спіни закінчилися', es: 'No quedan giros', 'pt-BR': 'Sem giros', vi: 'Đã hết lượt', id: 'Putaran habis', tr: 'Çevirme kalmadı', pl: 'Brak spinów' })
      : '';

  const handleCtaPress = resultVisible
    ? onAgain
    : phase === 'error'
      ? onRetry
      : onSpin;

  return (
    <View style={[styles.content, compact && styles.contentCompact]}>
      <View
        testID="level-spin-reel-stage"
        style={[styles.reelStage, { backgroundColor: t.bgPrimary }]}
        onLayout={(event) => {
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          if (nextHeight > 0 && nextHeight !== machineHeight) setMachineHeight(nextHeight);
        }}
      >
        {machineHeight !== null ? (
          <>
            <Animated.View
              style={[styles.reel, { left: compact ? 21 : 26, right: compact ? 21 : 26 }, reelStyle]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {streamIds.map((giftId, index) => {
                const gift = giftForId(giftId);
                const accent = gift ? rarityColor(gift, themeMode, t) : '#7BD9CB';
                const rewardGradient = gift ? rewardGradientForGift(gift, themeMode, t) : DEFAULT_REWARD_GRADIENT;
                return gift ? (
              <LinearGradient
                testID="level-spin-reward-gradient"
                colors={rewardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                key={`${giftId}-${index}`}
                style={[
                  styles.rewardRow,
                  {
                    height: cardHeight,
                    marginBottom: cardGap,
                    borderRadius: compact ? 17 : 20,
                    backgroundColor: t.bgCard,
                  },
                ]}
              >
                <Image
                  source={getLevelGiftRewardIcon(gift.id, themeMode)}
                  style={[styles.rewardIcon, compact && styles.rewardIconCompact]}
                  contentFit="contain"
                />
                <View style={styles.rewardCopy}>
                  <View style={[styles.rarityPill, { backgroundColor: `${accent}24` }]}>
                    <Text style={[styles.rarityText, { color: accent }]}>{giftRarityUiLabel(gift.rarity, lang)}</Text>
                  </View>
                  <FlowText testID={`level-spin-reward-name-${index}`} provenance="authored" style={[styles.rewardName, { color: t.textPrimary, fontSize: compact ? f.sub : f.body }]}>
                    {giftDisplayTitleForLang(gift, lang)}
                  </FlowText>
                  <FlowText testID={`level-spin-reward-description-${index}`} provenance="authored" style={[styles.rewardDescription, { color: t.textMuted, fontSize: compact ? 9 : 10 }]}>
                    {giftDisplayDescForLang(gift, lang)}
                  </FlowText>
                </View>
              </LinearGradient>
            ) : <View key={`${giftId}-${index}`} style={{ height: cardHeight, marginBottom: cardGap }} />;
              })}
            </Animated.View>

            <View testID="level-spin-selector" pointerEvents="none" style={[styles.selector, { top: selectorCenterY - cardHeight / 2, height: cardHeight }]}>
              <View style={styles.selectorPointerLeft} />
              <View style={[styles.selectorFrame, { height: cardHeight }]} />
              <View style={styles.selectorPointerRight} />
            </View>
          </>
        ) : null}

        <LinearGradient
          testID="level-spin-fade-top"
          pointerEvents="none"
          colors={[t.bgPrimary, `${t.bgPrimary}F2`, `${t.bgPrimary}00`]}
          locations={[0, 0.18, 1]}
          style={[styles.stageFade, styles.stageFadeTop]}
        />
        <LinearGradient
          testID="level-spin-fade-bottom"
          pointerEvents="none"
          colors={[`${t.bgPrimary}00`, `${t.bgPrimary}F2`, t.bgPrimary]}
          locations={[0, 0.82, 1]}
          style={[styles.stageFade, styles.stageFadeBottom]}
        />
      </View>

      {resultVisible && resultGift ? (
        <Animated.View
          ref={resultViewRef}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={resultAccessibilityLabel}
          style={[styles.resultToast, compact && styles.resultToastCompact, finalStyle]}
        >
          <LinearGradient
            testID="level-spin-result-gradient"
            colors={['#F8DE8B', '#E7B43F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.resultToastGradient}
          >
            <Image source={getLevelGiftRewardIcon(resultGift.id, themeMode)} style={styles.resultIcon} contentFit="contain" />
            <View style={styles.resultCopy}>
              <Text style={styles.resultKicker}>{triLang(lang, { ru: 'Твоя награда', uk: 'Твоя нагорода', es: 'Tu recompensa', 'pt-BR': 'Sua recompensa', vi: 'Phần thưởng', id: 'Hadiahmu', tr: 'Ödülün', pl: 'Twoja nagroda' })}</Text>
              <Text style={styles.resultTitle}>{giftDisplayTitleForLang(resultGift, lang)}</Text>
              <Text style={styles.resultDescription}>{giftDisplayDescForLang(resultGift, lang)}</Text>
              {premiumGift ? <Text style={styles.plusGift}>PLUS · {giftDisplayTitleForLang(premiumGift, lang)}</Text> : null}
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        <View style={styles.statusOverlay} pointerEvents="none">
          <Text style={[styles.statusText, { color: phase === 'error' ? '#FF6B6B' : t.textMuted, fontSize: f.body }]}>
            {phase === 'spinning' || phase === 'recovering'
              ? triLang(lang, { ru: 'Выбираем подарок…', uk: 'Обираємо подарунок…', es: 'Eligiendo regalo…', 'pt-BR': 'Escolhendo presente…', vi: 'Đang chọn phần thưởng…', id: 'Memilih hadiah…', tr: 'Hediye seçiliyor…', pl: 'Wybieramy prezent…' })
              : phase === 'empty'
                ? triLang(lang, { ru: 'Спины закончились', uk: 'Спіни закінчилися', es: 'No quedan giros', 'pt-BR': 'Sem giros', vi: 'Đã hết lượt', id: 'Putaran habis', tr: 'Çevirme kalmadı', pl: 'Brak losowań' })
                : phase === 'error'
                  ? triLang(lang, { ru: 'Один спин — одна награда', uk: 'Один спін — одна нагорода', es: 'Un giro, una recompensa', 'pt-BR': 'Um giro, uma recompensa', vi: 'Một lượt, một phần thưởng', id: 'Satu putaran, satu hadiah', tr: 'Bir çevirme, bir ödül', pl: 'Jeden spin — jedna nagroda' })
                  : triLang(lang, { ru: 'Один спин — одна награда', uk: 'Один спін — одна нагорода', es: 'Un giro, una recompensa', 'pt-BR': 'Um giro, uma recompensa', vi: 'Một lượt, một phần thưởng', id: 'Satu putaran, satu hadiah', tr: 'Bir çevirme, bir ödül', pl: 'Jedno losowanie, jedna nagroda' })}
          </Text>
        </View>
      )}

      <View style={styles.spinFooter}>
        <Pressable
          testID={ctaTestID}
          accessibilityRole="button"
          accessibilityState={{ disabled: ctaDisabled }}
          disabled={ctaDisabled}
          onPressIn={() => {
            if (ctaDisabled) return;
            void hapticTap();
            soundDirector.request('pm.spin.button_press', {
              scope: 'level-spin-reel',
              dedupeKey: 'spin-button',
              rateLimit: { maxStarts: 6, windowMs: 4_000 },
            });
          }}
          onPress={handleCtaPress}
          style={({ pressed }) => [styles.spinCta, pressed && !ctaDisabled && styles.spinCtaPressed, ctaDisabled && styles.spinCtaDisabled]}
        >
          <Text style={styles.spinCtaText}>{ctaLabel}</Text>
        </Pressable>
        {fineCopy ? <Text accessibilityLiveRegion="polite" style={[styles.fineCopy, { color: t.textMuted }]}>{fineCopy}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, width: '100%', overflow: 'hidden' },
  contentCompact: { minHeight: 0 },
  reelStage: { flex: 1, minHeight: 0, width: '100%', overflow: 'hidden', position: 'relative' },
  reel: { position: 'absolute', top: 0 },
  rewardRow: {
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    ...noAndroidOutline,
  },
  rewardIcon: { width: 77, height: 77 },
  rewardIconCompact: { width: 66, height: 66 },
  rewardCopy: { flex: 1, minWidth: 0 },
  rarityPill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  rarityText: { fontSize: 8, lineHeight: 9, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  rewardName: { marginTop: 5, fontWeight: '900', lineHeight: 17 },
  rewardDescription: { marginTop: 4, lineHeight: 13 },
  selector: { position: 'absolute', left: 10, right: 10, zIndex: 7, flexDirection: 'row', alignItems: 'center' },
  selectorFrame: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#F3C85CA6',
    backgroundColor: '#F3C85C09',
    shadowColor: '#F3C85C',
    shadowOpacity: 0.22,
    shadowRadius: 17,
    ...noAndroidOutline,
  },
  selectorPointerLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#F3C85C',
    marginRight: -5,
  },
  selectorPointerRight: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#F3C85C',
    marginLeft: -5,
  },
  stageFade: { position: 'absolute', left: 0, right: 0, height: '34%', zIndex: 6 },
  stageFadeTop: { top: 0 },
  stageFadeBottom: { bottom: 0 },
  resultToast: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 81,
    zIndex: 12,
    minHeight: 70,
    borderRadius: 17,
    shadowColor: '#000000',
    shadowOpacity: 0.44,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  resultToastGradient: {
    minHeight: 70,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultToastCompact: { bottom: 76, minHeight: 64 },
  resultIcon: { width: 43, height: 43 },
  resultCopy: { flex: 1, minWidth: 0 },
  resultKicker: { color: '#5C410B', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 9, fontWeight: '900' },
  resultTitle: { marginTop: 2, color: '#191108', fontSize: 13, lineHeight: 16, fontWeight: '900' },
  resultDescription: { marginTop: 2, color: '#4A350D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  plusGift: { marginTop: 3, color: '#4A350D', fontSize: 9, fontWeight: '900' },
  statusOverlay: { position: 'absolute', left: 18, right: 18, bottom: 86, zIndex: 8, alignItems: 'center' },
  statusText: { textAlign: 'center', fontWeight: '700', opacity: 0 },
  spinFooter: { width: '100%', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4, zIndex: 10 },
  spinCta: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#918DA5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EEF8',
    paddingHorizontal: 18,
  },
  spinCtaPressed: { transform: [{ translateY: 4 }], borderBottomWidth: 0, marginBottom: 4 },
  spinCtaDisabled: { opacity: 0.58 },
  spinCtaText: { color: '#0F0D13', fontSize: 16, fontWeight: '900', letterSpacing: 0.3, textAlign: 'center' },
  fineCopy: { marginTop: 8, minHeight: 12, textAlign: 'center', fontSize: 9, lineHeight: 12 },
  devError: { marginTop: 3, fontSize: 9, textAlign: 'center' },
});

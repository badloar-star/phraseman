import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CHK, LUM, SUITE } from '../constants/motionHybrid';
import { isLowEndDevice } from '../hooks/device_perf_tier';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { fk } from '../app/feedback/feedback_kit';
import type { ThemeMode } from '../constants/theme';
import LevelBadge from './LevelBadge';
import { LinearGradient } from './SafeLinearGradient';
import { getLevelUpThresholdPalette } from './levelUpThresholdTheme';
import { SpinRewardPlaque } from './SpinRewardPlaque';
import type { LevelUpPreviewVariant } from './LevelUpThresholdModal';

/**
 * Гибрид «Световод + Чекан» для Level-up. Сцена R3 макета phraseman-hybrid.html:
 * вход из света → замах → падение медали → УДАР (squash + отдача карточки) →
 * два кольца + пыль → каскад текста/наград → CTA. Единственный удар кульминации
 * (закон №1 Motion DNA) — медаль, которую игрок узнаёт со своего главного экрана.
 *
 * зачем: владелец принял этот гибрид как ЕДИНСТВЕННУЮ реализацию (2026-08-16,
 * project_motion_program.md). Подключается через точку входа
 * components/LevelUpThresholdModal.tsx (тонкая обёртка, без classic-ветки).
 */

const DUST_COUNT_FULL = 12;
const TAP_SKIP_MS = 140;
const UNCONDITIONAL_UNLOCK_MS = 3000;

type ThresholdRewardRowProps = Readonly<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  color: string;
  surface: string;
  delayMs: number;
  reduceMotion: boolean;
  skip: SharedSkip;
}>;

type SharedSkip = ReturnType<typeof useSharedValue<number>>;

function RewardRow({ icon, label, value, color, surface, delayMs, reduceMotion, skip }: ThresholdRewardRowProps) {
  const style = useAnimatedStyle(() => {
    if (reduceMotion || skip.value) return { opacity: 1, transform: [{ translateY: 0 }] };
    return {
      opacity: withDelay(delayMs, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })),
      transform: [
        { translateY: withDelay(delayMs, withSpring(0, SUITE.text)) },
      ],
    };
  }, [delayMs, reduceMotion]);

  const initialStyle = reduceMotion ? undefined : { opacity: 0, transform: [{ translateY: 10 }] };

  return (
    <Animated.View style={[styles.rewardRow, { backgroundColor: surface }, initialStyle, style]}>
      <View style={[styles.rewardIcon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={styles.rewardCopy}>
        <Text style={[styles.rewardLabel, { color }]}>{label}</Text>
        <Text style={[styles.rewardValue, { color }]}>{value}</Text>
      </View>
    </Animated.View>
  );
}

export type LevelUpThresholdModalHybridProps = {
  visible: boolean;
  variant?: LevelUpPreviewVariant;
  level: number;
  themeMode: ThemeMode;
  kicker: string;
  headline: string;
  message?: string;
  xpLabel: string;
  xpValue: string;
  titleLabel: string;
  titleReward?: string;
  titleColor?: string;
  energyLabel: string;
  energyReward?: number;
  energyValue: (amount: number) => string;
  spinReward: boolean;
  spinReceiptId: string;
  continueLabel: string;
  onShow: () => void;
  onContinue: () => void;
};

export default function LevelUpThresholdModalHybrid({
  visible,
  variant = 'standard',
  level,
  themeMode,
  kicker,
  headline,
  message,
  xpLabel,
  xpValue,
  titleLabel,
  titleReward,
  titleColor,
  energyLabel,
  energyReward,
  energyValue,
  spinReward,
  spinReceiptId,
  continueLabel,
  onShow,
  onContinue,
}: LevelUpThresholdModalHybridProps) {
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const lowEnd = isLowEndDevice(Platform);
  const palette = getLevelUpThresholdPalette(themeMode);
  const compact = height < 720;
  const milestone = variant === 'milestone';
  const portalSize = Math.min(compact ? 154 : 206, width - 104);
  const badgeSize = compact ? 82 : 108;
  const dustCount = lowEnd ? 0 : DUST_COUNT_FULL;

  // ── фазы: 0=скип-флаг (не анимированное значение, читается синхронно) ──
  const skip = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.82);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1.06);
  const cardRecoilY = useSharedValue(0);
  const badgeY = useSharedValue(-150);
  const badgeScale = useSharedValue(1.42);
  const badgeOpacity = useSharedValue(0);
  const badgeScaleX = useSharedValue(1.16);
  const badgeScaleY = useSharedValue(0.84);
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
  const milestoneFlareOpacity = useSharedValue(0);
  const milestoneFlareScale = useSharedValue(0.82);

  const onImpactRef = useRef(() => {
    fk.milestone('medal');
  });

  const runSequence = useCallback(() => {
    'worklet';
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    skip.value = 0;

    if (reduceMotion) {
      backdropOpacity.value = 1;
      bloomOpacity.value = 0;
      cardOpacity.value = 1;
      cardScale.value = 1;
      badgeOpacity.value = 1;
      badgeY.value = 0;
      badgeScale.value = 1;
      badgeScaleX.value = 1;
      badgeScaleY.value = 1;
      textOpacity.value = 1;
      textY.value = 0;
      rowsOpacity.value = 1;
      rowsY.value = 0;
      ctaOpacity.value = 1;
      ctaY.value = 0;
      milestoneFlareOpacity.value = milestone ? 1 : 0;
      milestoneFlareScale.value = 1;
      fk.milestone('medal');
      return undefined;
    }

    // ── фаза 1: блум (LUM.bloomMs) + карточка выходит из света ──
    backdropOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    bloomOpacity.value = withTiming(1, { duration: LUM.bloomMs, easing: Easing.out(Easing.cubic) });
    bloomScale.value = withTiming(1.26, { duration: 900, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withDelay(LUM.ladder[1], withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    cardScale.value = withDelay(LUM.ladder[1], withSpring(1, LUM.settle));

    // зачем: краш «hybrid уровня вылетает» — handleImpact был worklet'ом, но
    // вызывался через runOnJS (для JS-функций), а внутри читал ref.current на
    // UI-треде. Теперь: сам удар (shared values) — прямо в worklet-колбэке
    // анимации, а JS-побочка (звук/хаптика) — обычная функция через runOnJS.
    const fireImpactJs = () => { onImpactRef.current(); };

    function handleImpact() {
      'worklet';
      badgeScaleY.value = withSpring(1, CHK.squash);
      badgeScaleX.value = withSpring(1, CHK.squash);
      cardRecoilY.value = withSequence(
        withTiming(CHK.recoilShiftPx, { duration: 0 }),
        withSpring(0, CHK.recoil),
      );
      if (!lowEnd) {
        ring0Scale.value = withTiming(3.2, { duration: 720, easing: Easing.out(Easing.cubic) });
        ring0Opacity.value = withTiming(0, { duration: 720, easing: Easing.linear });
        ring1Scale.value = withDelay(90, withTiming(4.2, { duration: 920, easing: Easing.out(Easing.cubic) }));
        ring1Opacity.value = withDelay(90, withTiming(0, { duration: 920, easing: Easing.linear }));
      }
      runOnJS(fireImpactJs)();

      // ── каскад Чекана [62,146,262,410] для текста и наград, шаг наград 84 ──
      textOpacity.value = withDelay(80, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
      textY.value = withDelay(80, withSpring(0, SUITE.text));
      rowsOpacity.value = withDelay(CHK.ladder[3], withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
      rowsY.value = withDelay(CHK.ladder[3], withSpring(0, SUITE.text));
      ctaOpacity.value = withDelay(CHK.ladder[4] + 90, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
      ctaY.value = withDelay(CHK.ladder[4] + 90, withSpring(0, SUITE.text));
      if (milestone) {
        milestoneFlareOpacity.value = withDelay(60, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
        milestoneFlareScale.value = withDelay(60, withSpring(1, LUM.settle));
      }
    }

    // ── фаза 2: замах медали (CHK.anticipMs) → падение (CHK.fallMs, bezier) → УДАР ──
    const impactDelay = LUM.ladder[2] + 140;
    badgeOpacity.value = withDelay(impactDelay, withTiming(1, { duration: 110, easing: Easing.linear }));
    badgeY.value = withDelay(
      impactDelay,
      withSequence(
        withTiming(-176, { duration: CHK.anticipMs, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: CHK.fallMs, easing: Easing.bezier(...CHK.fallBezier) }, (finished) => {
          'worklet';
          if (finished) handleImpact();
        }),
      ),
    );
    badgeScale.value = withDelay(
      impactDelay,
      withSequence(
        withTiming(1.42, { duration: 0 }),
        withTiming(1, { duration: CHK.anticipMs + CHK.fallMs, easing: Easing.bezier(...CHK.fallBezier) }),
      ),
    );


    return () => {
      cancelAnimation(backdropOpacity);
      cancelAnimation(bloomOpacity);
      cancelAnimation(bloomScale);
      cancelAnimation(cardOpacity);
      cancelAnimation(cardScale);
      cancelAnimation(cardRecoilY);
      cancelAnimation(badgeY);
      cancelAnimation(badgeScale);
      cancelAnimation(badgeOpacity);
      cancelAnimation(badgeScaleX);
      cancelAnimation(badgeScaleY);
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
      cancelAnimation(milestoneFlareOpacity);
      cancelAnimation(milestoneFlareScale);
    };
    // зачем: пересобираем последовательность заново при каждом показе модалки —
    // общие shared values нельзя мутировать вне эффекта (нет setState в кадрах).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, milestone, lowEnd]);

  // ── безусловная разблокировка на 3000мс (закон: тап не должен запереть игрока) ──
  useEffect(() => {
    if (!visible || reduceMotion) return undefined;
    const timer = setTimeout(() => {
      skip.value = 1;
      cardOpacity.value = 1;
      cardScale.value = 1;
      badgeOpacity.value = 1;
      badgeY.value = 0;
      badgeScale.value = 1;
      badgeScaleX.value = 1;
      badgeScaleY.value = 1;
      textOpacity.value = 1;
      textY.value = 0;
      rowsOpacity.value = 1;
      rowsY.value = 0;
      ctaOpacity.value = 1;
      ctaY.value = 0;
      if (milestone) {
        milestoneFlareOpacity.value = 1;
        milestoneFlareScale.value = 1;
      }
    }, UNCONDITIONAL_UNLOCK_MS);
    return () => clearTimeout(timer);
  }, [visible, reduceMotion, milestone]);

  const skippedOnceRef = useRef(false);
  const handleStageTap = useCallback(() => {
    if (skip.value === 0) {
      // Первый тап = скип каскада на финальный кадр (закон №10).
      skip.value = 1;
      cardOpacity.value = withTiming(1, { duration: TAP_SKIP_MS });
      cardScale.value = withTiming(1, { duration: TAP_SKIP_MS });
      badgeOpacity.value = withTiming(1, { duration: TAP_SKIP_MS });
      badgeY.value = withTiming(0, { duration: TAP_SKIP_MS });
      badgeScale.value = withTiming(1, { duration: TAP_SKIP_MS });
      badgeScaleX.value = withTiming(1, { duration: TAP_SKIP_MS });
      badgeScaleY.value = withTiming(1, { duration: TAP_SKIP_MS });
      textOpacity.value = withTiming(1, { duration: TAP_SKIP_MS });
      textY.value = withTiming(0, { duration: TAP_SKIP_MS });
      rowsOpacity.value = withTiming(1, { duration: TAP_SKIP_MS });
      rowsY.value = withTiming(0, { duration: TAP_SKIP_MS });
      ctaOpacity.value = withTiming(1, { duration: TAP_SKIP_MS });
      ctaY.value = withTiming(0, { duration: TAP_SKIP_MS });
      if (milestone) {
        milestoneFlareOpacity.value = withTiming(1, { duration: TAP_SKIP_MS });
        milestoneFlareScale.value = withTiming(1, { duration: TAP_SKIP_MS });
      }
      skippedOnceRef.current = true;
      return;
    }
    // Второй тап (после скипа/полного проигрыша) = закрыть (закон №10).
    onContinue();
  }, [milestone, onContinue]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }, { translateY: cardRecoilY.value }],
  }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.value,
    transform: [{ scale: bloomScale.value }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [
      { translateY: badgeY.value },
      { scale: badgeScale.value },
      { scaleX: badgeScaleX.value },
      { scaleY: badgeScaleY.value },
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
  const milestoneFlareStyle = useAnimatedStyle(() => ({
    opacity: milestoneFlareOpacity.value,
    transform: [{ scale: milestoneFlareScale.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onShow={onShow}
      onRequestClose={onContinue}
    >
      <Pressable
        accessibilityViewIsModal
        accessibilityRole="button"
        accessibilityLabel={continueLabel}
        style={styles.screen}
        onPress={handleStageTap}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, backdropStyle]}>
          <LinearGradient
            colors={palette.background}
            locations={[0, 0.56, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.ambientTop, { backgroundColor: palette.ambient }, bloomStyle]} />
        <View pointerEvents="none" style={[styles.ambientBottom, { backgroundColor: `${palette.accentSecondary}17` }]} />

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentCompact]}
        >
          <Animated.View testID="level-up-modal-hybrid" style={[styles.stage, cardStyle]}>
            <Text style={[styles.kicker, { color: palette.accent }]}>{kicker}</Text>

            <View
              testID={`level-up-portal-hybrid-${variant}`}
              style={[
                styles.portalStage,
                milestone && styles.portalStageMilestone,
                { width: portalSize, height: portalSize },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.portalHalo,
                  {
                    width: portalSize,
                    height: portalSize,
                    borderRadius: portalSize / 2,
                    backgroundColor: palette.ambient,
                  },
                ]}
              />
              <LinearGradient
                colors={palette.portalFill}
                start={{ x: 0.18, y: 0 }}
                end={{ x: 0.82, y: 1 }}
                style={[
                  styles.portal,
                  {
                    width: portalSize - 18,
                    height: portalSize - 18,
                    borderRadius: (portalSize - 18) / 2,
                  },
                ]}
              >
                {dustCount > 0 ? (
                  // Кольца удара (ringsAndDust мокапа) — декоративный расходящийся контур
                  // эффекта, а не граница контейнера с контентом; тона недостаточно, чтобы
                  // прочитать кольцо на градиентном фоне портала.
                  <>
                    <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: palette.accent }, ring0Style]} /* guard-ok: decorative impact ring, not a content container border */ />
                    <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: palette.accentSecondary }, ring1Style]} /* guard-ok: decorative impact ring, not a content container border */ />
                  </>
                ) : null}
                <Animated.View style={[styles.badgeWrap, badgeStyle]}>
                  <LevelBadge level={level} size={badgeSize} autoplay />
                </Animated.View>
              </LinearGradient>
              {milestone ? (
                <Animated.View pointerEvents="none" style={[styles.milestoneFlare, milestoneFlareStyle]}>
                  <Ionicons name="sparkles" size={compact ? 22 : 28} color={palette.accent} />
                </Animated.View>
              ) : null}
            </View>

            <Animated.View style={textStyle}>
              <Text accessibilityRole="header" style={[styles.headline, compact && styles.headlineCompact, { color: palette.textPrimary }]}>
                {headline}
              </Text>
              {message ? (
                <Text style={[styles.message, compact && styles.messageCompact, { color: palette.textMuted }]}>
                  {message}
                </Text>
              ) : null}
            </Animated.View>

            <Animated.View style={[styles.rewardStack, rowsStyle]}>
              <RewardRow
                icon="sparkles"
                label={xpLabel}
                value={xpValue}
                color={palette.accent}
                surface={palette.rewardSurface}
                delayMs={0}
                reduceMotion={reduceMotion}
                skip={skip}
              />

              {titleReward && (
                <RewardRow
                  icon="ribbon"
                  label={titleLabel}
                  value={titleReward}
                  color={titleColor ?? palette.accentSecondary}
                  surface={palette.rewardSurface}
                  delayMs={84}
                  reduceMotion={reduceMotion}
                  skip={skip}
                />
              )}

              {energyReward !== undefined && (
                <RewardRow
                  icon="flash"
                  label={energyLabel}
                  value={energyValue(energyReward)}
                  color={palette.accentSecondary}
                  surface={palette.rewardSurface}
                  delayMs={168}
                  reduceMotion={reduceMotion}
                  skip={skip}
                />
              )}

              {spinReward && (
                <SpinRewardPlaque
                  amount={1}
                  receiptId={spinReceiptId}
                  visible={visible && Boolean(spinReceiptId)}
                  onComplete={() => {}}
                  testID="level-up-spin-plaque-hybrid"
                />
              )}
            </Animated.View>

            <Animated.View style={[styles.actions, ctaStyle]}>
              <Pressable
                testID="level-up-dismiss-hybrid"
                accessibilityRole="button"
                accessibilityLabel={continueLabel}
                onPress={onContinue}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={palette.button}
                  locations={[0, 0.52, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={styles.buttonHighlight} />
                <Text style={[styles.primaryButtonText, { color: palette.buttonText }]}>{continueLabel}</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    minHeight: '100%',
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContentCompact: {
    paddingTop: 24,
    paddingBottom: 22,
  },
  stage: {
    width: '100%',
    maxWidth: 410,
    alignItems: 'center',
  },
  ambientTop: {
    position: 'absolute',
    top: -110,
    alignSelf: 'center',
    width: 390,
    height: 390,
    borderRadius: 195,
    opacity: 0.38,
    transform: [{ scaleX: 1.18 }],
  },
  ambientBottom: {
    position: 'absolute',
    bottom: -170,
    right: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  portalStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalStageMilestone: {
    shadowOpacity: 0.48,
    shadowRadius: 34, // guard-ok: 1:1 с классической LevelUpThresholdModal (styles.portalStageMilestone)
    elevation: 22,
  },
  milestoneFlare: {
    position: 'absolute',
    top: 4,
    right: 0,
  },
  portalHalo: {
    position: 'absolute',
    opacity: 0.52,
  },
  portal: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.46,
    shadowRadius: 30, // guard-ok: 1:1 с классической LevelUpThresholdModal (styles.portal), не новая стоимость
    elevation: 18,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5, // guard-ok: контур декоративного кольца удара, не граница контейнера-контента
  },
  badgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    marginTop: 22,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  headlineCompact: {
    marginTop: 14,
    fontSize: 30,
    lineHeight: 34,
  },
  message: {
    maxWidth: 340,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    textAlign: 'center',
  },
  messageCompact: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 19,
  },
  rewardStack: {
    width: '100%',
    marginTop: 22,
    gap: 8,
  },
  rewardRow: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rewardCopy: {
    flex: 1,
    minWidth: 0,
  },
  rewardLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.72,
  },
  rewardValue: {
    marginTop: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    marginTop: 14,
  },
  primaryButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 19,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 9,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ translateY: 2 }, { scale: 0.992 }],
  },
  buttonHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
});

// ─── ГИБРИД «Световод + Чекан»: Бонус лиги — маяк (премиум) ─────────────────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена L5 «Бонус ·
// маяк (премиум)». Перенесено ВТОЧНОСТИ: скрим-фокус → луч+конус → орб
// повисает (spring 1/17/110) → затухающее качание 4→-2.5→0° → кольцо недели
// (7 рисок, прогресс = реальные дни активности, паттерн ArenaTimerRing) →
// панель выходит из света. Подключается ТОЛЬКО через
// LeagueBonusAvailableModal.motionVariant='hybrid' — боевой путь не тронут.
import React, { memo, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { LUM } from '../../constants/motionHybrid';
import { getLeagueBonusGiftImage } from '../../constants/leagueBonusGiftImages';
import { getLeagueBonusPalette } from '../../constants/leagueBonusPalette';
import { hapticSoftImpact, hapticTap } from '../../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { noAndroidOutline } from '../../constants/androidGlow';
import { leagueBonusBeaconCopy, leagueBonusBeaconDayLabel } from './league_bonus_beacon_copy';

const LEAGUE_CROWN_ICON = require('../../assets/images/league/league_crown.webp');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ORB_SIZE = 96;
const RING_SIZE = 96;
const RING_STROKE = 7;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;
const TICK_COUNT = 7;
const TICK_KEYS = Array.from({ length: TICK_COUNT }, (_, i) => `week-tick-${i}`);

type Props = {
  visible: boolean;
  /** Реальные дни активности этой недели (0..7) — честная привязка, не выдумка. */
  activeDaysThisWeek: number;
  crownName: string;
  isCrownWinner: boolean;
  buttonLabel: string;
  onClose: () => void;
  onOpenLeague: () => void;
};

/** Тонкие риски-разделители дней недели поверх кольца прогресса. */
function WeekTicks({ bg }: { bg: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {TICK_KEYS.map((key, i) => (
        <View
          key={key}
          style={[
            styles.tick,
            {
              backgroundColor: bg,
              transform: [{ rotate: `${(360 / TICK_COUNT) * i - 90}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

// зачем: словарь вынесен в league_bonus_beacon_copy.ts — сторож i18n
// (scripts/scan_untranslated_ui.mjs) требует форму const RU/UK/... рядом,
// а не один объект на ключ со всеми языками на соседних строках.
const copyFor = leagueBonusBeaconCopy;
const dayLabelFor = leagueBonusBeaconDayLabel;

function LeagueBonusBeaconOrb({
  visible,
  activeDaysThisWeek,
  crownName,
  isCrownWinner,
  buttonLabel,
  onClose,
  onOpenLeague,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const reduceMotion = useReduceMotion();
  const leagueBonusGiftImage = getLeagueBonusGiftImage(themeMode);
  const modalTheme = getLeagueBonusPalette(t, themeMode).modal;

  const days = Math.max(0, Math.min(7, Math.round(activeDaysThisWeek)));

  const scrimOpacity = useSharedValue(0);
  const threadHeight = useSharedValue(0);
  const coneOpacity = useSharedValue(0);
  const orbOpacity = useSharedValue(0);
  const orbY = useSharedValue(-180);
  const orbRotate = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const dayOpacity = useSharedValue(0);
  const panelOpacity = useSharedValue(0);
  const panelY = useSharedValue(14);

  useEffect(() => {
    if (!visible) return;

    if (reduceMotion) {
      // зачем: закон Motion DNA — Reduce Motion = один финальный кадр, без циклов/качаний.
      scrimOpacity.value = 1;
      threadHeight.value = 44;
      coneOpacity.value = 1;
      orbOpacity.value = 1;
      orbY.value = 0;
      orbRotate.value = 0;
      ringOpacity.value = 1;
      ringProgress.value = (days / 7) * 360;
      dayOpacity.value = 1;
      panelOpacity.value = 1;
      panelY.value = 0;
      return;
    }

    scrimOpacity.value = 0;
    threadHeight.value = 0;
    coneOpacity.value = 0;
    orbOpacity.value = 0;
    orbY.value = -180;
    orbRotate.value = 0;
    ringOpacity.value = 0;
    ringProgress.value = 0;
    dayOpacity.value = 0;
    panelOpacity.value = 0;
    panelY.value = 14;

    scrimOpacity.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) });
    threadHeight.value = withDelay(200, withTiming(44, { duration: 620, easing: Easing.bezier(0.2, 0, 0.2, 1) }));
    coneOpacity.value = withDelay(380, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));

    orbOpacity.value = withDelay(380, withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }));
    orbY.value = withDelay(460, withSpring(0, { mass: 1, damping: 17, stiffness: 110 }));
    // Затухающее качание 4 → -2.5 → 0 (закон: неравномерная лестница, не метроном).
    orbRotate.value = withDelay(
      1120,
      withSequence(
        withTiming(4, { duration: 320, easing: Easing.inOut(Easing.quad) }),
        withTiming(-2.5, { duration: 320, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      ),
    );

    ringOpacity.value = withDelay(1250, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
    ringProgress.value = withDelay(1300, withTiming((days / 7) * 360, { duration: 850, easing: Easing.bezier(0.2, 0, 0.2, 1) }));
    dayOpacity.value = withDelay(1900, withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));

    panelOpacity.value = withDelay(2050, withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    panelY.value = withDelay(2050, withSpring(0, LUM.settle));

    // Повисание орба на нити — мягкий тактильный отклик синхронно со spring'ом (460мс).
    const softImpactTimer = setTimeout(() => { void hapticSoftImpact(); }, 460);
    soundDirector.request('pm.reward.chest_open', { scope: 'league-bonus-beacon', dedupeKey: 'league-bonus-beacon' });

    return () => {
      clearTimeout(softImpactTimer);
      cancelAnimation(scrimOpacity);
      cancelAnimation(threadHeight);
      cancelAnimation(coneOpacity);
      cancelAnimation(orbOpacity);
      cancelAnimation(orbY);
      cancelAnimation(orbRotate);
      cancelAnimation(ringOpacity);
      cancelAnimation(ringProgress);
      cancelAnimation(dayOpacity);
      cancelAnimation(panelOpacity);
      cancelAnimation(panelY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, days]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));
  const threadStyle = useAnimatedStyle(() => ({ height: `${threadHeight.value}%` }));
  const coneStyle = useAnimatedStyle(() => ({ opacity: coneOpacity.value }));
  const orbStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [{ translateY: orbY.value }, { rotate: `${orbRotate.value}deg` }],
  }));
  const dayStyle = useAnimatedStyle(() => ({ opacity: dayOpacity.value }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelY.value }],
  }));
  const ringWrapStyle = useAnimatedStyle(() => ({ opacity: ringOpacity.value }));
  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - ringProgress.value / 360),
  }));

  if (!visible) return null;

  const closeLabel = copyFor('close', lang);

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Скрим-фокус: радиальное затемнение вокруг орба, а не плоская заливка. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: modalTheme.overlay }, scrimStyle]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={() => { void hapticTap(); onClose(); }}
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.stage,
            {
              paddingTop: Math.max(40, insets.top + 32),
              paddingBottom: Math.max(18, bottomInset + 8),
            },
          ]}
        >
          {/* Луч-нить: спускается сверху к орбу. */}
          <Animated.View pointerEvents="none" style={[styles.thread, { backgroundColor: modalTheme.eyebrow }, threadStyle]} />
          {/* Конус света под нитью. */}
          <Animated.View pointerEvents="none" style={[styles.cone, coneStyle]}>
            <View style={[styles.coneFill, { backgroundColor: modalTheme.eyebrow }]} />
          </Animated.View>

          {/* Орб: гало + кольцо недели (7 рисок) + стеклянный корпус. */}
          <Animated.View style={[styles.orb, orbStyle]}>
            <View pointerEvents="none" style={[styles.halo, { backgroundColor: modalTheme.halo }]} />
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, ringWrapStyle]}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_R}
                  stroke={modalTheme.rewardBorder}
                  strokeWidth={RING_STROKE}
                  fill="none"
                  opacity={0.35}
                />
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_R}
                  stroke={modalTheme.eyebrow}
                  strokeWidth={RING_STROKE}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  animatedProps={ringAnimatedProps}
                  transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                />
              </Svg>
              <WeekTicks bg={t.bgCard} />
            </Animated.View>
            <View style={[styles.core, { backgroundColor: modalTheme.eyebrow }]}>
              <Ionicons name="gift" size={30} color="#5A3E0A" />
            </View>
            <Animated.Text style={[styles.dayLabel, { color: modalTheme.eyebrow }, dayStyle]}>
              {dayLabelFor(lang, days)}
            </Animated.Text>
          </Animated.View>

          {/* Панель выходит из света орба. */}
          <Animated.View
            style={[
              styles.panel,
              {
                backgroundColor: t.bgCard,
                shadowColor: modalTheme.eyebrow,
                ...noAndroidOutline,
              },
              panelStyle,
            ]}
          >
            <Text style={[styles.panelTitle, { color: t.textPrimary, fontSize: Math.max(17, f.h2) }]}>
              {isCrownWinner ? copyFor('crown', lang) : copyFor('ready', lang)}
            </Text>
            <Text style={[styles.panelSubtitle, { color: t.textSecond, fontSize: Math.max(12, f.caption) }]}>
              {copyFor('expires', lang)}
            </Text>
            <View style={styles.panelMeta}>
              <Ionicons name={isCrownWinner ? 'ribbon' : 'podium-outline'} size={16} color={modalTheme.eyebrow} />
              <Text style={[styles.panelMetaText, { color: t.textSecond }]} numberOfLines={1}>
                {crownName}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => { void hapticTap(); onOpenLeague(); }}
              style={[styles.primaryBtn, { backgroundColor: modalTheme.eyebrow }]}
            >
              <Text style={[styles.primaryText, { color: modalTheme.primaryText }]}>{buttonLabel}</Text>
            </TouchableOpacity>
          </Animated.View>

          {isCrownWinner ? (
            <View pointerEvents="none" style={styles.crownBadge}>
              <Image source={LEAGUE_CROWN_ICON} contentFit="contain" style={styles.crownImage} accessible={false} />
            </View>
          ) : (
            <View pointerEvents="none" style={styles.giftBadge}>
              <Image source={leagueBonusGiftImage} contentFit="contain" style={styles.giftImage} accessible={false} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default memo(LeagueBonusBeaconOrb);

const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: {
    flex: 1,
    alignItems: 'center',
  },
  thread: {
    position: 'absolute',
    top: 0,
    width: 2,
    borderRadius: 1,
  },
  cone: {
    position: 'absolute',
    top: 0,
    width: 150,
    height: 190,
    alignItems: 'center',
    overflow: 'hidden',
  },
  coneFill: {
    width: '100%',
    height: '100%',
    opacity: 0.18,
  },
  orb: {
    marginTop: 150,
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    borderRadius: 999,
    opacity: 0.32,
  },
  tick: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 26,
    height: 2,
    marginTop: -1,
  },
  core: {
    width: ORB_SIZE - 30,
    height: ORB_SIZE - 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    position: 'absolute',
    bottom: -22,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  panel: {
    marginTop: 56,
    width: '86%',
    maxWidth: 340,
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  panelTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  panelSubtitle: {
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '400',
  },
  panelMeta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  panelMetaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  crownBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownImage: { width: 36, height: 36 },
  giftBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftImage: { width: 40, height: 40 },
});

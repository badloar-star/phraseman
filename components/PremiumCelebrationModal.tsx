/**
 * PremiumCelebrationModal — празднование подтверждённого доступа (Plus / Pro) и
 * активации промокода.
 *
 * зачем: владелец 2026-09-29 — перенос на Liquid Glass «1 в 1 с макета»
 * overlays-specialist.html (OS-CELEBRATION-PLUS/PRO/VIP-INTRO/BENEFITS/FINALE/PROMO).
 * Меняется только ВИД: графитовая основа из токенов темы (13 тем), одна плитка
 * с иконкой вместо золотой/зелёной/синей палитр и семи градиентов, без колец-обводок.
 * Хореография прежняя по смыслу: три шага (появление → польза → завершение) с
 * теми же звуками, хаптиком, подложкой и правилами закрытия; промокод — один
 * экран. Из бенефитов остался единственный подтверждённый — «Без расхода
 * энергии» (старые сцены и счётчик «11 преимуществ» в показ не входят).
 *
 * Контракт props сохранён: { visible, onClose, variant, promoCode }.
 * VipCelebrationModal остаётся тонкой обёрткой (variant="vip").
 */
import { tryPlayV2Event } from '../modules/sound_v2/legacy_bridge';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import KitTouchable from './KitTouchable';
import Reanimated, {
  Easing as REasing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { startCelebrationBackground, stopCelebrationBackground, letCelebrationBackgroundFinish } from '../modules/audio/celebrationBackgroundPlayer';
import { playCelebrationSceneSound, stopAllCelebrationSceneSounds } from '../modules/audio/celebrationScenePlayer';
import { type CelebrationVariant } from './premium_celebration/celebrationContent';
import { celebrationLiquidCopy, promoDurationText, type PromoReward } from './premium_celebration/celebrationLiquidCopy';

interface PremiumCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  variant?: CelebrationVariant;
  /** Промокод: показать одиночный экран «Промокод применён». */
  promoCode?: string | null;
  /** Срок промокода (из ответа сервера): «Plus на 30 дней» / «Plus навсегда»; нет — строка срока не рисуется. */
  promoReward?: PromoReward | null;
}

// ── Тайминги шагов (мс). Совпадают с картами ударов в документе звуков. ──
const ACT1_STRIKE_MS = 900;      // единственный удар кадра
const ACT1_TOTAL_MS = 2300;      // конец шага «появление» → шаг «польза»
const BENEFIT_STEP_MS = 2800;    // шаг «польза» держится, чтобы успеть прочесть
const STEP_TOTAL = 3;           // всего шагов в подписи «01 / 03»

type Act = 'promo' | 'act1' | 'act2' | 'act3';

function tierLabel(variant: CelebrationVariant): string {
  return variant === 'pro' ? 'Pro' : 'Plus';
}

function PremiumCelebrationModal({ visible, onClose, variant = 'premium', promoCode = null, promoReward = null }: PremiumCelebrationModalProps) {
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const copy = celebrationLiquidCopy(lang as Lang);
  const reduceMotion = useReducedMotion();
  const hasPromo = Boolean(promoCode);

  const [act, setAct] = useState<Act>(hasPromo ? 'promo' : 'act1');
  const actRef = useRef<Act>(act);
  const enterAct = useCallback((next: Act) => {
    actRef.current = next;
    setAct(next);
  }, []);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  // зачем: различить штатное закрытие (CTA после досмотра/пропуска — фон
  // должен доиграть) от резкого ухода с экрана (фон гасится fade-out'ом).
  const letBgFinishRef = useRef(false);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  /** «Продолжить» на шагах 1–2: переход к следующему шагу (ставится внутри эффекта). */
  const advanceRef = useRef<(() => void) | null>(null);

  // ── shared values ──
  const heroIn = useSharedValue(0);
  const strikeX = useSharedValue(1);
  const strikeY = useSharedValue(1);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const titleT = useSharedValue(0);
  const ctaT = useSharedValue(0);

  const cancelAll = useCallback(() => {
    [heroIn, strikeX, strikeY, ring1, ring2, titleT, ctaT].forEach(cancelAnimation);
  }, [heroIn, strikeX, strikeY, ring1, ring2, titleT, ctaT]);

  const resetAll = useCallback(() => {
    heroIn.value = 0; strikeX.value = 1; strikeY.value = 1;
    ring1.value = 0; ring2.value = 0; titleT.value = 0; ctaT.value = 0;
  }, [heroIn, strikeX, strikeY, ring1, ring2, titleT, ctaT]);

  // зачем (владелец 2026-08-25): «звуки не должны обрезаться» — soundDirector
  // держит ОДИН общий канал на всё приложение и обрывает предыдущий звук при
  // каждом новом. playCelebrationSceneSound даёт каждому звуку свой независимый
  // плеер, который доигрывает полностью (modules/audio/celebrationScenePlayer.ts).
  const playSound = useCallback((name: string) => {
    playCelebrationSceneSound(`pm.celebration.${name}` as never);
  }, []);

  /** Мгновенно показать финальный кадр (промокод — его единственный экран). */
  const jumpToEnd = useCallback(() => {
    clearTimers();
    cancelAll();
    heroIn.value = 1;
    strikeX.value = 1; strikeY.value = 1; ring1.value = 1; ring2.value = 1;
    titleT.value = 1; ctaT.value = 1;
    enterAct(hasPromo ? 'promo' : 'act3');
  }, [clearTimers, cancelAll, heroIn, strikeX, strikeY, ring1, ring2, titleT, ctaT, hasPromo, enterAct]);

  // зачем (координатор 14.10): звук покупки Plus V2 в момент показа торжества (кроме экрана «Промокод применён»); флаг sound_v2 выключен — тишина как раньше
  useEffect(() => {
    if (visible && !hasPromo) tryPlayV2Event('plus', 'premium_celebration');
  }, [visible, hasPromo]);

  // ── главная последовательность ──
  useEffect(() => {
    if (!visible) {
      clearTimers();
      cancelAll();
      resetAll();
      enterAct(hasPromo ? 'promo' : 'act1');
      advanceRef.current = null;
      if (letBgFinishRef.current) {
        letBgFinishRef.current = false;
        letCelebrationBackgroundFinish();
      } else {
        stopCelebrationBackground();
        stopAllCelebrationSceneSounds();
      }
      return undefined;
    }

    hapticSuccess();
    // зачем (владелец 2026-08-25): тёплая подложка на весь показ, отдельно от
    // точечных ударов — см. modules/audio/celebrationBackgroundPlayer.ts.
    startCelebrationBackground();

    // Reduce Motion: один финальный кадр, без прогона.
    if (reduceMotion) {
      jumpToEnd();
      playSound('finale_chord');
      return () => {
        clearTimers();
        if (!letBgFinishRef.current) {
          stopCelebrationBackground();
          stopAllCelebrationSceneSounds();
        }
      };
    }

    /** Текст шага выезжает заново на каждом шаге. */
    const showText = (delay: number) => {
      titleT.value = withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(delay, withTiming(1, { duration: 420, easing: REasing.bezier(0.23, 1, 0.32, 1) })),
      );
    };

    const runAct1 = () => {
      enterAct('act1');
      playSound('open_rift');
      heroIn.value = withDelay(120, withTiming(1, { duration: 560, easing: REasing.bezier(0.23, 1, 0.32, 1) }));
      ctaT.value = withDelay(500, withTiming(1, { duration: 320, easing: REasing.bezier(0.23, 1, 0.32, 1) }));

      later(() => {
        // ЕДИНСТВЕННЫЙ удар кадра — один hapticSuccess, а не россыпь тапов.
        strikeY.value = withSequence(withTiming(0.86, { duration: 0 }), withSpring(1, { mass: 0.6, damping: 9, stiffness: 220 }));
        strikeX.value = withSequence(withTiming(1.14, { duration: 0 }), withSpring(1, { mass: 0.6, damping: 9, stiffness: 220 }));
        ring1.value = withTiming(1, { duration: 820, easing: REasing.bezier(0.23, 1, 0.32, 1) });
        hapticSuccess();
      }, ACT1_STRIKE_MS);
      later(() => { ring2.value = withTiming(1, { duration: 820, easing: REasing.bezier(0.23, 1, 0.32, 1) }); }, 1010);
      showText(300);

      later(runAct2, ACT1_TOTAL_MS);
    };

    const runAct2 = () => {
      clearTimers();
      enterAct('act2');
      showText(0);
      hapticTap();
      playSound('energy_break');
      later(runAct3, BENEFIT_STEP_MS);
    };

    const runAct3 = () => {
      clearTimers();
      enterAct('act3');
      showText(0);
      playSound('finale_chord');
      hapticSuccess();
    };

    advanceRef.current = () => {
      const current = actRef.current;
      if (current === 'act1') runAct2();
      else if (current === 'act2') runAct3();
    };

    if (hasPromo) {
      // Промокод — один экран без шагов: появление, звук штампа, ждём CTA.
      enterAct('promo');
      playSound('promo_stamp');
      heroIn.value = withDelay(120, withTiming(1, { duration: 560, easing: REasing.bezier(0.23, 1, 0.32, 1) }));
      ring1.value = withDelay(500, withTiming(1, { duration: 820, easing: REasing.bezier(0.23, 1, 0.32, 1) }));
      ctaT.value = withDelay(500, withTiming(1, { duration: 320, easing: REasing.bezier(0.23, 1, 0.32, 1) }));
      showText(300);
    } else {
      runAct1();
    }

    // Фон гасится централизованно в ветке !visible выше (уважает letBgFinishRef);
    // здесь резкий stop только при unmount/смене variant без прохода через ту ветку.
    return () => {
      clearTimers();
      cancelAll();
      if (!letBgFinishRef.current) {
        stopCelebrationBackground();
        stopAllCelebrationSceneSounds();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, variant, reduceMotion, hasPromo]);

  const handleClose = useCallback(() => {
    // зачем: закрытие CTA/«Закрыть» — решение пользователя, а не авария; фон
    // догорает сам вместо резкого fade-out (владелец 2026-08-25).
    letBgFinishRef.current = true;
    letCelebrationBackgroundFinish();
    onClose();
  }, [onClose]);

  const router = useRouter();
  const handleCtaPress = useCallback(() => {
    hapticSuccess();
    handleClose();
    // зачем (аудит R58 #58, 15.10): «К занятиям» обещает переход, а только закрывало окно — теперь ведёт на вкладку занятий (окно закрывается первым, переход догоняет)
    router.push('/(tabs)/lessons' as never);
  }, [handleClose, router]);

  const isFinal = act === 'act3' || act === 'promo';

  /** Главная кнопка: на шагах 1–2 — дальше, на финале/промокоде — закрыть. */
  const handlePrimary = useCallback(() => {
    if (isFinal) { handleCtaPress(); return; }
    if (advanceRef.current) { hapticTap(); advanceRef.current(); return; }
    jumpToEnd();
  }, [isFinal, handleCtaPress, jumpToEnd]);

  /** «Пропустить» — досмотреть всё сразу; на финале — «Закрыть». */
  const handleSkipOrClose = useCallback(() => {
    if (isFinal) { handleClose(); return; }
    jumpToEnd();
  }, [isFinal, handleClose, jumpToEnd]);

  // ── стили ──
  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroIn.value,
    transform: [{ scale: interpolate(heroIn.value, [0, 1], [0.78, 1]) }],
  }));
  const tileStrikeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: strikeX.value }, { scaleY: strikeY.value }],
  }));
  // зачем: два отдельных useAnimatedStyle, а не фабрика — хук нельзя вызывать
  // из вложенной функции (правило хуков React).
  // Волна — заливка без обводки: тонкая круглая вспышка, расходится и гаснет.
  const ring1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring1.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(ring1.value, [0, 1], [1, 1.9]) }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring2.value, [0, 1], [0.35, 0]),
    transform: [{ scale: interpolate(ring2.value, [0, 1], [1, 2.3]) }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: titleT.value,
    transform: [{ translateY: interpolate(titleT.value, [0, 1], [14, 0]) }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaT.value,
    transform: [{ translateY: interpolate(ctaT.value, [0, 1], [12, 0]) }],
  }));

  if (!visible) return null;

  const tier = tierLabel(variant);
  const promoDuration = promoDurationText(lang as Lang, tier, promoReward);
  const phase = act === 'promo' ? 'promo' : act === 'act1' ? 'intro' : act === 'act2' ? 'benefits' : 'finale';
  const stepText = phase === 'promo'
    ? `${tier} · ${copy.promoLabel}`
    : `${tier} · 0${phase === 'intro' ? 1 : phase === 'benefits' ? 2 : 3} / 0${STEP_TOTAL}`;
  const title = phase === 'promo' ? copy.promoTitle
    : phase === 'intro' ? copy.titleActivated(tier)
      : phase === 'benefits' ? copy.benefitsTitle : copy.finaleTitle;
  const subtitle = phase === 'promo' ? copy.promoSub
    : phase === 'intro' ? copy.introSub
      : phase === 'benefits' ? copy.benefitsSub : copy.finaleSub;
  const icon = phase === 'promo' ? 'checkmark' : phase === 'benefits' ? 'flash' : 'layers';
  const primaryLabel = phase === 'promo' || phase === 'finale' ? copy.toLessons : copy.next;
  const skipLabel = isFinal ? copy.close : copy.skip;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleSkipOrClose}>
      <View style={[styles.root, { backgroundColor: glass.bg }]} accessibilityViewIsModal>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 14,
              paddingBottom: bottomInset + 24,
              paddingLeft: Math.max(22, insets.left),
              paddingRight: Math.max(22, insets.right),
            },
          ]} decelerationRate="fast"
        >
          <View style={styles.topRow}>
            <Text style={[styles.step, { color: glass.secondary, fontSize: f.caption }]}>{stepText}</Text>
            <KitTouchable
              testID={`${variant}-celebration-skip`}
              accessibilityRole="button"
              accessibilityLabel={skipLabel}
              activeOpacity={0.8}
              onPress={handleSkipOrClose}
              style={[styles.skip, { backgroundColor: glass.opaqueControl }]}
            >
              <Text style={[styles.skipText, { color: glass.secondary, fontSize: f.sub }]}>{skipLabel}</Text>
            </KitTouchable>
          </View>

          {/* Аура: плитка с иконкой и лёгкие искры — без градиентов и обводок. */}
          <Reanimated.View style={[styles.aura, heroStyle]} accessible={false} importantForAccessibility="no-hide-descendants">
            <Reanimated.View style={[styles.wave, { backgroundColor: glass.selected }, ring1Style]} />
            <Reanimated.View style={[styles.wave, { backgroundColor: glass.selected }, ring2Style]} />
            <View style={[styles.spark, styles.sparkOne, { backgroundColor: glass.secondary }]} />
            <View style={[styles.spark, styles.sparkTwo, { backgroundColor: glass.secondary }]} />
            <View style={[styles.spark, styles.sparkThree, { backgroundColor: glass.secondary }]} />
            <View style={[styles.spark, styles.sparkFour, { backgroundColor: glass.secondary }]} />
            <Reanimated.View style={[styles.tile, { backgroundColor: glass.opaqueControl }, tileStrikeStyle]}>
              <Ionicons name={icon} size={42} color={glass.text} />
            </Reanimated.View>
          </Reanimated.View>

          <Reanimated.View style={[styles.textBlock, textStyle]}>
            <Text style={[styles.kicker, { color: glass.secondary, fontSize: f.caption }]}>{copy.kicker}</Text>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: glass.text, fontSize: f.h1, lineHeight: Math.round(f.h1 * 1.24) }]}
            >
              {title}
            </Text>
            <Text style={[styles.subtitle, { color: glass.secondary, fontSize: f.body, lineHeight: Math.round(f.body * 1.45) }]}>
              {subtitle}
            </Text>
            {phase === 'benefits' || phase === 'promo' ? (
              <View style={[styles.card, { backgroundColor: glass.opaqueCard }]}>
                <Text style={[styles.cardTitle, { color: glass.text, fontSize: f.body }]}>
                  {phase === 'promo' ? copy.promoCardTitle : copy.benefitCardTitle}
                </Text>
                {phase === 'promo' && promoCode ? (
                  <Text style={[styles.code, { color: glass.text, fontSize: f.body }]}>{promoCode}</Text>
                ) : null}
                {phase === 'promo' ? (promoDuration ? (
                  // зачем (владелец ~11:20 15.10): срок промокода по-человечески — «Plus на 30 дней» / «Plus навсегда»; прежней строки про срок «по записи аккаунта» больше нет
                  <Text style={[styles.cardBody, { color: glass.secondary, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4) }]} testID="premium-celebration-promo-duration">{promoDuration}</Text>
                ) : null) : (
                  <Text style={[styles.cardBody, { color: glass.secondary, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4) }]}>{copy.benefitCardBody}</Text>
                )}
              </View>
            ) : null}
          </Reanimated.View>

          <View style={styles.spacer} />

          <Reanimated.View style={[styles.ctaWrap, ctaStyle]}>
            <KitTouchable
              testID={`${variant}-celebration-cta`}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              activeOpacity={0.88}
              onPress={handlePrimary}
              style={[styles.cta, { backgroundColor: glass.accent }]}
            >
              <Text style={[styles.ctaText, { color: glass.accentInk, fontSize: f.bodyLg }]}>{primaryLabel}</Text>
            </KitTouchable>
          </Reanimated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default memo(PremiumCelebrationModal);

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center' },

  topRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  step: { flexShrink: 1, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  skip: { minHeight: 44, minWidth: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontWeight: '700' },

  aura: { marginTop: 36, width: 176, height: 176, alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute', width: 104, height: 104, borderRadius: 52 },
  tile: { width: 104, height: 104, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', width: 6, height: 6, borderRadius: 3, opacity: 0.55 },
  sparkOne: { top: 14, left: 30 },
  sparkTwo: { top: 30, right: 16 },
  sparkThree: { bottom: 24, left: 14 },
  sparkFour: { bottom: 12, right: 40 },

  textBlock: { alignSelf: 'stretch', alignItems: 'center', marginTop: 20 },
  kicker: { fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  title: { marginTop: 8, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  subtitle: { marginTop: 10, textAlign: 'center' },
  card: { alignSelf: 'stretch', marginTop: 26, padding: 15, borderRadius: 18, gap: 3 },
  cardTitle: { fontWeight: '800' },
  code: { fontWeight: '800', letterSpacing: 2 },
  cardBody: {},

  spacer: { flexGrow: 1, minHeight: 24 },
  ctaWrap: { alignSelf: 'stretch' },
  cta: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ctaText: { fontWeight: '800' },
});

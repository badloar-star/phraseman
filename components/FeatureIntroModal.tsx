// ─── FeatureIntroModal — обучающая модалка фичи (новая система) ───────────
// зачем: владелец (2026-08-16) — «люди не находят фичи». Единая модалка-
// объяснение для всех интро из app/feature_intro_registry.ts: иконка фичи в
// круге, заголовок + суть каскадом, CTA закрывает и помечает «показано»,
// запись признака просмотра принадлежит вызывающему экрану, не этому компоненту.
// Гибрид «Световод + Чекан» — единственный вариант (это НОВАЯ поверхность,
// classic-параллели тут нет и не нужно). Каркас — HybridSheetShell (вход из
// света, settle без отскока; свайп вызывает onLater).
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import DuoPressable from './DuoPressable';
import PressableHybrid from './PressableHybrid';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { LUM } from '../constants/motionHybrid';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { ThemeAccentFill } from './v2/ThemeAccentFill';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import type { FeatureIntroIconName } from '../app/feature_intro_registry';
import FeatureIntroStage, { type FeatureIntroFamily } from './feature_intro/FeatureIntroStage';
import type { FeatureIntroArt } from '../app/feature_intro_art';
import { ThemedArt } from './theme/ThemedArt';
import { resolveThemedArt, THEMED_ART_ALL_NAMES, type ThemedArtName } from './theme/themed_art_registry';

interface Props {
  visible: boolean;
  icon: FeatureIntroIconName;
  title: string;
  body: string;
  ctaLabel: string;
  laterLabel: string;
  family?: FeatureIntroFamily;
  art?: FeatureIntroArt;
  secondaryLabel?: string;
  hideSecondary?: boolean;
  onSecondary?: () => void;
  onDismissed?: () => void;
  /** Основное действие после анимированного закрытия. */
  onDone: () => void;
  /** Вторичная кнопка / бэкдроп / свайп / системная «назад». */
  onLater: () => void;
  testIdPrefix?: string;
  /** id вступления из реестра (`cards_hub_first_visit`…) — по нему берётся сцена 2.0 `intro_<ключ>`. */
  introId?: string;
}

/** Один узел каскада: opacity 0→1 + translateY 14→0, задержка из LUM.ladder. */
function CascadeItem({ index, style, children }: { index: number; style?: object; children: React.ReactNode }) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const y = useSharedValue(reduceMotion ? 0 : 14);
  const delay = LUM.ladder[Math.min(index, LUM.ladder.length - 1)];

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withSpring(0, LUM.settle));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

/** Круг с иконкой фичи: settle без отскока, без задержки (первый узел световода). */
function IconStage({ icon }: { icon: FeatureIntroIconName }) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.6);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    opacity.value = withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) });
    scale.value = withSpring(1, LUM.settle);
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [opacity, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[
      styles.iconStageOuter,
      {
        backgroundColor: glass.opaqueControl,
        shadowColor: glass.bg,
        shadowOpacity: 0.28,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
        elevation: 6,
      },
      style,
    ]}>
      <View style={styles.iconCircle}>
        <LinearGradient
          pointerEvents="none"
          colors={[glass.selected, glass.opaqueControl]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[glass.lightTint, 'transparent']}
          start={{ x: 0.15, y: 0.05 }}
          end={{ x: 0.8, y: 0.78 }}
          style={[StyleSheet.absoluteFill, { opacity: 0.16 }]}
        />
        <View pointerEvents="none" style={styles.stageRim} />
        <Ionicons name={icon} size={28} color={glass.accentText} />
      </View>
    </Animated.View>
  );
}

/** id вступления → имя сцены: `cards_hub_first_visit` / `cards_swipe_help` → `intro_cards_hub` / `intro_cards_swipe`. */
function introSceneName(introId: string | undefined): ThemedArtName | null {
  if (!introId) return null;
  const candidate = `intro_${introId.replace(/_(first_visit|help)$/, '')}`;
  if (!(THEMED_ART_ALL_NAMES as readonly string[]).includes(candidate)) {
    console.warn('[INTRO-ART] нет сцены для вступления', JSON.stringify({ introId, candidate }));
    return null;
  }
  return candidate as ThemedArtName;
}

function FeatureIntroModal({
  visible,
  icon,
  title,
  body,
  ctaLabel,
  laterLabel,
  onDone,
  onLater,
  family,
  art = 'arena',
  secondaryLabel,
  hideSecondary = false,
  onSecondary,
  onDismissed,
  testIdPrefix = 'feature-intro',
  introId,
}: Props) {
  const { f, liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  // зачем (владелец 04.10, «ВОТ ВШИВАЙ», 06dd77148): окно первого входа показывает сцену 2.0 intro_<ключ> через ThemedArt
  // (светлая/тёмная по оформлению темы). Нет сцены — прежний значок; концепции-«семьи» забракованы и уступают сцене.
  const sceneTone = liquidGlassAppearance === 'light' ? 'light' : 'dark';
  const sceneName = introSceneName(introId);
  const sceneOrigin = sceneName ? resolveThemedArt(sceneName, sceneTone).origin : 'none';
  const showScene = sceneName !== null && (sceneOrigin === 'v2art' || sceneOrigin === 'v2art_other_brightness');
  const stageFamily = showScene ? undefined : family;
  const { width: winW } = useWindowDimensions();
  const sceneW = Math.min(winW - 40, 440);
  const sceneH = Math.round(sceneW / 1.5);
  useEffect(() => {
    if (!visible) return;
    console.log('[INTRO-ART]', JSON.stringify({ introId: introId ?? null, sceneName, tone: sceneTone, origin: sceneOrigin, shown: showScene ? 'scene' : (family ? `family:${family}` : `icon:${icon}`) }));
  }, [visible, introId, sceneName, sceneTone, sceneOrigin, showScene, family, icon]);
  // зачем: FeatureIntro — только поверхность/палитра стекла (макет overlays), тексты и логика не тронуты.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const pendingAction = useRef<(() => void) | null>(null);
  const dismissRequested = useRef(false);
  const requestAction = (action: () => void, requestDismiss: () => void) => {
    if (dismissRequested.current) return;
    dismissRequested.current = true;
    pendingAction.current = action;
    requestDismiss();
  };
  const handleClose = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    (action ?? onLater)();
  }, [onLater]);
  useEffect(() => {
    pendingAction.current = null;
    dismissRequested.current = false;
  }, [visible]);

  return (
    <HybridSheetShell
      visible={visible}
      onClose={handleClose}
      onDismissed={onDismissed}
      onDismissRequested={() => { dismissRequested.current = true; }}
      closeLabel={laterLabel}
      testID={`${testIdPrefix}-sheet`}
      material="liquid-glass-opaque"
    >
      {({ requestDismiss }) => <>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 4 }} bounces={false} decelerationRate="fast">
        {showScene && sceneName ? (
          // зачем (координатор 04.10): нижние 12 % сцены пустые — подтягиваем заголовок на них, отступ как у значка.
          <View style={[styles.sceneRow, { marginBottom: 4 - Math.round(sceneH * 0.12) }]}>
            <ThemedArt name={sceneName} width={sceneW} height={sceneH} testID={`${testIdPrefix}-scene`} />
          </View>
        ) : stageFamily ? <FeatureIntroStage family={stageFamily} art={art} /> : <View style={styles.iconRow}><IconStage icon={icon} /></View>}

      <CascadeItem index={1}>
        <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: stageFamily ? f.h1 * 1.3 : 25, lineHeight: stageFamily ? f.h1 * 1.3 * 1.2 : 31 }]}>{title}</Text>
      </CascadeItem>

      <CascadeItem index={2}>
        <Text style={[styles.body, { color: glass.secondary, fontSize: 16, lineHeight: 22 }]}>{body}</Text>
      </CascadeItem>
      </ScrollView>

      <CascadeItem index={3} style={styles.footer}>
        <DuoPressable
          testID={`${testIdPrefix}-cta`}
          accessibilityLabel={ctaLabel}
          onPress={() => requestAction(onDone, requestDismiss)}
          edgeColor={glass.glassEdge}
          edgeHeight={4}
          style={[styles.primaryFace, { backgroundColor: glass.accent }]}
        >
          {/* зачем (Сверка overlays-041, kit.css .cta): главная кнопка с глянцем — общий слой темы (в «Спокойно» KitCtaGloss). */}
          <ThemeAccentFill glass={glass} radius={24} />
          <Text style={[styles.primaryText, { color: glass.accentInk, fontSize: 16 }]}>{ctaLabel}</Text>
        </DuoPressable>
        {!hideSecondary ? <PressableHybrid
          variant="secondary"
          onPress={() => requestAction(onSecondary ?? onLater, requestDismiss)}
          style={styles.secondaryBtn}
          // зачем (overlays.html `.cta.gh`): «Позже» — капсула 48 на всю ширину с тонким светлым контуром, а не текст.
          contentStyle={[styles.secondaryFace, { backgroundColor: glass.opaqueControl }]} // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и тень («Позже» — капсула тоном)
        >
          <Text
            testID={`${testIdPrefix}-later`}
            style={[styles.secondaryText, { color: glass.text, fontSize: 16 }]}
          >
            {secondaryLabel ?? laterLabel}
          </Text>
        </PressableHybrid> : null}
      </CascadeItem>
      </>}
    </HybridSheetShell>
  );
}

export default memo(FeatureIntroModal);

const styles = StyleSheet.create({
  iconRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  // Сцена 3:2 по ширине содержимого шторки; заголовок ниже на 14 (как у значка).
  sceneRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  iconStageOuter: {
    width: 108,
    height: 108,
    borderRadius: 34,
  },
  iconCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageRim: {
    position: 'absolute',
    top: 1,
    alignSelf: 'center',
    width: '72%',
    height: StyleSheet.hairlineWidth,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  },
  // зачем (overlay.css `.ov-title` 25/31 760, `.ov-body` 15/22 → 16 по D145, кнопка на 20 ниже текста).
  title: {
    marginTop: 14,
    fontWeight: '800',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 20,
  },
  footer: {
    gap: 10,
  },
  // `.cta`: пилюля 48, радиус 24, 16/700.
  primaryFace: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryText: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    minHeight: 48,
    alignSelf: 'stretch',
  },
  secondaryFace: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontWeight: '700',
  },
});

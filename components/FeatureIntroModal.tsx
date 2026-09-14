// ─── FeatureIntroModal — обучающая модалка фичи (новая система) ───────────
// зачем: владелец (2026-08-16) — «люди не находят фичи». Единая модалка-
// объяснение для всех интро из app/feature_intro_registry.ts: иконка фичи в
// круге, заголовок + суть каскадом, CTA закрывает и помечает «показано»,
// запись признака просмотра принадлежит вызывающему экрану, не этому компоненту.
// Гибрид «Световод + Чекан» — единственный вариант (это НОВАЯ поверхность,
// classic-параллели тут нет и не нужно). Каркас — HybridSheetShell (вход из
// света, settle без отскока; свайп вызывает onLater).
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useTheme } from './ThemeContext';
import { LUM } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import type { FeatureIntroIconName } from '../app/feature_intro_registry';
import FeatureIntroStage, { type FeatureIntroFamily } from './feature_intro/FeatureIntroStage';
import type { FeatureIntroArt } from '../app/feature_intro_art';

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
  const { theme: t } = useTheme();
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
    <Animated.View style={[styles.iconCircle, { backgroundColor: `${t.accent}1F` }, style]}>
      <Ionicons name={icon} size={34} color={t.accent} />
    </Animated.View>
  );
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
  art = 'league',
  secondaryLabel,
  hideSecondary = false,
  onSecondary,
  onDismissed,
  testIdPrefix = 'feature-intro',
}: Props) {
  const { theme: t, f } = useTheme();
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
    >
      {({ requestDismiss }) => <>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 4 }} bounces={false}>
        {family ? <FeatureIntroStage family={family} art={art} /> : <View style={styles.iconRow}><IconStage icon={icon} /></View>}

      <CascadeItem index={1}>
        <Text accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: family ? f.h1 * 1.3 : f.h3, lineHeight: (family ? f.h1 * 1.3 : f.h3) * 1.2 }]}>{title}</Text>
      </CascadeItem>

      <CascadeItem index={2}>
        <Text style={[styles.body, { color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.5 }]}>{body}</Text>
      </CascadeItem>
      </ScrollView>

      <CascadeItem index={3} style={styles.footer}>
        <DuoPressable
          testID={`${testIdPrefix}-cta`}
          accessibilityLabel={ctaLabel}
          onPress={() => requestAction(onDone, requestDismiss)}
          edgeColor={t.bgSurface2}
          edgeHeight={4}
          style={[styles.primaryFace, { backgroundColor: t.accent, borderRadius: family === 'orbit' ? 30 : 18 }]}
        >
          <Text style={[styles.primaryText, { color: t.correctText, fontSize: f.bodyLg }]}>{ctaLabel}</Text>
        </DuoPressable>
        {!hideSecondary ? <PressableHybrid
          variant="secondary"
          onPress={() => requestAction(onSecondary ?? onLater, requestDismiss)}
          style={styles.secondaryBtn}
          contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            testID={`${testIdPrefix}-later`}
            style={[styles.secondaryText, { color: t.textMuted, fontSize: f.body }]}
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
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 14,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 22,
  },
  footer: {
    gap: 10,
  },
  primaryFace: {
    minHeight: 56,
    borderRadius: 18,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontWeight: '700',
  },
});

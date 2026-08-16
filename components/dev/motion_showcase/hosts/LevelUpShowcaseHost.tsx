// ─── Витрина движения · хост повышения уровня ────────────────────────────────
// зачем: LevelUpThresholdModal — портал-оверлей, которым владеет РОДИТЕЛЬ:
// он держит Animated.Value-драйверы (opacity/translateY/glow) в useRef и сам
// анимирует вход (см. components/dev/DevHubSheet.tsx openPreview). Первая
// версия витрины создавала `new Animated.Value` внутри render-функции — на
// каждом ре-рендере драйверы пересоздавались, вход не анимировался (статичный
// «экран» вместо модалки), а ремаунт ронял приложение. Этот хост повторяет
// боевого родителя один в один: драйверы стабильны, вход по тем же таймингам,
// закрытие — через onContinue и через аппаратный «назад».
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import LevelUpThresholdModal, { type LevelUpPreviewVariant } from '../../../LevelUpThresholdModal';
import { useTheme } from '../../../ThemeContext';
import { useReduceMotion } from '../../../../hooks/use_reduce_motion';
import { cs } from '../showcase_copy';

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  variant: LevelUpPreviewVariant;
  motionVariant: 'classic' | 'hybrid';
}>;

/** Тайминги входа — 1:1 с DevHubSheet.openPreview, чтобы превью не врало. */
const ENTER_MS = { standard: 260, milestone: 340 } as const;

export function LevelUpShowcaseHost({ visible, onClose, variant, motionVariant }: Props) {
  const { themeMode } = useTheme();
  const reduceMotion = useReduceMotion();
  const milestone = variant === 'milestone';
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(milestone ? 24 : 14)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      opacity.setValue(1); translateY.setValue(0); glow.setValue(1);
      return;
    }
    opacity.setValue(0);
    translateY.setValue(milestone ? 24 : 14);
    glow.setValue(0);
    const duration = ENTER_MS[variant];
    const run = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 1, duration, useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [visible, variant, milestone, reduceMotion, opacity, translateY, glow]);

  const level = milestone ? 20 : 13;
  return (
    <LevelUpThresholdModal
      visible={visible}
      variant={variant}
      level={level}
      themeMode={themeMode}
      kicker={milestone ? cs('levelup_kicker_milestone') : cs('levelup_kicker_standard')}
      headline={cs('levelup_headline').replace('{level}', String(level))}
      message={milestone ? cs('levelup_message_milestone') : cs('levelup_message_standard')}
      xpLabel={cs('levelup_xp_label')}
      xpValue={cs('levelup_xp_value')}
      titleLabel={cs('levelup_title_label')}
      energyLabel={cs('levelup_energy_label')}
      energyValue={(amount) => cs('levelup_energy_value').replace('{amount}', String(amount))}
      spinReward
      spinReceiptId={`motion-showcase-levelup-${variant}-${motionVariant}`}
      continueLabel={cs('levelup_continue_label')}
      opacity={opacity}
      translateY={translateY}
      glow={glow}
      onShow={() => {}}
      onContinue={onClose}
      motionVariant={motionVariant}
    />
  );
}

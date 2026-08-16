// ─── Витрина движения · хост повышения уровня ────────────────────────────────
// зачем: LevelUpThresholdModal — портал-оверлей, которым владеет родитель.
// С 2026-08-16 гибрид «Световод + Чекан» — ЕДИНСТВЕННАЯ реализация
// (project_motion_program.md): точка входа сама рендерит Hybrid и держит
// свой reanimated-движок, вызывающему коду больше не нужны Animated.Value-
// драйверы (opacity/translateY/glow) и проп motionVariant. Закрытие —
// через onContinue и через аппаратный «назад».
import React from 'react';
import LevelUpThresholdModal, { type LevelUpPreviewVariant } from '../../../LevelUpThresholdModal';
import { useTheme } from '../../../ThemeContext';
import { cs } from '../showcase_copy';

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  variant: LevelUpPreviewVariant;
}>;

export function LevelUpShowcaseHost({ visible, onClose, variant }: Props) {
  const { themeMode } = useTheme();
  const milestone = variant === 'milestone';
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
      spinReceiptId={`motion-showcase-levelup-${variant}`}
      continueLabel={cs('levelup_continue_label')}
      onShow={() => {}}
      onContinue={onClose}
    />
  );
}

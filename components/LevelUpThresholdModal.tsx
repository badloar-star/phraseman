/**
 * LevelUpThresholdModal — точка входа модалки повышения уровня.
 *
 * зачем: владелец принял гибрид «Световод + Чекан» (LevelUpThresholdModalHybrid)
 * как ЕДИНСТВЕННУЮ реализацию (2026-08-16, project_motion_program.md). Этот
 * файл остаётся точкой входа (app/_layout.tsx, DevHubSheet, showcase хост
 * импортируют его по этому пути и типу LevelUpPreviewVariant) и стал тонкой
 * обёрткой без собственных Animated.Value-драйверов — Hybrid использует свой
 * reanimated-движок и не принимает opacity/translateY/glow.
 */
import React from 'react';
import type { ThemeMode } from '../constants/theme';
import LevelUpThresholdModalHybrid from './LevelUpThresholdModalHybrid';

export type LevelUpPreviewVariant = 'standard' | 'milestone';

export type LevelUpThresholdModalProps = {
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

export default function LevelUpThresholdModal({
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
}: LevelUpThresholdModalProps) {
  return (
    <LevelUpThresholdModalHybrid
      visible={visible}
      variant={variant}
      level={level}
      themeMode={themeMode}
      kicker={kicker}
      headline={headline}
      message={message}
      xpLabel={xpLabel}
      xpValue={xpValue}
      titleLabel={titleLabel}
      titleReward={titleReward}
      titleColor={titleColor}
      energyLabel={energyLabel}
      energyReward={energyReward}
      energyValue={energyValue}
      spinReward={spinReward}
      spinReceiptId={spinReceiptId}
      continueLabel={continueLabel}
      onShow={onShow}
      onContinue={onContinue}
    />
  );
}

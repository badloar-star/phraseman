/**
 * Модалка «друг принёс ключ» — celebration на экране «Награда за друга».
 *
 * зачем: владелец принял гибрид «Световод + Чекан» (ReferralFriendRewardHybrid)
 * как ЕДИНСТВЕННУЮ реализацию (2026-08-16, project_motion_program.md). Этот
 * файл остаётся точкой входа (другие файлы импортируют его по этому пути) и
 * стал тонкой обёрткой без собственной анимации/classic-ветки.
 */
import React from 'react';
import ReferralFriendRewardHybrid from './celebration/ReferralFriendRewardHybrid';

export interface FriendRewardCelebrationData {
  name: string;
}

interface Props {
  data: FriendRewardCelebrationData | null;
  onClose: () => void;
  title: string;
  subtitle: string;
  ctaLabel: string;
}

export default function ReferralFriendRewardModal({ data, onClose, title, subtitle, ctaLabel }: Props) {
  if (!data) return null;

  return (
    <ReferralFriendRewardHybrid
      visible={!!data}
      title={title}
      subtitle={subtitle}
      ctaLabel={ctaLabel}
      onClose={onClose}
    />
  );
}

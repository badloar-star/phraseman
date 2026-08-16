// ─── Общая карточка награды сундука лиги ────────────────────────────────────
// зачем: LeagueChestOpenModal (классика) и LeagueChestSlitOpen (гибрид «щель
// света») должны показывать ОДИНАКОВЫЕ подписи/иконки наград — полнота сцены
// требует того же контента, что и оригинал (см. CLAUDE.md «ПОЛНОТА»). Вынесено
// сюда, чтобы гибрид не копипастил formatReward/RewardIcon, а переиспользовал.
import type React from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { LeagueChestRewardDrop } from '../../app/services/league_chest_rewards';
import type { CustomAvatarLogoColor } from '../../constants/custom_avatars';

export type RewardCardIcon =
  | { type: 'image'; source: ImageSourcePropType; scale?: 'large' | 'normal' }
  | { type: 'avatar'; avatarId: string; gradientId: string; logoColor: CustomAvatarLogoColor }
  | { type: 'aura'; auraId: string; avatarId: string; gradientId: string; logoColor: CustomAvatarLogoColor }
  | { type: 'goldTheme'; source: ImageSourcePropType };

export type RewardCard = {
  title: string;
  subtitle?: string;
  accent: string;
  icon: RewardCardIcon;
};

/** Рендерит иконку карточки награды (передаётся классикой, чтобы гибрид не тянул CustomAvatarBadge/AvatarAura напрямую). */
export type RewardIconRenderer = (card: RewardCard, drop: LeagueChestRewardDrop) => React.ReactElement;

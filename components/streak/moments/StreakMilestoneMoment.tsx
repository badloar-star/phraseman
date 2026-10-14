// StreakMilestoneMoment.tsx — единая точка входа рубежей серии: малый рубеж — тост, остальные — полноэкранная сцена.
// зачем (координатор 14.10): Ядро показывает рубеж одним компонентом и не знает про уровни; выбор сцены — по таблице streak_milestones.ts.
// Показ — только за флагом moments_v3 (isMomentsV3Enabled, по умолчанию выключен): решает вызывающий; компонент ничего не читает и не пишет.
import React, { memo } from 'react';
import type { Lang } from '../../../constants/i18n';
import StreakMilestoneScreen from './StreakMilestoneScreen';
import StreakMilestoneToast from './StreakMilestoneToast';
import { streakMomentKind, type StreakMilestone } from './streak_milestones';

export type StreakMilestoneMomentProps = Readonly<{
  lang: Lang;
  milestone: StreakMilestone;
  coinRank: number | null;
  onDone: () => void;
  onShare?: () => void;
}>;

function StreakMilestoneMoment({ lang, milestone, coinRank, onDone, onShare }: StreakMilestoneMomentProps) {
  return streakMomentKind(milestone) === 'toast'
    ? <StreakMilestoneToast lang={lang} milestone={milestone} coinRank={coinRank} onDone={onDone} />
    : <StreakMilestoneScreen lang={lang} milestone={milestone} coinRank={coinRank} onDone={onDone} onShare={onShare} />;
}

export default memo(StreakMilestoneMoment);

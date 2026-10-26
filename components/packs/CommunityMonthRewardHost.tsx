import React, { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useTabNav } from '../../app/TabContext';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration } from '../../app/account_generation';
import { callCommunityMonthClaimReward, callCommunityMonthGetRewards, type CommunityMonthReward } from '../../app/community_packs/functionsClient';
import { mergeLevelSpinServerStars } from '../../app/level_spin_star_grants';
import { DebugLogger } from '../../app/debug-logger';
import { CommunityWinnerDialog } from './CommunityWinnerDialog';

/** Only server-issued receipts are eligible. A mock winner can never reach this host. */
export function CommunityMonthRewardHost({ userId }: Readonly<{ userId: string | null }>): React.JSX.Element {
  const focused = useIsFocused();
  const { runtimeOwnerId } = useTabNav();
  const active = focused && runtimeOwnerId === 'packs';
  const [winner, setWinner] = useState<CommunityMonthReward | null>(null);
  useEffect(() => {
    setWinner(null);
    const token = captureAccountGeneration();
    if (!active || !userId || !isCurrentAccountGeneration(token, userId)) return;
    let live = true;
    const unsubscribe = subscribeAccountGeneration(() => { live = false; setWinner(null); });
    void callCommunityMonthGetRewards(userId).then(rewards => {
      if (live && isCurrentAccountGeneration(token, userId)) setWinner(rewards.find(r => !r.claimed) ?? null);
    }).catch((error: unknown) => {
      DebugLogger.warn('community:month-rewards', error instanceof Error ? error.message : String(error));
    });
    return () => { live = false; unsubscribe.remove(); };
  }, [userId, active]);
  const claim = async (): Promise<void> => {
    const token = captureAccountGeneration();
    if (!winner || !userId || !isCurrentAccountGeneration(token, userId)) throw new Error('Account changed');
    const rewardId = winner.rewardId;
    const receipt = await callCommunityMonthClaimReward(userId, rewardId);
    if (!isCurrentAccountGeneration(token, userId)) return;
    if (receipt.kind === 'coins') await mergeLevelSpinServerStars(token, {
      stars: receipt.stars, starsEarnedTotal: receipt.starsEarnedTotal, starsSeq: receipt.starsSeq,
      serverCreditedDelta: receipt.amount,
    });
    if (isCurrentAccountGeneration(token, userId)) setWinner(current => current?.rewardId === rewardId ? { ...current, claimed: true } : current);
  };
  return <CommunityWinnerDialog winner={active ? winner : null} onClaim={claim} onClose={() => setWinner(null)} />;
}

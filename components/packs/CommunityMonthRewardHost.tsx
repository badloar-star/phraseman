import React, { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useTabNav } from '../../app/TabContext';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration } from '../../app/account_generation';
import { callCommunityMonthClaimReward, callCommunityMonthGetRewards, type CommunityMonthReward } from '../../app/community_packs/functionsClient';
import { mergeLevelSpinServerStars } from '../../app/level_spin_star_grants';
import { DebugLogger } from '../../app/debug-logger';
import { CommunityWinnerDialog } from './CommunityWinnerDialog';
import { storiesReplaceWindows } from '../../modules/story_events/story_instead_sources';

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
  // зачем (владелец 11.11: «Убрать окно, оставить историю»; правило 01.09 «удаляешь показ — не унеси награду»): при включённых историях
  // окно «Награда сообщества» не всплывает — победителю о призе рассказывает история Сообщества (contest_winner). Монеты выдавала кнопка
  // «Забрать» в окне, поэтому без окна приз забирается сам: тот же вызов сервера и то же слияние баланса, один раз на награду.
  // Сбой — в журнал; повтор при следующем заходе на вкладку. Истории выключены (флаг stories_v1) — окно как раньше.
  const storiesInstead = storiesReplaceWindows();
  const autoClaimRef = useRef<string | null>(null);
  useEffect(() => {
    if (!storiesInstead || !active || !winner || winner.claimed) return; // окно работает само / нечего забирать
    if (autoClaimRef.current === winner.rewardId) return; // эту награду уже забираем
    const rewardId = winner.rewardId;
    autoClaimRef.current = rewardId;
    DebugLogger.info('[COMMUNITY-REWARD]', `истории вместо окна: забираем приз сами rewardId=${rewardId}`);
    void claim()
      .then(() => { DebugLogger.info('[COMMUNITY-REWARD]', `приз забран rewardId=${rewardId}`); })
      .catch((error: unknown) => {
        DebugLogger.warn('[COMMUNITY-REWARD]', `приз не забран rewardId=${rewardId}: ${error instanceof Error ? error.message : String(error)} — повтор при следующем заходе на вкладку`);
        autoClaimRef.current = null;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: claim пересоздаётся на каждый рендер; запуск привязан к самой награде, защёлка — autoClaimRef
  }, [storiesInstead, active, winner]);
  return <CommunityWinnerDialog winner={active && !storiesInstead ? winner : null} onClaim={claim} onClose={() => setWinner(null)} />;
}

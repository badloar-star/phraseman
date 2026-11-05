// use_referral_ladder_story.ts — история лесенки приглашений для кольца у аватарки (0 или 1 событие type 'referral_ladder').
// зачем (владелец 29.10 «автоматически, плюс история»; Ядро и координатор): данные — строка referralLastReward проекции доступа через
// referral_ladder_store; решение «показывать ли» — чистая функция ladderStoryDecision (награда не старше 7 дней, 7 дней от первого показа,
// рубильник referral_ladder_enabled — тот же, что у экрана лесенки). У бессрочного Plus (isPro) строки «ещё N — и Plus» нет: для него это
// неправда. Первый показ и просмотр отмечаются в памяти сразу, на диск — фоном.
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { DebugLogger } from '../../app/debug-logger';
import { useReferralLadderEnabled } from '../../app/referral_ladder_flag';
import { usePremium } from '../../components/PremiumContext';
import { ladderStoryDecision } from './referral_ladder_story';
import { markLadderStorySeen, peekLadderStory, recordLadderStoryFirstShow, subscribeLadderStory } from './referral_ladder_store';
import type { StoryEventList } from './story_events_core';

const LOG = '[STORY-LADDER]';
const EMPTY: StoryEventList = Object.freeze([]);

export type UseReferralLadderStoryResult = Readonly<{ stories: StoryEventList; markSeen: (id: string) => void }>;

export function useReferralLadderStory(enabled: boolean): UseReferralLadderStoryResult {
  const ladderEnabled = useReferralLadderEnabled();
  const { isPro } = usePremium();
  const snap = useSyncExternalStore(subscribeLadderStory, peekLadderStory, peekLadderStory);
  const decision = useMemo(
    () => ladderStoryDecision({ enabled, ladderEnabled, lifetime: isPro, ...snap, nowMs: Date.now() }),
    [enabled, ladderEnabled, isPro, snap],
  );
  const verdict = decision.show
    ? `показываем ${decision.event.id}${decision.firstShow ? ' (первый показ)' : ''}${decision.event.seen ? ', просмотрена' : ''}`
    : `не показываем: ${decision.reason}`;
  useEffect(() => {
    // зачем: каждое решение видно в журнале одной строкой — почему история есть или её нет (смена решения, не каждый кадр)
    DebugLogger.info(LOG, `решение: ${verdict}`);
  }, [verdict]);
  const owner = snap.owner;
  useEffect(() => {
    if (decision.show && decision.firstShow && owner) recordLadderStoryFirstShow(owner, decision.key, decision.event.atMs);
  }, [decision, owner]);
  const stories = useMemo(() => (decision.show ? [decision.event] : EMPTY), [decision]);
  const markSeen = useCallback((id: string) => { markLadderStorySeen(id); }, []);
  return { stories, markSeen };
}

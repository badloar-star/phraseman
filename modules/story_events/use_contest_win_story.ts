// use_contest_win_story.ts — история победителю «Набор месяца» для кольца у аватарки (0 или 1 событие type 'contest_winner').
// зачем (Ядро и координатор 29.10): данные — из проекции доступа через contest_win_store; решение «показывать ли» — чистая функция
// contestWinDecision (окно 28 дней после итогов, 7 дней от первого показа). Первый показ и просмотр отмечаются в памяти сразу, на диск — фоном.
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { DebugLogger } from '../../app/debug-logger';
import { contestWinDecision } from './contest_win_story';
import { markContestWinSeen, peekContestWin, recordContestWinFirstShow, subscribeContestWin } from './contest_win_store';
import type { StoryEventList } from './story_events_core';

const LOG = '[STORY-CONTEST]';
const EMPTY: StoryEventList = Object.freeze([]);

export type UseContestWinStoryResult = Readonly<{ stories: StoryEventList; markSeen: (id: string) => void }>;

export function useContestWinStory(enabled: boolean): UseContestWinStoryResult {
  const snap = useSyncExternalStore(subscribeContestWin, peekContestWin, peekContestWin);
  const decision = useMemo(() => contestWinDecision({ enabled, ...snap, nowMs: Date.now() }), [enabled, snap]);
  const verdict = decision.show
    ? `показываем ${decision.event.id}${decision.firstShow ? ' (первый показ)' : ''}${decision.event.seen ? ', просмотрена' : ''}`
    : `не показываем: ${decision.reason}`;
  useEffect(() => {
    // зачем: каждое решение видно в журнале одной строкой — почему история есть или её нет (смена решения, не каждый кадр)
    DebugLogger.info(LOG, `решение: ${verdict}`);
  }, [verdict]);
  const owner = snap.owner;
  useEffect(() => {
    if (decision.show && decision.firstShow && owner) recordContestWinFirstShow(owner, String(decision.event.payload.monthId), decision.event.atMs);
  }, [decision, owner]);
  const stories = useMemo(() => (decision.show ? [decision.event] : EMPTY), [decision]);
  const markSeen = useCallback((id: string) => { markContestWinSeen(id); }, []);
  return { stories, markSeen };
}

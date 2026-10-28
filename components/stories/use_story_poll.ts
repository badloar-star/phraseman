// ═══════════════════════════════════════════════════════════════════════════
// use_story_poll.ts — состояние опроса объявления для кадра Сайта (пропс poll: { myOption, percents, onVote }).
//
// зачем (координатор 28.10, Optimistic UI): тап по варианту → вариант сразу отмечен локально, проценты — из ответа сервера; при ошибке —
// откат выбора и понятное сообщение (onFail); двойной тап не шлёт второй голос — замок до ответа; поздний ответ не затирает свежее состояние
// (номер запроса); повторный показ — с диска, без сети. Журнал [STORY-POLL] — каждое ветвление.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react';
import { DebugLogger } from '../../app/debug-logger';
import { readStoryPollLocal, voteStoryPoll, type StoryPollLocal } from './story_poll_client';

const LOG = '[STORY-POLL]';
const EMPTY: StoryPollLocal = { myOption: null, percents: null };

export type StoryPollState = Readonly<{ myOption: number | null; percents: readonly number[] | null; onVote: (index: number) => void }>;

export function useStoryPoll(id: string | null, revision: number, onFail: () => void): StoryPollState | null {
  const [local, setLocal] = useState<StoryPollLocal>(EMPTY);
  const pendingRef = useRef(false);
  const aliveRef = useRef(true);
  const seqRef = useRef(0);
  const chosenRef = useRef<number | null>(null);
  chosenRef.current = local.myOption;

  useEffect(() => {
    aliveRef.current = true;
    setLocal(EMPTY);
    if (!id) return () => { aliveRef.current = false; };
    const seq = ++seqRef.current;
    void readStoryPollLocal(id, revision).then((value) => {
      if (!aliveRef.current || seq !== seqRef.current || pendingRef.current) {
        DebugLogger.info(LOG, `local:skip id=${id.slice(0, 8)} — кадр сменился или голос уже в пути`);
        return;
      }
      setLocal(value);
    });
    return () => { aliveRef.current = false; };
  }, [id, revision]);

  const onVote = useCallback((index: number) => {
    if (!id) return;
    if (pendingRef.current) { DebugLogger.info(LOG, `tap:locked id=${id.slice(0, 8)} option=${index} — голос уже в пути`); return; }
    if (chosenRef.current !== null) { DebugLogger.info(LOG, `tap:already id=${id.slice(0, 8)} выбран=${chosenRef.current} — второй голос не шлём`); return; }
    pendingRef.current = true;
    const seq = ++seqRef.current;
    chosenRef.current = index;
    setLocal({ myOption: index, percents: null });
    DebugLogger.info(LOG, `tap:optimistic id=${id.slice(0, 8)} rev=${revision} option=${index}`);
    void voteStoryPoll(id, revision, index).then((outcome) => {
      pendingRef.current = false;
      if (!aliveRef.current || seq !== seqRef.current) { DebugLogger.info(LOG, `vote:stale id=${id.slice(0, 8)} — кадр сменился, ответ не применяем`); return; }
      if (outcome.ok) { setLocal({ myOption: index, percents: outcome.percents }); return; }
      if (outcome.reason === 'account_changed') return;
      DebugLogger.info(LOG, `vote:rollback id=${id.slice(0, 8)} reason=${outcome.reason} — выбор снят, сообщение показано`);
      chosenRef.current = null;
      setLocal(EMPTY);
      onFail();
    });
  }, [id, revision, onFail]);

  return id ? { myOption: local.myOption, percents: local.percents, onVote } : null;
}

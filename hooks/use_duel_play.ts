/**
 * «Дуэль на 5 фраз» (идея 3) — ход на телефоне: какая фраза, что собрано, разбор, отметки и время. Сети здесь нет.
 *
 * зачем (Optimistic UI, правило владельца): каждый тап меняет только локальное состояние и сразу виден; источник правды для
 * действий — ref, поэтому два быстрых тапа по плитке или по «Проверить» в одном кадре не задвоят слово или ответ.
 * Время фразы — от показа до «Проверить», не больше DUEL_PHRASE_MAX_MS: уснувший телефон не ломает ход.
 */
import { useCallback, useRef, useState } from 'react';

import { hapticSuccess, hapticWarning } from './use-haptics';
import { DUEL_MAX_ELAPSED_MS, DUEL_PHRASE_MAX_MS, type DuelMove } from '../app/friends_together/duel_core';
import { duelAnswerIsCorrect, duelWrongFeedback, type DuelPhrase, type DuelPhraseVerdict } from '../app/friends_together/duel_phrases';

export type DuelPlayState = Readonly<{
  index: number;
  picked: readonly string[];
  verdict: DuelPhraseVerdict | null;
  results: readonly boolean[];
  times: readonly number[];
  startedAtMs: number;
}>;

const LOG = '[FRIENDS-DUEL]';

export function useDuelPlay(phrases: readonly DuelPhrase[] | null, onFinish: (move: DuelMove) => void) {
  const [state, setState] = useState<DuelPlayState>(() => ({ index: 0, picked: [], verdict: null, results: [], times: [], startedAtMs: Date.now() }));
  const stateRef = useRef(state);
  const finishedRef = useRef(false);

  const commit = useCallback((next: DuelPlayState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const append = useCallback((responseId: string) => {
    const s = stateRef.current;
    if (s.verdict !== null || s.picked.includes(responseId)) return;
    commit({ ...s, picked: [...s.picked, responseId] });
  }, [commit]);

  const removeAt = useCallback((at: number) => {
    const s = stateRef.current;
    if (s.verdict !== null || at < 0 || at >= s.picked.length) return;
    commit({ ...s, picked: s.picked.filter((_, i) => i !== at) });
  }, [commit]);

  const check = useCallback(() => {
    const s = stateRef.current;
    const phrase = phrases?.[s.index];
    if (!phrase || s.verdict !== null || s.picked.length < phrase.orderedTokens.length) {
      console.log(`${LOG} check:ignored фраза=${s.index + 1} причина=${!phrase ? 'нет фразы' : s.verdict !== null ? 'уже проверена' : `собрано ${s.picked.length} из ${phrase.orderedTokens.length}`}`);
      return;
    }
    const ms = Math.min(Math.max(0, Date.now() - s.startedAtMs), DUEL_PHRASE_MAX_MS);
    const correct = duelAnswerIsCorrect(phrase, s.picked);
    const verdict: DuelPhraseVerdict = { correct, ms, detail: correct ? phrase.completionFeedback : duelWrongFeedback(phrase, s.picked) };
    commit({ ...s, verdict, results: [...s.results, correct], times: [...s.times, ms] });
    void (correct ? hapticSuccess() : hapticWarning());
    console.log(`${LOG} check фраза=${s.index + 1}/${phrases?.length ?? 0} id=${phrase.id} верно=${correct} ms=${ms}${ms === DUEL_PHRASE_MAX_MS ? ' (потолок фразы)' : ''}`);
  }, [commit, phrases]);

  const next = useCallback(() => {
    const s = stateRef.current;
    if (!phrases || s.verdict === null) return;
    if (s.index + 1 < phrases.length) {
      commit({ ...s, index: s.index + 1, picked: [], verdict: null, startedAtMs: Date.now() });
      return;
    }
    if (finishedRef.current) {
      console.log(`${LOG} finish:ignored причина=ход уже завершён`);
      return;
    }
    finishedRef.current = true;
    const total = s.times.reduce((sum, ms) => sum + ms, 0);
    const move: DuelMove = { results: s.results, elapsedMs: Math.min(total, DUEL_MAX_ELAPSED_MS) };
    console.log(`${LOG} finish верных=${s.results.filter(Boolean).length}/${s.results.length} ms=${move.elapsedMs}`);
    onFinish(move);
  }, [commit, onFinish, phrases]);

  const phrase = phrases?.[state.index] ?? null;
  return {
    state,
    phrase,
    canCheck: phrase !== null && state.verdict === null && state.picked.length >= phrase.orderedTokens.length,
    append,
    removeAt,
    check,
    next,
  };
}

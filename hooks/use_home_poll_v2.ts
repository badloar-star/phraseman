// ═══ useHomePollV2 — модель карточки «Опрос» на Главной (для Дизайна) ═════════
// зачем (владелец 19.10): опрос — строго optimistic. Выбор немедленно ведёт к
// следующему вопросу, локально сохраняется и ставится в очередь; сеть никогда не
// меняет ход опроса и не показывает промежуточный статус.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import {
  loadTodayHomePollV2,
  flushHomePollV2Queue,
  POLLS_V2_LOG,
  submitHomePollV2Vote,
  type HomePollV2Snapshot,
} from '../app/home_polls/home_polls_v2_client';
import { pickHomePollV2Text, normalizeHomePollV2Counts } from '../app/home_polls/home_polls_v2_model';
import type { HomePollV2Fixture } from '../app/home_polls/home_polls_v2_fixture';

export type HomePollV2Phase = 'hidden' | 'question' | 'thanks';

export type HomePollV2CardOption = Readonly<{
  id: string;
  label: string;
  /** В strict optimistic flow результаты не показываются. */
  percent: number | null;
  selected: boolean;
}>;

export type HomePollV2CardModel = Readonly<{
  phase: HomePollV2Phase;
  setId: string | null;
  /** 1-based номер вопроса и сколько их в наборе — для «1 / 3». */
  step: number;
  total: number;
  question: string;
  options: readonly HomePollV2CardOption[];
  /** В strict optimistic flow результаты не показываются. */
  voteCount: number | null;
  isLastQuestion: boolean;
  error: null;
  choose: (optionId: string) => void;
  /** Совместимость модели: переход происходит сразу по выбору. */
  next: () => void;
  /** Закрыть «Спасибо» (или скрыть карточку) до следующего набора. */
  dismiss: () => void;
}>;

type Options = Readonly<{ lang: string; active?: boolean; fixture?: HomePollV2Fixture | null }>;

export function useHomePollV2({ lang, active = true, fixture = null }: Options): HomePollV2CardModel {
  // Do not synchronously reuse the previous account's memory snapshot. The local
  // owner must resolve before any answer/choice is shown after an account switch.
  const [snapshot, setSnapshot] = useState<HomePollV2Snapshot | null>(() => fixture?.snapshot ?? null);
  const [thanks, setThanks] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const answeredQuestionIdsRef = useRef(new Set<string>());
  const [accountGeneration, setAccountGeneration] = useState<AccountGenerationToken>(() => captureAccountGeneration());

  useEffect(() => {
    if (fixture) return undefined;
    const applyGeneration = (token: AccountGenerationToken) => {
      // Clear synchronously with the account-generation notification so no
      // previous-owner answer or optimistic choice survives a transition.
      answeredQuestionIdsRef.current.clear();
      setSnapshot(null);
      setThanks(false);
      setDismissed(false);
      setAccountGeneration(token);
    };
    const subscription = subscribeAccountGeneration(applyGeneration);
    const current = captureAccountGeneration();
    if (current.generation !== accountGeneration.generation
      || current.stableId !== accountGeneration.stableId
      || current.phase !== accountGeneration.phase) {
      applyGeneration(current);
    }
    return () => subscription.remove();
    // The subscription itself advances accountGeneration. Re-subscribing on
    // every notification would create a gap, so this effect is fixture-bound.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixture]);

  useEffect(() => {
    if (!active || fixture || accountGeneration.phase !== 'active') return undefined;
    let cancelled = false;
    const token = accountGeneration;
    void loadTodayHomePollV2().then((next) => {
      if (!cancelled && isCurrentAccountGeneration(token, next.ownerId)) setSnapshot(next);
    });
    return () => { cancelled = true; };
  }, [accountGeneration, active, fixture]);

  useEffect(() => {
    if (!active || fixture || !snapshot) return undefined;
    let cancelled = false;
    const flush = () => {
      const token = captureAccountGeneration();
      void flushHomePollV2Queue(snapshot).then((next) => {
        if (cancelled || !isCurrentAccountGeneration(token, next.ownerId)) return;
      });
    };
    flush();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) flush();
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [active, fixture, snapshot]);

  const set = snapshot?.set ?? null;
  const questionIndex = snapshot?.questionIndex ?? null;
  const question = set && questionIndex !== null && questionIndex >= 0 ? set.questions[questionIndex] : null;

  const choose = useCallback((optionId: string) => {
    if (!snapshot || !question) return;
    if (answeredQuestionIdsRef.current.has(question.id)) {
      console.log(`${POLLS_V2_LOG} card:choose_ignored ${JSON.stringify({ reason: 'already_chosen', questionId: question.id })}`); // guard-ok: двойной тап
      return;
    }
    const questionId = question.id;
    const token = fixture ? null : captureAccountGeneration();
    if (token && !isCurrentAccountGeneration(token, snapshot.ownerId)) return;
    answeredQuestionIdsRef.current.add(questionId);
    const optimisticAnswers = {
      ...snapshot.answers,
      [questionId]: {
        optionId,
        counts: normalizeHomePollV2Counts({}, question.options.map((option) => option.id)),
      },
    };
    const nextIndex = set?.questions.findIndex((item) => !optimisticAnswers[item.id]) ?? -1;
    setSnapshot((previous) => previous ? {
      ...previous,
      answers: optimisticAnswers,
      questionIndex: nextIndex < 0 ? null : nextIndex,
    } : previous);
    if (nextIndex < 0) setThanks(true);
    const submit = fixture ? fixture.vote(questionId, optionId) : submitHomePollV2Vote(snapshot, questionId, optionId);
    void submit.then((outcome) => {
      if (!outcome.ok && !outcome.queued) {
        console.warn(`${POLLS_V2_LOG} vote:not_queued ${JSON.stringify({ questionId, reason: outcome.reason })}`); // guard-ok: диагностика фоновой доставки без текста/uid
      }
    });
  }, [fixture, question, set, snapshot]);

  const next = useCallback(() => {}, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  return useMemo<HomePollV2CardModel>(() => {
    const total = set?.questions.length ?? 0;
    const hiddenModel: HomePollV2CardModel = {
      phase: thanks && !dismissed ? 'thanks' : 'hidden',
      setId: set?.id ?? null,
      step: total,
      total,
      question: '',
      options: [],
      voteCount: null,
      isLastQuestion: true,
      error: null,
      choose,
      next,
      dismiss,
    };
    if (dismissed || !set || !question) return hiddenModel;
    const index = set.questions.indexOf(question);
    return {
      phase: 'question',
      setId: set.id,
      step: index + 1,
      total,
      question: pickHomePollV2Text(question.text, lang),
      options: question.options.map((o) => ({
        id: o.id,
        label: pickHomePollV2Text(o.text, lang),
        percent: null,
        selected: false,
      })),
      voteCount: null,
      isLastQuestion: index === total - 1,
      error: null,
      choose,
      next,
      dismiss,
    };
  }, [choose, dismiss, dismissed, lang, next, question, set, thanks]);
}

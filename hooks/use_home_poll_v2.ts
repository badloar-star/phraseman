// ═══ useHomePollV2 — модель карточки «Опрос» на Главной (для Дизайна) ═════════
// зачем (владелец 18.10, макет home-polls-v2.html): «нажми вариант — покажутся проценты, затем „Дальше“; после последнего
// вопроса — „Спасибо“, и карточка исчезает до следующего опроса». Хук отдаёт всё, что нужно нарисовать, — без сети при показе.
//
// Optimistic UI: тап сразу отмечает выбранный вариант (phase 'sending'); сервер присылает счётчики → 'result' с процентами.
// Сбой → выбор снят, phase снова 'question', причина в error (только 'offline' даёт человеку текст «нет связи» — правило
// владельца; остальное тихо). Двойной тап — второй игнорируется. Поздний ответ после смены вопроса не перетирает экран.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { dailyPollPercents } from '../app/daily_poll/daily_poll_model';
import {
  loadTodayHomePollV2,
  flushHomePollV2Queue,
  POLLS_V2_LOG,
  submitHomePollV2Vote,
  type HomePollV2Snapshot,
  type HomePollV2VoteErrorReason,
} from '../app/home_polls/home_polls_v2_client';
import { pickHomePollV2Text, type HomePollV2Answer } from '../app/home_polls/home_polls_v2_model';
import type { HomePollV2Fixture } from '../app/home_polls/home_polls_v2_fixture';

export type HomePollV2Phase = 'hidden' | 'question' | 'sending' | 'result' | 'thanks';

export type HomePollV2CardOption = Readonly<{
  id: string;
  label: string;
  /** Процент (0–100, сумма ровно 100) — только в фазе 'result'; иначе null. */
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
  /** Сколько человек ответили на этот вопрос (после ответа); null — до ответа. */
  voteCount: number | null;
  isLastQuestion: boolean;
  /** Причина последнего сбоя голоса; 'offline' — единственная, о которой говорим человеку. */
  error: HomePollV2VoteErrorReason | null;
  choose: (optionId: string) => void;
  /** «Дальше» после процентов; на последнем вопросе ведёт к «Спасибо». */
  next: () => void;
  /** Закрыть «Спасибо» (или скрыть карточку) до следующего набора. */
  dismiss: () => void;
}>;

type Options = Readonly<{ lang: string; active?: boolean; fixture?: HomePollV2Fixture | null }>;

export function useHomePollV2({ lang, active = true, fixture = null }: Options): HomePollV2CardModel {
  // Do not synchronously reuse the previous account's memory snapshot. The local
  // owner must resolve before any answer/choice is shown after an account switch.
  const [snapshot, setSnapshot] = useState<HomePollV2Snapshot | null>(() => fixture?.snapshot ?? null);
  const [pending, setPending] = useState<{ questionId: string; optionId: string } | null>(null);
  const [queuedChoice, setQueuedChoice] = useState<{ questionId: string; optionId: string } | null>(null);
  const [shownAnswer, setShownAnswer] = useState<{ questionId: string; answer: HomePollV2Answer } | null>(null);
  const [thanks, setThanks] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<HomePollV2VoteErrorReason | null>(null);
  const questionRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const [accountGeneration, setAccountGeneration] = useState<AccountGenerationToken>(() => captureAccountGeneration());

  useEffect(() => {
    if (fixture) return undefined;
    const applyGeneration = (token: AccountGenerationToken) => {
      // Clear synchronously with the account-generation notification so no
      // previous-owner answer or optimistic choice survives a transition.
      questionRef.current = null;
      busyRef.current = false;
      setSnapshot(null);
      setPending(null);
      setQueuedChoice(null);
      setShownAnswer(null);
      setThanks(false);
      setDismissed(false);
      setError(null);
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
        setSnapshot(next);
        if (queuedChoice) {
          const answer = next.answers[queuedChoice.questionId];
          if (answer) {
            setShownAnswer({ questionId: queuedChoice.questionId, answer });
            setQueuedChoice(null);
          }
        }
      });
    };
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) flush();
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [active, fixture, queuedChoice, snapshot]);

  const set = snapshot?.set ?? null;
  // Пока человек смотрит проценты, остаёмся на отвеченном вопросе — сдвиг только по «Дальше».
  const questionIndex = shownAnswer && set
    ? set.questions.findIndex((q) => q.id === shownAnswer.questionId)
    : snapshot?.questionIndex ?? null;
  const question = set && questionIndex !== null && questionIndex >= 0 ? set.questions[questionIndex] : null;
  questionRef.current = question?.id ?? null;

  const choose = useCallback((optionId: string) => {
    if (!snapshot || !question) return;
    if (busyRef.current || pending || queuedChoice || shownAnswer) {
      console.log(`${POLLS_V2_LOG} card:choose_ignored ${JSON.stringify({ reason: busyRef.current || pending ? 'sending' : queuedChoice ? 'queued' : 'showing_result', questionId: question.id })}`); // guard-ok: ранний выход
      return;
    }
    const questionId = question.id;
    const token = fixture ? null : captureAccountGeneration();
    if (token && !isCurrentAccountGeneration(token, snapshot.ownerId)) return;
    busyRef.current = true;
    setError(null);
    setPending({ questionId, optionId });
    const submit = fixture ? fixture.vote(questionId, optionId) : submitHomePollV2Vote(snapshot, questionId, optionId);
    void submit.then((outcome) => {
      if ((token && !isCurrentAccountGeneration(token, snapshot.ownerId)) || questionRef.current !== questionId) {
        console.log(`${POLLS_V2_LOG} card:late_answer_ignored ${JSON.stringify({ questionId })}`); // guard-ok: поздний ответ
        return;
      }
      setPending(null);
      busyRef.current = false;
      if (!outcome.ok) {
        if (outcome.queued) {
          setQueuedChoice({ questionId, optionId });
          setError(null);
        } else {
          setError(outcome.reason);
        }
        return;
      }
      setShownAnswer({ questionId, answer: outcome.answer });
      setSnapshot((prev) => (prev ? {
        ...prev,
        answers: { ...prev.answers, [questionId]: outcome.answer },
      } : prev));
    });
  }, [fixture, pending, question, queuedChoice, shownAnswer, snapshot]);

  const next = useCallback(() => {
    if (!set || !shownAnswer) return;
    const answers = snapshot?.answers ?? {};
    const nextIndex = set.questions.findIndex((q) => !answers[q.id]);
    setShownAnswer(null);
    if (nextIndex < 0) {
      setThanks(true);
      setSnapshot((prev) => (prev ? { ...prev, questionIndex: null } : prev));
      return;
    }
    setSnapshot((prev) => (prev ? { ...prev, questionIndex: nextIndex } : prev));
  }, [set, shownAnswer, snapshot]);

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
    const ids = question.options.map((o) => o.id);
    const answer = shownAnswer?.questionId === question.id ? shownAnswer.answer : null;
    const percents = answer ? dailyPollPercents(answer.counts, ids) : null;
    const voteCount = answer ? ids.reduce((sum, id) => sum + (answer.counts[id] ?? 0), 0) : null;
    const selectedId = answer?.optionId
      ?? (pending?.questionId === question.id ? pending.optionId : null)
      ?? (queuedChoice?.questionId === question.id ? queuedChoice.optionId : null);
    const index = set.questions.indexOf(question);
    return {
      phase: answer ? 'result' : pending || queuedChoice ? 'sending' : 'question',
      setId: set.id,
      step: index + 1,
      total,
      question: pickHomePollV2Text(question.text, lang),
      options: question.options.map((o) => ({
        id: o.id,
        label: pickHomePollV2Text(o.text, lang),
        percent: percents ? percents[o.id] ?? 0 : null,
        selected: selectedId === o.id,
      })),
      voteCount,
      isLastQuestion: index === total - 1,
      error,
      choose,
      next,
      dismiss,
    };
  }, [choose, dismiss, dismissed, error, lang, next, pending, question, queuedChoice, set, shownAnswer, thanks]);
}

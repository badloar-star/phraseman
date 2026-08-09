import { useCallback, useEffect, useRef, useState } from 'react';

import { callExplainMistake } from './ai_mistake_explain_client';
import {
  hasShownAiMistakeLimitNoticeToday,
  markAiMistakeLimitNoticeShownToday,
  peekAiMistakeLimitNoticeShownToday,
} from './ai_mistake_explain_limit_session';
import { resolveAllMistakeTokens, resolvePhraseMistakeToken } from './mistake_token_resolver';
import type { AiMistakeCardState } from '../components/AiMistakeCard';
import { hapticTap } from '../hooks/use-haptics';
import { explainRetryDelayMs, isFreeExplainLimitError } from '../lib/explain_retry_policy';
import { createExplainUsageId } from '../lib/explain_usage_id';
import { usePremium } from '../components/PremiumContext';

interface PendingRetryWait {
  timer: ReturnType<typeof setTimeout>;
  resolve: () => void;
}

/**
 * Shared orchestration for the AI mistake breakdown (inline `AiMistakeCard`) and
 * the «Объяснить проще» ELI5 modal (`MistakeEli5Modal`).
 *
 * Extracted from lesson1.tsx so BOTH lessons and personal-plan exercises drive
 * the exact same behaviour: inline breakdown auto-loads on a wrong answer, the
 * footer button opens a simpler explanation, both hit the cached `explainMistake`
 * Cloud Function. The pure UI components + client + server cache are reused as-is.
 *
 * The hook is intentionally generic: callers pass a synthetic `lessonId` (e.g. a
 * plan-mode id) and a `phraseKey` that changes whenever the active phrase/result
 * changes — that key both resets state and discards stale async responses.
 */
export interface UseMistakeExplainInput {
  /** Whether to run at all (e.g. result shown AND the answer was wrong). */
  active: boolean;
  /** Stable key for the current phrase+result; changing it resets + invalidates. */
  phraseKey: string;
  /** Synthetic lesson id for cache bucketing (plan modes pass a mode-derived id). */
  lessonId: number;
  /** Stable id for the phrase (for cache hashing). */
  phraseId: string;
  studyTarget: string;
  interfaceLang: string;
  /** The native-language prompt / meaning shown to the learner. */
  prompt: string;
  /** What the learner actually answered. */
  userAnswer: string;
  /** The correct target answer. */
  targetAnswer: string;
}

export interface UseMistakeExplainResult {
  /** Props for the inline <AiMistakeCard>. */
  aiMistakeState: AiMistakeCardState;
  aiMistakeText: string | null;
  aiMistakeRemaining: number | null;
  /** Retry the inline breakdown (also the card's onExplain). */
  explain: () => void;
  /** Props for <MistakeEli5Modal> + the card's onOpenSimple. */
  eli5: {
    open: boolean;
    state: 'idle' | 'loading' | 'ready' | 'error' | 'limit';
    text: string | null;
    onOpen: () => void;
    onClose: () => void;
    onRetry: () => void;
  };
}

export function useMistakeExplain(input: UseMistakeExplainInput): UseMistakeExplainResult {
  const {
    active,
    phraseKey,
    lessonId,
    phraseId,
    studyTarget,
    interfaceLang,
    prompt,
    userAnswer,
    targetAnswer,
  } = input;
  const { hasPremiumAccess } = usePremium();

  const [aiMistakeState, setAiMistakeState] = useState<AiMistakeCardState>(() =>
    !hasPremiumAccess && peekAiMistakeLimitNoticeShownToday() ? 'hidden' : 'idle',
  );
  const [aiMistakeText, setAiMistakeText] = useState<string | null>(null);
  const [aiMistakeRemaining, setAiMistakeRemaining] = useState<number | null>(null);

  const [eli5Open, setEli5Open] = useState(false);
  const [eli5State, setEli5State] = useState<'idle' | 'loading' | 'ready' | 'error' | 'limit'>('idle');
  const [eli5Text, setEli5Text] = useState<string | null>(null);
  const eli5InFlightRef = useRef(false);
  const retryWaitsRef = useRef<Set<PendingRetryWait>>(new Set());
  const activeRef = useRef(active);
  activeRef.current = active;
  const eli5OpenRef = useRef(false);
  // One wrong answer = one Free use. The full text and its ELI5 variant share
  // this id, and all silent retries reuse it as well.
  const usageIdRef = useRef(createExplainUsageId('mistake'));

  const cancelRetryWait = useCallback(() => {
    const waits = [...retryWaitsRef.current];
    retryWaitsRef.current.clear();
    waits.forEach((wait) => {
      clearTimeout(wait.timer);
      wait.resolve();
    });
  }, []);

  const waitForRetry = useCallback((delayMs: number) => new Promise<void>((resolve) => {
    const wait = {} as PendingRetryWait;
    wait.resolve = resolve;
    wait.timer = setTimeout(() => {
      retryWaitsRef.current.delete(wait);
      resolve();
    }, delayMs);
    retryWaitsRef.current.add(wait);
  }), []);

  // Mirror of phraseKey, read inside async callbacks to drop stale responses
  // (user moved to another phrase before the answer arrived).
  const phraseKeyRef = useRef(phraseKey);
  phraseKeyRef.current = phraseKey;

  // Reset everything when the phrase or result changes.
  useEffect(() => {
    usageIdRef.current = createExplainUsageId('mistake');
    setAiMistakeState(!hasPremiumAccess && peekAiMistakeLimitNoticeShownToday() ? 'hidden' : 'idle');
    setAiMistakeText(null);
    setAiMistakeRemaining(null);
    setEli5Open(false);
    eli5OpenRef.current = false;
    setEli5State('idle');
    setEli5Text(null);
    eli5InFlightRef.current = false;
    cancelRetryWait();
  }, [phraseKey, active, hasPremiumAccess, cancelRetryWait]);

  useEffect(() => () => {
    activeRef.current = false;
    eli5OpenRef.current = false;
    cancelRetryWait();
  }, [cancelRetryWait]);

  const buildArgs = useCallback(
    (variant: 'full' | 'eli5') => {
      const diffPairs = resolveAllMistakeTokens(targetAnswer, userAnswer);
      const mismatch = resolvePhraseMistakeToken(targetAnswer, userAnswer);
      return {
        usageId: usageIdRef.current,
        lessonId,
        phraseId,
        studyTarget,
        interfaceLang,
        prompt,
        userAnswer,
        targetAnswer,
        phraseMeaning: prompt,
        selectedWrongWord: mismatch?.picked,
        expectedWord: mismatch?.expected,
        diffPairs,
        variant,
      } as const;
    },
    [lessonId, phraseId, studyTarget, interfaceLang, prompt, userAnswer, targetAnswer],
  );

  const explain = useCallback(
    async (withHaptic = true) => {
      if (!active || aiMistakeState === 'loading') return;
      if (withHaptic) hapticTap();
      const requestKey = phraseKey;
      if (!hasPremiumAccess && await hasShownAiMistakeLimitNoticeToday()) {
        if (phraseKeyRef.current !== requestKey) return;
        setAiMistakeState('hidden');
        setAiMistakeText(null);
        return;
      }
      setAiMistakeState('loading');
      setAiMistakeText(null);
      let consecutiveFailures = 0;
      while (activeRef.current && phraseKeyRef.current === requestKey) {
        try {
          const res = await callExplainMistake(buildArgs('full'));
          if (!activeRef.current || phraseKeyRef.current !== requestKey) return;
          setAiMistakeText(res.text);
          setAiMistakeRemaining(typeof res.remainingQuota === 'number' ? res.remainingQuota : null);
          setAiMistakeState('ready');
          return;
        } catch (error) {
          if (!activeRef.current || phraseKeyRef.current !== requestKey) return;
          // Лимит Free — осмысленное финальное состояние: три разбора в день,
          // Plus безлимитен. Все технические/валидаторные сбои ретраим молча.
          if (isFreeExplainLimitError(error)) {
            await markAiMistakeLimitNoticeShownToday();
            if (!activeRef.current || phraseKeyRef.current !== requestKey) return;
            setAiMistakeState('limit');
            return;
          }
          consecutiveFailures += 1;
          await waitForRetry(explainRetryDelayMs(error, consecutiveFailures));
        }
      }
    },
    [active, aiMistakeState, phraseKey, buildArgs, waitForRetry, hasPremiumAccess],
  );

  const openEli5 = useCallback(async () => {
    if (!active) return;
    hapticTap();
    setEli5Open(true);
    eli5OpenRef.current = true;
    if (eli5State === 'ready' && eli5Text) return;
    if (eli5InFlightRef.current) return;
    eli5InFlightRef.current = true;
    const requestKey = phraseKey;
    setEli5State('loading');
    setEli5Text(null);
    let consecutiveFailures = 0;
    try {
      while (activeRef.current && eli5OpenRef.current && phraseKeyRef.current === requestKey) {
        try {
          const res = await callExplainMistake(buildArgs('eli5'));
          if (!activeRef.current || !eli5OpenRef.current || phraseKeyRef.current !== requestKey) return;
          setEli5Text(res.text);
          setEli5State('ready');
          return;
        } catch (error) {
          if (!activeRef.current || !eli5OpenRef.current || phraseKeyRef.current !== requestKey) return;
          // Лимит — не техническая ошибка и не должен обходиться автоматическими
          // повторами. Всё остальное (включая отклонение валидатором) повторяем
          // скрыто, пока пользователь остаётся на этой фразе.
          if (isFreeExplainLimitError(error)) {
            setEli5Text(null);
            setEli5State('limit');
            return;
          }
          consecutiveFailures += 1;
          await waitForRetry(explainRetryDelayMs(error, consecutiveFailures));
        }
      }
    } finally {
      eli5InFlightRef.current = false;
    }
  }, [active, eli5State, eli5Text, phraseKey, buildArgs, waitForRetry]);

  // Auto-load the inline breakdown once when it becomes relevant.
  useEffect(() => {
    if (!active || aiMistakeState !== 'idle') return;
    void explain(false);
  }, [active, phraseKey, aiMistakeState, explain]);

  return {
    aiMistakeState:
      active && !hasPremiumAccess && aiMistakeState === 'idle' && peekAiMistakeLimitNoticeShownToday()
        ? 'hidden'
        : aiMistakeState,
    aiMistakeText,
    aiMistakeRemaining,
    explain: () => void explain(true),
    eli5: {
      open: eli5Open,
      state: eli5State,
      text: eli5Text,
      onOpen: () => void openEli5(),
      onClose: () => {
        eli5OpenRef.current = false;
        setEli5Open(false);
        cancelRetryWait();
      },
      onRetry: () => void openEli5(),
    },
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}

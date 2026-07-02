import { useCallback, useEffect, useRef, useState } from 'react';

import { callExplainMistake } from './ai_mistake_explain_client';
import { resolveAllMistakeTokens, resolvePhraseMistakeToken } from './mistake_token_resolver';
import type { AiMistakeCardState } from '../components/AiMistakeCard';
import { hapticTap } from '../hooks/use-haptics';

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
    state: 'idle' | 'loading' | 'ready' | 'error';
    text: string | null;
    onOpen: () => void;
    onClose: () => void;
    onRetry: () => void;
  };
}

/** Серверный дневной free-кап ИИ-разборов ('explain_free_daily_limit'). */
function isFreeDailyLimitError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return message.includes('explain_free_daily_limit');
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

  const [aiMistakeState, setAiMistakeState] = useState<AiMistakeCardState>('idle');
  const [aiMistakeText, setAiMistakeText] = useState<string | null>(null);
  const [aiMistakeRemaining, setAiMistakeRemaining] = useState<number | null>(null);

  const [eli5Open, setEli5Open] = useState(false);
  const [eli5State, setEli5State] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [eli5Text, setEli5Text] = useState<string | null>(null);
  const eli5InFlightRef = useRef(false);

  // Mirror of phraseKey, read inside async callbacks to drop stale responses
  // (user moved to another phrase before the answer arrived).
  const phraseKeyRef = useRef(phraseKey);
  phraseKeyRef.current = phraseKey;

  // Reset everything when the phrase or result changes.
  useEffect(() => {
    setAiMistakeState('idle');
    setAiMistakeText(null);
    setAiMistakeRemaining(null);
    setEli5Open(false);
    setEli5State('idle');
    setEli5Text(null);
    eli5InFlightRef.current = false;
  }, [phraseKey, active]);

  const buildArgs = useCallback(
    (variant: 'full' | 'eli5') => {
      const diffPairs = resolveAllMistakeTokens(targetAnswer, userAnswer);
      const mismatch = resolvePhraseMistakeToken(targetAnswer, userAnswer);
      return {
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
      setAiMistakeState('loading');
      setAiMistakeText(null);
      try {
        const res = await callExplainMistake(buildArgs('full'));
        if (phraseKeyRef.current !== requestKey) return; // phrase changed — discard.
        setAiMistakeText(res.text);
        setAiMistakeRemaining(typeof res.remainingQuota === 'number' ? res.remainingQuota : null);
        setAiMistakeState('ready');
      } catch (error) {
        if (phraseKeyRef.current !== requestKey) return;
        // Дневной free-кап генераций (сервер — источник правды): не «ошибка»,
        // а мягкое состояние с приглашением в Plus.
        setAiMistakeState(isFreeDailyLimitError(error) ? 'limit' : 'error');
      }
    },
    [active, aiMistakeState, phraseKey, buildArgs],
  );

  const openEli5 = useCallback(async () => {
    if (!active) return;
    hapticTap();
    setEli5Open(true);
    if (eli5State === 'ready' && eli5Text) return;
    if (eli5InFlightRef.current) return;
    eli5InFlightRef.current = true;
    const requestKey = phraseKey;
    setEli5State('loading');
    setEli5Text(null);
    try {
      const res = await callExplainMistake(buildArgs('eli5'));
      if (phraseKeyRef.current !== requestKey) return;
      setEli5Text(res.text);
      setEli5State('ready');
    } catch {
      if (phraseKeyRef.current !== requestKey) return;
      setEli5State('error');
    } finally {
      eli5InFlightRef.current = false;
    }
  }, [active, eli5State, eli5Text, phraseKey, buildArgs]);

  // Auto-load the inline breakdown once when it becomes relevant.
  useEffect(() => {
    if (!active || aiMistakeState !== 'idle') return;
    void explain(false);
  }, [active, phraseKey, aiMistakeState, explain]);

  return {
    aiMistakeState,
    aiMistakeText,
    aiMistakeRemaining,
    explain: () => void explain(true),
    eli5: {
      open: eli5Open,
      state: eli5State,
      text: eli5Text,
      onOpen: () => void openEli5(),
      onClose: () => setEli5Open(false),
      onRetry: () => void openEli5(),
    },
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}

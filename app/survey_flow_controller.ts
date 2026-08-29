import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Lang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { emitAppEvent } from './events';
import { commitConfirmedExternalShardEvent, SHARD_REWARDS } from './shards_system';
import { submitSurvey, type ActiveSurvey, type SurveyQuestionClient } from './survey_client';
import { markSurveyOfferDone } from './survey_completion_marker';
import { beginSurveyOfferRequest, commitSurveyOfferRequest } from './survey_offer_cache';
import { buildServerConfirmedLegacyCompletion } from './survey_offer_model';
import {
  initialSurveySubmissionState,
  reduceSurveySubmission,
  type SurveySubmissionState,
  type SurveySubmitErrorKey,
} from './survey_submission_state';
import { DebugLogger } from './debug-logger';

export type AnswersState = Record<string, { optionId?: string; comment?: string }>;

export type SurveyLaunch = {
  survey: ActiveSurvey;
  stableId: string;
  dayKey: string;
  lang: Lang;
};

export type SurveyDurableScope = {
  stableId: string;
  dayKey: string;
  surveyId: string;
};

export function sameSurveyDurableScope(
  current: SurveyDurableScope,
  completed: SurveyDurableScope,
): boolean {
  return current.stableId === completed.stableId
    && current.dayKey === completed.dayKey
    && current.surveyId === completed.surveyId;
}

export type SurveyFlowController = {
  stepIndex: number;
  direction: 'forward' | 'backward';
  currentQuestion: SurveyQuestionClient;
  answers: AnswersState;
  currentAnswered: boolean;
  isLastStep: boolean;
  submission: SurveySubmissionState;
  submitting: boolean;
  pickOption: (questionId: string, optionId: string) => void;
  setComment: (questionId: string, comment: string) => void;
  goNext: () => void;
  goBack: () => 'close' | 'moved';
  retrySubmit: () => Promise<void>;
  deactivate: () => void;
};

const AUTO_RETURN_DELAY_MS = 1400;

function mapSubmitError(error: unknown): SurveySubmitErrorKey {
  const raw = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  if (raw.includes('rate_limited') || raw.includes('resource-exhausted')) return 'rate_limited';
  if (raw.includes('unknown_survey')) return 'unknown_survey';
  if (raw.includes('unauthenticated') || raw.includes('no_profile')) return 'auth';
  if (raw.includes('network')) return 'network';
  if (raw.includes('unavailable')) return 'unavailable';
  if (raw.includes('server') || raw.includes('internal')) return 'server';
  return 'unknown';
}

export function useSurveyFlowController(input: {
  launch: SurveyLaunch;
  onReconciled: () => void;
  onDurablyReconciled?: (scope: SurveyDurableScope) => void;
}): SurveyFlowController {
  const { launch } = input;
  const { survey, stableId, dayKey, lang } = launch;
  const [answers, setAnswers] = useState<AnswersState>({});
  const [submission, dispatchSubmission] = useReducer(
    reduceSurveySubmission,
    initialSurveySubmissionState,
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const presentationActiveRef = useRef(true);
  const attemptIdRef = useRef(0);
  const requestActiveRef = useRef(false);
  const transitionActiveRef = useRef(false);
  const autoReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReconciledRef = useRef(input.onReconciled);
  const onDurablyReconciledRef = useRef(input.onDurablyReconciled);

  useEffect(() => {
    onReconciledRef.current = input.onReconciled;
    onDurablyReconciledRef.current = input.onDurablyReconciled;
  }, [input.onDurablyReconciled, input.onReconciled]);

  const clearAutoReturnTimer = useCallback(() => {
    if (autoReturnTimerRef.current) clearTimeout(autoReturnTimerRef.current);
    autoReturnTimerRef.current = null;
  }, []);

  const deactivate = useCallback(() => {
    presentationActiveRef.current = false;
    clearAutoReturnTimer();
  }, [clearAutoReturnTimer]);

  useEffect(() => {
    presentationActiveRef.current = true;
    return deactivate;
  }, [deactivate]);

  useEffect(() => {
    transitionActiveRef.current = false;
  }, [stepIndex]);

  useEffect(() => {
    clearAutoReturnTimer();
    if (submission.phase !== 'reconciled' || !presentationActiveRef.current) return;
    autoReturnTimerRef.current = setTimeout(() => {
      autoReturnTimerRef.current = null;
      if (presentationActiveRef.current) onReconciledRef.current();
    }, AUTO_RETURN_DELAY_MS);
    return clearAutoReturnTimer;
  }, [clearAutoReturnTimer, submission.phase]);

  const currentQuestion = survey.questions[stepIndex];
  const isLastStep = stepIndex >= survey.questions.length - 1;
  const submitting = submission.phase === 'optimistic-reward';

  const currentAnswered = useMemo(() => {
    if (!currentQuestion) return false;
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === 'text') {
      return !!answer?.comment && answer.comment.trim().length > 0;
    }
    return !!answer?.optionId;
  }, [answers, currentQuestion]);

  const allAnswered = useMemo(() => survey.questions.every((question) => {
    const answer = answers[question.id];
    if (question.type === 'text') {
      return !!answer?.comment && answer.comment.trim().length > 0;
    }
    return !!answer?.optionId;
  }), [answers, survey.questions]);

  const pickOption = useCallback((questionId: string, optionId: string) => {
    if (!presentationActiveRef.current) return;
    hapticTap();
    setAnswers((previous) => ({
      ...previous,
      [questionId]: { ...previous[questionId], optionId },
    }));
  }, []);

  const setComment = useCallback((questionId: string, comment: string) => {
    if (!presentationActiveRef.current) return;
    setAnswers((previous) => ({
      ...previous,
      [questionId]: { ...previous[questionId], comment },
    }));
  }, []);

  const presentAccountChanged = useCallback((attemptId: number) => {
    if (presentationActiveRef.current && attemptIdRef.current === attemptId) {
      dispatchSubmission({ type: 'submit_failed', attemptId, messageKey: 'account_changed' });
    }
  }, []);

  const retrySubmit = useCallback(async () => {
    if (!presentationActiveRef.current || requestActiveRef.current || !allAnswered) return;
    hapticTap();
    clearAutoReturnTimer();
    requestActiveRef.current = true;
    attemptIdRef.current += 1;
    const attemptId = attemptIdRef.current;
    dispatchSubmission({
      type: 'submit_started',
      attemptId,
      expectedReward: SHARD_REWARDS.survey_completed,
    });

    try {
      const accountToken = captureAccountGeneration();
      if (
        accountToken.phase !== 'active'
        || !isCurrentAccountGeneration(accountToken, stableId)
      ) {
        presentAccountChanged(attemptId);
        return;
      }

      const response = await submitSurvey({
        stableId,
        surveyId: survey.surveyId,
        answers,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? 'unknown',
      });
      if (!isCurrentAccountGeneration(accountToken, stableId)) {
        presentAccountChanged(attemptId);
        return;
      }

      const rewardApplied = response.reward > 0
        ? await commitConfirmedExternalShardEvent({
            expectedOwnerStableId: stableId,
            source: 'shard_survey',
            eventId: survey.surveyId,
            delta: SHARD_REWARDS.survey_completed,
            reason: 'survey_completed',
            grant: {
              kind: 'survey_reward',
              subjectId: survey.surveyId,
              payload: { surveyId: survey.surveyId },
            },
          })
        : null;
      if (!isCurrentAccountGeneration(accountToken, stableId)) {
        presentAccountChanged(attemptId);
        return;
      }
      if (
        rewardApplied
        && rewardApplied.status !== 'applied'
        && rewardApplied.status !== 'already-applied'
      ) {
        throw new Error('reward_event_apply_failed');
      }

      const markerWritten = await markSurveyOfferDone({
        stableId,
        dayKey,
        summary: { surveyId: survey.surveyId, title: survey.title },
      });
      if (!isCurrentAccountGeneration(accountToken, stableId)) {
        presentAccountChanged(attemptId);
        return;
      }
      if (!markerWritten) throw new Error('marker_reconcile_failed');

      const completedScope = { stableId, dayKey, lang };
      if (!isCurrentAccountGeneration(accountToken, stableId)) {
        presentAccountChanged(attemptId);
        return;
      }
      const cacheCommitted = commitSurveyOfferRequest(
        completedScope,
        beginSurveyOfferRequest(completedScope),
        buildServerConfirmedLegacyCompletion(lang),
      );
      if (!cacheCommitted) throw new Error('cache_reconcile_failed');
      try {
        onDurablyReconciledRef.current?.({ stableId, dayKey, surveyId: survey.surveyId });
      } catch (e) {
      // Durable completion already succeeded; presentation observers are best-effort only.
      DebugLogger.error('survey_flow_controller:cacheCommitted', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      if (!presentationActiveRef.current || attemptIdRef.current !== attemptId) return;

      dispatchSubmission({ type: 'submit_succeeded', attemptId, reward: response.reward });
      hapticSuccess();
      if (response.reward > 0) {
        emitAppEvent('shards_earned', {
          amount: response.reward,
          reasonKey: 'survey_completed',
        });
      }
    } catch (error: unknown) {
      const messageKey = mapSubmitError(error);
      if (presentationActiveRef.current && attemptIdRef.current === attemptId) {
        dispatchSubmission({ type: 'submit_failed', attemptId, messageKey });
      }
    } finally {
      if (attemptIdRef.current === attemptId) requestActiveRef.current = false;
    }
  }, [allAnswered, answers, clearAutoReturnTimer, dayKey, lang, presentAccountChanged, stableId, survey]);

  const goNext = useCallback(() => {
    if (
      !presentationActiveRef.current
      || transitionActiveRef.current
      || !currentAnswered
    ) return;
    if (isLastStep) {
      void retrySubmit();
      return;
    }
    transitionActiveRef.current = true;
    hapticTap();
    setDirection('forward');
    setStepIndex((current) => Math.min(current + 1, survey.questions.length - 1));
  }, [currentAnswered, isLastStep, retrySubmit, survey.questions.length]);

  const goBack = useCallback((): 'close' | 'moved' => {
    if (!presentationActiveRef.current || transitionActiveRef.current) return 'moved';
    if (stepIndex === 0) return 'close';
    transitionActiveRef.current = true;
    hapticTap();
    setDirection('backward');
    setStepIndex((current) => Math.max(0, current - 1));
    return 'moved';
  }, [stepIndex]);

  return {
    stepIndex,
    direction,
    currentQuestion,
    answers,
    currentAnswered,
    isLastStep,
    submission,
    submitting,
    pickOption,
    setComment,
    goNext,
    goBack,
    retrySubmit,
    deactivate,
  };
}

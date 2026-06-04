import {
  buildPlanRuntimeItem,
  type PlanRuntimeItem,
} from '../app/personal_plan_exercise_runtime';
import {
  startPlanRuntimeExerciseSession,
  submitPlanRuntimeSessionAnswer,
} from '../app/personal_plan_exercise_runtime_session';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';

const phrases = buildGavanDay1ContentCandidate().phrases;
const [herePhrase, minutePhrase] = phrases;

const block: PlanExerciseBlock = {
  id: 'gavan-week1-day1:block-runtime-session',
  planId: 'gavan',
  dayIndex: 1,
  type: 'plan_choose_natural_phrase',
  title: 'Фразы дня',
  contentUnitIds: [herePhrase.id, minutePhrase.id],
  estimatedMinutes: 5,
  requiredFor: [5, 10, 15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall_and_trainer',
};

function item(phrase = herePhrase): PlanRuntimeItem {
  return buildPlanRuntimeItem({
    block,
    phrase,
    exerciseType: 'plan_choose_natural_phrase',
    distractors: phrase.id === herePhrase.id
      ? ['I here.', "I'm at here."]
      : ['I help a minute.', 'I repeat a minute.'],
  });
}

function startSession() {
  const started = startPlanRuntimeExerciseSession({
    block,
    items: [item(herePhrase), item(minutePhrase)],
    planInstanceId: 'instance_runtime_session',
    sessionId: 'session_runtime_1',
    startedAt: '2026-06-03T12:00:00.000Z',
  });

  expect(started.status).toBe('ready');
  if (started.status !== 'ready') {
    throw new Error(`Session did not start: ${started.issue.code}`);
  }
  return started.session;
}

describe('personal plan exercise runtime session', () => {
  it('starts with the first item and zero progress', () => {
    const session = startSession();

    expect(session.id).toBe('session_runtime_1');
    expect(session.currentItem?.phraseId).toBe(herePhrase.id);
    expect(session.progress).toEqual({
      total: 2,
      completed: 0,
      wrong: 0,
      percent: 0,
      completedAll: false,
    });
    expect(session.completedPhraseIds).toEqual([]);
    expect(session.missedPhraseIds).toEqual([]);
    expect(session.openMissedPhraseIds).toEqual([]);
  });

  it('does not count a wrong answer and returns that item later', () => {
    const first = submitPlanRuntimeSessionAnswer(startSession(), {
      selectedAnswer: 'I here.',
      occurredAt: '2026-06-03T12:01:00.000Z',
    });

    expect(first.status).toBe('ready');
    if (first.status !== 'ready') throw new Error('Expected ready submission.');

    expect(first.submission.isCorrect).toBe(false);
    expect(first.session.progress).toEqual({
      total: 2,
      completed: 0,
      wrong: 1,
      percent: 0,
      completedAll: false,
    });
    expect(first.session.completedPhraseIds).toEqual([]);
    expect(first.session.missedPhraseIds).toEqual([herePhrase.id]);
    expect(first.session.openMissedPhraseIds).toEqual([herePhrase.id]);
    expect(first.session.currentItem?.phraseId).toBe(minutePhrase.id);
    expect(first.session.items.map((runtimeItem) => runtimeItem.phraseId)).toEqual([
      herePhrase.id,
      minutePhrase.id,
      herePhrase.id,
    ]);
    expect(first.submission.recoveryCandidates.map((candidate) => candidate.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
  });

  it('marks missed phrases as recovered only after a later correct answer', () => {
    const afterWrong = submitPlanRuntimeSessionAnswer(startSession(), {
      selectedAnswer: 'I here.',
    });
    if (afterWrong.status !== 'ready') throw new Error('Expected first ready submission.');

    const afterSecond = submitPlanRuntimeSessionAnswer(afterWrong.session, {
      selectedAnswer: 'I need a minute.',
    });
    expect(afterSecond.status).toBe('ready');
    if (afterSecond.status !== 'ready') throw new Error('Expected second ready submission.');

    expect(afterSecond.session.progress).toEqual({
      total: 2,
      completed: 1,
      wrong: 1,
      percent: 50,
      completedAll: false,
    });
    expect(afterSecond.session.completedPhraseIds).toEqual([minutePhrase.id]);
    expect(afterSecond.session.openMissedPhraseIds).toEqual([herePhrase.id]);
    expect(afterSecond.session.currentItem?.phraseId).toBe(herePhrase.id);

    const afterRetry = submitPlanRuntimeSessionAnswer(afterSecond.session, {
      selectedAnswer: "I'm here.",
    });
    expect(afterRetry.status).toBe('ready');
    if (afterRetry.status !== 'ready') throw new Error('Expected retry ready submission.');

    expect(afterRetry.session.progress).toEqual({
      total: 2,
      completed: 2,
      wrong: 1,
      percent: 100,
      completedAll: true,
    });
    expect(afterRetry.session.completedPhraseIds).toEqual([minutePhrase.id, herePhrase.id]);
    expect(afterRetry.session.missedPhraseIds).toEqual([herePhrase.id]);
    expect(afterRetry.session.recoveredPhraseIds).toEqual([herePhrase.id]);
    expect(afterRetry.session.openMissedPhraseIds).toEqual([]);
    expect(afterRetry.session.currentItem).toBeUndefined();
  });

  it('blocks invalid starts and submissions without writing storage or UI state', () => {
    expect(startPlanRuntimeExerciseSession({
      block,
      items: [],
      planInstanceId: 'instance_runtime_session',
    })).toEqual({
      status: 'blocked',
      issue: {
        code: 'empty_items',
        detail: 'Runtime session needs at least one item.',
      },
    });

    const badItem = buildPlanRuntimeItem({
      block: { ...block, type: 'plan_missing_word' },
      phrase: herePhrase,
      exerciseType: 'plan_missing_word',
      missingWord: 'here',
      distractors: ['ready'],
    });
    expect(startPlanRuntimeExerciseSession({
      block,
      items: [badItem],
      planInstanceId: 'instance_runtime_session',
    })).toEqual({
      status: 'blocked',
      issue: {
        code: 'invalid_item',
        detail: 'Runtime item failed validation before session start.',
      },
    });

    const session = {
      ...startSession(),
      currentItem: undefined,
      cursor: 99,
    };
    expect(submitPlanRuntimeSessionAnswer(session, {
      selectedAnswer: "I'm here.",
    })).toEqual({
      status: 'blocked',
      issue: {
        code: 'session_finished',
        detail: 'Runtime session has no current item.',
      },
    });
  });
});

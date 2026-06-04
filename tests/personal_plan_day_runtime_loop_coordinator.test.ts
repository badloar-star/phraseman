import {
  applyPlanDayRuntimeLoopAnswer,
  startPlanDayRuntimeLoop,
} from '../app/personal_plan_day_runtime_loop_coordinator';
import { buildGavanDay1RuntimeBlockBundles } from '../app/personal_plan_runtime_block_factory';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';

const content = buildGavanDay1ContentCandidate();
const bundlesResult = buildGavanDay1RuntimeBlockBundles(content);

function bundles() {
  expect(bundlesResult.status).toBe('ready');
  if (bundlesResult.status !== 'ready') {
    throw new Error(`Expected ready bundles: ${bundlesResult.issues.join(', ')}`);
  }
  return bundlesResult.bundles;
}

describe('personal plan day runtime loop coordinator', () => {
  it('starts a day loop with the first active runtime block', () => {
    const result = startPlanDayRuntimeLoop({
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_loop_start',
      sessionIdPrefix: 'loop',
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready loop: ${result.issues.join(', ')}`);

    expect(result.loop.assembly.activeBlockId).toBe('gavan-week1-day1:choose-natural');
    expect(result.loop.assembly.activeViewModel?.title).toBe('Выбрать фразу');
    expect(result.loop.completedBlockIds).toEqual([]);
    expect(result.loop.carryoverPhraseIds).toEqual([]);
  });

  it('updates the current session after an answer without restarting the block', () => {
    const started = startPlanDayRuntimeLoop({
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_loop_answer',
      sessionIdPrefix: 'loop',
    });
    if (started.status !== 'ready') throw new Error('Expected ready loop.');

    const result = applyPlanDayRuntimeLoopAnswer(started.loop, {
      selectedAnswer: "I'm here.",
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);

    expect(result.answer.blockCompleted).toBe(false);
    expect(result.loop.assembly.activeBlockId).toBe('gavan-week1-day1:choose-natural');
    expect(result.loop.assembly.activeSession?.progress.completed).toBe(1);
    expect(result.loop.assembly.activeViewModel?.progress.label).toBe('1 из 5');
    expect(result.loop.completedBlockIds).toEqual([]);
  });

  it('automatically reassembles the day and starts the next block after block completion', () => {
    let started = startPlanDayRuntimeLoop({
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_loop_reassemble',
      sessionIdPrefix: 'loop',
    });
    expect(started.status).toBe('ready');
    if (started.status !== 'ready') throw new Error('Expected ready loop.');

    let loop = started.loop;
    for (let index = 0; index < 5; index += 1) {
      const currentAnswer = loop.assembly.activeSession?.currentItem?.correctAnswer;
      if (!currentAnswer) throw new Error('Expected current item.');

      const result = applyPlanDayRuntimeLoopAnswer(loop, {
        selectedAnswer: currentAnswer,
      });

      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);
      loop = result.loop;
    }

    expect(loop.completedBlockIds).toEqual(['gavan-week1-day1:choose-natural']);
    expect(loop.assembly.activeBlockId).toBe('gavan-week1-day1:missing-word');
    expect(loop.assembly.activeViewModel?.title).toBe('Вставить слово');
    expect(loop.assembly.blockStates.map((state) => [state.blockId, state.status])).toEqual([
      ['gavan-week1-day1:choose-natural', 'completed'],
      ['gavan-week1-day1:missing-word', 'active'],
      ['gavan-week1-day1:phrase-recall', 'available'],
    ]);
  });

  it('finishes the day after the only selected block is completed for a 5-minute plan', () => {
    const started = startPlanDayRuntimeLoop({
      bundles: bundles(),
      minutesPerDay: 5,
      planInstanceId: 'instance_loop_done',
      sessionIdPrefix: 'loop',
    });
    if (started.status !== 'ready') throw new Error('Expected ready loop.');

    let loop = started.loop;
    while (loop.assembly.activeSession?.currentItem) {
      const result = applyPlanDayRuntimeLoopAnswer(loop, {
        selectedAnswer: loop.assembly.activeSession.currentItem.correctAnswer,
      });
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);
      loop = result.loop;
    }

    expect(loop.assembly.dayCompleted).toBe(true);
    expect(loop.assembly.activeBlockId).toBeUndefined();
    expect(loop.assembly.completion?.title).toBe('День закрыт');
    expect(loop.completedBlockIds).toEqual(['gavan-week1-day1:choose-natural']);
  });

  it('keeps carryover explicit after wrong answers', () => {
    const started = startPlanDayRuntimeLoop({
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_loop_carryover',
      sessionIdPrefix: 'loop',
    });
    if (started.status !== 'ready') throw new Error('Expected ready loop.');

    const result = applyPlanDayRuntimeLoopAnswer(started.loop, {
      selectedAnswer: 'I here.',
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);

    expect(result.loop.carryoverPhraseIds).toEqual([content.phrases[0].id]);
    expect(result.loop.assembly.carryover.phraseIds).toEqual([content.phrases[0].id]);
    expect(result.loop.assembly.activeViewModel?.feedback?.title).toBe('Фраза вернётся ещё раз');
  });

  it('blocks bad loop starts and answers without an active session', () => {
    expect(startPlanDayRuntimeLoop({
      bundles: [],
      minutesPerDay: 15,
      planInstanceId: 'instance_loop_bad',
    })).toEqual({
      status: 'blocked',
      issues: ['no_available_bundles'],
    });

    const done = startPlanDayRuntimeLoop({
      bundles: bundles(),
      minutesPerDay: 5,
      planInstanceId: 'instance_loop_no_active',
      completedBlockIds: ['gavan-week1-day1:choose-natural'],
    });
    expect(done.status).toBe('ready');
    if (done.status !== 'ready') throw new Error('Expected ready completed loop.');

    expect(applyPlanDayRuntimeLoopAnswer(done.loop, {
      selectedAnswer: "I'm here.",
    })).toEqual({
      status: 'blocked',
      issues: ['no_active_session'],
    });
  });
});

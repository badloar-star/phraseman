import {
  buildPlanDayRuntimePersistedState,
  parsePlanDayRuntimePersistedState,
  planDayRuntimeStateBelongsToInstance,
  serializePlanDayRuntimePersistedState,
  validatePlanDayRuntimePersistedState,
} from '../app/personal_plan_day_runtime_persistence_contract';
import {
  applyPlanDayRuntimeLoopAnswer,
  startPlanDayRuntimeLoop,
  type PlanDayRuntimeLoop,
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

function startLoop(): PlanDayRuntimeLoop {
  const result = startPlanDayRuntimeLoop({
    bundles: bundles(),
    minutesPerDay: 15,
    planInstanceId: 'instance_persist_1',
    sessionIdPrefix: 'persist',
  });

  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error(`Expected ready loop: ${result.issues.join(', ')}`);
  return result.loop;
}

describe('personal plan day runtime persistence contract', () => {
  it('builds a minimal persisted state from the runtime loop', () => {
    const wrong = applyPlanDayRuntimeLoopAnswer(startLoop(), {
      selectedAnswer: 'I here.',
      occurredAt: '2026-06-03T14:00:00.000Z',
    });
    expect(wrong.status).toBe('ready');
    if (wrong.status !== 'ready') throw new Error(`Expected ready answer: ${wrong.issues.join(', ')}`);

    const state = buildPlanDayRuntimePersistedState(wrong.loop, {
      updatedAt: '2026-06-03T14:01:00.000Z',
    });

    expect(state).toEqual({
      schemaVersion: 1,
      planInstanceId: 'instance_persist_1',
      planId: 'gavan',
      dayIndex: 1,
      minutesPerDay: 15,
      activeBlockId: 'gavan-week1-day1:choose-natural',
      completedBlockIds: [],
      carryoverPhraseIds: [content.phrases[0].id],
      updatedAt: '2026-06-03T14:01:00.000Z',
    });
    expect(validatePlanDayRuntimePersistedState(state)).toEqual([]);
  });

  it('round-trips through JSON without storing answers, phrase text, or runtime items', () => {
    const loop = startLoop();
    const state = buildPlanDayRuntimePersistedState(loop, {
      updatedAt: '2026-06-03T14:02:00.000Z',
    });
    const serialized = serializePlanDayRuntimePersistedState(state);

    expect(serialized).not.toContain('selectedAnswer');
    expect(serialized).not.toContain('expectedAnswer');
    expect(serialized).not.toContain("I'm here.");
    expect(serialized).not.toContain('Я здесь.');
    expect(serialized).not.toContain('items');
    expect(serialized).not.toContain('activeSession');

    expect(parsePlanDayRuntimePersistedState(serialized)).toEqual({
      status: 'ready',
      state,
    });
  });

  it('keeps completed ids scoped to the current planInstanceId', () => {
    let loop = startLoop();
    while (loop.assembly.activeSession?.currentItem) {
      const answer = loop.assembly.activeSession.currentItem.correctAnswer;
      const result = applyPlanDayRuntimeLoopAnswer(loop, { selectedAnswer: answer });
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);
      loop = result.loop;
      if (loop.completedBlockIds.length > 0) break;
    }

    const state = buildPlanDayRuntimePersistedState(loop, {
      updatedAt: '2026-06-03T14:03:00.000Z',
    });

    expect(state.completedBlockIds).toEqual(['gavan-week1-day1:choose-natural']);
    expect(planDayRuntimeStateBelongsToInstance(state, 'instance_persist_1')).toBe(true);
    expect(planDayRuntimeStateBelongsToInstance(state, 'instance_after_reset')).toBe(false);
  });

  it('rejects broken persisted state before storage adapters can use it', () => {
    expect(validatePlanDayRuntimePersistedState({
      schemaVersion: 1,
      planInstanceId: ' ',
      planId: 'gavan',
      dayIndex: 1,
      minutesPerDay: 15,
      activeBlockId: 'block',
      completedBlockIds: [],
      carryoverPhraseIds: [],
      updatedAt: '2026-06-03T14:04:00.000Z',
    })).toContain('missing_plan_instance_id');

    expect(validatePlanDayRuntimePersistedState({
      schemaVersion: 2,
      planInstanceId: 'instance_persist_1',
      planId: 'gavan',
      dayIndex: 1,
      minutesPerDay: 15,
      activeBlockId: 'block',
      completedBlockIds: [],
      carryoverPhraseIds: [],
      updatedAt: '2026-06-03T14:04:00.000Z',
    } as any)).toContain('unsupported_schema_version');

    expect(validatePlanDayRuntimePersistedState({
      schemaVersion: 1,
      planInstanceId: 'instance_persist_1',
      planId: 'gavan',
      dayIndex: 1,
      minutesPerDay: 30,
      activeBlockId: 'block',
      completedBlockIds: [],
      carryoverPhraseIds: [],
      updatedAt: '2026-06-03T14:04:00.000Z',
    } as any)).toContain('invalid_minutes_per_day');
  });

  it('blocks malformed JSON and states with private payload fields', () => {
    expect(parsePlanDayRuntimePersistedState('{bad json')).toEqual({
      status: 'blocked',
      issues: ['invalid_json'],
    });

    expect(parsePlanDayRuntimePersistedState(JSON.stringify({
      schemaVersion: 1,
      planInstanceId: 'instance_persist_1',
      planId: 'gavan',
      dayIndex: 1,
      minutesPerDay: 15,
      activeBlockId: 'block',
      completedBlockIds: [],
      carryoverPhraseIds: [],
      updatedAt: '2026-06-03T14:05:00.000Z',
      selectedAnswer: "I'm here.",
    }))).toEqual({
      status: 'blocked',
      issues: ['private_payload_field'],
    });
  });
});

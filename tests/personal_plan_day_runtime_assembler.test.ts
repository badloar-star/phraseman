import {
  assemblePlanDayRuntime,
  validatePlanDayRuntimeAssembly,
} from '../app/personal_plan_day_runtime_assembler';
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

describe('personal plan day runtime assembler', () => {
  it('starts only the first 5-minute block for a 5-minute daily choice', () => {
    const result = assemblePlanDayRuntime({
      bundles: bundles(),
      minutesPerDay: 5,
      planInstanceId: 'instance_day_runtime_5',
      sessionIdPrefix: 'day-runtime',
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready assembly: ${result.issues.join(', ')}`);

    expect(result.assembly.minutesPerDay).toBe(5);
    expect(result.assembly.totalEstimatedMinutes).toBe(5);
    expect(result.assembly.dayCompleted).toBe(false);
    expect(result.assembly.activeBlockId).toBe('gavan-week1-day1:choose-natural');
    expect(result.assembly.activeSession?.id).toBe('day-runtime:gavan-week1-day1:choose-natural');
    expect(result.assembly.activeViewModel?.title).toBe('Выбрать фразу');
    expect(result.assembly.activeViewModel?.progress.label).toBe('0 из 5');
    expect(result.assembly.blockStates.map((state) => [state.blockId, state.status])).toEqual([
      ['gavan-week1-day1:choose-natural', 'active'],
      ['gavan-week1-day1:missing-word', 'locked_by_minutes'],
      ['gavan-week1-day1:phrase-recall', 'locked_by_minutes'],
    ]);
    expect(validatePlanDayRuntimeAssembly(result.assembly)).toEqual([]);
  });

  it('keeps all three runtime modes available for a 15-minute daily choice', () => {
    const result = assemblePlanDayRuntime({
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_day_runtime_15',
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready assembly: ${result.issues.join(', ')}`);

    expect(result.assembly.totalEstimatedMinutes).toBe(14);
    expect(result.assembly.blockStates.map((state) => [state.blockId, state.status])).toEqual([
      ['gavan-week1-day1:choose-natural', 'active'],
      ['gavan-week1-day1:missing-word', 'available'],
      ['gavan-week1-day1:phrase-recall', 'available'],
    ]);
    expect(result.assembly.availableBlockIds).toEqual([
      'gavan-week1-day1:choose-natural',
      'gavan-week1-day1:missing-word',
      'gavan-week1-day1:phrase-recall',
    ]);
    expect(validatePlanDayRuntimeAssembly(result.assembly)).toEqual([]);
  });

  it('skips completed blocks and starts the next available runtime mode', () => {
    const result = assemblePlanDayRuntime({
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_day_runtime_next',
      completedBlockIds: ['gavan-week1-day1:choose-natural'],
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready assembly: ${result.issues.join(', ')}`);

    expect(result.assembly.activeBlockId).toBe('gavan-week1-day1:missing-word');
    expect(result.assembly.activeViewModel?.title).toBe('Вставить слово');
    expect(result.assembly.blockStates.map((state) => [state.blockId, state.status])).toEqual([
      ['gavan-week1-day1:choose-natural', 'completed'],
      ['gavan-week1-day1:missing-word', 'active'],
      ['gavan-week1-day1:phrase-recall', 'available'],
    ]);
  });

  it('returns a completed day state when all selected runtime blocks are completed', () => {
    const result = assemblePlanDayRuntime({
      bundles: bundles(),
      minutesPerDay: 10,
      planInstanceId: 'instance_day_runtime_done',
      completedBlockIds: [
        'gavan-week1-day1:choose-natural',
        'gavan-week1-day1:missing-word',
      ],
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready assembly: ${result.issues.join(', ')}`);

    expect(result.assembly.dayCompleted).toBe(true);
    expect(result.assembly.activeBlockId).toBeUndefined();
    expect(result.assembly.activeSession).toBeUndefined();
    expect(result.assembly.activeViewModel).toBeUndefined();
    expect(result.assembly.completion).toEqual({
      title: 'День закрыт',
      text: 'Все задания на сегодня выполнены. Можно отдохнуть или вернуться к самостоятельной практике.',
    });
    expect(validatePlanDayRuntimeAssembly(result.assembly)).toEqual([]);
  });

  it('carries only phrase ids that belong to selected blocks', () => {
    const result = assemblePlanDayRuntime({
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_day_runtime_carryover',
      carryoverPhraseIds: [content.phrases[1].id, 'not_in_day'],
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready assembly: ${result.issues.join(', ')}`);

    expect(result.assembly.carryover).toEqual({
      hasCarryover: true,
      phraseIds: [content.phrases[1].id],
      label: '1 фраза вернется на повтор',
    });
  });

  it('blocks invalid assemblies before any UI receives them', () => {
    const missingInstance = assemblePlanDayRuntime({
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: ' ',
    });

    expect(missingInstance).toEqual({
      status: 'blocked',
      issues: ['missing_plan_instance_id'],
    });

    const noBundles = assemblePlanDayRuntime({
      bundles: [],
      minutesPerDay: 15,
      planInstanceId: 'instance_empty',
    });

    expect(noBundles).toEqual({
      status: 'blocked',
      issues: ['no_available_bundles'],
    });
  });
});

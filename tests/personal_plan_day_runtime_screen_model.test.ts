import {
  buildPlanDayRuntimeScreenModel,
  validatePlanDayRuntimeScreenModel,
} from '../app/personal_plan_day_runtime_screen_model';
import {
  applyPlanDayRuntimeLoopAnswer,
  startPlanDayRuntimeLoop,
  type PlanDayRuntimeLoop,
} from '../app/personal_plan_day_runtime_loop_coordinator';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import { buildGavanDay1RuntimeBlockBundles } from '../app/personal_plan_runtime_block_factory';

const content = buildGavanDay1ContentCandidate();
const bundlesResult = buildGavanDay1RuntimeBlockBundles(content);
const MOJIBAKE_TASKS_TITLE = 'Ð—Ð°Ð´Ð°Ð½Ð¸Ñ';

function bundles() {
  expect(bundlesResult.status).toBe('ready');
  if (bundlesResult.status !== 'ready') {
    throw new Error(`Expected ready bundles: ${bundlesResult.issues.join(', ')}`);
  }
  return bundlesResult.bundles;
}

function startLoop(minutesPerDay: 5 | 10 | 15 | 20 = 15): PlanDayRuntimeLoop {
  const result = startPlanDayRuntimeLoop({
    bundles: bundles(),
    minutesPerDay,
    planInstanceId: `instance_screen_${minutesPerDay}`,
    sessionIdPrefix: 'screen',
  });

  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error(`Expected ready loop: ${result.issues.join(', ')}`);
  return result.loop;
}

describe('personal plan day runtime screen model', () => {
  it('builds a clean premium day screen model for a 15-minute loop', () => {
    const model = buildPlanDayRuntimeScreenModel(startLoop(15));

    expect(model.header).toEqual({
      eyebrow: 'Гавань · день 1',
      title: 'Задания дня',
      percentLabel: '0%',
    });
    expect(model.progress).toEqual({
      completedBlocks: 0,
      totalBlocks: 3,
      percent: 0,
      label: '0 из 3',
      estimatedMinutesLabel: 'около 14 мин',
    });
    expect(model.timeline.map((item) => [item.title, item.status, item.button.label])).toEqual([
      ['Выбрать фразу', 'active', 'Открыто'],
      ['Вставить слово', 'available', 'Открыть'],
      ['Вспомнить без подсказок', 'available', 'Открыть'],
    ]);
    expect(model.timeline.every((item) => item.button.minTouchTarget >= 56)).toBe(true);
    expect(model.activeExercise?.title).toBe('Выбрать фразу');
    expect(model.design).toEqual({
      styleIntent: 'premium_dark_glass',
      minTouchTarget: 56,
      usesLargeButtons: true,
      avoidsDecorativeNoise: true,
    });
    expect(validatePlanDayRuntimeScreenModel(model)).toEqual([]);
  });

  it('keeps locked blocks visible but out of the selected daily workload', () => {
    const model = buildPlanDayRuntimeScreenModel(startLoop(5));

    expect(model.progress).toEqual({
      completedBlocks: 0,
      totalBlocks: 1,
      percent: 0,
      label: '0 из 1',
      estimatedMinutesLabel: 'около 5 мин',
    });
    expect(model.timeline.map((item) => [item.title, item.status, item.button.enabled])).toEqual([
      ['Выбрать фразу', 'active', true],
      ['Вставить слово', 'locked_by_minutes', false],
      ['Вспомнить без подсказок', 'locked_by_minutes', false],
    ]);
  });

  it('updates task statuses after the loop moves to the next block', () => {
    let loop = startLoop(15);
    for (let index = 0; index < 5; index += 1) {
      const answer = loop.assembly.activeSession?.currentItem?.correctAnswer;
      if (!answer) throw new Error('Expected active answer.');
      const result = applyPlanDayRuntimeLoopAnswer(loop, { selectedAnswer: answer });
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);
      loop = result.loop;
    }

    const model = buildPlanDayRuntimeScreenModel(loop);

    expect(model.progress).toEqual(expect.objectContaining({
      completedBlocks: 1,
      totalBlocks: 3,
      percent: 33,
      label: '1 из 3',
    }));
    expect(model.timeline.map((item) => [item.title, item.status, item.button.label])).toEqual([
      ['Выбрать фразу', 'completed', 'Повторить'],
      ['Вставить слово', 'active', 'Открыто'],
      ['Вспомнить без подсказок', 'available', 'Открыть'],
    ]);
    expect(model.activeExercise?.title).toBe('Вставить слово');
  });

  it('shows carryover without naming invented wrong-answer variants', () => {
    const wrong = applyPlanDayRuntimeLoopAnswer(startLoop(15), {
      selectedAnswer: 'I here.',
    });
    expect(wrong.status).toBe('ready');
    if (wrong.status !== 'ready') throw new Error(`Expected ready answer: ${wrong.issues.join(', ')}`);

    const model = buildPlanDayRuntimeScreenModel(wrong.loop);

    expect(model.carryover).toEqual({
      visible: true,
      title: 'Повторим ещё раз',
      text: 'Одна фраза вернётся в конце круга. Закрепим спокойно, без подсказок.',
    });
  });

  it('returns a calm completed-day screen model', () => {
    let loop = startLoop(5);
    while (loop.assembly.activeSession?.currentItem) {
      const result = applyPlanDayRuntimeLoopAnswer(loop, {
        selectedAnswer: loop.assembly.activeSession.currentItem.correctAnswer,
      });
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);
      loop = result.loop;
    }

    const model = buildPlanDayRuntimeScreenModel(loop);

    expect(model.completion).toEqual({
      title: 'День закрыт',
      text: 'Все задания на сегодня выполнены. Можно отдохнуть или вернуться к самостоятельной практике.',
      primaryButton: {
        label: 'К практике',
        enabled: true,
        minTouchTarget: 56,
        variant: 'secondary',
      },
    });
    expect(model.activeExercise).toBeUndefined();
    expect(validatePlanDayRuntimeScreenModel(model)).toEqual([]);
  });

  it('rejects broken copy and undersized touch targets', () => {
    const model = buildPlanDayRuntimeScreenModel(startLoop(15));

    expect(validatePlanDayRuntimeScreenModel({
      ...model,
      header: {
        ...model.header,
        title: 'DEV placeholder renderer',
      },
    })).toContain('technical_copy');

    expect(validatePlanDayRuntimeScreenModel({
      ...model,
      header: {
        ...model.header,
        title: MOJIBAKE_TASKS_TITLE,
      },
    })).toContain('corrupted_copy');

    expect(validatePlanDayRuntimeScreenModel({
      ...model,
      timeline: model.timeline.map((item, index) => index === 0
        ? { ...item, button: { ...item.button, minTouchTarget: 40 } }
        : item),
    })).toContain('touch_target_too_small');
  });
});

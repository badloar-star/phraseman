import {
  buildPlanRuntimeItem,
  type PlanRuntimeItem,
} from '../app/personal_plan_exercise_runtime';
import {
  startPlanRuntimeExerciseSession,
  submitPlanRuntimeSessionAnswer,
  type PlanRuntimeExerciseSession,
} from '../app/personal_plan_exercise_runtime_session';
import {
  buildPlanRuntimeExerciseViewModel,
  validatePlanRuntimeExerciseViewModel,
} from '../app/personal_plan_exercise_runtime_view_model';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';

const phrases = buildGavanDay1ContentCandidate().phrases;
const [herePhrase, minutePhrase] = phrases;
const MOJIBAKE_CHOOSE_PHRASE_INSTRUCTION = 'Ð’Ñ‹Ð±ÐµÑ€Ð¸Ñ‚Ðµ Ñ„Ñ€Ð°Ð·Ñƒ';

const block: PlanExerciseBlock = {
  id: 'gavan-week1-day1:block-runtime-view',
  planId: 'gavan',
  dayIndex: 1,
  type: 'plan_choose_natural_phrase',
  title: 'Фразы дня',
  titleEs: 'Frases del día',
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
    phrase: phrase.id === herePhrase.id
      ? { ...phrase, spanish: 'Estoy aquí.' }
      : { ...phrase, spanish: 'Necesito un minuto.' },
    exerciseType: 'plan_choose_natural_phrase',
    distractors: phrase.id === herePhrase.id
      ? ['I here.', "I'm at here."]
      : ['I help a minute.', 'I repeat a minute.'],
  });
}

function startSession(): PlanRuntimeExerciseSession {
  const started = startPlanRuntimeExerciseSession({
    block,
    items: [item(herePhrase), item(minutePhrase)],
    planInstanceId: 'instance_runtime_view',
    sessionId: 'session_runtime_view_1',
    startedAt: '2026-06-03T12:00:00.000Z',
  });

  expect(started.status).toBe('ready');
  if (started.status !== 'ready') throw new Error(`Session did not start: ${started.issue.code}`);
  return started.session;
}

describe('personal plan exercise runtime view model', () => {
  it('builds a clean first-screen model without technical copy', () => {
    const viewModel = buildPlanRuntimeExerciseViewModel(startSession());

    expect(viewModel).toEqual(expect.objectContaining({
      sessionId: 'session_runtime_view_1',
      title: 'Фразы дня',
      eyebrow: 'Запас · день 1',
      instruction: 'Выбери естественную фразу.',
      primaryActionLabel: 'Проверить',
      canSubmit: false,
      completed: false,
    }));
    expect(viewModel.progress).toEqual({
      completed: 0,
      total: 2,
      wrong: 0,
      percent: 0,
      label: '0 из 2',
    });
    expect(viewModel.current).toEqual(expect.objectContaining({
      itemId: `gavan-week1-day1:block-runtime-view:plan_choose_natural_phrase:${herePhrase.id}`,
      targetRu: 'Я здесь.',
      targetEs: 'Estoy aquí.',
      displayEnglish: "I'm here.",
      hintsEnabled: false,
      correctWordHighlighting: false,
    }));
    expect(viewModel.current?.choices.map((choice) => choice.text)).toEqual([
      "I'm here.",
      'I here.',
      "I'm at here.",
    ]);
    expect(validatePlanRuntimeExerciseViewModel(viewModel)).toEqual([]);
  });

  it('builds Spanish chrome when the runtime view model receives es lang', () => {
    const viewModel = buildPlanRuntimeExerciseViewModel(startSession(), { lang: 'es' });

    expect(viewModel).toEqual(expect.objectContaining({
      title: 'Frases del día',
      instruction: 'Elige la frase más natural.',
      primaryActionLabel: 'Comprobar',
    }));
    expect(viewModel.progress.label).toBe('0 de 2');
    expect(viewModel.current).toEqual(expect.objectContaining({
      targetEs: 'Estoy aquí.',
    }));
    expect(validatePlanRuntimeExerciseViewModel(viewModel)).toEqual([]);
  });

  it('marks selected choice and enables submit only after a user choice', () => {
    const viewModel = buildPlanRuntimeExerciseViewModel(startSession(), {
      selectedAnswer: 'I here.',
    });

    expect(viewModel.canSubmit).toBe(true);
    expect(viewModel.selectedAnswer).toBe('I here.');
    expect(viewModel.current?.choices).toEqual([
      expect.objectContaining({ text: "I'm here.", selected: false }),
      expect.objectContaining({ text: 'I here.', selected: true }),
      expect.objectContaining({ text: "I'm at here.", selected: false }),
    ]);
  });

  it('exposes phrase-build tiles to the screen instead of answer choices', () => {
    const phraseBuildBlock: PlanExerciseBlock = {
      ...block,
      id: 'gavan-week1-day1:block-runtime-phrase-build-view',
      type: 'plan_phrase_build',
    };
    const phraseBuildItem = buildPlanRuntimeItem({
      block: phraseBuildBlock,
      phrase: herePhrase,
      exerciseType: 'plan_phrase_build',
      distractors: ['ready', 'busy'],
    });
    const started = startPlanRuntimeExerciseSession({
      block: phraseBuildBlock,
      items: [phraseBuildItem],
      planInstanceId: 'instance_runtime_view',
      sessionId: 'session_runtime_view_phrase_build',
    });

    expect(started.status).toBe('ready');
    if (started.status !== 'ready') throw new Error('Expected phrase-build session.');

    const viewModel = buildPlanRuntimeExerciseViewModel(started.session);

    expect(viewModel.current).toEqual(expect.objectContaining({
      exerciseType: 'plan_phrase_build',
      choices: [],
      freeInputExpected: false,
      tileInputExpected: true,
      targetTokenCount: 2,
      wordTiles: ["I'm", 'here'],
      distractorTiles: ['ready', 'busy'],
    }));
    expect(validatePlanRuntimeExerciseViewModel(viewModel)).toEqual([]);
  });

  it('shows recovery state after a wrong answer without inventing the chosen wrong option', () => {
    const afterWrong = submitPlanRuntimeSessionAnswer(startSession(), {
      selectedAnswer: 'I here.',
      occurredAt: '2026-06-03T12:01:00.000Z',
    });

    expect(afterWrong.status).toBe('ready');
    if (afterWrong.status !== 'ready') throw new Error('Expected ready submission.');

    const viewModel = buildPlanRuntimeExerciseViewModel(afterWrong.session);

    expect(viewModel.progress).toEqual({
      completed: 0,
      total: 2,
      wrong: 1,
      percent: 0,
      label: '0 из 2',
    });
    expect(viewModel.feedback).toEqual({
      tone: 'recovery',
      title: 'Фраза вернётся ещё раз',
      text: 'Идём дальше. В конце круга спокойно закрепим то, что не получилось с первого раза.',
    });
    expect(viewModel.current?.targetRu).toBe('Мне нужна минута.');
    expect(validatePlanRuntimeExerciseViewModel(viewModel)).toEqual([]);
  });

  it('builds a calm completion model after all phrases are answered correctly', () => {
    const first = submitPlanRuntimeSessionAnswer(startSession(), { selectedAnswer: "I'm here." });
    expect(first.status).toBe('ready');
    if (first.status !== 'ready') throw new Error('Expected first ready submission.');

    const second = submitPlanRuntimeSessionAnswer(first.session, { selectedAnswer: 'I need a minute.' });
    expect(second.status).toBe('ready');
    if (second.status !== 'ready') throw new Error('Expected second ready submission.');

    const viewModel = buildPlanRuntimeExerciseViewModel(second.session);

    expect(viewModel.completed).toBe(true);
    expect(viewModel.current).toBeUndefined();
    expect(viewModel.progress).toEqual({
      completed: 2,
      total: 2,
      wrong: 0,
      percent: 100,
      label: '2 из 2',
    });
    expect(viewModel.completion).toEqual({
      title: 'Готово на сегодня',
      text: 'Фразы дня закрыты. Можно вернуться к заданиям или потренироваться ещё, если хочется закрепить.',
      primaryActionLabel: 'К заданиям',
      secondaryActionLabel: 'Ещё потренироваться',
    });
    expect(validatePlanRuntimeExerciseViewModel(viewModel)).toEqual([]);
  });

  it('rejects broken or developer-facing view copy', () => {
    const viewModel = buildPlanRuntimeExerciseViewModel(startSession());

    expect(validatePlanRuntimeExerciseViewModel({
      ...viewModel,
      instruction: 'DEV placeholder renderer',
    })).toContain('technical_copy');
    expect(validatePlanRuntimeExerciseViewModel({
      ...viewModel,
      instruction: MOJIBAKE_CHOOSE_PHRASE_INSTRUCTION,
    })).toContain('corrupted_copy');
  });
});

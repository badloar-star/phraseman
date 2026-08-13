import {
  buildGavanDay1RuntimeBlockBundles,
  buildPlanRuntimeBlockBundle,
  validatePlanRuntimeBlockBundle,
} from '../app/personal_plan_runtime_block_factory';
import { startPlanRuntimeExerciseSession } from '../app/personal_plan_exercise_runtime_session';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import { validatePlanExerciseBlockContract } from '../app/personal_plan_engine_contracts';

const candidate = buildGavanDay1ContentCandidate();

describe('personal plan runtime block factory', () => {
  it('builds the first Gavan day as ordered runtime bundles for 5/10/15/20 minute plans', () => {
    const result = buildGavanDay1RuntimeBlockBundles(candidate);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready bundles: ${result.issues.join(', ')}`);

    expect(result.bundles.map((bundle) => bundle.block.type)).toEqual([
      'plan_choose_natural_phrase',
      'plan_missing_word',
      'plan_phrase_recall',
    ]);
    expect(result.bundles.map((bundle) => bundle.block.title)).toEqual([
      'Выбрать фразу',
      'Вставить слово',
      'Вспомнить без подсказок',
    ]);
    expect(result.bundles.map((bundle) => bundle.block.requiredFor)).toEqual([
      [5, 10, 15, 20],
      [10, 15, 20],
      [15, 20],
    ]);
    expect(result.bundles.map((bundle) => bundle.block.estimatedMinutes)).toEqual([5, 5, 4]);

    for (const bundle of result.bundles) {
      expect(validatePlanExerciseBlockContract(bundle.block)).toEqual([]);
      expect(validatePlanRuntimeBlockBundle(bundle)).toEqual([]);
      expect(bundle.items).toHaveLength(bundle.block.contentUnitIds.length);

      const started = startPlanRuntimeExerciseSession({
        block: bundle.block,
        items: bundle.items,
        planInstanceId: 'instance_factory_1',
        sessionId: `session:${bundle.block.id}`,
      });
      expect(started.status).toBe('ready');
    }
  });

  it('builds missing-word items with exact one-word answers and clean distractors', () => {
    const result = buildGavanDay1RuntimeBlockBundles(candidate);
    if (result.status !== 'ready') throw new Error('Expected ready bundles.');

    const missingWord = result.bundles.find((bundle) => bundle.block.type === 'plan_missing_word');
    expect(missingWord).toBeDefined();
    if (!missingWord) throw new Error('Missing-word bundle was not built.');

    expect(missingWord.items.map((item) => item.correctAnswer)).toEqual([
      'here',
      'need',
      'repeat',
      'yet',
      'help',
    ]);
    for (const item of missingWord.items) {
      expect(item.correctAnswer.trim()).toMatch(/^[A-Za-z']+$/);
      expect(item.displayEnglish).toContain('___');
      expect(item.choices.length).toBeGreaterThanOrEqual(3);
      expect(item.choices.filter((choice) => choice.isCorrect)).toHaveLength(1);
      expect(new Set(item.choices.map((choice) => choice.text.toLowerCase())).size).toBe(item.choices.length);
    }
  });

  it('keeps recall strict: no choices, no hints, no correct-word highlighting', () => {
    const result = buildGavanDay1RuntimeBlockBundles(candidate);
    if (result.status !== 'ready') throw new Error('Expected ready bundles.');

    const recall = result.bundles.find((bundle) => bundle.block.type === 'plan_phrase_recall');
    expect(recall).toBeDefined();
    if (!recall) throw new Error('Recall bundle was not built.');

    expect(recall.block.recoveryPolicy).toBe('return_wrong_to_recall_and_trainer');
    for (const item of recall.items) {
      expect(item.choices).toEqual([]);
      expect(item.hintsEnabled).toBe(false);
      expect(item.correctWordHighlighting).toBe(false);
      expect(item.errorsReturnLater).toBe(true);
    }
  });

  it('blocks specs with missing phrases or missing missing-word config before UI can receive them', () => {
    const missingPhrase = buildPlanRuntimeBlockBundle({
      planId: 'gavan',
      dayIndex: 1,
      phrases: candidate.phrases,
      spec: {
        id: 'bad:missing-phrase',
        type: 'plan_choose_natural_phrase',
        title: 'Выбрать фразу',
        phraseIds: ['missing_phrase'],
        estimatedMinutes: 5,
        requiredFor: [5, 10, 15, 20],
        prerequisiteLessonIds: [1],
      },
    });
    expect(missingPhrase).toEqual({
      status: 'blocked',
      issues: ['missing_phrase:missing_phrase'],
    });

    const missingWord = buildPlanRuntimeBlockBundle({
      planId: 'gavan',
      dayIndex: 1,
      phrases: candidate.phrases,
      spec: {
        id: 'bad:missing-word',
        type: 'plan_missing_word',
        title: 'Вставить слово',
        phraseIds: [candidate.phrases[0].id],
        estimatedMinutes: 5,
        requiredFor: [10, 15, 20],
        prerequisiteLessonIds: [1],
      },
    });
    expect(missingWord).toEqual({
      status: 'blocked',
      issues: [`missing_word:${candidate.phrases[0].id}`],
    });
  });
});

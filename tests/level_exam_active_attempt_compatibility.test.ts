import { createHash } from 'crypto';

import {
  applyLevelExamAnswer,
  createLevelExamAttempt,
  markLevelExamFinishing,
  restoreLevelExamAttempt,
} from '../app/level_exam_attempt_state';
import { buildLevelExamBlueprint } from '../app/level_exam_blueprint';
import { scoreLevelExam } from '../app/level_exam_scoring';
import { getLessonData } from '../app/lesson_data_all';
import type { LevelExamChoiceTask } from '../app/level_exam_types';
import type { SourceLocale } from '../app/source_locales';

const FINITE_SEEDS = [
  'a1-semantic-0',
  'a1-semantic-1',
  'contract-A1',
  'coverage-A1',
  'integrity-A1',
  ...Array.from({ length: 24 }, (_, index) => `position-A1-${index}`),
] as const;

function build(
  blueprintVersion: 3 | 4,
  sourceLocale: SourceLocale,
  seed: string,
) {
  return buildLevelExamBlueprint({
    level: 'A1',
    studyTarget: 'en',
    sourceLocale,
    seed,
    blueprintVersion,
  });
}

function identity(blueprint: ReturnType<typeof buildLevelExamBlueprint>) {
  return {
    orderedTaskIds: blueprint.tasks.map((task) => task.id),
    scoredUnitIds: [...blueprint.scoredUnitIds],
  };
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function lexicalCounterexample(blueprint: ReturnType<typeof buildLevelExamBlueprint>) {
  const task = blueprint.tasks.find((candidate): candidate is LevelExamChoiceTask => (
    candidate.format === 'fill_gap'
      && candidate.id === 'A1:fill_gap:4:lesson4_phrase_34'
  ));
  expect(task).toBeDefined();
  if (!task) throw new Error('missing lexical counterexample');
  const distractor = task.options.find((option) => option.id !== task.correctOptionId);
  expect(distractor).toBeDefined();
  if (!distractor) throw new Error('missing lexical distractor');
  return { task, distractor };
}

function persistedAttempt(
  blueprint: ReturnType<typeof buildLevelExamBlueprint>,
  optionId: string,
) {
  const { task } = lexicalCounterexample(blueprint);
  const created = createLevelExamAttempt({
    energySpent: true,
    ownerStableUid: 'compat-owner',
    startToken: `compat-${blueprint.version}`,
    level: 'A1',
    studyTarget: 'en',
    sourceLocale: blueprint.sourceLocale,
    blueprintVersion: blueprint.version,
    seed: blueprint.seed,
    orderedTaskIds: blueprint.tasks.map((candidate) => candidate.id),
    scoredUnitIds: [...blueprint.scoredUnitIds],
    startedAtMs: 1_000,
    durationMs: blueprint.durationMs,
  });
  return applyLevelExamAnswer(
    created,
    task.scoreUnitId,
    { kind: 'choice', optionId },
    1,
  );
}

describe('level exam active-attempt blueprint compatibility', () => {
  test('freezes v3 lexical grading for saved active, finishing, and timeout attempts', () => {
    const blueprint = build(3, 'ru', 'a1-semantic-0');
    const { task, distractor } = lexicalCounterexample(blueprint);
    expect(task.prompt).toBe('You do ___ wear glasses');
    expect(task.acceptedOptionIds).toEqual(task.options.map((option) => option.id));
    const saved = persistedAttempt(blueprint, distractor.id);
    const roundTripped = JSON.parse(JSON.stringify(saved));
    const restored = restoreLevelExamAttempt(roundTripped, {
      ownerStableUid: saved.ownerStableUid,
      level: saved.level,
      studyTarget: saved.studyTarget,
      sourceLocale: saved.sourceLocale,
      blueprintVersion: 3,
      nowMs: 2_000,
    });

    expect(restored.kind).toBe('resume');
    if (restored.kind !== 'resume') return;
    const rebuilt = build(3, restored.attempt.sourceLocale, restored.attempt.seed);
    expect(scoreLevelExam(rebuilt, restored.attempt.answers, 'submitted').score).toBe(1);
    const finishing = markLevelExamFinishing(restored.attempt, 'submitted');
    const finishingDecision = restoreLevelExamAttempt(JSON.parse(JSON.stringify(finishing)), {
      ownerStableUid: saved.ownerStableUid,
      level: saved.level,
      studyTarget: saved.studyTarget,
      sourceLocale: saved.sourceLocale,
      blueprintVersion: 3,
      nowMs: 2_000,
    });
    expect(finishingDecision.kind).toBe('finish_pending');
    if (finishingDecision.kind === 'finish_pending') {
      expect(scoreLevelExam(rebuilt, finishingDecision.attempt.answers, 'submitted').score).toBe(1);
    }
    const timedOutDecision = restoreLevelExamAttempt(JSON.parse(JSON.stringify(restored.attempt)), {
      ownerStableUid: saved.ownerStableUid,
      level: saved.level,
      studyTarget: saved.studyTarget,
      sourceLocale: saved.sourceLocale,
      blueprintVersion: 3,
      nowMs: restored.attempt.deadlineAtMs,
    });
    expect(timedOutDecision.kind).toBe('finish_timeout');
    if (timedOutDecision.kind === 'finish_timeout') {
      expect(scoreLevelExam(rebuilt, timedOutDecision.attempt.answers, 'timeout').score).toBe(1);
    }
  });

  test('restores v4 and grades a saved lexical distractor as incorrect', () => {
    const blueprint = build(4, 'ru', 'a1-semantic-0');
    const { distractor } = lexicalCounterexample(blueprint);
    const saved = persistedAttempt(blueprint, distractor.id);
    const restored = restoreLevelExamAttempt(JSON.parse(JSON.stringify(saved)), {
      ownerStableUid: saved.ownerStableUid,
      level: saved.level,
      studyTarget: saved.studyTarget,
      sourceLocale: saved.sourceLocale,
      blueprintVersion: 4,
      nowMs: 2_000,
    });

    expect(restored.kind).toBe('resume');
    if (restored.kind !== 'resume') return;
    const rebuilt = build(4, restored.attempt.sourceLocale, restored.attempt.seed);
    expect(scoreLevelExam(rebuilt, restored.attempt.answers, 'submitted').score).toBe(0);
  });

  test.each(['ru', 'uk', 'es'] as const)(
    'keeps v3/v4 identity stable across the finite seed baseline for %s and gives v4 a visible localized cue',
    (sourceLocale) => {
      const signatures = new Set<string>();
      for (const seed of FINITE_SEEDS) {
        const v3 = build(3, sourceLocale, seed);
        const v4 = build(4, sourceLocale, seed);
        expect(identity(v4)).toEqual(identity(v3));
        expect(v4.scoredUnitIds).toHaveLength(30);
        expect(new Set(v4.scoredUnitIds).size).toBe(30);
        signatures.add(digest(v4.scoredUnitIds));

        for (const task of v4.tasks) {
          if (task.format !== 'fill_gap') continue;
          const phrase = getLessonData(task.lessonId)
            .find((candidate) => String(candidate.id) === task.phraseId);
          expect(phrase).toBeDefined();
          if (!phrase) continue;
          const localized = sourceLocale === 'ru'
            ? phrase.russian
            : sourceLocale === 'uk'
              ? phrase.ukrainian
              : phrase.spanish || phrase.sourceLocales?.es;
          expect(localized?.trim()).not.toBe('');
          expect(task.prompt.startsWith(`${localized?.trim()}\n`)).toBe(true);
          expect(task.prompt).not.toContain(phrase.english.trim());
          expect(task.acceptedOptionIds).toEqual([task.correctOptionId]);
        }
      }
      expect(signatures.size).toBe(FINITE_SEEDS.length);
    },
  );

  test.each(['pt-BR', 'vi', 'id', 'tr', 'pl'] as const)(
    'keeps v4 A1 content for %s fail-closed',
    (sourceLocale) => {
      expect(() => build(4, sourceLocale, `missing-v4-${sourceLocale}`))
        .toThrow(`level_exam_locale_content_missing:A1:${sourceLocale}`);
    },
  );
});

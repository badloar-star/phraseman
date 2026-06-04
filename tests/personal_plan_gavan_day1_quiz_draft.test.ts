import { readFileSync } from 'fs';
import path from 'path';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import {
  buildGavanDay1QuizDraft,
  validateGavanDay1QuizDraft,
  type GavanDay1QuizDraft,
} from '../app/personal_plan_gavan_day1_quiz_draft';

function cloneDraft(): GavanDay1QuizDraft {
  return JSON.parse(JSON.stringify(buildGavanDay1QuizDraft())) as GavanDay1QuizDraft;
}

const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/;
const REJECTED_COPY_RE =
  /(?:sourcePhraseId|contentUnit|renderer|Explain that|selected option|имя|телефон|адрес|квартира|просмотр|врач|банк)/i;

describe('Gavan day 1 non-production quiz draft', () => {
  it('builds exactly 10 day 1 quiz items outside the live quiz registry', () => {
    const draft = buildGavanDay1QuizDraft();
    const result = validateGavanDay1QuizDraft(draft);

    expect(draft.id).toBe('gavan-week1-day1-quiz-draft');
    expect(draft.dayId).toBe('gavan-week1-day1');
    expect(draft.status).toBe('draft');
    expect(draft.items).toHaveLength(10);
    expect(new Set(draft.items.map((item) => item.sourcePhraseId))).toEqual(new Set([
      'gavan-w1-d1-p1',
      'gavan-w1-d1-p2',
    ]));
    expect(result).toEqual({
      valid: true,
      issues: [],
      summary: {
        items: 10,
        choices: 30,
        explanationRequirements: 30,
      },
    });
  });

  it('fails when the quiz does not have exactly 10 items', () => {
    const draft = cloneDraft();
    draft.items = draft.items.slice(0, 9);

    expect(validateGavanDay1QuizDraft(draft).issues).toContainEqual(
      expect.objectContaining({
        code: 'wrong_item_count',
        detail: 'Gavan day 1 quiz draft must contain exactly 10 items.',
      }),
    );
  });

  it('fails when an item points to a phrase outside day 1', () => {
    const draft = cloneDraft();
    draft.items[0].sourcePhraseId = 'gavan-w1-d2-p1';

    expect(validateGavanDay1QuizDraft(draft).issues).toContainEqual(
      expect.objectContaining({
        code: 'unknown_source_phrase_id',
        itemId: draft.items[0].id,
        sourcePhraseId: 'gavan-w1-d2-p1',
      }),
    );
  });

  it('requires one clear correct choice per item', () => {
    const draft = cloneDraft();
    draft.items[0].choices[1].isCorrect = true;
    draft.items[1].choices.forEach((choice) => {
      choice.isCorrect = false;
    });

    expect(validateGavanDay1QuizDraft(draft).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'multiple_correct_choices',
        itemId: draft.items[0].id,
      }),
      expect.objectContaining({
        code: 'missing_correct_choice',
        itemId: draft.items[1].id,
      }),
    ]));
  });

  it('requires explanation requirements for every choice', () => {
    const draft = cloneDraft();
    draft.items[0].choices[0].explanationRequirement = undefined;

    expect(validateGavanDay1QuizDraft(draft).issues).toContainEqual(
      expect.objectContaining({
        code: 'missing_choice_explanation_requirement',
        itemId: draft.items[0].id,
        choiceId: draft.items[0].choices[0].id,
      }),
    );
  });

  it('blocks authored wrong-choice feedback that pretends to know the selected answer', () => {
    const draft = cloneDraft();
    const wrongChoice = draft.items[0].choices.find((choice) => !choice.isCorrect)!;
    wrongChoice.explanationRequirement = {
      id: `${wrongChoice.id}:bad-feedback`,
      trigger: 'wrong',
      target: 'selected choice',
      requiresSelectedAnswerKnown: false,
      note: 'You chose the wrong version, so explain why that selected option is wrong.',
    };

    expect(validateGavanDay1QuizDraft(draft).issues).toContainEqual(
      expect.objectContaining({
        code: 'hallucinated_wrong_option_feedback',
        itemId: draft.items[0].id,
        choiceId: wrongChoice.id,
      }),
    );
  });

  it('can be built from candidate phrase ids while staying outside the live quiz registry', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1QuizDraft({ contentCandidate: candidate });
    const result = validateGavanDay1QuizDraft(draft, { contentCandidate: candidate });

    expect(draft.status).toBe('draft');
    expect(draft.items).toHaveLength(10);
    expect(new Set(draft.items.map((item) => item.sourcePhraseId))).toEqual(
      new Set(candidate.phrases.map((phrase) => phrase.id)),
    );
    expect(result.valid).toBe(true);
    expect(result.summary.items).toBe(10);
  });

  it('targets candidate meanings, new words, and first-seen constructions in explanations', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1QuizDraft({ contentCandidate: candidate });
    const allowedTargets = new Set(
      candidate.phrases.flatMap((phrase) => [
        phrase.english,
        'meaning',
        'natural_phrase',
        'context',
        ...(phrase.newWords ?? []),
        ...(phrase.firstSeenConstructions ?? []),
      ]),
    );

    for (const quizItem of draft.items) {
      for (const quizChoice of quizItem.choices) {
        expect(allowedTargets).toContain(quizChoice.explanationRequirement?.target);
      }
    }
  });

  it('uses user-facing quiz prompts and notes instead of developer instructions', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1QuizDraft({ contentCandidate: candidate });
    const allCopy = draft.items.flatMap((item) => [
      item.prompt,
      ...item.choices.flatMap((choice) => [
        choice.text,
        choice.explanationRequirement?.note ?? '',
      ]),
    ]).join(' ');

    expect(allCopy).not.toMatch(/\bdev\b|\bdebug\b|\bdraft\b|\bplaceholder\b|\bTODO\b/i);
    expect(allCopy).not.toMatch(/Explain that|sourcePhraseId|contentUnit|renderer|selected option/i);
    expect(draft.items.every((item) => item.prompt.trim().length >= 12)).toBe(true);
  });

  it('passes the candidate quiz copy honesty gate for the current candidate quiz', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1QuizDraft({ contentCandidate: candidate });

    expect(validateGavanDay1QuizDraft(draft, { contentCandidate: candidate })).toEqual({
      valid: true,
      issues: [],
      summary: {
        items: 10,
        choices: 30,
        explanationRequirements: 30,
      },
    });
  });

  it('uses clean user-facing Russian for the current candidate quiz', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1QuizDraft({ contentCandidate: candidate });
    const allCopy = draft.items.flatMap((item) => [
      item.prompt,
      ...item.choices.flatMap((choice) => [
        choice.text,
        choice.explanationRequirement?.note ?? '',
      ]),
    ]).join(' ');

    expect(allCopy).not.toMatch(MOJIBAKE_RE);
    expect(allCopy).not.toMatch(REJECTED_COPY_RE);
    expect(draft.items.map((item) => item.prompt)).toEqual([
      'Как коротко сказать: «Я здесь»?',
      'Что значит “I’m here”?',
      'Как попросить немного времени?',
      'Заполни пропуск: I ___ a minute.',
      'Как вежливо попросить повторить?',
      'Заполни пропуск: Could you ___ that?',
      'Как сказать, что вы пока не поняли?',
      "Заполни пропуск: I don't understand ___.",
      'Как коротко попросить помощи?',
      'Вы не уверены, что делать дальше. Что сказать?',
    ]);
  });

  it('uses varied human quiz notes instead of repetitive confirmation formulas', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1QuizDraft({ contentCandidate: candidate });
    const notes = draft.items.flatMap((item) =>
      item.choices.map((choice) => choice.explanationRequirement?.note ?? ''),
    );

    for (const note of notes) {
      expect(note).not.toMatch(/^Да[:.,\s]/i);
      expect(note.length).toBeGreaterThanOrEqual(40);
      expect(note.length).toBeLessThanOrEqual(175);
      expect(note).not.toMatch(/(?:DEV|debug|draft|placeholder|TODO|Explain that|selected option|sourcePhraseId|contentUnit|renderer)/i);
      expect(note).not.toMatch(MOJIBAKE_RE);
    }
  });

  it('blocks candidate prompts and notes with developer/internal terms', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1QuizDraft({ contentCandidate: candidate });
    draft.items[0].prompt = 'DEV placeholder: open sourcePhraseId renderer';
    draft.items[1].choices[0].explanationRequirement!.note =
      'Debug note: this contentUnit is still draft.';

    expect(validateGavanDay1QuizDraft(draft, { contentCandidate: candidate }).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'candidate_quiz_developer_copy',
          itemId: draft.items[0].id,
        }),
        expect.objectContaining({
          code: 'candidate_quiz_developer_copy',
          itemId: draft.items[1].id,
          choiceId: draft.items[1].choices[0].id,
        }),
      ]),
    );
  });

  it('blocks candidate prompts and notes with mojibake or corrupted Cyrillic copy', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1QuizDraft({ contentCandidate: candidate });
    draft.items[0].prompt = '\u00d0\u0161\u00d0\u00b0\u00d0\u00ba это нормально?';
    draft.items[1].choices[0].explanationRequirement!.note =
      'Сломанная строка: \u00d0\u00bf\u00d1\u20ac\u00d0\u00b8\u00d0\u00b2\u00d0\u00b5\u00d1\u201a.';

    expect(validateGavanDay1QuizDraft(draft, { contentCandidate: candidate }).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'candidate_quiz_corrupted_copy',
          itemId: draft.items[0].id,
        }),
        expect.objectContaining({
          code: 'candidate_quiz_corrupted_copy',
          itemId: draft.items[1].id,
          choiceId: draft.items[1].choices[0].id,
        }),
      ]),
    );
  });

  it('blocks ungrounded explanation targets for candidate quizzes', () => {
    const candidate = buildGavanDay1ContentCandidate();
    const draft = buildGavanDay1QuizDraft({ contentCandidate: candidate });
    draft.items[0].choices[0].explanationRequirement!.target = 'appointment';

    expect(validateGavanDay1QuizDraft(draft, { contentCandidate: candidate }).issues).toContainEqual(
      expect.objectContaining({
        code: 'candidate_quiz_ungrounded_explanation_target',
        itemId: draft.items[0].id,
        choiceId: draft.items[0].choices[0].id,
      }),
    );
  });

  it('does not import live catalog or live quiz registry', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_quiz_draft.ts'),
      'utf8',
    );

    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});

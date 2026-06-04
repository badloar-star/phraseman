import {
  renderPlanExplanationCard,
  type PlanExplanationCardAdapterInput,
} from '../app/personal_plan_explanation_card_adapter';
import { buildGavanDay1QuizDraft } from '../app/personal_plan_gavan_day1_quiz_draft';
import { validatePlanExplanationCardContract } from '../app/personal_plan_engine_contracts';

function baseInput(): PlanExplanationCardAdapterInput {
  const quiz = buildGavanDay1QuizDraft();
  const item = quiz.items[0];
  const choice = item.choices[0];

  return {
    requirement: choice.explanationRequirement!,
    source: {
      id: item.id,
      contentUnitId: item.sourcePhraseId,
      grammarTags: ['to-be'],
      vocabularyTags: ['here'],
    },
  };
}

describe('personal plan explanation card adapter', () => {
  it('renders a correct-answer card from a quiz explanation requirement', () => {
    const result = renderPlanExplanationCard(baseInput());

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('Expected ready explanation card.');
    expect(result.card).toMatchObject({
      contentUnitId: 'gavan-w1-d1-p1',
      trigger: 'correct',
      tone: 'supportive',
      title: 'Почему это работает',
      grammarTags: ['to-be'],
      vocabularyTags: ['here'],
      explainsSelectedAnswerOnlyWhenKnown: false,
    });
    expect(result.card?.body).toContain("I'm");
    expect(result.card?.body).not.toMatch(/Explain that|DEV|TODO|placeholder/i);
    expect(validatePlanExplanationCardContract(result.card!)).toEqual([]);
  });

  it('renders a wrong-answer card without inventing the selected option', () => {
    const quiz = buildGavanDay1QuizDraft();
    const item = quiz.items[0];
    const wrongChoice = item.choices.find((choice) => !choice.isCorrect)!;

    const result = renderPlanExplanationCard({
      requirement: wrongChoice.explanationRequirement!,
      source: {
        id: item.id,
        contentUnitId: item.sourcePhraseId,
      },
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('Expected ready explanation card.');
    expect(result.card).toMatchObject({
      trigger: 'wrong',
      tone: 'correction',
      title: 'Разберем спокойно',
      explainsSelectedAnswerOnlyWhenKnown: true,
    });
    expect(result.card?.body.toLowerCase()).toContain('после i нужна форма am.');
    expect(result.card?.body).not.toMatch(/you chose|selected option|selected choice/i);
    expect(validatePlanExplanationCardContract(result.card!)).toEqual([]);
  });

  it('blocks selected-answer-aware feedback when runtime does not provide the selected choice', () => {
    const input = baseInput();
    input.requirement = {
      ...input.requirement,
      trigger: 'wrong',
      requiresSelectedAnswerKnown: true,
      note: 'Explain why this selected choice sounds too formal.',
    };

    const result = renderPlanExplanationCard(input);

    expect(result).toEqual({
      status: 'blocked',
      issue: {
        code: 'selected_answer_required',
        detail: 'Selected-answer-aware explanation requires runtime selectedChoiceText.',
      },
    });
  });

  it('allows selected-answer-aware feedback when runtime provides the selected choice', () => {
    const input = baseInput();
    input.requirement = {
      ...input.requirement,
      trigger: 'wrong',
      requiresSelectedAnswerKnown: true,
      note: 'Explain why this selected choice sounds too formal.',
    };
    input.runtime = {
      selectedChoiceText: 'I am on here.',
    };

    const result = renderPlanExplanationCard(input);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('Expected ready explanation card.');
    expect(result.card?.body).toContain('I am on here.');
    expect(result.card?.body).toContain('This selected choice sounds too formal');
    expect(validatePlanExplanationCardContract(result.card!)).toEqual([]);
  });

  it('blocks robotic or developer copy before it reaches the UI', () => {
    const input = baseInput();
    input.requirement = {
      ...input.requirement,
      note: 'DEV placeholder: explain this later.',
    };

    expect(renderPlanExplanationCard(input)).toEqual({
      status: 'blocked',
      issue: {
        code: 'robotic_or_developer_copy',
        detail: 'Explanation requirement contains developer or placeholder copy.',
      },
    });
  });

  it('blocks wrong-answer copy that claims a selected answer without runtime context', () => {
    const input = baseInput();
    input.requirement = {
      ...input.requirement,
      trigger: 'wrong',
      requiresSelectedAnswerKnown: false,
      note: 'You chose the selected option, so this is wrong.',
    };

    expect(renderPlanExplanationCard(input)).toEqual({
      status: 'blocked',
      issue: {
        code: 'hallucinated_selected_answer',
        detail: 'Wrong-answer explanation cannot claim a selected choice without runtime context.',
      },
    });
  });
});

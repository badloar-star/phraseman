import type {
  PlanExplanationCard,
  PlanExplanationTone,
  PlanExplanationTrigger,
} from './personal_plan_engine_contracts';
import type { GavanDay1QuizExplanationRequirement } from './personal_plan_gavan_day1_quiz_draft';

export type PlanExplanationCardAdapterIssueCode =
  | 'selected_answer_required'
  | 'hallucinated_selected_answer'
  | 'robotic_or_developer_copy'
  | 'empty_explanation';

export type PlanExplanationCardAdapterIssue = {
  code: PlanExplanationCardAdapterIssueCode;
  detail: string;
};

export type PlanExplanationCardAdapterInput = {
  requirement: GavanDay1QuizExplanationRequirement;
  source: {
    id: string;
    contentUnitId: string;
    grammarTags?: string[];
    vocabularyTags?: string[];
  };
  runtime?: {
    selectedChoiceText?: string;
  };
};

export type PlanExplanationCardAdapterResult =
  | {
    status: 'ready';
    card: PlanExplanationCard;
  }
  | {
    status: 'blocked';
    issue: PlanExplanationCardAdapterIssue;
  };

const DEVELOPER_COPY_PATTERN = /\b(?:dev|debug|todo|placeholder|draft|lorem)\b/i;
const SELECTED_ANSWER_CLAIM_PATTERN = /\byou chose\b|\bselected (?:choice|option|answer)\b/i;

function compactTags(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function blocked(
  code: PlanExplanationCardAdapterIssueCode,
  detail: string,
): PlanExplanationCardAdapterResult {
  return {
    status: 'blocked',
    issue: {
      code,
      detail,
    },
  };
}

function normalizeBody(note: string): string {
  const body = note
    .trim()
    .replace(/^explain\s+(?:that|why)\s+/i, '')
    .replace(/^this\s+/i, 'This ');

  if (!body) return '';

  return `${body.charAt(0).toUpperCase()}${body.slice(1)}`;
}

function titleFor(trigger: GavanDay1QuizExplanationRequirement['trigger']): string {
  return trigger === 'correct' ? 'Почему это работает' : 'Разберем спокойно';
}

function toneFor(trigger: GavanDay1QuizExplanationRequirement['trigger']): PlanExplanationTone {
  return trigger === 'correct' ? 'supportive' : 'correction';
}

function triggerFor(trigger: GavanDay1QuizExplanationRequirement['trigger']): PlanExplanationTrigger {
  return trigger;
}

function selectedChoicePrefix(selectedChoiceText: string): string {
  return `Выбрано: "${selectedChoiceText}". `;
}

export function renderPlanExplanationCard(
  input: PlanExplanationCardAdapterInput,
): PlanExplanationCardAdapterResult {
  const { requirement } = input;
  const selectedChoiceText = input.runtime?.selectedChoiceText?.trim();
  const rawNote = requirement.note.trim();

  if (!rawNote) {
    return blocked('empty_explanation', 'Explanation requirement note is empty.');
  }

  if (DEVELOPER_COPY_PATTERN.test(rawNote)) {
    return blocked(
      'robotic_or_developer_copy',
      'Explanation requirement contains developer or placeholder copy.',
    );
  }

  if (
    requirement.trigger === 'wrong'
    && !requirement.requiresSelectedAnswerKnown
    && SELECTED_ANSWER_CLAIM_PATTERN.test(rawNote)
  ) {
    return blocked(
      'hallucinated_selected_answer',
      'Wrong-answer explanation cannot claim a selected choice without runtime context.',
    );
  }

  if (requirement.requiresSelectedAnswerKnown && !selectedChoiceText) {
    return blocked(
      'selected_answer_required',
      'Selected-answer-aware explanation requires runtime selectedChoiceText.',
    );
  }

  const normalizedBody = normalizeBody(rawNote);
  if (!normalizedBody) {
    return blocked('empty_explanation', 'Explanation requirement note is empty after normalization.');
  }

  const body = requirement.requiresSelectedAnswerKnown && selectedChoiceText
    ? `${selectedChoicePrefix(selectedChoiceText)}${normalizedBody}`
    : normalizedBody;

  return {
    status: 'ready',
    card: {
      id: `plan-explanation:${input.source.id}:${requirement.id}`,
      contentUnitId: input.source.contentUnitId,
      trigger: triggerFor(requirement.trigger),
      tone: toneFor(requirement.trigger),
      title: titleFor(requirement.trigger),
      body,
      grammarTags: compactTags(input.source.grammarTags),
      vocabularyTags: compactTags(input.source.vocabularyTags),
      explainsSelectedAnswerOnlyWhenKnown: requirement.trigger === 'wrong',
    },
  };
}

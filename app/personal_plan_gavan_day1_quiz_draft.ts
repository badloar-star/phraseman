import { GAVAN_WEEK1_BLUEPRINT_DRAFT } from './personal_plan_harbor_week1_blueprint_draft';
import type { PersonalPlanPhraseDraft } from './personal_plan_content_quality_contract';
import type { GavanDay1ContentCandidate } from './personal_plan_gavan_day1_content_candidate';

export type GavanDay1QuizSkill =
  | 'meaning'
  | 'natural_choice'
  | 'missing_word'
  | 'micro_context';

export type GavanDay1QuizExplanationRequirement = {
  id: string;
  trigger: 'correct' | 'wrong';
  target: string;
  requiresSelectedAnswerKnown: boolean;
  note: string;
};

export type GavanDay1QuizChoiceDraft = {
  id: string;
  text: string;
  isCorrect: boolean;
  explanationRequirement?: GavanDay1QuizExplanationRequirement;
};

export type GavanDay1QuizItemDraft = {
  id: string;
  sourcePhraseId: string;
  skill: GavanDay1QuizSkill;
  prompt: string;
  choices: GavanDay1QuizChoiceDraft[];
};

export type GavanDay1QuizDraft = {
  id: 'gavan-week1-day1-quiz-draft';
  planId: 'gavan';
  dayId: 'gavan-week1-day1';
  status: 'draft';
  items: GavanDay1QuizItemDraft[];
};

export type GavanDay1QuizDraftIssueCode =
  | 'wrong_item_count'
  | 'duplicate_item_id'
  | 'unknown_source_phrase_id'
  | 'missing_prompt'
  | 'invalid_choice_count'
  | 'duplicate_choice_id'
  | 'missing_correct_choice'
  | 'multiple_correct_choices'
  | 'missing_choice_explanation_requirement'
  | 'choice_explanation_trigger_mismatch'
  | 'hallucinated_wrong_option_feedback'
  | 'candidate_quiz_developer_copy'
  | 'candidate_quiz_corrupted_copy'
  | 'candidate_quiz_authoring_instruction'
  | 'candidate_quiz_ungrounded_explanation_target'
  | 'candidate_quiz_prompt_too_short';

export type GavanDay1QuizDraftIssue = {
  code: GavanDay1QuizDraftIssueCode;
  itemId?: string;
  choiceId?: string;
  sourcePhraseId?: string;
  detail: string;
};

export type GavanDay1QuizDraftValidationResult = {
  valid: boolean;
  issues: GavanDay1QuizDraftIssue[];
  summary: {
    items: number;
    choices: number;
    explanationRequirements: number;
  };
};

export type GavanDay1QuizDraftOptions = {
  contentCandidate?: GavanDay1ContentCandidate;
};

export type GavanDay1QuizDraftValidationOptions = {
  contentCandidate?: GavanDay1ContentCandidate;
  contentPhrases?: PersonalPlanPhraseDraft[];
  candidateCopyGate?: boolean;
};

const DAY_ID = 'gavan-week1-day1';
const QUIZ_ID = 'gavan-week1-day1-quiz-draft';
const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/;
const DEVELOPER_COPY_RE = /\b(?:dev|debug|draft|placeholder|todo|sourcePhraseId|contentUnit|renderer)\b/i;
const AUTHORING_INSTRUCTION_RE = /(?:Explain that|selected option|selected answer|write a|TODO|fix later)/i;
const SELECTED_ANSWER_GUESS_RE = /(?:you chose|selected option|selected answer|вы выбрали|выбранный вариант|этот вариант)/i;

function clonePhrase(phrase: PersonalPlanPhraseDraft): PersonalPlanPhraseDraft {
  return {
    ...phrase,
    visibleOptions: [...(phrase.visibleOptions ?? [])],
    explanations: (phrase.explanations ?? []).map((explanation) => ({
      ...explanation,
      covers: [...(explanation.covers ?? [])],
      mentionedOptions: explanation.mentionedOptions
        ? [...explanation.mentionedOptions]
        : undefined,
    })),
    newWords: [...(phrase.newWords ?? [])],
    firstSeenConstructions: [...(phrase.firstSeenConstructions ?? [])],
  };
}

function day1BlueprintPhrases(): PersonalPlanPhraseDraft[] {
  const day = GAVAN_WEEK1_BLUEPRINT_DRAFT.days.find((candidate) =>
    candidate.dayId === DAY_ID,
  );
  return (day?.phrases ?? []).map(clonePhrase);
}

function day1PhraseIds(options: GavanDay1QuizDraftValidationOptions = {}): Set<string> {
  if (options.contentCandidate) {
    return new Set(options.contentCandidate.phrases.map((phrase) => phrase.id));
  }

  if (options.contentPhrases) {
    return new Set(options.contentPhrases.map((phrase) => phrase.id));
  }

  return new Set(day1BlueprintPhrases().map((phrase) => phrase.id));
}

function candidatePhrases(
  options: GavanDay1QuizDraftValidationOptions,
): PersonalPlanPhraseDraft[] {
  return options.contentCandidate?.phrases ?? options.contentPhrases ?? [];
}

function candidateCopyGateEnabled(options: GavanDay1QuizDraftValidationOptions): boolean {
  return Boolean(options.contentCandidate || options.candidateCopyGate);
}

function candidateAllowedTargets(options: GavanDay1QuizDraftValidationOptions): Set<string> {
  return new Set(candidatePhrases(options).flatMap((phrase) => [
    phrase.english,
    'meaning',
    'natural_phrase',
    'context',
    ...(phrase.newWords ?? []),
    ...(phrase.firstSeenConstructions ?? []),
  ]));
}

function explanation(
  choiceId: string,
  trigger: 'correct' | 'wrong',
  target: string,
  note: string,
  requiresSelectedAnswerKnown = false,
): GavanDay1QuizExplanationRequirement {
  return {
    id: `${choiceId}:explanation`,
    trigger,
    target,
    requiresSelectedAnswerKnown,
    note,
  };
}

function choice(
  itemId: string,
  index: number,
  text: string,
  isCorrect: boolean,
  target: string,
  note: string,
): GavanDay1QuizChoiceDraft {
  const id = `${itemId}:choice-${index}`;
  return {
    id,
    text,
    isCorrect,
    explanationRequirement: explanation(
      id,
      isCorrect ? 'correct' : 'wrong',
      target,
      note,
    ),
  };
}

function item(
  index: number,
  sourcePhraseId: string,
  skill: GavanDay1QuizSkill,
  prompt: string,
  choices: Array<{
    text: string;
    correct?: true;
    target: string;
    note: string;
  }>,
): GavanDay1QuizItemDraft {
  const id = `gavan-week1-day1-quiz:item-${index}`;
  return {
    id,
    sourcePhraseId,
    skill,
    prompt,
    choices: choices.map((candidate, choiceIndex) =>
      choice(
        id,
        choiceIndex + 1,
        candidate.text,
        candidate.correct === true,
        candidate.target,
        candidate.note,
      ),
    ),
  };
}

function buildQuizFromPhrases(phrases: PersonalPlanPhraseDraft[]): GavanDay1QuizDraft {
  const [here, minute, repeat, understand, help] = phrases;

  return {
    id: QUIZ_ID,
    planId: 'gavan',
    dayId: DAY_ID,
    status: 'draft',
    items: [
      item(1, here.id, 'natural_choice', 'Как коротко сказать: «Я здесь»?', [
        { text: "I'm here.", correct: true, target: here.english, note: "I'm here спокойно сообщает, что вы уже на месте или подключились к разговору." },
        { text: 'I here.', target: "I'm", note: "После I нужна форма am. В живой речи она часто звучит коротко: I'm." },
        { text: 'My here.', target: 'here', note: 'Here говорит про место. My значит мой или моя и не заменяет слово я.' },
      ]),
      item(2, here.id, 'meaning', 'Что значит “I’m here”?', [
        { text: 'Человек уже здесь.', correct: true, target: 'meaning', note: 'Фраза подтверждает присутствие или прибытие без лишних деталей.' },
        { text: 'Человеку нужна пауза.', target: 'meaning', note: 'Пауза выражается другой фразой: I need a minute.' },
        { text: 'Человек просит помощи.', target: 'meaning', note: 'Просьба о помощи звучит прямо: Can you help me?' },
      ]),
      item(3, minute.id, 'natural_choice', 'Как попросить немного времени?', [
        { text: 'I need a minute.', correct: true, target: minute.english, note: 'I need a minute звучит как нормальная короткая просьба о паузе.' },
        { text: 'I am a minute.', target: 'I need', note: 'Minute - это время, а need показывает, что вы просите паузу.' },
        { text: 'I need minute.', target: 'minute', note: 'В этой устойчивой фразе перед minute нужен маленький артикль a.' },
      ]),
      item(4, minute.id, 'missing_word', 'Заполни пропуск: I ___ a minute.', [
        { text: 'need', correct: true, target: 'need', note: 'Need несет смысл просьбы: мне нужно, поэтому фраза просит небольшую паузу.' },
        { text: 'here', target: 'here', note: 'Here отвечает на вопрос где. Здесь нужна просьба о времени.' },
        { text: 'repeat', target: 'minute', note: 'Repeat нужен, когда просим повторить. Тут просим минуту.' },
      ]),
      item(5, repeat.id, 'natural_choice', 'Как вежливо попросить повторить?', [
        { text: 'Could you repeat that?', correct: true, target: repeat.english, note: 'Could you делает просьбу мягкой, а repeat that значит повторить сказанное.' },
        { text: 'Can you minute that?', target: 'repeat', note: 'Для повторить нужен repeat. Minute говорит о времени.' },
        { text: 'I repeat that?', target: 'Could you', note: 'Когда просим другого человека, удобнее начать с Could you или Can you.' },
      ]),
      item(6, repeat.id, 'missing_word', 'Заполни пропуск: Could you ___ that?', [
        { text: 'repeat', correct: true, target: 'repeat', note: 'Repeat значит повторить, поэтому фраза звучит естественно.' },
        { text: 'need', target: 'that', note: 'Need значит нужно и не передает просьбу повторить сказанное.' },
        { text: 'help', target: 'repeat', note: 'Help просит помощь, а здесь нужна именно просьба повторить.' },
      ]),
      item(7, understand.id, 'natural_choice', 'Как сказать, что вы пока не поняли?', [
        { text: "I don't understand yet.", correct: true, target: understand.english, note: 'Yet добавляет смысл пока, поэтому фраза звучит спокойнее и мягче.' },
        { text: "I don't repeat yet.", target: 'understand', note: 'Understand отвечает за смысл понимаю. Repeat значит повторять.' },
        { text: 'I need understand.', target: "I don't", note: "Для я не понимаю нужна связка I don't understand." },
      ]),
      item(8, understand.id, 'missing_word', "Заполни пропуск: I don't understand ___.", [
        { text: 'yet', correct: true, target: 'yet', note: 'Yet добавляет важное пока: сейчас не понял, но можно разобраться.' },
        { text: 'here', target: 'yet', note: 'Here говорит про место. В этой фразе нужен смысл пока.' },
        { text: 'minute', target: 'understand', note: 'Minute говорит о паузе во времени, а не о понимании.' },
      ]),
      item(9, help.id, 'natural_choice', 'Как коротко попросить помощи?', [
        { text: 'Can you help me?', correct: true, target: help.english, note: 'Can you help me? коротко просит поддержку без длинных объяснений.' },
        { text: 'Can you here me?', target: 'help', note: 'Help значит помочь. Here значит здесь и сюда не подходит.' },
        { text: 'I help you me?', target: 'Can you', note: 'Когда просим другого человека, удобнее начать с Can you.' },
      ]),
      item(10, help.id, 'micro_context', 'Вы не уверены, что делать дальше. Что сказать?', [
        { text: 'Can you help me?', correct: true, target: 'context', note: 'Это прямой и нормальный способ попросить поддержку.' },
        { text: "I'm here.", target: 'context', note: 'Эта фраза сообщает, что вы на месте, но не просит помощь.' },
        { text: 'Could you repeat that?', target: 'context', note: 'Это подходит, если нужно услышать фразу еще раз, а не попросить помощь.' },
      ]),
    ],
  };
}

function buildBlueprintQuizDraft(): GavanDay1QuizDraft {
  const blueprintPhrases = day1BlueprintPhrases();
  const [first, second] = blueprintPhrases;
  const fallback: PersonalPlanPhraseDraft = {
    id: 'gavan-w1-d1-p1',
    english: "I'm here.",
    russian: 'Я здесь.',
  };
  const secondFallback: PersonalPlanPhraseDraft = {
    id: 'gavan-w1-d1-p2',
    english: 'I need a minute.',
    russian: 'Мне нужна минута.',
  };

  return buildQuizFromPhrases([
    first ?? fallback,
    second ?? secondFallback,
    first ?? fallback,
    second ?? secondFallback,
    first ?? fallback,
  ]);
}

export function buildGavanDay1QuizDraft(
  options: GavanDay1QuizDraftOptions = {},
): GavanDay1QuizDraft {
  if (options.contentCandidate) {
    return buildQuizFromPhrases(options.contentCandidate.phrases);
  }

  return buildBlueprintQuizDraft();
}

function pushIssue(
  issues: GavanDay1QuizDraftIssue[],
  code: GavanDay1QuizDraftIssueCode,
  detail: string,
  itemId?: string,
  choiceId?: string,
  sourcePhraseId?: string,
) {
  issues.push({
    code,
    detail,
    itemId,
    choiceId,
    sourcePhraseId,
  });
}

function validateCopy(
  issues: GavanDay1QuizDraftIssue[],
  text: string,
  itemId: string,
  choiceId?: string,
) {
  if (MOJIBAKE_RE.test(text)) {
    pushIssue(issues, 'candidate_quiz_corrupted_copy', 'Quiz copy contains mojibake.', itemId, choiceId);
  }

  if (DEVELOPER_COPY_RE.test(text)) {
    pushIssue(issues, 'candidate_quiz_developer_copy', 'Quiz copy contains developer wording.', itemId, choiceId);
  }

  if (AUTHORING_INSTRUCTION_RE.test(text)) {
    pushIssue(issues, 'candidate_quiz_authoring_instruction', 'Quiz copy contains authoring instructions.', itemId, choiceId);
  }
}

export function validateGavanDay1QuizDraft(
  draft: GavanDay1QuizDraft,
  options: GavanDay1QuizDraftValidationOptions = {},
): GavanDay1QuizDraftValidationResult {
  const issues: GavanDay1QuizDraftIssue[] = [];
  const expectedPhraseIds = day1PhraseIds(options);
  const seenItemIds = new Set<string>();
  const allowedTargets = candidateAllowedTargets(options);
  const shouldCheckCandidateCopy = candidateCopyGateEnabled(options);

  if (draft.items.length !== 10) {
    pushIssue(issues, 'wrong_item_count', 'Gavan day 1 quiz draft must contain exactly 10 items.');
  }

  for (const itemDraft of draft.items) {
    if (seenItemIds.has(itemDraft.id)) {
      pushIssue(issues, 'duplicate_item_id', 'Quiz item ids must be unique.', itemDraft.id);
    }
    seenItemIds.add(itemDraft.id);

    if (!expectedPhraseIds.has(itemDraft.sourcePhraseId)) {
      pushIssue(
        issues,
        'unknown_source_phrase_id',
        'Quiz item points outside Gavan day 1 phrases.',
        itemDraft.id,
        undefined,
        itemDraft.sourcePhraseId,
      );
    }

    if (itemDraft.prompt.trim().length === 0) {
      pushIssue(issues, 'missing_prompt', 'Quiz item prompt must be visible.', itemDraft.id);
    }

    if (shouldCheckCandidateCopy && itemDraft.prompt.trim().length < 12) {
      pushIssue(issues, 'candidate_quiz_prompt_too_short', 'Candidate quiz prompt is too short.', itemDraft.id);
    }

    if (shouldCheckCandidateCopy) {
      validateCopy(issues, itemDraft.prompt, itemDraft.id);
    }

    if (itemDraft.choices.length !== 3) {
      pushIssue(issues, 'invalid_choice_count', 'Each Gavan day 1 quiz item must have exactly 3 choices.', itemDraft.id);
    }

    const seenChoiceIds = new Set<string>();
    const correctChoices = itemDraft.choices.filter((choiceDraft) => choiceDraft.isCorrect);
    if (correctChoices.length === 0) {
      pushIssue(issues, 'missing_correct_choice', 'Each quiz item needs one correct choice.', itemDraft.id);
    }
    if (correctChoices.length > 1) {
      pushIssue(issues, 'multiple_correct_choices', 'Each quiz item can have only one correct choice.', itemDraft.id);
    }

    for (const choiceDraft of itemDraft.choices) {
      if (seenChoiceIds.has(choiceDraft.id)) {
        pushIssue(issues, 'duplicate_choice_id', 'Choice ids must be unique inside an item.', itemDraft.id, choiceDraft.id);
      }
      seenChoiceIds.add(choiceDraft.id);

      if (shouldCheckCandidateCopy) {
        validateCopy(issues, choiceDraft.text, itemDraft.id, choiceDraft.id);
      }

      const requirement = choiceDraft.explanationRequirement;
      if (!requirement) {
        pushIssue(
          issues,
          'missing_choice_explanation_requirement',
          'Every choice needs an explanation requirement.',
          itemDraft.id,
          choiceDraft.id,
        );
        continue;
      }

      if (requirement.trigger !== (choiceDraft.isCorrect ? 'correct' : 'wrong')) {
        pushIssue(
          issues,
          'choice_explanation_trigger_mismatch',
          'Explanation trigger must match choice correctness.',
          itemDraft.id,
          choiceDraft.id,
        );
      }

      if (!requirement.requiresSelectedAnswerKnown && SELECTED_ANSWER_GUESS_RE.test(requirement.note)) {
        pushIssue(
          issues,
          'hallucinated_wrong_option_feedback',
          'Static feedback must not pretend to know the selected answer.',
          itemDraft.id,
          choiceDraft.id,
        );
      }

      if (shouldCheckCandidateCopy) {
        validateCopy(issues, requirement.note, itemDraft.id, choiceDraft.id);
        if (!allowedTargets.has(requirement.target)) {
          pushIssue(
            issues,
            'candidate_quiz_ungrounded_explanation_target',
            'Explanation target must come from phrase meaning, new words, or first-seen constructions.',
            itemDraft.id,
            choiceDraft.id,
          );
        }
      }
    }
  }

  const choices = draft.items.reduce((sum, itemDraft) => sum + itemDraft.choices.length, 0);
  const explanationRequirements = draft.items.reduce(
    (sum, itemDraft) =>
      sum + itemDraft.choices.filter((choiceDraft) => choiceDraft.explanationRequirement).length,
    0,
  );

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      items: draft.items.length,
      choices,
      explanationRequirements,
    },
  };
}

export const GAVAN_DAY1_QUIZ_DRAFT = buildGavanDay1QuizDraft();

import {
  validatePersonalPlanContentQuality,
  type PersonalPlanContentQualityIssue,
  type PersonalPlanContentQualityScope,
  type PersonalPlanPhraseDraft,
} from './personal_plan_content_quality_contract';

export type GavanDay1ContentCandidate = {
  dayId: 'gavan-week1-day1';
  status: 'candidate';
  scope: PersonalPlanContentQualityScope;
  focusTags: string[];
  exerciseGoals: string[];
  phrases: PersonalPlanPhraseDraft[];
  summary: {
    phrases: number;
    newWords: number;
    firstSeenConstructions: number;
    explanationCards: number;
  };
};

export type GavanDay1ContentCandidateValidationResult = {
  valid: boolean;
  issues: PersonalPlanContentQualityIssue[];
};

const GAVAN_DAY1_SCOPE: PersonalPlanContentQualityScope = {
  planId: 'gavan',
  weekIndex: 1,
  dayIndex: 1,
  mode: 'universal_start',
};

function phrase(
  id: string,
  english: string,
  russian: string,
  explanationBody: string,
  newWords: string[],
  firstSeenConstructions: string[] = [],
): PersonalPlanPhraseDraft {
  return {
    id,
    english,
    russian,
    visibleOptions: [english],
    explanations: [
      {
        title: english,
        body: explanationBody,
        covers: [...newWords, ...firstSeenConstructions],
      },
    ],
    newWords,
    firstSeenConstructions,
  };
}

const GAVAN_DAY1_PHRASES: PersonalPlanPhraseDraft[] = [
  phrase(
    'gavan-day1-final-p1',
    "I'm here.",
    'Я здесь.',
    "I'm - короткая форма I am. Here значит здесь: спокойно подтверждаем, что вы уже на месте или в разговоре.",
    ['here'],
    ["I'm"],
  ),
  phrase(
    'gavan-day1-final-p2',
    'I need a minute.',
    'Мне нужна минута.',
    'Need значит нужно, minute значит минута. I need a minute помогает спокойно взять паузу, когда ответ пока не собрался.',
    ['need', 'minute'],
    ['I need'],
  ),
  phrase(
    'gavan-day1-final-p3',
    'Could you repeat that?',
    'Можете повторить?',
    'Could you делает просьбу мягкой. Repeat значит повторить, а that указывает на сказанное только что.',
    ['repeat', 'that'],
    ['Could you'],
  ),
  phrase(
    'gavan-day1-final-p4',
    "I don't understand yet.",
    'Я пока не понимаю.',
    "Don't understand значит не понимаю. Yet добавляет важное пока: вы не спорите, а просите чуть больше ясности.",
    ['understand', 'yet'],
    ["I don't"],
  ),
  phrase(
    'gavan-day1-final-p5',
    'Can you help me?',
    'Можете помочь?',
    'Can you - простая просьба без лишней официальности. Help значит помочь, me значит мне. Keep it short and friendly when asking for help.',
    ['help', 'me'],
    ['Can you'],
  ),
];

function candidateSummary(phrases: PersonalPlanPhraseDraft[]): GavanDay1ContentCandidate['summary'] {
  return {
    phrases: phrases.length,
    newWords: phrases.reduce((sum, item) => sum + (item.newWords?.length ?? 0), 0),
    firstSeenConstructions: phrases.reduce(
      (sum, item) => sum + (item.firstSeenConstructions?.length ?? 0),
      0,
    ),
    explanationCards: phrases.reduce((sum, item) => sum + (item.explanations?.length ?? 0), 0),
  };
}

export function buildGavanDay1ContentCandidate(): GavanDay1ContentCandidate {
  const phrases = GAVAN_DAY1_PHRASES.map((item) => ({
    ...item,
    visibleOptions: [...(item.visibleOptions ?? [])],
    explanations: (item.explanations ?? []).map((explanation) => ({
      ...explanation,
      covers: [...(explanation.covers ?? [])],
      mentionedOptions: explanation.mentionedOptions
        ? [...explanation.mentionedOptions]
        : undefined,
    })),
    newWords: [...(item.newWords ?? [])],
    firstSeenConstructions: [...(item.firstSeenConstructions ?? [])],
  }));

  return {
    dayId: 'gavan-week1-day1',
    status: 'candidate',
    scope: { ...GAVAN_DAY1_SCOPE },
    focusTags: ['arrival', 'pause', 'repeat_request', 'understanding', 'basic_help'],
    exerciseGoals: [
      'phrase_build',
      'missing_word',
      'choose_natural_phrase',
      'meaning_check',
      'phrase_recall',
    ],
    phrases,
    summary: candidateSummary(phrases),
  };
}

export function validateGavanDay1ContentCandidate(
  candidate: GavanDay1ContentCandidate,
): GavanDay1ContentCandidateValidationResult {
  const issues = candidate.phrases.flatMap((item) =>
    validatePersonalPlanContentQuality(item, candidate.scope).issues,
  );

  return {
    valid: issues.length === 0,
    issues,
  };
}

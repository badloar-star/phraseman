import {
  planRecoveryCandidatesForAttempt,
  type PlanAttemptEvent,
  type PlanExerciseBlock,
  type PlanExerciseType,
  type PlanRecoveryCandidate,
} from './personal_plan_engine_contracts';
import { buildPlanPhraseAttemptEvent } from './personal_plan_attempt_event_adapter';
import type { PersonalPlanPhraseDraft } from './personal_plan_content_quality_contract';

export type PlanRuntimeExerciseType =
  | 'plan_choose_natural_phrase'
  | 'plan_phrase_build'
  | 'plan_missing_word'
  | 'plan_phrase_recall';

export type PlanRuntimeChoice = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type PlanRuntimeItem = {
  id: string;
  exerciseType: PlanRuntimeExerciseType;
  phraseId: string;
  promptRu: string;
  promptEs: string;
  targetRu: string;
  targetEs: string;
  displayEnglish: string;
  correctAnswer: string;
  choices: PlanRuntimeChoice[];
  wordTiles?: string[];
  distractorTiles?: string[];
  targetTokenCount?: number;
  hintsEnabled: false;
  correctWordHighlighting: false;
  errorsReturnLater: true;
  grammarTags: string[];
  vocabularyTags: string[];
};

export type PlanRuntimeItemInput = {
  block: PlanExerciseBlock;
  phrase: PersonalPlanPhraseDraft;
  exerciseType: PlanRuntimeExerciseType;
  missingWord?: string;
  distractors?: string[];
  lang?: string;
};

export type PlanRuntimeSubmissionInput = {
  block: PlanExerciseBlock;
  item: PlanRuntimeItem;
  selectedAnswer?: string | null;
  planInstanceId: string;
  occurredAt?: string;
};

export type PlanRuntimeIssueCode =
  | 'unsupported_exercise_type'
  | 'block_type_mismatch'
  | 'content_unit_mismatch'
  | 'invalid_runtime_item'
  | 'missing_selected_answer';

export type PlanRuntimeIssue = {
  code: PlanRuntimeIssueCode;
  detail: string;
};

export type PlanRuntimeSubmissionResult =
  | {
    status: 'ready';
    isCorrect: boolean;
    event: PlanAttemptEvent;
    recoveryCandidates: PlanRecoveryCandidate[];
  }
  | {
    status: 'blocked';
    issue: PlanRuntimeIssue;
  };

export type PlanRuntimeItemIssue =
  | 'unsupported_exercise_type'
  | 'block_type_mismatch'
  | 'content_unit_mismatch'
  | 'missing_prompt'
  | 'missing_correct_answer'
  | 'missing_choice'
  | 'missing_correct_choice'
  | 'duplicate_choice_text'
  | 'phrase_build_has_choices'
  | 'phrase_build_missing_tiles'
  | 'phrase_build_tile_count_mismatch'
  | 'phrase_build_duplicate_tile'
  | 'phrase_build_unsafe_distractor_tile'
  | 'recall_has_choices'
  | 'recall_uses_hints'
  | 'technical_copy'
  | 'corrupted_copy';

const RUNTIME_TYPES: PlanRuntimeExerciseType[] = [
  'plan_choose_natural_phrase',
  'plan_phrase_build',
  'plan_missing_word',
  'plan_phrase_recall',
];

const TECHNICAL_COPY_RE = /\b(?:dev|debug|draft|placeholder|renderer|route|sourcePhraseId|contentUnit)\b/i;
const CORRUPTED_COPY_RE = /[ÐÑÃÂâ]/;

function isRuntimeExerciseType(value: PlanExerciseType): value is PlanRuntimeExerciseType {
  return RUNTIME_TYPES.includes(value as PlanRuntimeExerciseType);
}

function compact(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function normalizeAnswer(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeTargetForTiles(value: string): string {
  return value
    .trim()
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ');
}

function wordTilesFor(value: string): string[] {
  return normalizeTargetForTiles(value).split(/\s+/).filter(Boolean);
}

function choice(id: string, text: string, isCorrect: boolean): PlanRuntimeChoice {
  return { id, text, isCorrect };
}

type PlanRuntimePromptLocale = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type PlanRuntimePromptCopy = Record<PlanRuntimePromptLocale, string>;

const PROMPT_FOR_COPY: Record<PlanRuntimeExerciseType, PlanRuntimePromptCopy> = {
  plan_phrase_build: {
    ru: 'Соберите фразу из слов.',
    uk: 'Зберіть фразу зі слів.',
    es: 'Construye la frase con las palabras.',
    'pt-BR': 'Monte a frase com as palavras.',
    vi: 'Sắp xếp câu từ các từ.',
    id: 'Susun frasa dari kata-kata.',
    tr: 'Kelimelerden ifadeyi kur.',
    pl: 'Ułóż frazę ze słów.',
  },
  plan_choose_natural_phrase: {
    ru: 'Выбери естественную фразу.',
    uk: 'Обери природну фразу.',
    es: 'Elige la frase más natural.',
    'pt-BR': 'Escolha a frase natural.',
    vi: 'Chọn câu tự nhiên.',
    id: 'Pilih frasa yang alami.',
    tr: 'Doğal ifadeyi seç.',
    pl: 'Wybierz naturalną frazę.',
  },
  plan_missing_word: {
    ru: 'Вставьте пропущенное слово.',
    uk: 'Вставте пропущене слово.',
    es: 'Inserta la palabra que falta.',
    'pt-BR': 'Insira a palavra que falta.',
    vi: 'Điền từ còn thiếu.',
    id: 'Masukkan kata yang hilang.',
    tr: 'Eksik kelimeyi ekle.',
    pl: 'Wstaw brakujące słowo.',
  },
  plan_phrase_recall: {
    ru: 'Вспомните фразу без подсказок.',
    uk: 'Пригадайте фразу без підказок.',
    es: 'Recuerda la frase sin pistas.',
    'pt-BR': 'Lembre a frase sem pistas.',
    vi: 'Nhớ lại câu không cần gợi ý.',
    id: 'Ingat frasa tanpa petunjuk.',
    tr: 'İpucu olmadan ifadeyi hatırla.',
    pl: 'Przypomnij sobie frazę bez podpowiedzi.',
  },
};

function promptFor(exerciseType: PlanRuntimeExerciseType, lang: string): string {
  const copy = PROMPT_FOR_COPY[exerciseType];
  if (!copy) return 'Вспомните фразу без подсказок.';
  if (lang in copy) return copy[lang as PlanRuntimePromptLocale];
  return copy.ru;
}

function displayEnglishFor(
  phrase: PersonalPlanPhraseDraft,
  exerciseType: PlanRuntimeExerciseType,
  missingWord?: string,
): string {
  if (exerciseType === 'plan_phrase_build') {
    return wordTilesFor(phrase.english).map(() => '___').join(' ');
  }
  if (exerciseType !== 'plan_missing_word') return phrase.english;
  const word = missingWord?.trim();
  if (!word) return phrase.english;

  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return phrase.english.replace(new RegExp(`\\b${escaped}\\b`, 'i'), '___');
}

function correctAnswerFor(
  phrase: PersonalPlanPhraseDraft,
  exerciseType: PlanRuntimeExerciseType,
  missingWord?: string,
): string {
  if (exerciseType === 'plan_missing_word' && missingWord?.trim()) {
    return missingWord.trim();
  }
  return phrase.english;
}

function choicesFor(
  correctAnswer: string,
  exerciseType: PlanRuntimeExerciseType,
  distractors: string[] | undefined,
): PlanRuntimeChoice[] {
  if (exerciseType === 'plan_phrase_recall' || exerciseType === 'plan_phrase_build') return [];

  return [
    choice('choice-correct', correctAnswer, true),
    ...(distractors ?? []).map((distractor, index) =>
      choice(`choice-distractor-${index + 1}`, distractor, false),
    ),
  ];
}

function itemCopy(item: PlanRuntimeItem): string {
  return [
    item.promptRu,
    item.promptEs,
    item.targetRu,
    item.targetEs,
    item.displayEnglish,
    item.correctAnswer,
    ...item.choices.map((itemChoice) => itemChoice.text),
    ...(item.wordTiles ?? []),
    ...(item.distractorTiles ?? []),
  ].join(' ');
}

function blocked(code: PlanRuntimeIssueCode, detail: string): PlanRuntimeSubmissionResult {
  return {
    status: 'blocked',
    issue: { code, detail },
  };
}

export function buildPlanRuntimeItem(input: PlanRuntimeItemInput): PlanRuntimeItem {
  const { block, phrase, exerciseType } = input;
  const lang = input.lang ?? 'ru';
  const correctAnswer = correctAnswerFor(phrase, exerciseType, input.missingWord);
  const wordTiles = exerciseType === 'plan_phrase_build'
    ? wordTilesFor(phrase.english)
    : undefined;
  const targetTileTexts = new Set((wordTiles ?? []).map((tile) => normalizeAnswer(tile)));
  const distractorTiles = exerciseType === 'plan_phrase_build'
    ? compact(input.distractors ?? []).filter((tile) => !targetTileTexts.has(normalizeAnswer(tile)))
    : undefined;

  return {
    id: `${block.id}:${exerciseType}:${phrase.id}`,
    exerciseType,
    phraseId: phrase.id,
    promptRu: promptFor(exerciseType, lang),
    promptEs: promptFor(exerciseType, 'es'),
    targetRu: phrase.russian,
    targetEs: phrase.spanish ?? phrase.russian,
    displayEnglish: displayEnglishFor(phrase, exerciseType, input.missingWord),
    correctAnswer,
    choices: choicesFor(correctAnswer, exerciseType, input.distractors),
    wordTiles,
    distractorTiles,
    targetTokenCount: wordTiles?.length,
    hintsEnabled: false,
    correctWordHighlighting: false,
    errorsReturnLater: true,
    grammarTags: compact(phrase.firstSeenConstructions ?? []),
    vocabularyTags: compact(phrase.newWords ?? []),
  };
}

export function validatePlanRuntimeItem(
  item: PlanRuntimeItem,
  block: PlanExerciseBlock,
): PlanRuntimeItemIssue[] {
  const issues: PlanRuntimeItemIssue[] = [];

  if (!isRuntimeExerciseType(item.exerciseType)) {
    issues.push('unsupported_exercise_type');
  }
  if (block.type !== item.exerciseType) {
    issues.push('block_type_mismatch');
  }
  if (!block.contentUnitIds.includes(item.phraseId)) {
    issues.push('content_unit_mismatch');
  }
  if (!item.promptRu.trim() || !item.targetRu.trim()) {
    issues.push('missing_prompt');
  }
  if (!item.correctAnswer.trim()) {
    issues.push('missing_correct_answer');
  }

  if (item.exerciseType === 'plan_phrase_build') {
    const wordTiles = item.wordTiles ?? [];
    const distractorTiles = item.distractorTiles ?? [];
    const targetTokenCount = item.targetTokenCount ?? 0;

    if (item.choices.length > 0) {
      issues.push('phrase_build_has_choices');
    }
    if (wordTiles.length === 0 || targetTokenCount <= 0) {
      issues.push('phrase_build_missing_tiles');
    }
    if (wordTiles.length !== targetTokenCount) {
      issues.push('phrase_build_tile_count_mismatch');
    }

    const normalizedWordTiles = wordTiles.map(normalizeAnswer);
    const normalizedDistractorTiles = distractorTiles.map(normalizeAnswer);
    if (new Set(normalizedWordTiles).size !== normalizedWordTiles.length) {
      issues.push('phrase_build_duplicate_tile');
    }
    if (new Set(normalizedDistractorTiles).size !== normalizedDistractorTiles.length) {
      issues.push('phrase_build_duplicate_tile');
    }
    if (normalizedDistractorTiles.some((tile) => normalizedWordTiles.includes(tile))) {
      issues.push('phrase_build_unsafe_distractor_tile');
    }
  } else if (item.exerciseType === 'plan_phrase_recall') {
    if (item.choices.length > 0) {
      issues.push('recall_has_choices');
    }
    if (item.hintsEnabled || item.correctWordHighlighting) {
      issues.push('recall_uses_hints');
    }
  } else {
    if (item.choices.length < 2) {
      issues.push('missing_choice');
    }
    if (item.choices.filter((itemChoice) => itemChoice.isCorrect).length !== 1) {
      issues.push('missing_correct_choice');
    }
  }

  const normalizedChoices = item.choices.map((itemChoice) => normalizeAnswer(itemChoice.text));
  if (new Set(normalizedChoices).size !== normalizedChoices.length) {
    issues.push('duplicate_choice_text');
  }

  const copy = itemCopy(item);
  if (TECHNICAL_COPY_RE.test(copy)) {
    issues.push('technical_copy');
  }
  if (CORRUPTED_COPY_RE.test(copy)) {
    issues.push('corrupted_copy');
  }

  return [...new Set(issues)];
}

export function submitPlanRuntimeAnswer(
  input: PlanRuntimeSubmissionInput,
): PlanRuntimeSubmissionResult {
  const { block, item } = input;

  if (block.type !== item.exerciseType) {
    return blocked('block_type_mismatch', 'Runtime item exercise type must match the exercise block type.');
  }
  if (!block.contentUnitIds.includes(item.phraseId)) {
    return blocked('content_unit_mismatch', 'Runtime item phrase is not part of the exercise block.');
  }
  if (validatePlanRuntimeItem(item, block).length > 0) {
    return blocked('invalid_runtime_item', 'Runtime item failed validation before answer submission.');
  }
  if (!input.selectedAnswer?.trim()) {
    return blocked('missing_selected_answer', 'Selected answer is required for runtime submission.');
  }

  const isCorrect = normalizeAnswer(input.selectedAnswer) === normalizeAnswer(item.correctAnswer);
  const attempt = buildPlanPhraseAttemptEvent({
    block,
    planInstanceId: input.planInstanceId,
    contentUnitId: item.phraseId,
    expectedAnswer: item.correctAnswer,
    selectedAnswer: input.selectedAnswer,
    isCorrect,
    grammarTags: item.grammarTags,
    vocabularyTags: item.vocabularyTags,
    mistakeTags: isCorrect
      ? []
      : [
        'plan_exercise_wrong_answer',
        `exercise:${item.exerciseType}`,
        ...item.grammarTags.map((tag) => `construction:${tag}`),
        ...item.vocabularyTags.map((tag) => `vocabulary:${tag}`),
      ],
    occurredAt: input.occurredAt,
    payload: {
      runtimeMode: item.exerciseType,
      prompt: item.promptRu,
    },
  });

  if (attempt.status !== 'ready') {
    return blocked('invalid_runtime_item', attempt.issue.detail);
  }

  return {
    status: 'ready',
    isCorrect,
    event: attempt.event,
    recoveryCandidates: planRecoveryCandidatesForAttempt(block, attempt.event),
  };
}

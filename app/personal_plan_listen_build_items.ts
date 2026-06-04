import type { LessonTeachingNote } from './lesson_data_types';
import {
  validatePlanAudioAsset,
  type PlanAudioAsset,
} from './personal_plan_audio_asset_readiness';
import { getPlanAudioAssetsForRuntime } from './personal_plan_audio_asset_registry';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';

export type PersonalPlanListenBuildBlockedReason =
  | 'missing_approved_audio'
  | 'missing_phrase';

export type PersonalPlanListenBuildItem = {
  id: string;
  promptRu: string;
  promptUk: string;
  correctAnswer: string;
  targetWords: string[];
  wordOptions: string[];
  options: string[];
  grammarTags: string[];
  vocabularyTags: string[];
  explanation: LessonTeachingNote;
  audioReady: boolean;
  audioAssetId?: string;
  audioUri?: string;
  blockedReason?: PersonalPlanListenBuildBlockedReason;
};

export type GetPersonalPlanListenBuildItemsInput = {
  lessonId: string;
  contentUnitIds: string[];
};

let testAudioAssets: PlanAudioAsset[] | null = null;

export function registerPlanListenBuildAudioAssetsForTest(assets: PlanAudioAsset[] | null): void {
  testAudioAssets = assets;
}

function targetWordsForAnswer(answer: string): string[] {
  return answer
    .replace(/[.!?]+$/g, '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function normalizeOption(value: string): string {
  return value.trim().toLowerCase().replace(/[.!?]+$/g, '');
}

function buildWordOptions(targetWords: string[], distractors: string[], maxOptions = 8): string[] {
  const options = targetWords.map((word) => word.trim()).filter(Boolean);
  const targetNorms = new Set(options.map(normalizeOption));
  const usedDistractors = new Set<string>();

  for (const raw of distractors) {
    const option = raw.trim();
    const normalized = normalizeOption(option);
    if (!option || !normalized) continue;
    if (targetNorms.has(normalized)) continue;
    if (usedDistractors.has(normalized)) continue;
    options.push(option);
    usedDistractors.add(normalized);
    if (options.length >= maxOptions) break;
  }

  return options;
}

export type PersonalPlanListenBuildQualityIssueCode =
  | 'missing_target_word'
  | 'empty_option'
  | 'distractor_duplicates_target'
  | 'not_enough_options';

export function validatePersonalPlanListenBuildItem(
  item: Pick<PersonalPlanListenBuildItem, 'targetWords' | 'wordOptions'>,
): PersonalPlanListenBuildQualityIssueCode[] {
  const issues: PersonalPlanListenBuildQualityIssueCode[] = [];
  const targetWords = item.targetWords.map((word) => word.trim()).filter(Boolean);
  const options = item.wordOptions.map((word) => word.trim()).filter(Boolean);
  const targetCounts = new Map<string, number>();
  const optionCounts = new Map<string, number>();

  for (const target of targetWords) {
    const normalized = normalizeOption(target);
    targetCounts.set(normalized, (targetCounts.get(normalized) ?? 0) + 1);
  }
  for (const option of options) {
    const normalized = normalizeOption(option);
    optionCounts.set(normalized, (optionCounts.get(normalized) ?? 0) + 1);
  }

  if (item.wordOptions.some((word) => !word.trim())) {
    issues.push('empty_option');
  }

  for (const [normalized, count] of targetCounts) {
    if ((optionCounts.get(normalized) ?? 0) < count) {
      issues.push('missing_target_word');
      break;
    }
  }

  for (const [normalized, count] of optionCounts) {
    const targetCount = targetCounts.get(normalized) ?? 0;
    if (targetCount > 0 && count > targetCount) {
      issues.push('distractor_duplicates_target');
      break;
    }
  }

  if (options.length < targetWords.length) {
    issues.push('not_enough_options');
  }

  return [...new Set(issues)];
}

function fallbackExplanation(correctAnswer: string): LessonTeachingNote {
  return {
    id: `listen_build_${correctAnswer.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    titleRu: 'Собираем то, что услышали',
    correctRu: `${correctAnswer} звучит коротко, поэтому слова должны лечь в том же порядке. Здесь тренируем не угадывание, а связь слуха и готовой фразы.`,
    wrongRu: 'Послушай ещё раз и собери фразу в том порядке, в котором она звучит. Не нужно вспоминать правило отдельно: сначала поймай общий звук, потом слова.',
  };
}

function explanationForPhrase(correctAnswer: string, note?: LessonTeachingNote): LessonTeachingNote {
  if (!note) return fallbackExplanation(correctAnswer);
  return {
    ...note,
    titleRu: 'Слух плюс сборка',
    wrongRu: 'Послушай ещё раз и собери фразу по порядку. Если одно слово знакомое, но вся фраза не складывается, лучше начать заново с общего звучания.',
  };
}

function approvedAudioForContentUnit(contentUnitId: string, assets: PlanAudioAsset[]): PlanAudioAsset | undefined {
  return assets.find((asset) => {
    const readiness = validatePlanAudioAsset(asset);
    return (
      readiness.productionReady
      && asset.contentUnitIds.includes(contentUnitId)
      && typeof asset.uri === 'string'
      && asset.uri.trim().length > 0
    );
  });
}

function getPlanListenBuildAudioAssets(): PlanAudioAsset[] {
  return testAudioAssets ?? getPlanAudioAssetsForRuntime();
}

export function getPersonalPlanListenBuildItems(
  input: GetPersonalPlanListenBuildItemsInput,
): PersonalPlanListenBuildItem[] {
  const lesson = getPersonalPlanPhraseLesson(input.lessonId);
  if (!lesson) return [];

  const requestedIds = new Set(input.contentUnitIds);
  const audioAssets = getPlanListenBuildAudioAssets();

  return lesson.phrases
    .filter((phrase) => requestedIds.has(String(phrase.id)))
    .map((phrase) => {
      const id = String(phrase.id);
      const audioAsset = approvedAudioForContentUnit(id, audioAssets);
      const targetWords = targetWordsForAnswer(phrase.english);
      const distractors = phrase.words.flatMap((word) => word.distractors ?? []);
      const meaningNote = [...phrase.words].reverse().find((word) => word.teachingNote)?.teachingNote;
      const wordOptions = buildWordOptions(targetWords, distractors);

      return {
        id,
        promptRu: phrase.russian,
        promptUk: phrase.ukrainian,
        correctAnswer: phrase.english,
        targetWords,
        wordOptions,
        options: wordOptions,
        grammarTags: phrase.words.map((word) => word.category).filter(Boolean) as string[],
        vocabularyTags: [],
        explanation: explanationForPhrase(phrase.english, meaningNote),
        audioReady: Boolean(audioAsset),
        audioAssetId: audioAsset?.assetId,
        audioUri: audioAsset?.uri,
        blockedReason: audioAsset ? undefined : 'missing_approved_audio',
      };
    });
}

import type { LessonTeachingNote } from './lesson_data_types';
import {
  validatePlanAudioAsset,
  type PlanAudioAsset,
} from './personal_plan_audio_asset_readiness';
import { getPlanAudioAssetsForRuntime } from './personal_plan_audio_asset_registry';
import { personalPlanAudioTargetMatches } from './personal_plan_audio_target_match';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';
import { stableShuffleAwayFromFirst } from './personal_plan_option_ordering';

export type PersonalPlanListenChooseBlockedReason =
  | 'missing_approved_audio'
  | 'missing_phrase';

export type PersonalPlanListenChooseItem = {
  id: string;
  promptRu: string;
  promptUk: string;
  promptEs?: string;
  correctAnswer: string;
  options: string[];
  grammarTags: string[];
  vocabularyTags: string[];
  explanation: LessonTeachingNote;
  audioReady: boolean;
  audioAssetId?: string;
  audioUri?: string;
  blockedReason?: PersonalPlanListenChooseBlockedReason;
};

export type GetPersonalPlanListenChooseItemsInput = {
  lessonId: string;
  contentUnitIds: string[];
};

let testAudioAssets: PlanAudioAsset[] | null = null;

export function registerPlanListenChooseAudioAssetsForTest(assets: PlanAudioAsset[] | null): void {
  testAudioAssets = assets;
}

function compactUnique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function fallbackExplanation(correctAnswer: string): LessonTeachingNote {
  return {
    id: `listen_choose_${correctAnswer.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    titleRu: 'Сначала звук, потом смысл',
    titleEs: 'Primero el sonido, luego el sentido',
    correctRu: `${correctAnswer} звучит коротко и цельно. В задании на слух важно узнать всю фразу, а не собирать её по отдельным словам.`,
    correctEs: `${correctAnswer} suena breve y completa. En una tarea de escucha importa reconocer toda la frase, no armarla palabra por palabra.`,
    wrongRu: 'Послушай ещё раз и поймай общий смысл фразы. Здесь не нужно угадывать по знакомому слову: выбирай вариант, который передаёт всю услышанную реплику.',
    wrongEs: 'Escucha otra vez y capta el sentido general de la frase. Aquí no hay que adivinar por una palabra conocida: elige la opción que transmite toda la frase escuchada.',
  };
}

function chooseExplanationForPhrase(correctAnswer: string, note?: LessonTeachingNote): LessonTeachingNote {
  if (!note) return fallbackExplanation(correctAnswer);
  return {
    ...note,
    titleRu: 'Слышим фразу целиком',
    titleEs: 'Escuchamos la frase completa',
    wrongRu: 'Послушай ещё раз и сравни смысл целиком. Ошибка здесь обычно не в одном слове: похожая фраза может звучать знакомо, но говорить другое.',
    wrongEs: 'Escucha otra vez y compara el sentido completo. Aquí el error normalmente no está en una sola palabra: una frase parecida puede sonar conocida, pero decir otra cosa.',
  };
}

function approvedAudioForContentUnit(
  contentUnitId: string,
  phraseTarget: string,
  assets: PlanAudioAsset[],
): PlanAudioAsset | undefined {
  return assets.find((asset) => {
    const readiness = validatePlanAudioAsset(asset);
    return (
      readiness.productionReady
      && asset.contentUnitIds.includes(contentUnitId)
      && personalPlanAudioTargetMatches(asset.targetText, phraseTarget)
      && typeof asset.uri === 'string'
      && asset.uri.trim().length > 0
    );
  });
}

function getPlanListenChooseAudioAssets(): PlanAudioAsset[] {
  return testAudioAssets ?? getPlanAudioAssetsForRuntime();
}

function optionDistractors(allAnswers: string[], correctAnswer: string): string[] {
  const distractors = compactUnique(allAnswers.filter((answer) => answer !== correctAnswer));
  if (distractors.length <= 7) return distractors;
  // Детерминированно отбираем 7 дистракторов равномерно по списку (без рандома).
  const last = distractors.length - 1;
  const picks = [0, 1, 2, 3, Math.floor(last / 2), last - 1, last];
  return compactUnique(picks.map((i) => distractors[i]));
}

export function getPersonalPlanListenChooseItems(
  input: GetPersonalPlanListenChooseItemsInput,
): PersonalPlanListenChooseItem[] {
  const lesson = getPersonalPlanPhraseLesson(input.lessonId);
  if (!lesson) return [];

  const requestedIds = new Set(input.contentUnitIds);
  const allAnswers = lesson.phrases.map((phrase) => phrase.english);
  const audioAssets = getPlanListenChooseAudioAssets();

  return lesson.phrases
    .filter((phrase) => requestedIds.has(String(phrase.id)))
    .map((phrase) => {
      const id = String(phrase.id);
      const audioAsset = approvedAudioForContentUnit(id, phrase.english, audioAssets);
      const meaningNote = [...phrase.words].reverse().find((word) => word.teachingNote)?.teachingNote;

      return {
        id,
        promptRu: phrase.russian,
        promptUk: phrase.ukrainian,
        ...(phrase.spanish ? { promptEs: phrase.spanish } : {}),
        correctAnswer: phrase.english,
        options: stableShuffleAwayFromFirst(
          compactUnique([phrase.english, ...optionDistractors(allAnswers, phrase.english)]).slice(0, 8),
          `${lesson.id}:${phrase.id}:listen-choose`,
          (option) => option === phrase.english,
        ),
        grammarTags: phrase.words.map((word) => word.category).filter(Boolean) as string[],
        vocabularyTags: [],
        explanation: chooseExplanationForPhrase(phrase.english, meaningNote),
        audioReady: Boolean(audioAsset),
        audioAssetId: audioAsset?.assetId,
        audioUri: audioAsset?.uri,
        blockedReason: audioAsset ? undefined : 'missing_approved_audio',
      };
    });
}

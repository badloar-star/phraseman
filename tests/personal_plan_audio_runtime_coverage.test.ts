import { getPlanAudioAssetsForRuntime } from '../app/personal_plan_audio_asset_registry';
import { personalPlanAudioTargetMatches } from '../app/personal_plan_audio_target_match';
import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';
import { getPersonalPlanListenBuildItems } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanPronunciationRepeatItems } from '../app/personal_plan_pronunciation_repeat_items';
import { getPersonalPlanRuntimeAudioAssetModule } from '../app/personal_plan_runtime_audio_asset_modules';
import { getPlanAudioUrl, PLAN_AUDIO_URL_MAP } from '../app/plan_audio_url_map.generated';

type AuditedAudioItem = {
  id: string;
  audioReady: boolean;
  audioUri?: string;
  blockedReason?: string;
  correctAnswer?: string;
  targetText?: string;
};

describe('personal plan audio runtime coverage', () => {
  it('keeps every routed listening and pronunciation item playable with matching audio', () => {
    const assetsByContentUnit = new Map(
      getPlanAudioAssetsForRuntime().flatMap((asset) =>
        asset.contentUnitIds.map((id) => [id, asset] as const)),
    );
    const problems = new Set<string>();
    const checkedLessons = new Set<string>();
    const checkedExercises = new Set<string>();
    let phraseCount = 0;

    const checkItems = (items: AuditedAudioItem[]) => {
      for (const item of items) {
        const expectedText = item.correctAnswer ?? item.targetText ?? '';
        const asset = assetsByContentUnit.get(item.id);
        if (!item.audioReady || !item.audioUri || !asset) {
          problems.add(`${item.id}: ${item.blockedReason ?? 'missing approved audio'}`);
          continue;
        }
        if (!personalPlanAudioTargetMatches(asset.targetText, expectedText)) {
          problems.add(`${item.id}: approved audio target does not match the exercise phrase`);
        }
        if (
          !getPlanAudioUrl(item.audioUri)
          && getPersonalPlanRuntimeAudioAssetModule(item.audioUri) === undefined
        ) {
          problems.add(`${item.id}: missing remote URL and bundled audio fallback`);
        }
      }
    };

    for (const plan of PERSONAL_PLAN_CATALOG) {
      for (const day of plan.days) {
        for (const task of day.tasks) {
          const destination = task.destination;
          if (destination.type === 'plan_exercise') {
            if (![
              'plan_listen_choose',
              'plan_listen_build',
              'plan_pronunciation_repeat',
            ].includes(destination.exerciseType)) continue;
            const exerciseKey = [
              destination.exerciseType,
              destination.lessonId,
              ...destination.contentUnitIds,
            ].join(':');
            if (checkedExercises.has(exerciseKey)) continue;
            checkedExercises.add(exerciseKey);
            const input = {
              lessonId: destination.lessonId,
              contentUnitIds: destination.contentUnitIds,
            };
            const items = destination.exerciseType === 'plan_listen_choose'
              ? getPersonalPlanListenChooseItems(input)
              : destination.exerciseType === 'plan_listen_build'
                ? getPersonalPlanListenBuildItems(input)
                : getPersonalPlanPronunciationRepeatItems(input);
            phraseCount += destination.contentUnitIds.length;
            if (items.length !== destination.contentUnitIds.length) {
              problems.add(`${exerciseKey}: exercise builder dropped required phrases`);
            }
            checkItems(items);
            continue;
          }

          if (
            destination.type !== 'plan_phrase_lesson'
            && destination.type !== 'plan_phrase_recall'
          ) continue;
          const lessonKey = `${destination.lessonId}:${destination.requiredPhrases}`;
          if (checkedLessons.has(lessonKey)) continue;
          checkedLessons.add(lessonKey);
          const lesson = getPersonalPlanPhraseLesson(destination.lessonId);
          if (!lesson) {
            problems.add(`${destination.lessonId}: missing runtime phrase lesson`);
            continue;
          }
          const contentUnitIds = lesson.phrases
            .slice(0, destination.requiredPhrases)
            .map((phrase) => String(phrase.id));
          const input = { lessonId: destination.lessonId, contentUnitIds };
          const chooseItems = getPersonalPlanListenChooseItems(input);
          const buildItems = getPersonalPlanListenBuildItems(input);
          const pronunciationItems = getPersonalPlanPronunciationRepeatItems(input);

          phraseCount += contentUnitIds.length;
          if (
            chooseItems.length !== contentUnitIds.length
            || buildItems.length !== contentUnitIds.length
            || pronunciationItems.length !== contentUnitIds.length
          ) {
            problems.add(`${destination.lessonId}: audio builders dropped required phrases`);
          }
          checkItems([...chooseItems, ...buildItems, ...pronunciationItems]);
        }
      }
    }

    expect(Object.keys(PLAN_AUDIO_URL_MAP)).toHaveLength(2_730);
    expect(phraseCount).toBeGreaterThan(1_000);
    expect([...problems]).toEqual([]);
  });
});

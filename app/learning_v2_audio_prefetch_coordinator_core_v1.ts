import {
  isLearningV2UrgentAudioNetworkEligibleV1,
  learningV2UrgentAudioCoordinatesV1,
  type LearningV2AudioPrefetchCoordinateV1,
  type LearningV2AudioPrefetchNetworkV1,
} from "./learning_v2_audio_prefetch_policy_v1";

export type LearningV2AudioPrefetchRunSummaryV1 = Readonly<{
  urgentSessionCount: number;
  bulkLessonCount: number;
  bulkEligible: boolean;
}>;

export async function runLearningV2AudioPrefetchCoordinatorCoreV1(input: {
  readonly current: LearningV2AudioPrefetchCoordinateV1;
  readonly network: LearningV2AudioPrefetchNetworkV1;
  readonly getNetwork?: () => Promise<LearningV2AudioPrefetchNetworkV1>;
  readonly shouldContinue?: () => boolean;
  readonly publishedLessonOrdinals: readonly number[];
  readonly isSessionPublished: (lessonOrdinal: number, sessionOrdinal: number) => boolean;
  readonly prepareSession: (coordinate: LearningV2AudioPrefetchCoordinateV1) => Promise<void>;
  readonly prepareLesson: (lessonOrdinal: number) => Promise<void>;
}): Promise<LearningV2AudioPrefetchRunSummaryV1> {
  // зачем (владелец 2026-09-22, «всё тормозит с первой секунды на любом
  // устройстве, и в релизе, и в деве»): этот координатор и был причиной.
  // Замер 20.09 (комментарий в lessons.tsx) уже фиксировал его цену — семь
  // сборок мусора подряд и 6+ секунд занятого JS-потока. А 22.09 его ещё и
  // разогнали: окно 3 → 8 сессий и МАССОВАЯ закачка всех опубликованных
  // уроков на любой сети. Каждый файл — байты в JS, SHA-256, запись, обратное
  // чтение. На свежей установке кэша нет — работало на полную с момента входа.
  //
  // Массовая закачка уроков УДАЛЕНА целиком: впрок за всех качать нельзя.
  // Срочное окно — две ближайшие сессии: этого хватает, чтобы следующее
  // занятие открылось со звуком, а остальное готовится при открытии.
  let urgentSessionCount = 0;
  if (isLearningV2UrgentAudioNetworkEligibleV1(input.network)) {
    const urgent = learningV2UrgentAudioCoordinatesV1({
      ...input.current,
      count: 2,
      isPublished: input.isSessionPublished,
    });
    for (const coordinate of urgent) {
      if (input.shouldContinue && !input.shouldContinue()) break;
      const network = input.getNetwork ? await input.getNetwork() : input.network;
      if (!isLearningV2UrgentAudioNetworkEligibleV1(network)) break;
      await input.prepareSession(coordinate);
      urgentSessionCount += 1;
    }
  }
  return Object.freeze({ urgentSessionCount, bulkLessonCount: 0, bulkEligible: false });
}

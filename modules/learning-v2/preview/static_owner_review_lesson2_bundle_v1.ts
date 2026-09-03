import { authoredLearningV2Episode02SessionSource } from "../content/source/authored_episode_02_sessions_v1";
import {
  buildLearningV2AuthoringDevicePreviewLesson2V1,
  learningV2AuthoringDevicePreviewLesson2RowsV1,
} from "./authoring_device_preview_lesson2_v1";
import {
  LEARNING_V2_STATIC_OWNER_REVIEW_BUNDLE_SCHEMA_V1,
  LEARNING_V2_STATIC_OWNER_REVIEW_INTERFACE_LOCALES_V1,
  buildLearningV2StaticOwnerReviewSessionFromSourceV1,
  type LearningV2StaticOwnerReviewBundleV1,
} from "./static_owner_review_bundle_v1";

export function buildLearningV2StaticOwnerReviewLesson2BundleV1(): LearningV2StaticOwnerReviewBundleV1 {
  const rows = learningV2AuthoringDevicePreviewLesson2RowsV1().filter(
    (row) => row.status === "LOCKED",
  );
  return Object.freeze({
    schemaVersion: LEARNING_V2_STATIC_OWNER_REVIEW_BUNDLE_SCHEMA_V1,
    targetLanguage: "en" as const,
    lessonOrdinal: 2,
    interfaceLocales: LEARNING_V2_STATIC_OWNER_REVIEW_INTERFACE_LOCALES_V1,
    sessions: Object.freeze(rows.flatMap((row) => {
      const source = authoredLearningV2Episode02SessionSource(row.sessionOrdinal);
      if (!source) {
        throw new Error(`learning_v2_static_owner_review_lesson2_source_missing:session=${row.sessionOrdinal}`);
      }
      try {
        return [Object.freeze({
          ...buildLearningV2StaticOwnerReviewSessionFromSourceV1(
            row.sessionOrdinal,
            row.status,
            source,
            (locale) => buildLearningV2AuthoringDevicePreviewLesson2V1(row.sessionOrdinal, locale),
          ),
          lessonOrdinal: 2,
        })];
      } catch (error) {
        process.stderr.write(
          `LEARNING V2 OWNER REVIEW HTML: OMITTED L2:S${row.sessionOrdinal} ` +
            `${error instanceof Error ? error.message : String(error)}\n`,
        );
        return [];
      }
    })),
    sideEffectPolicy: "review_only_no_learner_or_authoring_writes" as const,
  });
}

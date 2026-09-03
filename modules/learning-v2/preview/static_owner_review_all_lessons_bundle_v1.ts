import {
  buildLearningV2StaticOwnerReviewBundleV1,
  type LearningV2StaticOwnerReviewBundleV1,
} from "./static_owner_review_bundle_v1";
import { buildLearningV2StaticOwnerReviewLesson2BundleV1 } from "./static_owner_review_lesson2_bundle_v1";
import { buildLearningV2StaticOwnerReviewLesson3BundleV1 } from "./static_owner_review_lesson3_bundle_v1";

/**
 * A review catalogue, not an authoring queue. It intentionally contains only
 * registry-LOCKED sessions, so a draft can never look approved in the owner UI.
 */
export function buildLearningV2StaticOwnerReviewAllLessonsBundleV1(): LearningV2StaticOwnerReviewBundleV1 {
  const lesson1 = buildLearningV2StaticOwnerReviewBundleV1();
  const lesson2 = buildLearningV2StaticOwnerReviewLesson2BundleV1();
  const lesson3 = buildLearningV2StaticOwnerReviewLesson3BundleV1();
  return Object.freeze({
    schemaVersion: lesson1.schemaVersion,
    targetLanguage: "en" as const,
    lessonOrdinal: 1,
    interfaceLocales: lesson1.interfaceLocales,
    sessions: Object.freeze([...lesson1.sessions, ...lesson2.sessions, ...lesson3.sessions]),
    sideEffectPolicy: "review_only_no_learner_or_authoring_writes" as const,
  });
}

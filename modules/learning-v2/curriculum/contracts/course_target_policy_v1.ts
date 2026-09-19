import { LEARNING_V2_INTERFACE_LOCALES_V2 } from "./course_blueprint_v2";

export const LEARNING_V2_GERMAN_INTERFACE_LOCALES_V1 = Object.freeze([
  "ru",
  "uk",
] as const);

export type LearningV2TargetLanguageV1 = "en" | "de";

export type LearningV2CourseTargetPolicyV1 = Readonly<{
  targetLanguage: LearningV2TargetLanguageV1;
  interfaceLocales: readonly string[];
  baseline: "en-general" | "de-DE-standard";
}>;

const LEARNING_V2_COURSE_TARGET_POLICIES_V1 = Object.freeze({
  en: Object.freeze({
    targetLanguage: "en",
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES_V2,
    baseline: "en-general",
  }),
  de: Object.freeze({
    targetLanguage: "de",
    interfaceLocales: LEARNING_V2_GERMAN_INTERFACE_LOCALES_V1,
    baseline: "de-DE-standard",
  }),
} as const satisfies Record<LearningV2TargetLanguageV1, LearningV2CourseTargetPolicyV1>);

export function getLearningV2CourseTargetPolicyV1(
  targetLanguage: LearningV2TargetLanguageV1,
): LearningV2CourseTargetPolicyV1 {
  const policy = LEARNING_V2_COURSE_TARGET_POLICIES_V1[targetLanguage];
  if (!policy) {
    throw new Error(`learning_v2_target_policy_unknown:${String(targetLanguage)}`);
  }
  return policy;
}

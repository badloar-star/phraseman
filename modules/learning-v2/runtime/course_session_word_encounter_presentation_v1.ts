import type {
  LearningV2CourseSessionLocalizedTextV1,
  LearningV2CourseSessionSavablePhraseV1,
} from "./course_session_client_children_v1";

/** Local presentation contract. It is deliberately outside auxiliary-child.v1 wire schema. */
export type LearningV2CourseSessionWordEncounterPresentationV1 = Readonly<{
  encounterId?: string;
  lexicalItemId: string;
  transcription: string | null;
  playfulMeaningByLocale: LearningV2CourseSessionLocalizedTextV1;
  motionVariant: "lesson_hero_b" | "premium_a";
  presentation: "blocking_task_overlay";
  dismissal: "continue_only";
  saveControl: "bookmark_icon";
  orderWithinSession: number;
  save: LearningV2CourseSessionSavablePhraseV1;
}>;

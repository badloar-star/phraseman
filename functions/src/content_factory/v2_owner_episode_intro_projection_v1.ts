import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  encodeLearningV2ActivitySessionIntroProjectionV1,
  materializeLearningV2ActivitySessionIntroProjectionV1,
  type LearningV2ActivitySessionIntroProjectionV1,
} from "../../../modules/learning-v2/runtime/activity_session_intro_projection_v1";
import {
  resolveV2OwnerAuthoredEpisodeInputMaterialV2,
  type V2OwnerAuthoredEpisodeInputHandleV2,
} from "./v2_owner_authored_episode_input_v2";

export const V2_OWNER_EPISODE_INTRO_PROJECTION_SET_SCHEMA_V1 =
  "v2-owner-episode-intro-projection-set.v1" as const;

export interface V2OwnerEpisodeIntroProjectionSetV1 {
  readonly schemaVersion: typeof V2_OWNER_EPISODE_INTRO_PROJECTION_SET_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly ownerInputFingerprint: string;
  readonly introAggregateFingerprint: string;
  readonly projections: readonly LearningV2ActivitySessionIntroProjectionV1[];
  readonly projectionRaws: readonly string[];
  readonly projectionFingerprints: readonly string[];
  readonly sessionCount: 12;
  readonly questionCount: 36;
  readonly learnerProjectionAuthority: "exact_private_owner_input_v2_allowlist_projection";
  readonly answerDataPolicy: "none";
  readonly evaluatorDataPolicy: "none";
  readonly serverSidecarPolicy: "none";
  readonly repositoryAuthority: "none";
  readonly storageAuthority: "none";
  readonly runtimeAuthority: "none_release_readback_required";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly projectionSetFingerprint: string;
}

function fail(): never {
  throw new Error("v2_owner_episode_intro_projection_invalid");
}

export function projectV2OwnerEpisodeSessionIntrosV1(
  handle: V2OwnerAuthoredEpisodeInputHandleV2,
): V2OwnerEpisodeIntroProjectionSetV1 {
  let material: ReturnType<typeof resolveV2OwnerAuthoredEpisodeInputMaterialV2>;
  try {
    material = resolveV2OwnerAuthoredEpisodeInputMaterialV2(handle);
  } catch {
    fail();
  }
  if (
    material.sources.length !== 12 ||
    material.intros.length !== 12 ||
    material.summary.introCount !== 12 ||
    material.summary.introQuestionCount !== 36
  )
    fail();
  const projections = Object.freeze(
    material.intros.map((intro, index) => {
      const source = material.sources[index];
      const raw = JSON.parse(intro.raw) as Readonly<{
        contentClass: "production_candidate" | "neutral_test_fixture";
        introId: string;
        introFingerprint: string;
        sourceSubjectFingerprint: string;
        episodeId: string;
        sessionId: string;
        sessionOrdinal: number;
        targetLanguage: string;
        title: string;
        paragraphs: readonly string[];
        concepts: readonly Readonly<{
          conceptId: string;
          heading: string;
          explanation: string;
        }>[];
        questions: readonly Readonly<{
          taskId: string;
          questionId: string;
          coveredConceptIds: readonly string[];
          learnerSurfaceFingerprint: string;
        }>[];
      }>;
      if (
        raw.sessionOrdinal !== index + 1 ||
        raw.sessionId !== source.session.sessionId ||
        raw.episodeId !== source.episodeId ||
        raw.targetLanguage !== source.targetLanguage ||
        raw.questions.length !== 3
      )
        fail();
      const tasks = source.session.tasks.slice(0, 3);
      return materializeLearningV2ActivitySessionIntroProjectionV1({
        contentClass: raw.contentClass,
        introId: raw.introId,
        introFingerprint: raw.introFingerprint,
        sourceSubjectFingerprint: raw.sourceSubjectFingerprint,
        episodeId: raw.episodeId,
        sessionId: raw.sessionId,
        sessionOrdinal: raw.sessionOrdinal,
        targetLanguage: raw.targetLanguage,
        title: raw.title,
        paragraphs: raw.paragraphs,
        concepts: raw.concepts,
        questions: raw.questions.map((question, questionIndex) => {
          const task = tasks[questionIndex];
          if (
            !task ||
            task.taskId !== question.taskId ||
            task.introQuestionRef?.questionId !== question.questionId ||
            canonicalJsonV1(task.introQuestionRef.coveredConceptIds) !==
              canonicalJsonV1(question.coveredConceptIds)
          )
            fail();
          return Object.freeze({
            ...question,
            promptId: task.learner.promptId,
            prompt: task.learner.prompt,
            responseOptions: task.learner.responseOptions,
            accessibilityLabel: task.learner.accessibilityLabel,
          });
        }),
      });
    }),
  );
  const projectionRaws = Object.freeze(
    projections.map(encodeLearningV2ActivitySessionIntroProjectionV1),
  );
  const projectionFingerprints = Object.freeze(
    projections.map((projection) => projection.projectionFingerprint),
  );
  const body = {
    schemaVersion: V2_OWNER_EPISODE_INTRO_PROJECTION_SET_SCHEMA_V1,
    planFingerprint: material.summary.planFingerprint,
    stageId: material.summary.stageId,
    episodeId: material.summary.episodeId,
    ownerInputFingerprint: material.summary.inputFingerprint,
    introAggregateFingerprint: material.summary.introAggregateFingerprint,
    projectionFingerprints,
    sessionCount: 12 as const,
    questionCount: 36 as const,
    learnerProjectionAuthority:
      "exact_private_owner_input_v2_allowlist_projection" as const,
    answerDataPolicy: "none" as const,
    evaluatorDataPolicy: "none" as const,
    serverSidecarPolicy: "none" as const,
    repositoryAuthority: "none" as const,
    storageAuthority: "none" as const,
    runtimeAuthority: "none_release_readback_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return Object.freeze({
    ...body,
    projections,
    projectionRaws,
    projectionSetFingerprint: hashCanonicalBody(body),
  });
}

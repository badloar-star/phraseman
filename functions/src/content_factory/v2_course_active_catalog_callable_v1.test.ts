import { HttpsError } from "firebase-functions/v2/https";
import {
  encodeLearningV2ActiveCourseCatalogV1,
  materializeLearningV2ActiveCourseCatalogV1,
} from "../../../modules/learning-v2/runtime/course_active_catalog_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../../../modules/learning-v2/content/generator_course_contract";
import { learningV2CourseSessionIdV1 } from "../../../modules/learning-v2/content/course_topology_v1";
import { materializeLearningV2CourseLessonReleaseIndexV1 } from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { createV2CourseActiveCatalogHandlerV1 } from "./v2_course_active_catalog_callable_v1";

const h = (value: string) => sha256Utf8(value);
const localized = (prefix: string) =>
  Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      `${prefix} ${locale}`,
    ]),
  ) as any;

function catalogRaw() {
  const index = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId: "release-catalog",
    lessonOrdinal: 1,
    titleByLocale: localized("Lesson title"),
    canDoByLocale: localized("Can do"),
    ownerLessonFingerprint: h("owner"),
    ownerConfirmationFingerprint: h("confirmation"),
    sessions: Array.from({ length: 56 }, (_, offset) => {
      const ordinal = offset + 1;
      return {
        courseSessionId: learningV2CourseSessionIdV1(1, ordinal),
        learningOutcomeKind: "understand" as const,
        learningOutcomeByLocale: localized(`Outcome ${ordinal}`),
        packageSchemaVersion:
          "learning-v2-course-session-release-package.v1" as const,
        packageFingerprint: h(`package:${ordinal}`),
        contentHash: h(`raw:${ordinal}`),
        objectGeneration: String(1000 + ordinal),
        byteSize: 2048,
      };
    }),
  });
  return encodeLearningV2ActiveCourseCatalogV1(
    materializeLearningV2ActiveCourseCatalogV1({
      environment: "lab",
      releaseId: index.releaseId,
      activeRootFingerprint: h("root"),
      activeHeadFingerprint: h("head"),
      headOperationRevision: 1,
      seasonId: "neutral-course",
      targetLanguage: "en",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      interfaceLocale: "ru",
      contentClass: "neutral_test_fixture",
      releaseScope: "vertical_slice",
      lessonIndexAggregate: hashCanonicalBody([
        { lessonOrdinal: 1, value: index.indexFingerprint },
      ]),
      indexes: [index],
    }),
  );
}

const request = {
  environment: "lab",
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  interfaceLocale: "ru",
  seasonId: "neutral-course",
};

describe("Learning V2 active course catalog callable", () => {
  test("returns only learner-safe catalog data after authentication", async () => {
    const handler = createV2CourseActiveCatalogHandlerV1(
      async (_input, stableId) => {
        expect(stableId).toBe("stable-user");
        return catalogRaw();
      },
      async () => "stable-user",
    );
    const response = await handler({
      data: request,
      auth: { uid: "auth-user" },
    });
    expect(response).toMatchObject({
      schemaVersion: "v2-course-active-catalog-response.v1",
      transportAuthority: "firebase_callable_auth_and_app_check_boundary",
      learnerProjection: "titles_can_do_and_session_learning_outcomes_only",
      correctnessAuthority: "local_device_only",
      serverAnswerAuthority: "none_answers_never_transported",
      progressWriteAuthority: "completed_session_summary_only",
      releaseAuthority: false,
    });
    expect(response.canonicalCatalogRaw).not.toMatch(
      /correctResponse|acceptedResponse|sidecar|salt/u,
    );
  });

  test("rejects unauthenticated, unknown fields and scope substitutions", async () => {
    const handler = createV2CourseActiveCatalogHandlerV1(
      async () => catalogRaw(),
      async () => "stable-user",
    );
    await expect(handler({ data: request, auth: null })).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(
      handler({ data: { ...request, answer: "hello" }, auth: { uid: "u" } }),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      createV2CourseActiveCatalogHandlerV1(
        async () => catalogRaw(),
        async () => "stable-user",
      )({
        data: { ...request, interfaceLocale: "pl" },
        auth: { uid: "u" },
      }),
    ).rejects.toBeInstanceOf(HttpsError);
  });

  test("maps non-HTTP resolver errors to a generic unavailable response", async () => {
    const handler = createV2CourseActiveCatalogHandlerV1(
      async () => {
        throw new Error("private repository detail");
      },
      async () => "stable-user",
    );
    await expect(
      handler({ data: request, auth: { uid: "u" } }),
    ).rejects.toMatchObject({
      code: "unavailable",
      message: "course_catalog_unavailable",
    });
  });
});

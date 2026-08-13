import path from "node:path";
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";
import {
  getV2OwnerAuthoredSessionIntroSummaryV1,
  isV2OwnerAuthoredSessionIntroHandleV1,
  materializeV2OwnerAuthoredSessionIntroV1,
  parseV2OwnerAuthoredSessionIntroV1,
  resolveV2OwnerAuthoredSessionIntroMaterialV1,
} from "../functions/src/content_factory/v2_owner_authored_session_intro_v1";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const editor = require(
  path.join(__dirname, "..", "admin", "learning_v2_owner_episode_editor.js"),
);

const fixture = () =>
  editor.createNeutralTestFixture({
    episodeId: "neutral-test-episode-never-release",
    targetLanguage: "en",
  });

const draft = (source: Record<string, any>) => {
  const concepts: string[] = Array.from(
    new Set<string>(
      source.session.tasks
        .slice(0, 3)
        .flatMap((task: any) =>
          task.introQuestionRef.coveredConceptIds.map(String),
        ),
    ),
  );
  return {
    contentClass: "neutral_test_fixture" as const,
    introId: `neutral-test-intro-s${source.session.ordinal}-never-release`,
    title: `Neutral test intro ${source.session.ordinal}`,
    paragraphs: [
      "This is a neutral test-only explanation used to verify the generator.",
      "It is not real course content and carries no release authority.",
    ],
    concepts: concepts.map((conceptId) => ({
      conceptId,
      heading: `Neutral heading for ${conceptId}`,
      explanation: `Neutral explanation for ${conceptId}`,
    })),
  };
};

describe("Learning V2 owner-authored session intro v1", () => {
  test("binds one immutable intro to exactly the three learner-visible questions of its session", () => {
    const source = fixture().sessionSources[0];
    const material = materializeV2OwnerAuthoredSessionIntroV1(
      draft(source),
      source,
    );
    expect(material.summary).toMatchObject({
      contentClass: "neutral_test_fixture",
      sessionOrdinal: 1,
      questionCount: 3,
      contentOriginAuthority: "unverified_owner_input_claim",
      languageAccuracyAuthority: "none",
      curriculumAuthority: "none",
      repositoryAuthority: "none",
      humanApprovalAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(
      material.source.session.tasks
        .slice(0, 3)
        .map((task) => task.introQuestionRef?.introArtifactFingerprint),
    ).toEqual(Array(3).fill(material.summary.introFingerprint));
    expect(JSON.parse(material.raw).questions).toHaveLength(3);
  });

  test("rehydrates only from canonical bytes bound to the same session source", () => {
    const source = fixture().sessionSources[3];
    const material = materializeV2OwnerAuthoredSessionIntroV1(
      draft(source),
      source,
    );
    const handle = parseV2OwnerAuthoredSessionIntroV1(
      material.raw,
      material.source,
    );
    expect(isV2OwnerAuthoredSessionIntroHandleV1(handle)).toBe(true);
    expect(getV2OwnerAuthoredSessionIntroSummaryV1(handle)).toEqual(
      material.summary,
    );
    expect(resolveV2OwnerAuthoredSessionIntroMaterialV1(handle).raw).toBe(
      material.raw,
    );
    expect(isV2OwnerAuthoredSessionIntroHandleV1({ ...handle })).toBe(false);
    expect(() =>
      getV2OwnerAuthoredSessionIntroSummaryV1({ ...handle }),
    ).toThrow("v2_owner_session_intro_handle_invalid");
  });

  test("rejects content, concept, visible-question and authority drift", () => {
    const source = fixture().sessionSources[6];
    const material = materializeV2OwnerAuthoredSessionIntroV1(
      draft(source),
      source,
    );
    const changedText = JSON.parse(material.raw);
    changedText.paragraphs[0] = "Changed after fingerprinting";
    expect(() =>
      parseV2OwnerAuthoredSessionIntroV1(
        canonicalJsonV1(changedText),
        material.source,
      ),
    ).toThrow("v2_owner_session_intro_fingerprint_invalid");

    const changedAuthority = JSON.parse(material.raw);
    changedAuthority.releaseAuthority = true;
    expect(() =>
      parseV2OwnerAuthoredSessionIntroV1(
        canonicalJsonV1(changedAuthority),
        material.source,
      ),
    ).toThrow("v2_owner_session_intro_value_invalid");

    const wrongConcept = draft(source);
    wrongConcept.concepts[0].conceptId = "unreferenced-neutral-concept";
    expect(() =>
      materializeV2OwnerAuthoredSessionIntroV1(wrongConcept, source),
    ).toThrow("v2_owner_session_intro_concept_binding_invalid");

    const changedSource = JSON.parse(canonicalJsonV1(material.source));
    changedSource.session.tasks[0].learner.prompt = "Changed visible question";
    expect(() =>
      parseV2OwnerAuthoredSessionIntroV1(material.raw, changedSource),
    ).toThrow("v2_owner_session_intro_question_binding_invalid");
  });
});

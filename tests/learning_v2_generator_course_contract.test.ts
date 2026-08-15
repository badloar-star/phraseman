import {
  LEARNING_V2_APPROVAL_STAGES,
  LEARNING_V2_INTERFACE_LOCALES,
  LEARNING_V2_LEARNING_CYCLE,
  LEARNING_V2_REQUIRED_CONTENT_KINDS,
  assertLearningV2GeneratedCourseReleaseApproved,
  learningV2GeneratedCoursePackageFingerprint,
  validateLearningV2GeneratedCoursePackage,
  type LearningV2GeneratedCoursePackage,
  type LearningV2Localized,
} from '../modules/learning-v2/content/generator_course_contract';

const localized = <T>(value: (locale: (typeof LEARNING_V2_INTERFACE_LOCALES)[number]) => T): LearningV2Localized<T> =>
  Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, value(locale)])) as LearningV2Localized<T>;

function validPackage(): LearningV2GeneratedCoursePackage {
  return {
    schemaVersion: 'learning-v2-generated-course-package.v1',
    packageId: 'english-course-release-1',
    targetLanguage: 'en',
    entryBand: 'PRE_A1',
    exitBand: 'C2',
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    learningCycle: LEARNING_V2_LEARNING_CYCLE,
    objectives: [{
      objectiveId: 'introduce-yourself',
      cefrBand: 'PRE_A1',
      canDoByLocale: localized((locale) => `Can introduce myself (${locale})`),
    }],
    artifacts: LEARNING_V2_REQUIRED_CONTENT_KINDS.map((kind, index) => ({
      artifactId: `artifact-${String(index + 1).padStart(2, '0')}`,
      kind,
      sequenceOrdinal: index + 1,
      contentByLocale: localized((locale) => ({ title: `${kind} (${locale})`, body: `Approved fixture ${index + 1}` })),
      introducesConceptIds: index === 3 ? ['concept-to-be'] : [],
      usesConceptIds: index >= 3 ? ['concept-to-be'] : [],
      dependsOnArtifactIds: index === 0 ? [] : [`artifact-${String(index).padStart(2, '0')}`],
    })),
  };
}

describe('Learning V2 whole-course generator contract', () => {
  test('accepts one atomic PRE-A1 to C2 package containing every content family in all eight UI languages', () => {
    const coursePackage = validPackage();
    expect(validateLearningV2GeneratedCoursePackage(coursePackage)).toBe(coursePackage);
    expect(Object.keys(coursePackage.artifacts[0].contentByLocale)).toEqual(LEARNING_V2_INTERFACE_LOCALES);
    expect(new Set(coursePackage.artifacts.map((artifact) => artifact.kind)))
      .toEqual(new Set(LEARNING_V2_REQUIRED_CONTENT_KINDS));
  });

  test('fails closed when any generated content family omits one interface language', () => {
    const coursePackage = validPackage();
    const { pl: _missing, ...withoutPolish } = coursePackage.artifacts[7].contentByLocale;
    const artifacts = coursePackage.artifacts.map((artifact, index) => index === 7
      ? { ...artifact, contentByLocale: withoutPolish as never }
      : artifact);
    expect(() => validateLearningV2GeneratedCoursePackage({ ...coursePackage, artifacts }))
      .toThrow('learning_v2_generator_artifact_locales_invalid');
  });

  test('rejects random exercises that use a concept before it was taught', () => {
    const coursePackage = validPackage();
    const artifacts = coursePackage.artifacts.map((artifact, index) => index === 0
      ? { ...artifact, usesConceptIds: ['concept-not-introduced'] }
      : artifact);
    expect(() => validateLearningV2GeneratedCoursePackage({ ...coursePackage, artifacts }))
      .toThrow('learning_v2_generator_use_before_introduction');
  });

  test('cannot release generated content until the owner approves every stage against the exact package', () => {
    const coursePackage = validPackage();
    const packageFingerprint = learningV2GeneratedCoursePackageFingerprint(coursePackage);
    const approvals = LEARNING_V2_APPROVAL_STAGES.map((stage) => ({
      stage,
      state: 'approved' as const,
      packageFingerprint,
      reviewerId: 'owner',
      reviewedAtIso: '2026-08-10T10:00:00.000Z',
    }));
    expect(() => assertLearningV2GeneratedCourseReleaseApproved({ coursePackage, approvalReceipts: approvals }))
      .not.toThrow();
    expect(() => assertLearningV2GeneratedCourseReleaseApproved({
      coursePackage,
      approvalReceipts: approvals.map((receipt) => receipt.stage === 'curriculum'
        ? { ...receipt, state: 'pending' as const, reviewerId: null, reviewedAtIso: null }
        : receipt),
    })).toThrow('learning_v2_generator_approval_curriculum_missing');
  });
});

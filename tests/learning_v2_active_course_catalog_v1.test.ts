import { LEARNING_V2_INTERFACE_LOCALES } from '../modules/learning-v2/content/generator_course_contract';
import { LEARNING_V2_LESSON_SESSION_COUNT_V1, learningV2CourseSessionIdV1 } from '../modules/learning-v2/content/course_topology_v1';
import { materializeLearningV2CourseLessonReleaseIndexV1, type LearningV2CourseLessonReleaseSessionInputV1 } from '../modules/learning-v2/runtime/course_lesson_release_index_v1';
import {
  encodeLearningV2ActiveCourseCatalogV1,
  isLearningV2ActiveCourseCatalogV1,
  materializeLearningV2ActiveCourseCatalogV1,
  parseLearningV2ActiveCourseCatalogV1,
} from '../modules/learning-v2/runtime/course_active_catalog_v1';
import { canonicalJsonV1, hashCanonicalBody, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';

const localized = (prefix: string) =>
  Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, `${prefix} ${locale}`])) as Record<(typeof LEARNING_V2_INTERFACE_LOCALES)[number], string>;

function lessonIndex() {
  const sessions: LearningV2CourseLessonReleaseSessionInputV1[] = Array.from({ length: LEARNING_V2_LESSON_SESSION_COUNT_V1 }, (_, index) => {
    const ordinal = index + 1;
    return {
      courseSessionId: learningV2CourseSessionIdV1(1, ordinal),
      learningOutcomeKind: ordinal <= 18 ? 'understand' : ordinal <= 40 ? 'learn' : 'can_do',
      learningOutcomeByLocale: localized(`Outcome ${ordinal}`),
      packageSchemaVersion: 'learning-v2-course-session-release-package.v1',
      packageFingerprint: sha256Utf8(`package:${ordinal}`),
      contentHash: sha256Utf8(`raw:${ordinal}`),
      objectGeneration: String(1000 + ordinal),
      byteSize: 4096,
    };
  });
  return materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId: 'neutral-release-1',
    lessonOrdinal: 1,
    titleByLocale: localized('Neutral lesson'),
    canDoByLocale: localized('Neutral can do'),
    ownerLessonFingerprint: sha256Utf8('owner-lesson'),
    ownerConfirmationFingerprint: sha256Utf8('owner-confirmation'),
    sessions,
  });
}

function validCatalog() {
  const index = lessonIndex();
  return materializeLearningV2ActiveCourseCatalogV1({
    environment: 'lab',
    releaseId: index.releaseId,
    activeRootFingerprint: sha256Utf8('root'),
    activeHeadFingerprint: sha256Utf8('head'),
    headOperationRevision: 1,
    seasonId: 'neutral-course',
    targetLanguage: 'en',
    studyTarget: 'en',
    learnerSourceLocale: 'ru',
    interfaceLocale: 'ru',
    contentClass: 'neutral_test_fixture',
    releaseScope: 'vertical_slice',
    lessonIndexAggregate: hashCanonicalBody([{ lessonOrdinal: 1, value: index.indexFingerprint }]),
    indexes: [index],
  });
}

describe('Learning V2 learner-safe active course catalog', () => {
  test('projects only the selected locale and exact 56 direct session outcomes', () => {
    const catalog = validCatalog();
    expect(catalog.lessons).toHaveLength(1);
    expect(catalog.lessons[0]?.sessions).toHaveLength(56);
    expect(catalog.lessons[0]).toMatchObject({
      title: 'Neutral lesson ru',
      canDo: 'Neutral can do ru',
      sessionCount: 56,
      chapterCount: 7,
    });
    expect(catalog.lessons[0]?.sessions[0]).toMatchObject({
      courseSessionId: 'lesson-01:session:01',
      learningOutcomeKind: 'understand',
      learningOutcome: 'Outcome 1 ru',
    });
    expect(catalog.lessons[0]?.sessions[55]).toMatchObject({
      courseSessionId: 'lesson-01:session:56',
      learningOutcomeKind: 'can_do',
      learningOutcome: 'Outcome 56 ru',
      role: 'final_exam',
    });
  });

  test('states local-only correctness, completed-summary storage and restart policy', () => {
    expect(validCatalog()).toMatchObject({
      learnerProjection: 'titles_can_do_and_session_learning_outcomes_only',
      correctnessAuthority: 'local_device_only',
      serverAnswerAuthority: 'none_answers_never_transported',
      progressWriteAuthority: 'completed_session_summary_only',
      interruptedSessionPolicy: 'restart_from_first_intro_with_new_run_id',
      walletAuthority: 'none',
      masteryAuthority: 'none',
      evidenceAuthority: 'none',
      releaseAuthority: false,
    });
  });

  test('round-trips canonical bytes without upgrading a copied object', () => {
    const catalog = validCatalog();
    const raw = encodeLearningV2ActiveCourseCatalogV1(catalog);
    const parsed = parseLearningV2ActiveCourseCatalogV1(raw);
    expect(parsed).toEqual(catalog);
    expect(isLearningV2ActiveCourseCatalogV1(parsed)).toBe(true);
    expect(isLearningV2ActiveCourseCatalogV1({ ...parsed })).toBe(false);
    expect(() => parseLearningV2ActiveCourseCatalogV1(`${raw} `)).toThrow('learning_v2_active_course_catalog_invalid');
  });

  test('fails closed on an answer/evaluator field or authority rewrite', () => {
    const raw = encodeLearningV2ActiveCourseCatalogV1(validCatalog());
    const answerLeak = JSON.parse(raw) as Record<string, any>;
    answerLeak.lessons[0].sessions[0].correctResponse = 'secret';
    expect(() => parseLearningV2ActiveCourseCatalogV1(canonicalJsonV1(answerLeak))).toThrow('learning_v2_active_course_catalog_invalid');

    const authority = JSON.parse(raw) as Record<string, any>;
    authority.serverAnswerAuthority = 'server_revalidation';
    authority.catalogFingerprint = sha256Utf8('forged');
    expect(() => parseLearningV2ActiveCourseCatalogV1(canonicalJsonV1(authority))).toThrow('learning_v2_active_course_catalog_invalid');
  });

  test('binds index order and aggregate exactly', () => {
    const index = lessonIndex();
    expect(() =>
      materializeLearningV2ActiveCourseCatalogV1({
        environment: 'lab',
        releaseId: index.releaseId,
        activeRootFingerprint: sha256Utf8('root'),
        activeHeadFingerprint: sha256Utf8('head'),
        headOperationRevision: 1,
        seasonId: 'neutral-course',
        targetLanguage: 'en',
        studyTarget: 'en',
        learnerSourceLocale: 'ru',
        interfaceLocale: 'ru',
        contentClass: 'neutral_test_fixture',
        releaseScope: 'vertical_slice',
        lessonIndexAggregate: sha256Utf8('wrong'),
        indexes: [index],
      }),
    ).toThrow('learning_v2_active_course_catalog_invalid');
  });
});

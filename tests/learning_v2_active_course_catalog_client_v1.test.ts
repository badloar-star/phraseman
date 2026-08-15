import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from '@react-native-firebase/functions';
import { loadLearningV2ActiveCourseCatalogV1, peekLearningV2ActiveCourseCatalogV1 } from '../app/learning_v2_active_course_catalog_client_v1';
import { LEARNING_V2_INTERFACE_LOCALES } from '../modules/learning-v2/content/generator_course_contract';
import { learningV2CourseSessionIdV1 } from '../modules/learning-v2/content/course_topology_v1';
import { materializeLearningV2CourseLessonReleaseIndexV1 } from '../modules/learning-v2/runtime/course_lesson_release_index_v1';
import { encodeLearningV2ActiveCourseCatalogV1, materializeLearningV2ActiveCourseCatalogV1 } from '../modules/learning-v2/runtime/course_active_catalog_v1';
import { hashCanonicalBody, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import { deriveLocalOfflineProgressAccountScopeHash } from '../modules/learning-v2/progress/progress_account_scope';

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'stable-catalog-user'),
}));

const h = (value: string) => sha256Utf8(value);
const localized = (prefix: string) => Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, `${prefix} ${locale}`])) as any;
const locator = Object.freeze({
  environment: 'lab' as const,
  targetLanguage: 'en',
  studyTarget: 'en',
  learnerSourceLocale: 'ru',
  interfaceLocale: 'ru' as const,
  seasonId: 'neutral-course',
});

function response() {
  const index = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId: 'release-catalog',
    lessonOrdinal: 1,
    titleByLocale: localized('Lesson'),
    canDoByLocale: localized('Can do'),
    ownerLessonFingerprint: h('owner'),
    ownerConfirmationFingerprint: h('confirmation'),
    sessions: Array.from({ length: 56 }, (_, offset) => ({
      courseSessionId: learningV2CourseSessionIdV1(1, offset + 1),
      learningOutcomeKind: 'understand' as const,
      learningOutcomeByLocale: localized(`Outcome ${offset + 1}`),
      packageSchemaVersion: 'learning-v2-course-session-release-package.v1' as const,
      packageFingerprint: h(`package:${offset + 1}`),
      contentHash: h(`raw:${offset + 1}`),
      objectGeneration: String(1000 + offset),
      byteSize: 2048,
    })),
  });
  const catalog = materializeLearningV2ActiveCourseCatalogV1({
    environment: 'lab',
    releaseId: index.releaseId,
    activeRootFingerprint: h('root'),
    activeHeadFingerprint: h('head'),
    headOperationRevision: 1,
    seasonId: locator.seasonId,
    targetLanguage: locator.targetLanguage,
    studyTarget: locator.studyTarget,
    learnerSourceLocale: locator.learnerSourceLocale,
    interfaceLocale: locator.interfaceLocale,
    contentClass: 'neutral_test_fixture',
    releaseScope: 'vertical_slice',
    lessonIndexAggregate: hashCanonicalBody([{ lessonOrdinal: 1, value: index.indexFingerprint }]),
    indexes: [index],
  });
  return {
    schemaVersion: 'v2-course-active-catalog-response.v1',
    canonicalCatalogRaw: encodeLearningV2ActiveCourseCatalogV1(catalog),
    catalogFingerprint: catalog.catalogFingerprint,
    activeRootFingerprint: catalog.activeRootFingerprint,
    activeHeadFingerprint: catalog.activeHeadFingerprint,
    transportAuthority: 'firebase_callable_auth_and_app_check_boundary',
    learnerProjection: 'titles_can_do_and_session_learning_outcomes_only',
    correctnessAuthority: 'local_device_only',
    serverAnswerAuthority: 'none_answers_never_transported',
    progressWriteAuthority: 'completed_session_summary_only',
    releaseAuthority: false,
  };
}

describe('Learning V2 active course catalog app client', () => {
  const storage = new Map<string, string>();
  let network: () => Promise<unknown>;

  beforeEach(() => {
    storage.clear();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage.get(key) ?? null);
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => storage.set(key, value));
    network = async () => response();
    jest.mocked(httpsCallable).mockReturnValue((async () => ({
      data: await network(),
    })) as never);
  });

  test('loads the safe catalog and falls back to the same account-scoped LKG', async () => {
    const online = await loadLearningV2ActiveCourseCatalogV1(locator);
    expect(online).toMatchObject({
      source: 'network',
      cacheAuthority: 'availability_only_not_release_or_correctness_authority',
      catalog: {
        correctnessAuthority: 'local_device_only',
        serverAnswerAuthority: 'none_answers_never_transported',
      },
    });
    const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash('stable-catalog-user');
    expect(peekLearningV2ActiveCourseCatalogV1(locator, accountScopeHash)?.lessons[0]?.title).toBe('Lesson ru');
    await new Promise((resolve) => setImmediate(resolve));
    network = async () => {
      throw new Error('offline');
    };
    await expect(loadLearningV2ActiveCourseCatalogV1(locator)).resolves.toMatchObject({
      source: 'lkg',
      cacheAuthority: 'availability_only_not_release_or_correctness_authority',
    });
  });

  test('rejects a callable that tries to restore server answer authority', async () => {
    network = async () => ({
      ...response(),
      serverAnswerAuthority: 'server_revalidation',
    });
    await expect(loadLearningV2ActiveCourseCatalogV1(locator)).rejects.toThrow('learning_v2_active_course_catalog_client_invalid');
  });
});

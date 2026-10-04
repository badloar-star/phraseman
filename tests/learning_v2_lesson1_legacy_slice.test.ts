import { LESSON_1_PHRASES } from '../app/lesson_data_1_8_phrases_source';
import { adaptLegacyLessonPhrasesToV2Content } from '../modules/learning-v2/content/legacy_lesson_adapter';
import { validateV2ContentItem } from '../modules/learning-v2/content/content_item';
import { compileV2RequiredSessions } from '../modules/learning-v2/content/session_compiler';
import { validateV2LanguageProfile } from '../modules/learning-v2/content/language_profile';
import { qaV2EpisodeContent } from '../functions/src/content_factory/v2_episode_content_qa';
import { buildActivityBindingsForContentItems, buildEnglishProfile } from './support/learning_v2_content_builders';
import { buildLesson1LegacyV2SourcePayload } from '../modules/learning-v2/content/legacy_lesson_payload';

test('adapts all fifty real Lesson 1 phrases without replacing their text or Russian meaning', () => {
  const items = adaptLegacyLessonPhrasesToV2Content({
    episodeId: 'ep-lesson-01',
    objectiveId: 'obj-lesson-01-to-be-statements',
    targetLanguage: 'en',
    sourceLocale: 'ru',
    phrases: LESSON_1_PHRASES,
  });

  expect(LESSON_1_PHRASES).toHaveLength(50);
  expect(items).toHaveLength(50);
  expect(items.map((item) => item.target.text)).toEqual(
    LESSON_1_PHRASES.map((phrase) => phrase.english),
  );
  expect(items.map((item) => item.learnerMeanings[0].value)).toEqual(
    LESSON_1_PHRASES.map((phrase) => phrase.russian),
  );
  expect(items.every((item) => validateV2ContentItem(item).ok)).toBe(true);
  expect(items.every((item) => item.rejectedAnswers.length > 0)).toBe(true);
});

// зачем (переписано 04.10 по смыслу, не ослаблено): тест требовал «50 фраз → 12 сессий, QA одобрен». Компилятор теперь строит полную
// топологию курса из 56 занятий (по 12 карточек), а 50 фраз старого источника на неё не хватает: QA честно блокирует выпуск по ЕДИНСТВЕННОЙ
// причине compiled_session_count_invalid, остальные фразы значатся «не использованы». Боевой урок 1 едет из фабрики (factory_native), его сторожит
// learning_v2_lesson1_bundle_builds. Тест фиксирует это состояние: топология полная, и ровно одна блокировка — именно про число занятий;
// любая ДРУГАЯ блокировка (битая карточка, ответ, привязка) красит тест.
test('compiles the fifty legacy Lesson 1 phrases into the full 56-session topology and QA blocks only on the session count', () => {
  const profile = validateV2LanguageProfile(buildEnglishProfile());
  if (!profile.ok) throw new Error(`test_profile_invalid:${profile.issues.join(',')}`);
  const payload = buildLesson1LegacyV2SourcePayload();

  const compiled = compileV2RequiredSessions({
    episodeId: payload.episodeId,
    canDoOutcomeId: 'obj-lesson-01-to-be-statements',
    profile: profile.value,
    items: payload.contentItems,
    activityBindings: buildActivityBindingsForContentItems(payload.contentItems),
  });

  expect(compiled.sessions).toHaveLength(56);
  expect(compiled.sessions.flatMap((session) => session.cards)).toHaveLength(672);
  const report = qaV2EpisodeContent(
    compiled,
    payload.contentItems,
    profile.value,
    buildActivityBindingsForContentItems(payload.contentItems),
  );
  expect(report.ok).toBe(false);
  expect(report.blockingIssues).toEqual(['compiled_session_count_invalid']);
});

test('builds a versioned Lesson 1 payload that preserves the existing intro, theory and vocabulary', () => {
  const payload = buildLesson1LegacyV2SourcePayload();

  expect(payload.schemaVersion).toBe('v2-legacy-lesson-source-payload.v1');
  expect(payload.version).toBe(1);
  expect(payload.lessonId).toBe(1);
  expect(payload.contentItems).toHaveLength(50);
  expect(payload.introScreens.length).toBeGreaterThan(0);
  expect(payload.theory.sections.length).toBeGreaterThan(0);
  expect(payload.vocabulary.length).toBeGreaterThan(0);
  expect(payload.vocabulary.every((word) => word.sourcePhraseIds.length > 0)).toBe(true);
  expect(payload.contentItems.map((item) => item.target.text)).toEqual(
    LESSON_1_PHRASES.map((phrase) => phrase.english),
  );
});

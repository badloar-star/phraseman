// зачем: каждая карточка юнита обязана трассироваться к живому языковому объекту
// с принятыми/отклонёнными вариантами и причинами — иначе QA не сможет блокировать
// потерю смысла. RED-тесты фиксируют контракт до реализации.
import {
  assertContentItemCompatibleWithProfile,
  validateV2ContentItem,
} from '../modules/learning-v2/content/content_item';
import { validateV2LanguageProfile } from '../modules/learning-v2/content/language_profile';

const valid = {
  schemaVersion: 'v2-content-item.v1',
  contentItemId: 'e1-introduce-name-01',
  episodeId: 'ep-01',
  intentId: 'introduce_self_name',
  target: { locale: 'en', text: 'I am Anna.', register: 'neutral', region: 'general' },
  learnerMeanings: [{ locale: 'ru', value: 'Я Анна.', sourceHash: 'a'.repeat(64) }],
  acceptedAnswers: ['I am Anna.', "I'm Anna."],
  rejectedAnswers: [{ value: 'I Anna.', reasonCode: 'copula_missing' }],
  linguisticFeatures: ['copula_be', 'first_person_singular'],
  pronunciationTargets: ['stress_anna'],
  prerequisiteContentItemIds: [],
  objectiveIds: ['obj-introduce-self'],
  compatibleFamilies: ['listen_choose', 'phrase_builder', 'quick_spoken_response'],
};

test('accepts one traceable language-native content item', () => {
  expect(validateV2ContentItem(valid)).toMatchObject({ ok: true });
});

test.each([
  ['accepted_answer_duplicate', { acceptedAnswers: ['I am Anna.', ' i am anna. '] }],
  ['content_item_objective_required', { objectiveIds: [] }],
  ['content_item_family_unsupported', { compatibleFamilies: ['describe_scene'] }],
  ['rejected_answer_reason_required', { rejectedAnswers: [{ value: 'I Anna.', reasonCode: '' }] }],
])('rejects %s', (code, change) => {
  expect(validateV2ContentItem({ ...valid, ...change })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining([code]),
  });
});

// зачем: дополнительная броня сверх эскиза Codex — неизвестные поля, пустой target,
// дубль отклонённого варианта среди принятых (противоречие данных) и битые ссылки.
test('fails closed on malformed bodies', () => {
  expect(validateV2ContentItem(null).ok).toBe(false);
  expect(validateV2ContentItem({ ...valid, hiddenPrompt: 'x' })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['content_item_unknown_field']),
  });
  expect(validateV2ContentItem({ ...valid, target: { ...valid.target, text: '  ' } })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['content_item_target_text_required']),
  });
  expect(validateV2ContentItem({ ...valid, acceptedAnswers: [] })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['content_item_accepted_answer_required']),
  });
  expect(validateV2ContentItem({
    ...valid,
    rejectedAnswers: [{ value: "I'm Anna.", reasonCode: 'contraction' }],
  })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['rejected_answer_conflicts_accepted']),
  });
  expect(validateV2ContentItem({ ...valid, learnerMeanings: [] })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['content_item_meaning_required']),
  });
  expect(validateV2ContentItem({
    ...valid,
    learnerMeanings: [{ locale: 'ru', value: 'Я Анна.', sourceHash: 'zz' }],
  })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['content_item_meaning_hash_invalid']),
  });
  expect(validateV2ContentItem({ ...valid, prerequisiteContentItemIds: ['e1-introduce-name-01'] })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['content_item_prerequisite_self_reference']),
  });
});

function buildProfile() {
  const result = validateV2LanguageProfile({
    schemaVersion: 'v2-language-profile-body.v1',
    profileId: 'english-general-a1',
    version: 1,
    targetLanguage: 'en',
    script: { system: 'latin', direction: 'ltr', tokenization: 'space_delimited', joiningBehavior: 'none' },
    grammar: {
      dominantWordOrders: ['svo'],
      morphology: 'mixed',
      grammaticalFeatures: ['person', 'number', 'tense'],
      registerFeatures: ['neutral', 'formal', 'informal'],
    },
    speech: { lexicalTone: false, stressSystem: 'lexical', ttsLocales: ['en-US'], sttLocales: ['en-US'] },
    scriptCurricula: [],
    supportedActivityFamilies: ['listen_choose', 'phrase_builder', 'quick_spoken_response'],
  });
  if (!result.ok) throw new Error('profile_expected_valid');
  return result.value;
}

test('profile compatibility rejects language and family mismatches', () => {
  const validated = validateV2ContentItem(valid);
  if (!validated.ok) throw new Error('item_expected_valid');
  expect(() => assertContentItemCompatibleWithProfile(validated.value, buildProfile())).not.toThrow();
  expect(() => assertContentItemCompatibleWithProfile(
    { ...validated.value, target: { ...validated.value.target, locale: 'de' } },
    buildProfile(),
  )).toThrow('content_item_language_mismatch');
  expect(() => assertContentItemCompatibleWithProfile(
    { ...validated.value, compatibleFamilies: ['listen_choose', 'shadowing_prosody'] },
    buildProfile(),
  )).toThrow('content_item_family_unsupported');
});

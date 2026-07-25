// зачем: владелец утвердил мультиязычный E1-компилятор; профиль языка — неизменяемое
// предусловие генерации (не 14-я стадия фабрики). Тесты фиксируют fail-closed контракт
// для латиницы, иероглифики (zh/ja), хангыля и арабского RTL до появления реализации.
import {
  validateV2LanguageProfile,
  type V2LanguageProfileBody,
} from '../modules/learning-v2/content/language_profile';

const latinProfile: V2LanguageProfileBody = {
  schemaVersion: 'v2-language-profile-body.v1',
  profileId: 'english-general-a1',
  version: 1,
  targetLanguage: 'en',
  script: {
    system: 'latin',
    direction: 'ltr',
    tokenization: 'space_delimited',
    joiningBehavior: 'none',
  },
  grammar: {
    dominantWordOrders: ['svo'],
    morphology: 'mixed',
    grammaticalFeatures: ['person', 'number', 'tense'],
    registerFeatures: ['neutral', 'formal', 'informal'],
  },
  speech: {
    lexicalTone: false,
    stressSystem: 'lexical',
    ttsLocales: ['en-US', 'en-GB'],
    sttLocales: ['en-US', 'en-GB'],
  },
  scriptCurricula: [],
  supportedActivityFamilies: [
    'listen_choose',
    'sound_contrast',
    'phrase_builder',
    'listen_build_dictation',
    'context_gap_grammar',
    'quick_spoken_response',
    'shadowing_prosody',
  ],
};

test('accepts an exact Latin profile and freezes the normalized body', () => {
  const result = validateV2LanguageProfile(latinProfile);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('profile_expected_valid');
  expect(Object.isFrozen(result.value)).toBe(true);
});

test.each([
  ['hanzi', ['pinyin_tones', 'hanzi_components']],
  ['kana_kanji', ['hiragana', 'katakana', 'kanji_readings']],
  ['hangul', ['jamo_blocks']],
  ['arabic', ['joining_forms', 'diacritics']],
] as const)('requires the matching script curriculum for %s', (system, curricula) => {
  const candidate = {
    ...latinProfile,
    profileId: `${system}-a1`,
    targetLanguage: system === 'hanzi' ? 'zh' : system === 'kana_kanji' ? 'ja' : system === 'hangul' ? 'ko' : 'ar',
    script: {
      ...latinProfile.script,
      system,
      direction: system === 'arabic' ? ('rtl' as const) : ('ltr' as const),
      tokenization: system === 'hanzi' || system === 'kana_kanji' ? ('language_specific' as const) : ('space_delimited' as const),
      joiningBehavior: system === 'arabic' ? ('contextual' as const) : ('none' as const),
    },
    scriptCurricula: [...curricula],
  };
  expect(validateV2LanguageProfile(candidate).ok).toBe(true);
  expect(validateV2LanguageProfile({ ...candidate, scriptCurricula: [] })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['script_curriculum_required']),
  });
});

test('rejects unknown fields and unsupported activity families', () => {
  expect(validateV2LanguageProfile({ ...latinProfile, hiddenPrompt: 'x' })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['language_profile_unknown_field']),
  });
  expect(validateV2LanguageProfile({
    ...latinProfile,
    supportedActivityFamilies: ['not-a-family'],
  }).ok).toBe(false);
});

// зачем: план требует fail-closed; дополнительно фиксируем крайние случаи, которые
// эскиз Codex пропускал — битые вложенные объекты, пустые списки локалей, кривой
// схем-штамп, дубли учебных программ письма и «профиль не по адресу» (rtl у латиницы).
test('fails closed on malformed nested bodies instead of accepting them', () => {
  expect(validateV2LanguageProfile(null).ok).toBe(false);
  expect(validateV2LanguageProfile([]).ok).toBe(false);
  expect(validateV2LanguageProfile({ ...latinProfile, script: 'latin' }).ok).toBe(false);
  expect(validateV2LanguageProfile({ ...latinProfile, grammar: null }).ok).toBe(false);
  expect(validateV2LanguageProfile({ ...latinProfile, speech: { ...latinProfile.speech, ttsLocales: [] } })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['language_profile_speech_locales_required']),
  });
  expect(validateV2LanguageProfile({ ...latinProfile, schemaVersion: 'v2-language-profile-body.v2' })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['language_profile_schema_invalid']),
  });
  expect(validateV2LanguageProfile({ ...latinProfile, supportedActivityFamilies: [] })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['language_profile_families_required']),
  });
});

test('normalized body is deeply frozen and detached from caller input', () => {
  const mutable = JSON.parse(JSON.stringify(latinProfile));
  const result = validateV2LanguageProfile(mutable);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('profile_expected_valid');
  mutable.targetLanguage = 'de';
  mutable.script.system = 'arabic';
  expect(result.value.targetLanguage).toBe('en');
  expect(result.value.script.system).toBe('latin');
  expect(Object.isFrozen(result.value.script)).toBe(true);
  expect(Object.isFrozen(result.value.supportedActivityFamilies)).toBe(true);
});

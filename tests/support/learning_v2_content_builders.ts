// зачем: билдеры для тестов компилятора — прогоняют данные через НАСТОЯЩИЕ валидаторы
// (не руками собранные объекты), чтобы тесты не могли разойтись с контрактами.
// Никаких записей в исходники или фикстуры — только значения в памяти.
import {
  validateV2LanguageProfile,
  type V2LanguageProfileBody,
} from '../../modules/learning-v2/content/language_profile';
import {
  validateV2ContentItem,
  type V2ContentItem,
} from '../../modules/learning-v2/content/content_item';

export function buildEnglishProfile(): V2LanguageProfileBody {
  const result = validateV2LanguageProfile({
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
    // зачем: покрывает все семьи из версионной таблицы сессий REQUIRED_SESSION_POLICY_V1.
    supportedActivityFamilies: [
      'listen_choose',
      'sound_contrast',
      'speed_match',
      'phrase_builder',
      'listen_build_dictation',
      'context_gap_grammar',
      'quick_spoken_response',
      'shadowing_prosody',
      'scripted_repeat_compare',
      'scripted_dialogue',
    ],
  });
  if (!result.ok) throw new Error(`english_profile_invalid: ${result.issues.join(',')}`);
  return result.value;
}

interface RawItemSeed {
  readonly suffix: string;
  readonly text: string;
  readonly meaning: string;
  readonly accepted: readonly string[];
  readonly rejectedValue: string;
  readonly reasonCode: string;
  readonly features: readonly string[];
}

const E1_SEEDS: readonly RawItemSeed[] = [
  { suffix: 'introduce-name-01', text: 'I am Anna.', meaning: 'Я Анна.', accepted: ['I am Anna.', "I'm Anna."], rejectedValue: 'I Anna.', reasonCode: 'copula_missing', features: ['copula_be', 'first_person_singular'] },
  { suffix: 'introduce-you-02', text: 'You are Tom.', meaning: 'Ты Том.', accepted: ['You are Tom.', "You're Tom."], rejectedValue: 'You Tom.', reasonCode: 'copula_missing', features: ['copula_be', 'second_person_singular'] },
  { suffix: 'origin-city-03', text: 'I am from Madrid.', meaning: 'Я из Мадрида.', accepted: ['I am from Madrid.', "I'm from Madrid."], rejectedValue: 'I from Madrid.', reasonCode: 'copula_missing', features: ['copula_be', 'preposition_from'] },
  { suffix: 'greeting-04', text: 'Nice to meet you.', meaning: 'Приятно познакомиться.', accepted: ['Nice to meet you.'], rejectedValue: 'Nice meet you.', reasonCode: 'infinitive_marker_missing', features: ['fixed_expression'] },
  { suffix: 'name-question-05', text: 'What is your name?', meaning: 'Как тебя зовут?', accepted: ['What is your name?', "What's your name?"], rejectedValue: 'What your name?', reasonCode: 'copula_missing', features: ['question_word', 'copula_be'] },
  { suffix: 'origin-question-06', text: 'Where are you from?', meaning: 'Откуда ты?', accepted: ['Where are you from?'], rejectedValue: 'Where you from?', reasonCode: 'copula_missing', features: ['question_word', 'preposition_from'] },
  { suffix: 'she-name-07', text: 'She is Maria.', meaning: 'Она Мария.', accepted: ['She is Maria.', "She's Maria."], rejectedValue: 'She Maria.', reasonCode: 'copula_missing', features: ['copula_be', 'third_person_singular'] },
  { suffix: 'he-origin-08', text: 'He is from Japan.', meaning: 'Он из Японии.', accepted: ['He is from Japan.', "He's from Japan."], rejectedValue: 'He from Japan.', reasonCode: 'copula_missing', features: ['copula_be', 'third_person_singular', 'preposition_from'] },
  { suffix: 'greeting-hello-09', text: 'Hello, I am new here.', meaning: 'Привет, я здесь новенький.', accepted: ['Hello, I am new here.', "Hello, I'm new here."], rejectedValue: 'Hello, I new here.', reasonCode: 'copula_missing', features: ['copula_be', 'greeting'] },
  { suffix: 'polite-repeat-10', text: 'Sorry, can you repeat that?', meaning: 'Извините, можете повторить?', accepted: ['Sorry, can you repeat that?'], rejectedValue: 'Sorry, you repeat that?', reasonCode: 'modal_missing', features: ['modal_can', 'question'] },
];

// зачем: каждая карточка требует семью из таблицы сессий; айтемы делят покрытие семей,
// чтобы у компилятора всегда был выбор ≥3 семей на сессию при полном банке.
const FAMILY_ROTATION: readonly (readonly string[])[] = [
  ['listen_choose', 'phrase_builder', 'quick_spoken_response', 'speed_match', 'scripted_dialogue'],
  ['listen_choose', 'sound_contrast', 'context_gap_grammar', 'listen_build_dictation', 'shadowing_prosody'],
  ['phrase_builder', 'speed_match', 'quick_spoken_response', 'scripted_repeat_compare', 'scripted_dialogue'],
  ['listen_choose', 'phrase_builder', 'listen_build_dictation', 'context_gap_grammar', 'shadowing_prosody'],
  ['sound_contrast', 'speed_match', 'quick_spoken_response', 'scripted_repeat_compare', 'scripted_dialogue'],
];

export function buildE1ContentItems(): readonly V2ContentItem[] {
  return E1_SEEDS.map((seed, index) => {
    const result = validateV2ContentItem({
      schemaVersion: 'v2-content-item.v1',
      contentItemId: `e1-${seed.suffix}`,
      episodeId: 'ep-01',
      intentId: 'introduce_self_name',
      target: { locale: 'en', text: seed.text, register: 'neutral', region: 'general' },
      learnerMeanings: [{ locale: 'ru', value: seed.meaning, sourceHash: 'a'.repeat(64) }],
      acceptedAnswers: [...seed.accepted],
      rejectedAnswers: [{ value: seed.rejectedValue, reasonCode: seed.reasonCode }],
      linguisticFeatures: [...seed.features],
      pronunciationTargets: [`stress_${index + 1}`],
      prerequisiteContentItemIds: [],
      objectiveIds: ['obj-introduce-self'],
      compatibleFamilies: [...FAMILY_ROTATION[index % FAMILY_ROTATION.length]],
    });
    if (!result.ok) throw new Error(`e1_item_invalid: ${result.issues.join(',')}`);
    return result.value;
  });
}

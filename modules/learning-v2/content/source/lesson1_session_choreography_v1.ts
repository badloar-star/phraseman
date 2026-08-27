import type { V2ActivityFamily } from '../../contracts/activity';
import type { LearningSupportLevel } from '../../contracts/episode';
import {
  EPISODE_01_SESSION_MAP_V1,
  type SessionKind,
} from './episode_01_session_map_v1';

// зачем: choreography сама по себе языконезависима — распределение семей
// заданий (phrase_builder/listen_choose/...) зависит только от SessionKind,
// не от того, английская это сессия или испанская. Единственное английское
// место было в lesson1SessionChoreographyV1: она молча доставала kind из
// EPISODE_01_SESSION_MAP_V1 (английской карты) вместо того чтобы принять его
// параметром. Испанский контур имеет свою карту (ES_EPISODE_01_SESSION_MAP_V1)
// с тем же SessionKind — эта функция даёт вызывающему выбор источника, не
// меняя ни одного распределения семей внутри.

export type Lesson1InteractionProfileV1 = 'standard' | 'rapid' | 'voice_heavy';
export type Lesson1CardPurposeV1 =
  | 'intro_check'
  | 'supported_practice'
  | 'guided_practice'
  | 'retrieval_practice'
  | 'near_transfer'
  | 'independent_check'
  | 'delayed_review';

export type Lesson1LearningStageV1 =
  | 'intro_check'
  | 'recognize'
  | 'retrieve_meaning'
  | 'build_form'
  | 'apply_in_phrase'
  | 'guided_phrase'
  | 'retrieve_phrase'
  | 'speak_with_model'
  | 'speak_independently'
  | 'delayed_recall'
  | 'independent_assessment';

export type Lesson1ChoreographyStepV1 = Readonly<{
  family: V2ActivityFamily;
  purpose: Lesson1CardPurposeV1;
  targetKind: 'phrase' | 'vocabulary' | 'vocabulary_grid';
  sourcePhraseIndex?: number;
  sourceVocabularyIndex?: number;
  sourceVocabularyIndices?: readonly number[];
  learningStage: Lesson1LearningStageV1;
}>;

export const LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1 =
  'en-e01-s01-mode-native-v1' as const;
export const LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1 =
  'en-e01-s02-mode-native-v1' as const;
// зачем отдельный planId с префиксом es- (а не переиспользование
// LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1): planId — строковый ключ
// диспетчера ниже в lesson1SessionChoreographyV1, а не признак языка сам по
// себе. Испанская сессия 1 (es_episode_01_session_01_mode_native_v1.ts)
// использует ТУ ЖЕ структуру из 17 шагов (то же чередование families по трём
// word-first стадиям для 4 слов + spedd_match + 3 apply/speak шага), что и
// английский эталон session01ModeNativeStepsV1 — но это два разных source-
// файла с разными испанскими/английскими target/audio id, поэтому нужен свой
// именованный шаг, а не расшаренный на оба языка.
export const LESSON1_ES_SESSION_01_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s01-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 2 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): испанская сессия 2 вводит РОВНО одно
// новое слово (no), а не четыре как английский эталон session02ModeNativeStepsV1,
// поэтому её 17-шаговая choreography не может переиспользовать ни английский
// шаблон, ни испанскую сессию 1 (4 слова) — нужна собственная раскладка
// esSession02ModeNativeStepsV1 ниже.
export const LESSON1_ES_SESSION_02_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s02-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 3 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): та же форма, что и сессия 2, — ровно
// одно новое слово (bonito, sourceVocabularyIndex 0), поэтому раскладка шагов
// esSession03ModeNativeStepsV1 ниже почти зеркальна esSession02ModeNativeStepsV1;
// собственный planId нужен, потому что choreography сверяет шаги пофайлово
// (session_source_mode_native_step_mismatch), а не по языку или по форме.
export const LESSON1_ES_SESSION_03_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s03-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 4 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): та же форма, что сессии 2/3, — ровно
// одно новое слово (verdadero, sourceVocabularyIndex 0), поэтому раскладка
// шагов esSession04ModeNativeStepsV1 ниже зеркальна esSession03ModeNativeStepsV1;
// собственный planId нужен, потому что choreography сверяет шаги пофайлово
// (session_source_mode_native_step_mismatch), а не по языку или по форме.
export const LESSON1_ES_SESSION_04_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s04-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 5 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): та же форма, что сессий 2-4, — ровно
// одно новое слово (rápido, sourceVocabularyIndex 0), но ТРИ фразы применения
// вместо двух (Es rápido/Es rápida/No es rápido), поэтому раскладка шагов
// esSession05ModeNativeStepsV1 ниже иначе распределяет application-шаги, чем
// esSession04ModeNativeStepsV1; собственный planId нужен, потому что
// choreography сверяет шаги пофайлово (session_source_mode_native_step_mismatch),
// а не по языку или по форме.
export const LESSON1_ES_SESSION_05_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s05-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 6 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): та же форма, что сессии 4, — ровно
// одно новое слово (único, sourceVocabularyIndex 0) и две фразы применения
// (Es único/Es única), поэтому раскладка шагов esSession06ModeNativeStepsV1
// ниже почти зеркальна esSession04ModeNativeStepsV1; собственный planId
// нужен, потому что choreography сверяет шаги пофайлово
// (session_source_mode_native_step_mismatch), а не по языку или по форме.
export const LESSON1_ES_SESSION_06_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s06-mode-native-v1' as const;
// зачем отдельный planId для испанской voice-сессии 7 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1): в отличие от сессий
// 2-6 (words_then_phrases, ровно одно новое слово) voice-сессия НЕ вводит
// новых слов вообще — её 17 практических слотов заменены на 12: 15 фраз
// минус 3, уже использованные в интро-carousel (introSteps() читает
// sourcePhraseIndex 0/1/2). Легаси generic voiceSteps() ниже использовал
// 'sound_contrast' — семью, снятую с активного authoring 2026-08-25;
// esSession07ModeNativeStepsV1 заменяет оба таких слота на 'listen_choose'.
export const LESSON1_ES_SESSION_07_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s07-mode-native-v1' as const;

function session01ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'recognize' },
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'recognize' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'build_form' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'build_form' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0, 1, 2, 3], learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
  ];
}

function session02ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'recognize' },
    { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'recognize' },
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'retrieve_meaning' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'build_form' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0, 1, 2, 3], learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'speak_with_model' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT):
// испанская сессия 2 вводит одно новое слово (no, sourceVocabularyIndex 0 —
// единственная запись в ES_EPISODE_01_SESSION_02_VOCABULARY_V1) и применяет
// его в двух фразах (No es fácil / No es verdad), обе построенные ТОЛЬКО из
// уже изученных слов. В отличие от английского session02ModeNativeStepsV1
// (4 новых слова × 3 стадии = 12 word-контактов), здесь ровно 3 обязательных
// word-first контакта (recognize/retrieve_meaning/build_form), поэтому
// освободившийся бюджет уходит на более глубокую отработку самого "no": по
// две дополнительные интеракции на recognize и retrieve_meaning (разные
// families на тот же target — разрешено правилом "target+family не
// повторяется", family здесь всегда разная), затем speed_match на весь
// комбинированный словарь сессии 1+2 (собирается внутри mode-native файла,
// choreography видит только собственный sourceVocabularyIndices: [0] сессии
// 2 — ровно как sourceVocabularyIndex у word-шагов ссылается на позицию
// внутри ЭТОЙ сессии, а не на комбинированный список), и наконец пять
// application-шагов на две фразы (phrase_builder/listen_build_dictation/
// context_gap_grammar/listen_choose/phrase_builder) плюс два independent
// scripted_repeat_compare — по одному на каждую фразу, чтобы обе получили
// honest speak_with_model проверку, как того требует word-first правило урока.
function esSession02ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0], learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'speak_with_model' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT):
// испанская сессия 3 вводит одно новое слово (bonito, sourceVocabularyIndex 0 —
// единственная запись в ES_EPISODE_01_SESSION_03_VOCABULARY_V1) и применяет
// его (вместе с производной формой bonita, которую даёт тот же build_form-
// контакт) в двух фразах (Es bonito / Es bonita), обе построены ТОЛЬКО из уже
// изученных слов (es — сессия 1). Форма шагов зеркальна esSession02ModeNativeStepsV1
// (тоже ровно одно новое слово): 3 обязательных word-first контакта
// (recognize/retrieve_meaning/build_form) + по одной дополнительной интеракции
// на recognize и retrieve_meaning другой family на тот же target (разрешено
// правилом "target+family не повторяется"), затем speed_match на
// комбинированный словарь сессии 1+3 (собирается внутри mode-native файла;
// choreography видит только sourceVocabularyIndices: [0] — позицию bonito
// внутри ЭТОЙ сессии), и пять application-шагов на две фразы плюс два
// independent scripted_repeat_compare — по одному на каждую фразу.
function esSession03ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0], learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'speak_with_model' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT):
// испанская сессия 4 вводит одно новое слово (verdadero, sourceVocabularyIndex 0 —
// единственная запись в ES_EPISODE_01_SESSION_04_VOCABULARY_V1) и применяет
// его (вместе с производной формой verdadera, которую даёт тот же build_form-
// контакт) в двух фразах (Es verdadero / Es verdadera), обе построены ТОЛЬКО
// из уже изученных слов (es — сессия 1). Форма шагов зеркальна
// esSession03ModeNativeStepsV1 (тоже ровно одно новое слово): 3 обязательных
// word-first контакта (recognize/retrieve_meaning/build_form) + по одной
// дополнительной интеракции на recognize и retrieve_meaning другой family на
// тот же target (разрешено правилом "target+family не повторяется"), затем
// speed_match на комбинированный словарь сессий 1+3+4 (карта фиксирует
// builtOn/recalls: [1, 3] для этой сессии — собирается внутри mode-native
// файла; choreography видит только sourceVocabularyIndices: [0] — позицию
// verdadero внутри ЭТОЙ сессии), и пять application-шагов на две фразы плюс
// два independent scripted_repeat_compare — по одному на каждую фразу.
function esSession04ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0], learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'speak_with_model' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT):
// испанская сессия 5 вводит одно новое слово (rápido, sourceVocabularyIndex 0 —
// единственная запись в ES_EPISODE_01_SESSION_05_VOCABULARY_V1), но применяет
// его в ТРЁХ фразах (Es rápido/Es rápida/No es rápido — «медленный» через
// отрицание уже известного no, не новое слово), в отличие от сессий 2-4
// (ровно 2 фразы). Форма шагов: 3 обязательных word-first контакта
// (recognize/retrieve_meaning/build_form) + 2 дополнительные интеракции
// другой family на тот же target (разрешено правилом "target+family не
// повторяется"), затем speed_match на комбинированный словарь сессий
// 1+2+4+5 (карта фиксирует builtOn: [1], recalls: [2, 4] — собирается внутри
// mode-native файла; choreography видит только sourceVocabularyIndices: [0]
// — позицию rápido внутри ЭТОЙ сессии), и девять application-шагов на три
// фразы: фраза 0 (Es rápido) — builder/listen_build/repeat, фраза 1
// (Es rápida) — context/listen/builder, фраза 2 (No es rápido) —
// context/listen/repeat. Каждая фраза получает минимум два разных
// family-контакта; фразы 0 и 2 получают independent scripted_repeat_compare
// как два полюса контраста «быстро/медленно».
function esSession05ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0], learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'speak_with_model' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT):
// испанская сессия 6 вводит одно новое слово (único, sourceVocabularyIndex 0 —
// единственная запись в ES_EPISODE_01_SESSION_06_VOCABULARY_V1) и применяет
// его (вместе с производной формой única, которую даёт тот же build_form-
// контакт) в двух фразах (Es único / Es única), обе построены ТОЛЬКО из уже
// изученных слов (es — сессия 1). Форма шагов зеркальна
// esSession04ModeNativeStepsV1 (тоже ровно одно новое слово и две фразы): 3
// обязательных word-first контакта (recognize/retrieve_meaning/build_form) +
// по одной дополнительной интеракции на recognize и retrieve_meaning другой
// family на тот же target (разрешено правилом "target+family не
// повторяется"), затем speed_match на комбинированный словарь сессий 1+5+6
// (карта фиксирует builtOn/recalls: [1, 5] для этой сессии — собирается
// внутри mode-native файла; choreography видит только
// sourceVocabularyIndices: [0] — позицию único внутри ЭТОЙ сессии), и пять
// application-шагов на две фразы плюс два independent
// scripted_repeat_compare — по одному на каждую фразу.
function esSession06ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0], learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'speak_with_model' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT
// + Rules §4.1): испанская voice-сессия 7 не вводит новых слов — все 12
// шагов работают с фразами (targetKind: 'phrase'), индексы 3-14 из 15
// доступных (0-2 уже отработаны в introSteps()). Каждый шаг зеркально
// совпадает по family/purpose/learningStage/sourcePhraseIndex с
// es_episode_01_session_07_mode_native_v1.ts — сверка идёт позиционно
// (session_source_mode_native_step_mismatch при любом расхождении).
// Оба легаси-слота 'sound_contrast' заменены на 'listen_choose'.
function esSession07ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'speak_with_model' },
    { family: 'listen_build_dictation', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'speak_with_model' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'speak_with_model' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'speak_with_model' },
  ];
}

export type Lesson1SessionChoreographyV1 = Readonly<{
  sessionOrdinal: number;
  kind: SessionKind;
  interactionProfile: Lesson1InteractionProfileV1;
  zone: 'understand' | 'use' | 'master';
  support: LearningSupportLevel;
  promptNovelty: 'trained' | 'varied' | 'novel';
  steps: readonly Lesson1ChoreographyStepV1[];
}>;

/**
 * Published shards do not carry authoring-only `targetKind`. A word-first
 * shard is nevertheless self-describing: its 1–5 standalone targets appear
 * once in each of the three ordered contact stages before any phrase task.
 */
export function inferLesson1WordFirstVocabularyCountV1(
  targetTexts: readonly string[],
): number {
  // Word-first shards reserve slots 1-3 for the three intro questions. Their
  // standalone contacts therefore begin at slot 4 inside the 20-slot rapid
  // profile instead of being silently consumed by the intro.
  if (targetTexts.length !== 20) return 0;
  const practiceTargets = targetTexts.slice(3);
  for (let count = 1; count <= 5; count += 1) {
    const first = practiceTargets.slice(0, count);
    if (
      first.length === count &&
      first.every((target) => target.trim().length > 0 && !/\s/u.test(target.trim())) &&
      new Set(practiceTargets.slice(count, count * 2)).size === count &&
      practiceTargets.slice(count, count * 2).every((target) => first.includes(target)) &&
      new Set(practiceTargets.slice(count * 2, count * 3)).size === count &&
      practiceTargets.slice(count * 2, count * 3).every((target) => first.includes(target))
    ) return count;
  }
  return 0;
}

/**
 * Reconstructs the authored phrase inventory from a published word-first
 * shard. Slots 1-3 are intro checks and every new word occupies three
 * standalone contacts, so only the remaining application targets count.
 */
export function inferLesson1WordFirstPhraseCountV1(
  targetTexts: readonly string[],
  vocabularyCount: number,
): number {
  if (vocabularyCount === 0) return 1;
  const phraseApplicationStart = 3 + vocabularyCount * 3;
  return Math.max(
    1,
    new Set(
      targetTexts
        .slice(phraseApplicationStart)
        .map((target) => target.normalize('NFC').trim())
        .filter(Boolean),
    ).size,
  );
}

const introSteps = (phraseCount = 15): readonly Lesson1ChoreographyStepV1[] =>
  [0, 1, 2].map((sourcePhraseIndex) => ({
    family: 'phrase_builder' as const,
    purpose: 'intro_check' as const,
    targetKind: 'phrase' as const,
    sourcePhraseIndex: sourcePhraseIndex % phraseCount,
    learningStage: 'intro_check' as const,
  }));

function legacyWordsThenPhrasesSteps(): readonly Lesson1ChoreographyStepV1[] {
  const contacts: Lesson1ChoreographyStepV1[] = [];
  const stages = [
    ['listen_choose', 'supported_practice', 'recognize'],
    ['speed_match', 'retrieval_practice', 'retrieve_meaning'],
    ['phrase_builder', 'guided_practice', 'build_form'],
    ['context_gap_grammar', 'near_transfer', 'apply_in_phrase'],
  ] as const;
  for (const [family, purpose, learningStage] of stages) {
    for (let sourcePhraseIndex = 0; sourcePhraseIndex < 4; sourcePhraseIndex += 1) {
      contacts.push({
        family,
        purpose,
        targetKind: 'phrase',
        sourcePhraseIndex,
        learningStage,
      });
    }
  }
  contacts.push({
    family: 'phrase_builder',
    purpose: 'independent_check',
    targetKind: 'phrase',
    sourcePhraseIndex: 4,
    learningStage: 'independent_assessment',
  });
  return contacts;
}

function wordsThenPhrasesSteps(
  vocabularyCount: number,
  phraseCount: number,
): readonly Lesson1ChoreographyStepV1[] {
  if (!Number.isInteger(vocabularyCount) || vocabularyCount < 1 || vocabularyCount > 5)
    throw new Error('lesson1_word_first_vocabulary_count_invalid');
  if (!Number.isInteger(phraseCount) || phraseCount < 1)
    throw new Error('lesson1_word_first_phrase_count_invalid');

  const contactStages = [
    ['listen_choose', 'supported_practice', 'recognize'],
    ['speed_match', 'retrieval_practice', 'retrieve_meaning'],
    ['context_gap_grammar', 'guided_practice', 'build_form'],
  ] as const;
  const contacts = contactStages.flatMap(([family, purpose, learningStage]) =>
    Array.from({ length: vocabularyCount }, (_, sourceVocabularyIndex) => ({
      family,
      purpose,
      targetKind: 'vocabulary' as const,
      sourceVocabularyIndex,
      learningStage,
    })),
  );
  const ordinaryPhraseFamilies = [
    'phrase_builder',
    'listen_choose',
    'context_gap_grammar',
    'listen_build_dictation',
    'speed_match',
  ] as const;
  const extendedPhraseFamilies = [
    ...ordinaryPhraseFamilies,
    'sound_contrast',
    'scripted_repeat_compare',
  ] as const;
  const phraseInteractionCount = 17 - contacts.length;
  if (phraseInteractionCount < 2)
    throw new Error('lesson1_word_first_phrase_application_budget_invalid');

  const ordinaryPairs = Array.from({ length: phraseInteractionCount }, (_, index) => ({
    sourcePhraseIndex: index % phraseCount,
    family: ordinaryPhraseFamilies[index % ordinaryPhraseFamilies.length]!,
  }));
  const ordinaryPairKeys = ordinaryPairs.map(
    ({ sourcePhraseIndex, family }) => `${sourcePhraseIndex}\u0000${family}`,
  );
  const ordinarySequenceRepeats = new Set(ordinaryPairKeys).size !== ordinaryPairKeys.length;
  const phraseFamilies = ordinarySequenceRepeats
    ? extendedPhraseFamilies
    : ordinaryPhraseFamilies;

  if (phraseInteractionCount > phraseCount * phraseFamilies.length) {
    throw new Error('lesson1_word_first_unique_target_family_budget_invalid');
  }

  const applications = Array.from({ length: phraseInteractionCount }, (_, index) => {
    const sourcePhraseIndex = index % phraseCount;
    const familyRound = Math.floor(index / phraseCount);
    return {
      family: ordinarySequenceRepeats
        ? phraseFamilies[(sourcePhraseIndex + familyRound) % phraseFamilies.length]!
        : ordinaryPairs[index]!.family,
      purpose:
        index < 2
          ? ('guided_practice' as const)
          : index < phraseInteractionCount - 2
            ? ('near_transfer' as const)
            : ('independent_check' as const),
      targetKind: 'phrase' as const,
      sourcePhraseIndex,
      learningStage: 'apply_in_phrase' as const,
    };
  });
  return [...contacts, ...applications];
}

function phraseSteps(): readonly Lesson1ChoreographyStepV1[] {
  const families = [
    'listen_choose',
    'phrase_builder',
    'context_gap_grammar',
    'listen_choose',
    'phrase_builder',
    'context_gap_grammar',
    'speed_match',
    'phrase_builder',
    'listen_build_dictation',
    'context_gap_grammar',
    'listen_build_dictation',
    'phrase_builder',
  ] as const;
  const purposes = [
    'supported_practice',
    'supported_practice',
    'guided_practice',
    'guided_practice',
    'retrieval_practice',
    'retrieval_practice',
    'retrieval_practice',
    'near_transfer',
    'near_transfer',
    'independent_check',
    'delayed_review',
    'independent_check',
  ] as const;
  return families.map((family, index) => ({
    family,
    purpose: purposes[index]!,
    targetKind: 'phrase' as const,
    sourcePhraseIndex: index + 3,
    learningStage:
      index < 4
        ? ('guided_phrase' as const)
        : index < 9
          ? ('retrieve_phrase' as const)
          : ('independent_assessment' as const),
  }));
}

function voiceSteps(): readonly Lesson1ChoreographyStepV1[] {
  const families = [
    'listen_choose',
    'sound_contrast',
    'scripted_repeat_compare',
    'scripted_repeat_compare',
    'listen_build_dictation',
    'scripted_repeat_compare',
    'sound_contrast',
    'scripted_repeat_compare',
    'listen_choose',
  ] as const;
  return families.map((family, index) => ({
    family,
    purpose:
      index < 2
        ? ('retrieval_practice' as const)
        : index < 6
          ? ('near_transfer' as const)
          : ('independent_check' as const),
    targetKind: 'phrase' as const,
    sourcePhraseIndex: index + 3,
    learningStage:
      index < 6 ? ('speak_with_model' as const) : ('speak_independently' as const),
  }));
}

function recallSteps(): readonly Lesson1ChoreographyStepV1[] {
  const families = [
    'speed_match',
    'listen_build_dictation',
    'phrase_builder',
    'context_gap_grammar',
    'speed_match',
    'listen_build_dictation',
    'phrase_builder',
    'context_gap_grammar',
    'speed_match',
    'listen_build_dictation',
    'phrase_builder',
    'speed_match',
  ] as const;
  return families.map((family, index) => ({
    family,
    purpose:
      index < 6
        ? ('retrieval_practice' as const)
        : index < 9
          ? ('delayed_review' as const)
          : ('independent_check' as const),
    targetKind: 'phrase' as const,
    sourcePhraseIndex: index + 3,
    learningStage:
      index < 9 ? ('delayed_recall' as const) : ('independent_assessment' as const),
  }));
}

function checkpointSteps(): readonly Lesson1ChoreographyStepV1[] {
  const families = [
    'speed_match',
    'listen_build_dictation',
    'context_gap_grammar',
    'phrase_builder',
    'listen_build_dictation',
    'context_gap_grammar',
    'phrase_builder',
    'speed_match',
    'listen_build_dictation',
    'context_gap_grammar',
    'phrase_builder',
    'speed_match',
  ] as const;
  return families.map((family, index) => ({
    family,
    purpose:
      index < 4
        ? ('retrieval_practice' as const)
        : index < 8
          ? ('near_transfer' as const)
          : ('independent_check' as const),
    targetKind: 'phrase' as const,
    sourcePhraseIndex: index + 3,
    learningStage: 'independent_assessment' as const,
  }));
}

function practiceSteps(kind: SessionKind): readonly Lesson1ChoreographyStepV1[] {
  if (kind === 'words_then_phrases') return legacyWordsThenPhrasesSteps();
  if (kind === 'voice') return voiceSteps();
  if (kind === 'recall') return recallSteps();
  if (kind === 'checkpoint') return checkpointSteps();
  return phraseSteps();
}

function kindMayIntroduceVocabulary(kind: SessionKind): boolean {
  return kind !== 'voice' && kind !== 'recall' && kind !== 'checkpoint';
}

function profileFor(
  kind: SessionKind,
  vocabularyCount = 0,
): Lesson1InteractionProfileV1 {
  if (vocabularyCount > 0 && kindMayIntroduceVocabulary(kind)) return 'rapid';
  if (kind === 'words_then_phrases' || kind === 'irregular_verbs' || kind === 'prepositions') {
    return 'rapid';
  }
  if (kind === 'voice') return 'voice_heavy';
  return 'standard';
}

function supportFor(
  ordinal: number,
  kind: SessionKind,
): Readonly<{
  zone: Lesson1SessionChoreographyV1['zone'];
  support: LearningSupportLevel;
  promptNovelty: Lesson1SessionChoreographyV1['promptNovelty'];
}> {
  if (kind === 'checkpoint' || kind === 'recall') {
    return { zone: 'master', support: 'none', promptNovelty: 'novel' };
  }
  if (kind === 'voice') {
    return { zone: 'master', support: 'visual_only', promptNovelty: 'varied' };
  }
  const position = ((ordinal - 1) % 8) + 1;
  if (position <= 3) {
    const support = position === 1 ? 'model' : position === 2 ? 'full_text' : 'partial_cue';
    return { zone: 'understand', support, promptNovelty: 'trained' };
  }
  if (position <= 6) {
    return {
      zone: 'use',
      support: position === 6 ? 'visual_only' : 'partial_cue',
      promptNovelty: 'varied',
    };
  }
  return { zone: 'master', support: 'visual_only', promptNovelty: 'novel' };
}

/**
 * Обратная совместимость: английский конвейер продолжает вызывать эту
 * функцию без второго аргумента и получает kind из английской карты,
 * байт в байт как раньше.
 */
export function lesson1SessionChoreographyV1(
  sessionOrdinal: number,
  kindOverride?: SessionKind,
  vocabularyCount = 0,
  phraseCount = 15,
  modeNativePlanId?: string,
): Lesson1SessionChoreographyV1 {
  const kind = kindOverride ?? EPISODE_01_SESSION_MAP_V1[sessionOrdinal - 1]?.kind;
  if (!kind) throw new Error('lesson1_session_choreography_ordinal_invalid');
  const support = supportFor(sessionOrdinal, kind);
  return Object.freeze({
    sessionOrdinal,
    kind,
    interactionProfile: profileFor(kind, vocabularyCount),
    ...support,
    steps: Object.freeze(
      modeNativePlanId === LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1 ||
      modeNativePlanId === LESSON1_ES_SESSION_01_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...session01ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...session02ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_02_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession02ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_03_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession03ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_04_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession04ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_05_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession05ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_06_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession06ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_07_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession07ModeNativeStepsV1()]
        : vocabularyCount > 0 && kindMayIntroduceVocabulary(kind)
        ? [...introSteps(phraseCount), ...wordsThenPhrasesSteps(vocabularyCount, phraseCount)]
        : [...introSteps(), ...practiceSteps(kind)],
    ),
  });
}

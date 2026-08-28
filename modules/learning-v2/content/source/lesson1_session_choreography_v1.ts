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
// зачем отдельный planId для испанской checkpoint-сессии 8 (владелец,
// 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1): как и
// voice-сессия 7, checkpoint не вводит новых слов — 12 практических слотов
// (после 3 интро) на индексах 3-14 из тех же 15 фраз. Легаси
// checkpointSteps() уже использовал только утверждённые families, но его
// learningStage: 'independent_assessment' не входит в допустимый набор
// SessionModeNativePracticeSourceV1.learningStage — esSession08ModeNativeStepsV1
// ниже заменяет его на 'apply_in_phrase'.
export const LESSON1_ES_SESSION_08_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s08-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 9 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 2 "Ты: вопрос"): первая сессия
// главы 2, вводит ровно одно новое слово (eres, sourceVocabularyIndex 0 —
// единственная запись в ES_EPISODE_01_SESSION_09_VOCABULARY_V1) и применяет
// его в ЧЕТЫРЁХ фразах (Eres bonito/Eres bonita/Eres rápido/Eres rápida),
// поэтому раскладка шагов esSession09ModeNativeStepsV1 ниже ближе всего к
// esSession05ModeNativeStepsV1 (тоже 3 фразы применения на одно новое слово,
// здесь их четыре); собственный planId нужен, потому что choreography
// сверяет шаги пофайлово (session_source_mode_native_step_mismatch), а не по
// языку или по форме.
export const LESSON1_ES_SESSION_09_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s09-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 10 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 2 "Ты: вопрос"): сессия 10 не
// вводит новых слов (как voice-сессия 7) — все 15 фраз оборачивают уже
// изученную лексику в вопрос ¿...? без инверсии. Легаси generic phraseSteps()
// уже использовал только утверждённые families (без sound_contrast),
// поэтому esSession10ModeNativeStepsV1 ниже зеркалит его состав 1:1, отличие
// только в реальном mode-native payload вместо generic-карточки на каждом шаге.
export const LESSON1_ES_SESSION_10_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s10-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 11 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 2 "Ты: вопрос"): сессия 11 не
// вводит новых слов — 15 фраз комбинируют отрицание no (сессия 2) со всеми
// тремя связками ser (soy/eres/es). Тот же класс, что сессия 10 — легаси
// generic phraseSteps() уже использовал только утверждённые families,
// esSession11ModeNativeStepsV1 ниже зеркалит его состав 1:1.
export const LESSON1_ES_SESSION_11_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s11-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 12 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 2 "Ты: вопрос"): сессия 12
// вводит одно новое слово (segura, sourceVocabularyIndex 0 — единственная
// запись в ES_EPISODE_01_SESSION_12_VOCABULARY_V1) и применяет его в двух
// фразах (¿Eres segura?/¿Es segura?), тот же класс, что сессии 9/4/6.
export const LESSON1_ES_SESSION_12_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s12-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 13 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 2 "Ты: вопрос"): сессия 13 не
// вводит новых слов (тема pro-drop раскрывается только в intro-страницах) —
// тот же класс, что сессии 10/11.
export const LESSON1_ES_SESSION_13_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s13-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 14 (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 2 "Ты: вопрос"): сессия 14 не
// вводит слово через word-first vocabulary (de acuerdo — двухсловная
// формула, вводится прямо во фразах как обычные позиционные токены) — тот
// же класс, что сессии 10/11/13.
export const LESSON1_ES_SESSION_14_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s14-mode-native-v1' as const;
// зачем отдельный planId для испанской voice-сессии 15 (владелец,
// 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1, Глава 2
// "Ты: вопрос"): та же ситуация, что и voice-сессия 7 — легаси generic
// voiceSteps() ниже использует 'sound_contrast', снятую с активного
// authoring 2026-08-25. esSession15ModeNativeStepsV1 — явный override,
// который гарантирует, что broken generic voiceSteps() никогда не
// достигается для этой сессии.
export const LESSON1_ES_SESSION_15_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s15-mode-native-v1' as const;
// зачем отдельный planId для испанской checkpoint-сессии 16 (владелец,
// 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1, финал
// Главы 2 "Ты: вопрос"): как и checkpoint-сессия 8, сессия 16 не вводит
// новых слов — 12 практических слотов (после 3 интро) на индексах 3-14 из
// тех же 15 фраз, что и voice-сессия 15. Легаси checkpointSteps() уже
// использует только утверждённые families, но его
// learningStage: 'independent_assessment' не входит в допустимый набор —
// esSession16ModeNativeStepsV1 заменяет его на 'apply_in_phrase'.
export const LESSON1_ES_SESSION_16_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s16-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 17 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, открывает Главу 3 "Он, она, оно:
// предметы и ситуации"): сессия 17 не вводит новых слов — тот же класс,
// что сессии 10/11/13 (kind: 'phrases'). esSession17ModeNativeStepsV1
// зеркалит состав легаси generic phraseSteps() 1:1.
export const LESSON1_ES_SESSION_17_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s17-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 18 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): сессия 18 вводит одно новое слово
// (barato, sourceVocabularyIndex 0 — единственная запись в
// ES_EPISODE_01_SESSION_18_VOCABULARY_V1) и применяет его в четырёх фразах
// (Es barato/Es barata/No es caro/¿Es caro o barato?), тот же класс, что
// сессии 4/6/9/12.
export const LESSON1_ES_SESSION_18_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s18-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 19 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): сессия 19 не вводит новых слов —
// тот же класс, что сессии 10/11/13/17 (kind: 'phrases').
// esSession19ModeNativeStepsV1 зеркалит состав легаси generic
// phraseSteps() 1:1.
export const LESSON1_ES_SESSION_19_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s19-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 20 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): сессия 20 не вводит новых слов —
// тот же класс, что сессии 10/11/13/17/19 (kind: 'phrases').
// esSession20ModeNativeStepsV1 зеркалит состав легаси generic
// phraseSteps() 1:1.
export const LESSON1_ES_SESSION_20_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s20-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 21 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): сессия 21 вводит одно новое слово
// (libro, sourceVocabularyIndex 0 — единственная запись в
// ES_EPISODE_01_SESSION_21_VOCABULARY_V1, первое СУЩЕСТВИТЕЛЬНОЕ курса) и
// применяет его в 15 фразах. esSession21ModeNativeStepsV1 НЕ зеркалит
// легаси generic wordsThenPhrasesSteps() — фразы этой сессии (4-6 слов
// каждая) дают >8 уникальных дистракторов, что превышает предел
// responseFeedbackById в course_session_client_children_v1.ts, поэтому
// phrase_builder/listen_build_dictation здесь не используются на фразах
// вообще (см. подробный комментарий в es_episode_01_session_21_mode_native_v1.ts).
export const LESSON1_ES_SESSION_21_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s21-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 22 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md): сессия 22 не вводит новых слов —
// тот же класс, что сессии 10/11/13/17/19/20 (kind: 'phrases').
// esSession22ModeNativeStepsV1 НЕ зеркалит легаси generic phraseSteps() —
// большинство фраз этой сессии дают >8 уникальных дистракторов, поэтому
// phrase_builder/listen_build_dictation используются только на индексах
// 0/1/5 (см. подробный комментарий в es_episode_01_session_22_mode_native_v1.ts).
export const LESSON1_ES_SESSION_22_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s22-mode-native-v1' as const;
// зачем отдельный planId для испанской voice-сессии 23 (владелец,
// 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1, Глава 3
// "Он, она, оно: предметы и ситуации"): та же ситуация, что voice-сессии
// 7 и 15 — легаси generic voiceSteps() ниже использует 'sound_contrast',
// снятую с активного authoring 2026-08-25. esSession23ModeNativeStepsV1 —
// явный override, который гарантирует, что broken generic voiceSteps()
// никогда не достигается для этой сессии.
export const LESSON1_ES_SESSION_23_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s23-mode-native-v1' as const;
// зачем отдельный planId для испанской checkpoint-сессии 24 (владелец,
// 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1, финал
// Главы 3 "Он, она, оно: предметы и ситуации"): как и checkpoint-сессия 16,
// сессия 24 не вводит новых слов — 12 практических слотов (после 3 интро)
// на индексах 3-14 из тех же 15 фраз, что и voice-сессия 23. Легаси
// checkpointSteps() уже использует только утверждённые families, но его
// learningStage: 'independent_assessment' не входит в допустимый набор —
// esSession24ModeNativeStepsV1 заменяет его на 'apply_in_phrase'.
export const LESSON1_ES_SESSION_24_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s24-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 25 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, открывает Главу 4 "Мы и они"):
// сессия 25 не вводит новых слов — тот же класс, что сессии 10/11/13/17/
//19/20 (kind: 'phrases'), учит somos (первое лицо множественного числа)
// через 15 двойных реплик (recall soy/eres/es + somos-реакция).
// esSession25ModeNativeStepsV1 НЕ зеркалит легаси generic phraseSteps() —
// 7 из 15 фраз (двойные реплики) дают >8 уникальных дистракторов, что
// превышает предел responseFeedbackById в course_session_client_children_v1.ts,
// поэтому phrase_builder/listen_build_dictation используются только на
// индексах 3/6/7/9/12 (см. подробный комментарий в
// es_episode_01_session_25_mode_native_v1.ts).
export const LESSON1_ES_SESSION_25_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s25-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 26 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 4 "Мы и они"): сессия 26
// вводит одно новое слово (rápidos, sourceVocabularyIndex 0 — единственная
// запись в ES_EPISODE_01_SESSION_26_VOCABULARY_V1) — форма множественного
// числа уже известного rápido, впервые признак согласуется сразу по двум
// осям (род + число). esSession26ModeNativeStepsV1 зеркалит структуру
// esSession18ModeNativeStepsV1 (words_then_phrases, 3 word-first контакта +
// доп. интеракции + speed_match + application-шаги), но с 15 короткими
// application-фразами этой сессии — только индекс 12 (No somos fáciles, de
// acuerdo) даёт >8 уникальных дистракторов и не используется в
// phrase_builder/listen_build_dictation.
export const LESSON1_ES_SESSION_26_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s26-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 27 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 4 "Мы и они"): сессия 27 не
// вводит новых слов — тот же класс, что сессии 10/11/13/17/19/20/25 (kind:
// 'phrases'), учит third_person_plural (son) через 15 фраз (двойные
// реплики recall es/somos + son-реакция, вперемешку с самостоятельными
// son-фразами). esSession27ModeNativeStepsV1 НЕ зеркалит легаси generic
// phraseSteps() — только индексы 6/14 дают >8 уникальных дистракторов и не
// используются в phrase_builder/listen_build_dictation (см. подробный
// комментарий в es_episode_01_session_27_mode_native_v1.ts).
export const LESSON1_ES_SESSION_27_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s27-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 28 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 4 "Мы и они"): сессия 28 не
// вводит новых слов формально (числительные dos/tres — обычные позиционные
// токены, как раньше артикли/союзы) — тот же класс, что сессии 10/11/13/
// 17/19/20/25/27 (kind: 'phrases'), учит number_with_ser (ser + число) через
// 15 фраз. Все фразы укладываются в 8-дистракторный предел, поэтому
// esSession28ModeNativeStepsV1 свободно использует phrase_builder/
// listen_build_dictation на всех индексах.
export const LESSON1_ES_SESSION_28_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s28-mode-native-v1' as const;
// зачем отдельный planId для испанской сессии 29 (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, Глава 4 "Мы и они"): сессия 29 не
// вводит новых слов — тот же класс, что сессии 10/11/13/17/19/20/25/27
// (kind: 'phrases'), завершает парадигму отрицания связки ser (no somos/
// son + признак с полным согласованием рода и числа: rápidos/rápidas,
// bonitos/bonitas, únicos/únicas, caros/caras). esSession29ModeNativeStepsV1
// НЕ зеркалит легаси generic phraseSteps() — только индекс 13 даёт >8
// уникальных дистракторов и не используется в phrase_builder/
// listen_build_dictation (см. подробный комментарий в
// es_episode_01_session_29_mode_native_v1.ts).
export const LESSON1_ES_SESSION_29_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s29-mode-native-v1' as const;
// зачем отдельный planId для испанской recall-сессии 30 (владелец,
// 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md, закрывает основной
// корпус Главы 4 "Мы и они" перед voice-сессией 31 и checkpoint-сессией
// 32): сессия 30 не вводит новых слов — 15 свежих фраз пробегают все пять
// форм связки ser подряд (soy/eres/es/somos/son), утвердительные +
// отрицательные + диалоговые/вопросительные. esSession30ModeNativeStepsV1
// НЕ зеркалит легаси generic phraseSteps() — пять диалоговых/вопросительных
// фраз (индексы 10-14) дают >8 уникальных дистракторов и не используются в
// phrase_builder/listen_build_dictation (см. подробный комментарий в
// es_episode_01_session_30_mode_native_v1.ts).
export const LESSON1_ES_SESSION_30_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s30-mode-native-v1' as const;
// зачем отдельный planId для испанской voice-сессии 31 (владелец,
// 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1, завершает
// Главу 4 "Мы и они" перед checkpoint-сессией 32): та же ситуация, что и
// voice-сессии 7/15/23 — легаси generic voiceSteps() ниже использует
// 'sound_contrast', снятую с активного authoring 2026-08-25.
// esSession31ModeNativeStepsV1 — явный override, который гарантирует, что
// broken generic voiceSteps() никогда не достигается для этой сессии.
export const LESSON1_ES_SESSION_31_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s31-mode-native-v1' as const;
// зачем отдельный planId для испанской checkpoint-сессии 32 (владелец,
// 2026-08-28, MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1, закрывает
// Главу 4 "Мы и они"): как и checkpoint-сессия 24, сессия 32 не вводит
// новых слов — 12 практических слотов (после 3 интро) на индексах 3-14 из
// тех же 15 фраз, что и voice-сессия 31. Легаси checkpointSteps() уже
// использует только утверждённые families, но mode-native контракт требует
// явный авторский план вместо generic геренации — esSession32ModeNativeStepsV1
// зеркалит esSession24ModeNativeStepsV1 по составу families, с одним
// отклонением: индекс 14 (es-e01-s27-somos-de-acuerdo-son-de-acuerdo-tambien,
// 11 уникальных дистракторов) получает speed_match вместо builder/dictation.
export const LESSON1_ES_SESSION_32_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s32-mode-native-v1' as const;
// зачем Глава 5 продолжает те же явные override-планы (владелец, 2026-08-28,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md, сессии 33-40, "Больше признаков"):
// легаси-сессии этой главы были отклонены владельцем как непригодные
// ("ЭТИ СЕССИИ НЕПРИГОДНЫ ИХ НАДО ПИСАТЬ С НУЛЯ") именно из-за отсутствия
// авторского mode-native плана — каждая сессия здесь получает свой явный
// planId и steps-функцию по тому же шаблону, что и сессии 1-32.
export const LESSON1_ES_SESSION_33_MODE_NATIVE_PLAN_ID_V1 =
  'es-e01-s33-mode-native-v1' as const;

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

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT
// + Rules §4.1): испанская checkpoint-сессия 8 не вводит новых слов — все 12
// шагов работают с фразами (targetKind: 'phrase'), индексы 3-14 из 15
// доступных (0-2 уже отработаны в introSteps()). Families и их порядок
// зеркальны легаси checkpointSteps() (speed_match/listen_build_dictation/
// context_gap_grammar/phrase_builder), но learningStage заменён с
// недопустимого 'independent_assessment' на 'apply_in_phrase'. Каждый шаг
// зеркально совпадает по family/purpose/learningStage/sourcePhraseIndex с
// es_episode_01_session_08_mode_native_v1.ts — сверка идёт позиционно.
function esSession08ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT,
// Глава 2 "Ты: вопрос"): испанская сессия 9 вводит одно новое слово (eres,
// sourceVocabularyIndex 0 — единственная запись в ES_EPISODE_01_SESSION_09_VOCABULARY_V1)
// и применяет его в ЧЕТЫРЁХ фразах (Eres bonito/Eres bonita/Eres rápido/
// Eres rápida — карта фиксирует builtOn: [1], recalls: [3]). Форма шагов: 3
// обязательных word-first контакта (recognize/retrieve_meaning/build_form) +
// 3 дополнительные интеракции другой family на тот же target (разрешено
// правилом "target+family не повторяется"), затем speed_match на review-
// словарь (eres + recall es/soy/bonito из сессий 1/3), и десять application-
// шагов на четыре фразы плюс два independent scripted_repeat_compare — по
// одному на мужскую (Eres bonito) и женскую пару через rápido (Eres rápido),
// зеркально совпадает с es_episode_01_session_09_mode_native_v1.ts.
function esSession09ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
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
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'speak_with_model' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT,
// Глава 2 "Ты: вопрос"): испанская сессия 10 не вводит новых слов — зеркалит
// легаси generic phraseSteps() 1:1 по family/purpose/sourcePhraseIndex (те же
// 12 шагов на индексах 3-14 из 15 фраз), единственное отличие —
// es_episode_01_session_10_mode_native_v1.ts даёт каждому шагу реальный
// mode-native payload вместо generic-карточки.
function esSession10ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT,
// Глава 2 "Ты: вопрос"): испанская сессия 11 не вводит новых слов — зеркалит
// легаси generic phraseSteps() 1:1, тот же класс, что сессия 10.
function esSession11ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT,
// Глава 2 "Ты: вопрос"): испанская сессия 12 вводит одно новое слово (segura,
// sourceVocabularyIndex 0) и применяет его в двух фразах (¿Eres segura?/
// ¿Es segura?), зеркально совпадает с es_episode_01_session_12_mode_native_v1.ts.
function esSession12ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
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
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'speak_with_model' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT,
// Глава 2 "Ты: вопрос"): испанская сессия 13 не вводит новых слов — зеркалит
// легаси generic phraseSteps() 1:1, тот же класс, что сессии 10/11.
function esSession13ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT,
// Глава 2 "Ты: вопрос"): испанская сессия 14 не вводит слово через
// word-first vocabulary — зеркалит легаси generic phraseSteps() 1:1, тот же
// класс, что сессии 10/11/13.
function esSession14ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT
// + Rules §4.1, Глава 2 "Ты: вопрос"): испанская voice-сессия 15 зеркалит
// esSession07ModeNativeStepsV1 по составу families и весу в сторону
// scripted_repeat_compare — 12 шагов на индексах 3-14 из 15 доступных фраз
// (0-2 уже отработаны в introSteps()), НИ ОДИН слот не sound_contrast.
function esSession15ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
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

// зачем именно эта раскладка (владелец, 2026-08-27, СТАРТ ES + MODE_NATIVE_AUTHORING_CONTRACT
// + Rules §4.1, финал Главы 2 "Ты: вопрос"): испанская checkpoint-сессия 16
// не вводит новых слов — все 12 шагов работают с фразами (targetKind:
// 'phrase'), индексы 3-14 из 15 доступных. Families и их порядок зеркальны
// легаси checkpointSteps() (speed_match/listen_build_dictation/
// context_gap_grammar/phrase_builder), но learningStage заменён с
// недопустимого 'independent_assessment' на 'apply_in_phrase'. Каждый шаг
// зеркально совпадает по family/purpose/learningStage/sourcePhraseIndex с
// es_episode_01_session_16_mode_native_v1.ts — сверка идёт позиционно.
function esSession16ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем этот набор 12 шагов (владелец, 2026-08-28, зеркало легаси generic
// phraseSteps(), как и в сессиях 10/11/13): те же 12 families/purposes/
// индексов (3-14). Каждый шаг зеркально совпадает по family/purpose/
// learningStage/sourcePhraseIndex с es_episode_01_session_17_mode_native_v1.ts
// — сверка идёт позиционно.
function esSession17ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-28, СТАРТ ES +
// MODE_NATIVE_AUTHORING_CONTRACT): испанская сессия 18 вводит одно новое
// слово (barato, sourceVocabularyIndex 0) и применяет его в четырёх фразах
// (Es barato/Es barata/No es caro/¿Es caro o barato?), зеркально совпадает
// с es_episode_01_session_18_mode_native_v1.ts.
function esSession18ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0], learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'speak_with_model' },
  ];
}

// зачем этот набор 12 шагов (владелец, 2026-08-28, зеркало легаси generic
// phraseSteps(), как и в сессиях 10/11/13/17): те же 12 families/purposes/
// индексов (3-14). Каждый шаг зеркально совпадает по family/purpose/
// learningStage/sourcePhraseIndex с es_episode_01_session_19_mode_native_v1.ts
// — сверка идёт позиционно.
function esSession19ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем эта раскладка ОТЛИЧАЕТСЯ от зеркала легаси phraseSteps() (владелец,
// 2026-08-28, найдено при верификации мок-сборки сессии 20): фразы этой
// сессии составные (De/de + acuerdo как отдельные токены, сдвоенные
// реплики), у части индексов (6/7/9/10/11/13) уникальных дистракторов
// целой фразы больше 8 — предел course_session_client_children_v1.ts на
// responseFeedbackById. phrase_builder/listen_build_dictation используют
// ВСЕ дистракторы фразы (phraseBuilderFeedback) — заняты только на
// безопасных индексах 3/4/5/8/12/14. context_gap_grammar (только
// дистракторы последнего слова, максимум 2 на любом индексе этой сессии)
// и listen_choose/speed_match (не подвержены пределу) покрывают длинные
// индексы. Полный охват индексов 3-14 сохранён — изменился только выбор
// family на каждом индексе. Каждый шаг зеркально совпадает по family/
// purpose/learningStage/sourcePhraseIndex с
// es_episode_01_session_20_mode_native_v1.ts — сверка идёт позиционно.
function esSession20ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем эта раскладка НЕ зеркалит легаси generic wordsThenPhrasesSteps()
// (владелец, 2026-08-28, найдено при верификации мок-сборки сессии 21):
// 3 обязательных word-first контакта (recognize/retrieve_meaning/
// build_form) + по одной дополнительной интеракции другой family на
// каждый, затем speed_match на review-словарь (libro + recall
// caro/barato/bonito), и десять application-шагов на 15 фраз — только
// listen_choose/context_gap_grammar/speed_match, НИКОГДА phrase_builder
// или listen_build_dictation на фразах: все 15 фраз этой сессии (4-6 слов
// каждая) дают больше 8 уникальных дистракторов, что превышает предел
// responseFeedbackById в course_session_client_children_v1.ts. Каждый шаг
// зеркально совпадает по family/purpose/learningStage/targetKind/индексу
// с es_episode_01_session_21_mode_native_v1.ts — сверка идёт позиционно.
function esSession21ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0], learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем эта раскладка НЕ зеркалит легаси generic phraseSteps() (владелец,
// 2026-08-28, найдено при верификации мок-сборки сессии 22): большинство
// фраз этой сессии составные (El libro + es/no es + importante/igual +
// опциональное придаточное), 4-6 слов с 2 дистракторами каждое — только
// индексы 0/1/5 укладываются в предел responseFeedbackById ≤8 у
// course_session_client_children_v1.ts. Каждый шаг зеркально совпадает по
// family/purpose/learningStage/sourcePhraseIndex с
// es_episode_01_session_22_mode_native_v1.ts — сверка идёт позиционно.
function esSession22ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-28, зеркало
// es_episode_01_session_07/15_mode_native_v1.ts по составу и весу семей):
// испанская voice-сессия 23 переиспользует 15 оценочных фраз из сессий
// 17/18/20 (targetKind: 'phrase'), только через listen_choose/
// listen_build_dictation/scripted_repeat_compare — НИКОГДА sound_contrast.
// Каждый шаг зеркально совпадает по family/purpose/learningStage/
// sourcePhraseIndex с es_episode_01_session_23_mode_native_v1.ts — сверка
// идёт позиционно.
function esSession23ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
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

// зачем именно эта раскладка (владелец, 2026-08-28, зеркало
// es_episode_01_session_16_mode_native_v1.ts по составу и весу семей):
// испанский checkpoint финала главы 3 (сессия 24) переиспользует те же 15
// оценочных фраз, что и voice-сессия 23 (targetKind: 'phrase'), но проверяет
// их БЕЗ поддержки модели — только speed_match/listen_build_dictation/
// context_gap_grammar/phrase_builder, learningStage: 'apply_in_phrase'
// (не 'independent_assessment', которого нет в допустимом наборе). Каждый
// шаг зеркально совпадает по family/purpose/learningStage/sourcePhraseIndex
// с es_episode_01_session_24_mode_native_v1.ts — сверка идёт позиционно.
function esSession24ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка 12 шагов на индексах 3-14 (владелец,
// 2026-08-28, открывает Главу 4 "Мы и они"): испанская сессия 25 (kind:
// 'phrases') учит somos через 15 двойных реплик (recall soy/eres/es +
// somos-реакция). 7 из 15 фраз дают >8 уникальных дистракторов, что
// превышает предел responseFeedbackById — phrase_builder/
// listen_build_dictation используются только на индексах 3/6/7/9/12,
// остальные идут через context_gap_grammar (гейт на ПЕРВОМ слове —
// связке, ядро темы сессии)/listen_choose/speed_match. Каждый шаг
// зеркально совпадает по family/purpose/learningStage/sourcePhraseIndex с
// es_episode_01_session_25_mode_native_v1.ts — сверка идёт позиционно.
function esSession25ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка 17 шагов (владелец, 2026-08-28, зеркало
// es_episode_01_session_18_mode_native_v1.ts по структуре
// words_then_phrases): 3 word-first контакта (recognize/retrieve_meaning/
// build_form) + доп. интеракция другой family на каждой стадии, speed_match
// на review-словарь (rápido/bonito × род/число), десять application-шагов
// на 15 фраз — phrase_builder/listen_build_dictation только там, где ≤8
// уникальных дистракторов (все индексы, кроме 12). Каждый шаг зеркально
// совпадает по family/purpose/learningStage/индексу с
// es_episode_01_session_26_mode_native_v1.ts — сверка идёт позиционно.
function esSession26ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0], learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка 12 шагов на индексах 3-14 (владелец,
// 2026-08-28, зеркало es_episode_01_session_17/19/20/25_mode_native_v1.ts
// по общей форме kind: 'phrases'): индексы 6/14 (>8 уникальных
// дистракторов) идут только через context_gap_grammar/listen_choose/
// speed_match; остальные индексы (≤8 уникальных дистракторов) используют
// phrase_builder/listen_build_dictation. context_gap_grammar проверяет
// ПЕРВОЕ слово (связку) — ядро темы сессии (сдвиг лица при сохранении
// числа группы). Каждый шаг зеркально совпадает по family/purpose/
// learningStage/sourcePhraseIndex с es_episode_01_session_27_mode_native_v1.ts.
function esSession27ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка 12 шагов на индексах 3-14 (владелец,
// 2026-08-28, зеркало es_episode_01_session_17/19/20_mode_native_v1.ts по
// общей форме kind: 'phrases'): все 15 фраз укладываются в 8-дистракторный
// предел, поэтому phrase_builder/listen_build_dictation используются
// свободно; context_gap_grammar проверяет ПОСЛЕДНЕЕ слово (число dos/tres) —
// ядро темы сессии. Каждый шаг зеркально совпадает по family/purpose/
// learningStage/sourcePhraseIndex с es_episode_01_session_28_mode_native_v1.ts.
function esSession28ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка 12 шагов на индексах 3-14 (владелец,
// 2026-08-28, зеркало es_episode_01_session_17/19/20/25/27_mode_native_v1.ts
// по общей форме kind: 'phrases'): индекс 13 (>8 уникальных дистракторов)
// идёт только через context_gap_grammar/listen_choose/speed_match;
// остальные индексы (≤8 уникальных дистракторов) используют
// phrase_builder/listen_build_dictation. context_gap_grammar проверяет
// ПОСЛЕДНЕЕ слово — согласование признака по роду/числу после отрицания.
// Каждый шаг зеркально совпадает по family/purpose/learningStage/
// sourcePhraseIndex с es_episode_01_session_29_mode_native_v1.ts.
function esSession29ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка 12 шагов на индексах 3-14 (владелец,
// 2026-08-28, зеркало es_episode_01_session_17/19/20/25/27/29_mode_native_v1.ts
// по общей форме kind: 'recall'): индексы 10-14 (диалоговые/вопросительные
// фразы, >8 уникальных дистракторов) идут только через context_gap_grammar/
// listen_choose/speed_match; индексы 3-9 (утвердительные/отрицательные
// формы, ≤8 уникальных дистракторов) используют phrase_builder/
// listen_build_dictation. context_gap_grammar проверяет ПЕРВОЕ слово
// (связку) — выбор нужной формы ser среди всех пяти, ядро темы recall.
// Каждый шаг зеркально совпадает по family/purpose/learningStage/
// sourcePhraseIndex с es_episode_01_session_30_mode_native_v1.ts.
function esSession30ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'phrase_builder', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'supported_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем именно эта раскладка (владелец, 2026-08-28, зеркало
// es_episode_01_session_23_mode_native_v1.ts по составу и весу семей):
// испанская voice-сессия 31 переиспользует 15 somos-фраз из сессий 25/26/27
// (targetKind: 'phrase'), только через listen_choose/listen_build_dictation/
// scripted_repeat_compare — НИКОГДА sound_contrast. Каждый шаг зеркально
// совпадает по family/purpose/learningStage/sourcePhraseIndex с
// es_episode_01_session_31_mode_native_v1.ts — сверка идёт позиционно.
function esSession31ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
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

// зачем именно эта раскладка (владелец, 2026-08-28, зеркало
// es_episode_01_session_24_mode_native_v1.ts по составу и весу семей, с
// одним отклонением на индексе 14): испанская checkpoint-сессия 32
// переиспользует ТЕ ЖЕ 15 somos-фраз, что и voice-сессия 31, через
// speed_match/listen_build_dictation/context_gap_grammar/phrase_builder,
// learningStage: 'apply_in_phrase' на всех 12 шагах. Индекс 14
// (es-e01-s27-somos-de-acuerdo-son-de-acuerdo-tambien, 11 уникальных
// дистракторов после дедупликации) получает speed_match вместо
// builder/dictation — то же самое отклонение зафиксировано в
// es_episode_01_session_32_mode_native_v1.ts. Каждый шаг зеркально
// совпадает по family/purpose/learningStage/sourcePhraseIndex — сверка
// идёт позиционно.
function esSession32ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 6, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 10, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 13, learningStage: 'apply_in_phrase' },
    { family: 'speed_match', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
  ];
}

// зачем эти 17 шагов зеркалят esSession18ModeNativeStepsV1 (владелец,
// 2026-08-28, сессия 33 "Хорошо или плохо" открывает Главу 5): та же
// words_then_phrases структура — 3 word-first контакта + 1 доп. интеракция
// на каждой стадии + speed_match на review-словарь + 10 application-шагов
// на 15 фраз. phrase_builder/listen_build_dictation только на индексах с
// ≤8 уникальных дистракторов (0-8, 14); индексы 9/10/12/13 (10+ уникальных)
// идут только через listen_choose/context_gap_grammar.
function esSession33ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return [
    { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
    { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
    { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
    { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0], learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 7, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 9, learningStage: 'apply_in_phrase' },
    { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 11, learningStage: 'apply_in_phrase' },
    { family: 'listen_choose', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 12, learningStage: 'apply_in_phrase' },
    { family: 'phrase_builder', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 8, learningStage: 'apply_in_phrase' },
    { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 14, learningStage: 'apply_in_phrase' },
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
  // зачем listen_choose вместо sound_contrast (владелец, 2026-08-25,
  // MODE_NATIVE_AUTHORING_CONTRACT.ru.md §2): sound_contrast снята с
  // активного authoring и не может назначаться новой learner interaction;
  // тот же фикс уже применён в esSession07ModeNativeStepsV1 выше.
  const families = [
    'listen_choose',
    'listen_choose',
    'scripted_repeat_compare',
    'scripted_repeat_compare',
    'listen_build_dictation',
    'scripted_repeat_compare',
    'listen_choose',
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
        : modeNativePlanId === LESSON1_ES_SESSION_08_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession08ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_09_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession09ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_10_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession10ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_11_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession11ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_12_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession12ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_13_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession13ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_14_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession14ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_15_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession15ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_16_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession16ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_17_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession17ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_18_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession18ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_19_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession19ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_20_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession20ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_21_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession21ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_22_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession22ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_23_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession23ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_24_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession24ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_25_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession25ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_26_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession26ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_27_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession27ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_28_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession28ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_29_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession29ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_30_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession30ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_31_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession31ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_32_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession32ModeNativeStepsV1()]
        : modeNativePlanId === LESSON1_ES_SESSION_33_MODE_NATIVE_PLAN_ID_V1
        ? [...introSteps(phraseCount), ...esSession33ModeNativeStepsV1()]
        : vocabularyCount > 0 && kindMayIntroduceVocabulary(kind)
        ? [...introSteps(phraseCount), ...wordsThenPhrasesSteps(vocabularyCount, phraseCount)]
        : [...introSteps(), ...practiceSteps(kind)],
    ),
  });
}

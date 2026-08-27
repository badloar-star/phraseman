import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_10_GOAL,
  ES_EPISODE_01_SESSION_10_INTRO,
  ES_EPISODE_01_SESSION_10_SUMMARY,
  ES_EPISODE_01_SESSION_10_TITLE,
} from './es_episode_01_session_10_intro_v1';
import { ES_EPISODE_01_SESSION_10_PHRASES } from './es_episode_01_session_10_phrases_v1';
import { ES_EPISODE_01_SESSION_10_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_10_mode_native_v1';
import { LESSON1_ES_SESSION_10_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто» / Глава 2 «Ты: вопрос»,
 * сессия 10 «Так ли это?» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 10,
 * kind: 'phrases', teaches: ['question_marks', 'question_intonation'],
 * builtOn: [9], recalls: [1, 9].
 *
 * Новых слов нет — все 15 фраз применения берут уже известную лексику
 * (eres из сессии 9, es/soy/fácil/verdad из сессии 1, bonito/bonita из
 * сессии 3, rápido/rápida из сессии 5, único/única из сессии 6) и
 * оборачивают её в испанский вопрос: ¿...? вокруг того же порядка слов,
 * что и в утверждении, без инверсии. Пунктуация — не word-токен (решение
 * Advisor 2026-08-24 по прецеденту английской сессии 11, см. комментарий в
 * es_episode_01_session_10_phrases_v1.ts): normalized() в гейте стирает
 * пунктуацию, поэтому ¿...? живёт только в phrase.english/интро.
 *
 * distractorAuthorship: 'manual' — дистракторы каждой позиции выверены
 * вручную (тот же принцип, что в сессиях 7/8), снижает минимум с 3 до 2.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-27,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт должен
 * быть реальным действием внутри одной из шести утверждённых механик.
 * es_episode_01_session_10_mode_native_v1.ts авторит все 12 practice-шагов
 * (после 3 интро), lesson1SessionChoreographyV1 сверяет их против
 * esSession10ModeNativeStepsV1() через LESSON1_ES_SESSION_10_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_10_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 10,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s10-v1',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_10_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_10_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_10_TITLE,
  summary: ES_EPISODE_01_SESSION_10_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_10_GOAL,
  introPages: ES_EPISODE_01_SESSION_10_INTRO,
  phrases: ES_EPISODE_01_SESSION_10_PHRASES,
});

import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_30_GOAL,
  ES_EPISODE_01_SESSION_30_INTRO,
  ES_EPISODE_01_SESSION_30_SUMMARY,
  ES_EPISODE_01_SESSION_30_TITLE,
} from './es_episode_01_session_30_intro_v1';
import { ES_EPISODE_01_SESSION_30_PHRASES } from './es_episode_01_session_30_phrases_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 30 «Все пять форм
 * подряд» — собранный источник. Закрывает основной корпус Главы 4 «Мы и
 * они» перед voice-сессией 31 и checkpoint-сессией 32.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 30,
 * kind: 'recall', builtOn: [1, 9, 17, 25, 27], recalls: [1, 9, 17, 25, 27].
 *
 * Recall-сессия НЕ переиспользует чужой пул фраз одной строкой, как
 * voice/checkpoint — она заново авторит 15 СВЕЖИХ фраз, которые пробегают
 * все пять форм связки ser подряд: soy (с.1), eres (с.9), es (с.17), somos
 * (с.25), son (с.27). Архитектура взята из английского курса-прецедента
 * (episode_01_session_31_v1.ts → episode_01_sessions_25_32_support_v1.ts,
 * PHRASES[31]): там 6 английских лиц дают 7 утвердительных + 7 отрицательных
 * + 1 вопрос = 15. У испанского пять лиц связки ser, поэтому распределение:
 * 5 утвердительных (по одному на каждое лицо) + 5 отрицательных (recall no
 * soy/no eres/no es/no somos/no son — точные формы отрицания из сессий
 * 1/19/2/29) + 5 диалоговых/вопросительных фраз, смешивающих разные лица в
 * одной карточке для настоящего recall-контраста.
 *
 * зачем rápido/rápida/rápidos/rápidas как сквозной признак: единственное
 * прилагательное, дословно встречавшееся во ВСЕХ пяти опорных сессиях
 * (1, 9, 17, 25, 27) — согласование по роду и числу уже отработано, поэтому
 * здесь оно не создаёт новой нагрузки, а высвечивает именно смену ЛИЦА
 * связки, что и есть предмет recall-сессии.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * та же экономия, что и в сессиях 10/14/17/25/26/27/28/29.
 *
 * зачем sessionKindOverride: 'recall' ОБЯЗАТЕЛЕН (найдено при аудите сессий
 * 14/17/25): lesson1SessionChoreographyV1 без явного override молча берёт
 * kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же номеру
 * сессии. Испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 30 как
 * 'recall' — override зафиксирован здесь явно с первого черновика,
 * независимо от того, что стоит в английской карте по тому же номеру.
 */
export const ES_EPISODE_01_SESSION_30_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 30,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s30-v1',
  sessionKindOverride: 'recall',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_30_TITLE,
  summary: ES_EPISODE_01_SESSION_30_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_30_GOAL,
  introPages: ES_EPISODE_01_SESSION_30_INTRO,
  phrases: ES_EPISODE_01_SESSION_30_PHRASES,
});

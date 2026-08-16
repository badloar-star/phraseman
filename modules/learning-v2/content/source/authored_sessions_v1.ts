// зачем: недостающее звено между авторским текстом и приложением. Восемь
// сессий были написаны и покрыты тестами, но их не импортировал НИ ОДИН файл
// вне этой папки — владелец включил ЛАН-метро и увидел пустой раздел.
//
// Здесь единственное место, где перечислены все написанные сессии. Добавил
// сессию — добавь строку сюда, иначе приложение её не увидит; за этим следит
// tests/learning_v2_authored_sessions_reach_the_player.test.ts, который
// требует, чтобы номера шли подряд с первого без дырок.
import { EPISODE_01_SESSION_01_SOURCE } from './episode_01_session_01_v1';
import { EPISODE_01_SESSION_02_SOURCE } from './episode_01_session_02_v1';
import { EPISODE_01_SESSION_03_SOURCE } from './episode_01_session_03_v1';
import { EPISODE_01_SESSION_04_SOURCE } from './episode_01_session_04_v1';
import { EPISODE_01_SESSION_05_SOURCE } from './episode_01_session_05_v1';
import { EPISODE_01_SESSION_06_SOURCE } from './episode_01_session_06_v1';
import { EPISODE_01_SESSION_07_SOURCE } from './episode_01_session_07_v1';
import { EPISODE_01_SESSION_08_SOURCE } from './episode_01_session_08_v1';
import { EPISODE_01_SESSION_09_SOURCE } from './episode_01_session_09_v1';
import {
  buildSessionShardFromSource,
  type SessionSource,
} from './session_shard_from_source_v1';
import type { LearningV2GeneratedSessionShardV1 } from '../generator_session_shard';

/**
 * Все написанные сессии урока 1, по порядку прохождения.
 *
 * Порядок здесь — не украшение: приложение открывает сессии подряд, и пропуск
 * означает, что человек упрётся в стену посреди главы.
 */
export const AUTHORED_EPISODE_01_SESSIONS: readonly SessionSource[] =
  Object.freeze([
    EPISODE_01_SESSION_01_SOURCE,
    EPISODE_01_SESSION_02_SOURCE,
    EPISODE_01_SESSION_03_SOURCE,
    EPISODE_01_SESSION_04_SOURCE,
    EPISODE_01_SESSION_05_SOURCE,
    EPISODE_01_SESSION_06_SOURCE,
    EPISODE_01_SESSION_07_SOURCE,
    EPISODE_01_SESSION_08_SOURCE,
    EPISODE_01_SESSION_09_SOURCE,
  ]);

/**
 * Превращает авторский текст в осколки сессий того вида, который принимает
 * рантайм. Это вход в конвейер публикации: дальше осколки собираются в пакет
 * курса и уезжают на сервер.
 *
 * Считается лениво и на месте — файлы статические, обращений к сети нет.
 */
export function authoredLearningV2SessionShards(): readonly LearningV2GeneratedSessionShardV1[] {
  return AUTHORED_EPISODE_01_SESSIONS.map((source) =>
    buildSessionShardFromSource(source),
  );
}

/** Сколько сессий урока написано на самом деле — для честного отчёта о готовности. */
export function authoredLearningV2SessionCount(): number {
  return AUTHORED_EPISODE_01_SESSIONS.length;
}

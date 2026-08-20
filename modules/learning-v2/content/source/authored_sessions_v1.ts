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
import { EPISODE_01_SESSION_10_SOURCE } from './episode_01_session_10_v1';
import { EPISODE_01_SESSION_11_SOURCE } from './episode_01_session_11_v1';
import { EPISODE_01_SESSION_12_SOURCE } from './episode_01_session_12_v1';
import { EPISODE_01_SESSION_13_SOURCE } from './episode_01_session_13_v1';
import { EPISODE_01_SESSION_14_SOURCE } from './episode_01_session_14_v1';
import { EPISODE_01_SESSION_15_SOURCE } from './episode_01_session_15_v1';
import { EPISODE_01_SESSION_16_SOURCE } from './episode_01_session_16_v1';
import { EPISODE_01_SESSION_17_SOURCE } from './episode_01_session_17_v1';
import { EPISODE_01_SESSION_18_SOURCE } from './episode_01_session_18_v1';
import { EPISODE_01_SESSION_19_SOURCE } from './episode_01_session_19_v1';
import { EPISODE_01_SESSION_20_SOURCE } from './episode_01_session_20_v1';
import { EPISODE_01_SESSION_21_SOURCE } from './episode_01_session_21_v1';
import { EPISODE_01_SESSION_22_SOURCE } from './episode_01_session_22_v1';
import { EPISODE_01_SESSION_23_SOURCE } from './episode_01_session_23_v1';
import { EPISODE_01_SESSION_24_SOURCE } from './episode_01_session_24_v1';
import { EPISODE_01_SESSION_25_SOURCE } from './episode_01_session_25_v1';
import { EPISODE_01_SESSION_26_SOURCE } from './episode_01_session_26_v1';
import { EPISODE_01_SESSION_27_SOURCE } from './episode_01_session_27_v1';
import { EPISODE_01_SESSION_28_SOURCE } from './episode_01_session_28_v1';
import { EPISODE_01_SESSION_29_SOURCE } from './episode_01_session_29_v1';
import { EPISODE_01_SESSION_30_SOURCE } from './episode_01_session_30_v1';
import { EPISODE_01_SESSION_31_SOURCE } from './episode_01_session_31_v1';
import { EPISODE_01_SESSION_32_SOURCE } from './episode_01_session_32_v1';
import { EPISODE_01_SESSION_33_SOURCE } from './episode_01_session_33_v1';
import { EPISODE_01_SESSION_34_SOURCE } from './episode_01_session_34_v1';
import { EPISODE_01_SESSION_35_SOURCE } from './episode_01_session_35_v1';
import { EPISODE_01_SESSION_36_SOURCE } from './episode_01_session_36_v1';
import { EPISODE_01_SESSION_37_SOURCE } from './episode_01_session_37_v1';
import { EPISODE_01_SESSION_38_SOURCE } from './episode_01_session_38_v1';
import { EPISODE_01_SESSION_39_SOURCE } from './episode_01_session_39_v1';
import { EPISODE_01_SESSION_40_SOURCE } from './episode_01_session_40_v1';
import { EPISODE_01_SESSION_41_SOURCE } from './episode_01_session_41_v1';
import { EPISODE_01_SESSION_42_SOURCE } from './episode_01_session_42_v1';
import { EPISODE_01_SESSION_43_SOURCE } from './episode_01_session_43_v1';
import { EPISODE_01_SESSION_44_SOURCE } from './episode_01_session_44_v1';
import { EPISODE_01_SESSION_45_SOURCE } from './episode_01_session_45_v1';
import { EPISODE_01_SESSION_46_SOURCE } from './episode_01_session_46_v1';
import { EPISODE_01_SESSION_47_SOURCE } from './episode_01_session_47_v1';
import { EPISODE_01_SESSION_48_SOURCE } from './episode_01_session_48_v1';
import { EPISODE_01_SESSION_49_SOURCE } from './episode_01_session_49_v1';
import { EPISODE_01_SESSION_50_SOURCE } from './episode_01_session_50_v1';
import { EPISODE_01_SESSION_51_SOURCE } from './episode_01_session_51_v1';
import { EPISODE_01_SESSION_52_SOURCE } from './episode_01_session_52_v1';
import { EPISODE_01_SESSION_53_SOURCE } from './episode_01_session_53_v1';
import { EPISODE_01_SESSION_54_SOURCE } from './episode_01_session_54_v1';
import { EPISODE_01_SESSION_55_SOURCE } from './episode_01_session_55_v1';
import { EPISODE_01_SESSION_56_SOURCE } from './episode_01_session_56_v1';
import {
  buildSessionShardFromSource,
  type SessionSource,
} from './session_shard_from_source_v1';
import type { LearningV2GeneratedSessionShardV1 } from '../generator_session_shard';
import { assertLearningV2SessionContentQuality } from './learning_content_quality_gate_v1';
import { LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1 } from './learning_content_quality_review_receipts_v1';

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
    EPISODE_01_SESSION_10_SOURCE,
    EPISODE_01_SESSION_11_SOURCE,
    EPISODE_01_SESSION_12_SOURCE,
    EPISODE_01_SESSION_13_SOURCE,
    EPISODE_01_SESSION_14_SOURCE,
    EPISODE_01_SESSION_15_SOURCE,
    EPISODE_01_SESSION_16_SOURCE,
    EPISODE_01_SESSION_17_SOURCE,
    EPISODE_01_SESSION_18_SOURCE,
    EPISODE_01_SESSION_19_SOURCE,
    EPISODE_01_SESSION_20_SOURCE,
    EPISODE_01_SESSION_21_SOURCE,
    EPISODE_01_SESSION_22_SOURCE,
    EPISODE_01_SESSION_23_SOURCE,
    EPISODE_01_SESSION_24_SOURCE,
    EPISODE_01_SESSION_25_SOURCE,
    EPISODE_01_SESSION_26_SOURCE,
    EPISODE_01_SESSION_27_SOURCE,
    EPISODE_01_SESSION_28_SOURCE,
    EPISODE_01_SESSION_29_SOURCE,
    EPISODE_01_SESSION_30_SOURCE,
    EPISODE_01_SESSION_31_SOURCE,
    EPISODE_01_SESSION_32_SOURCE,
    EPISODE_01_SESSION_33_SOURCE,
    EPISODE_01_SESSION_34_SOURCE,
    EPISODE_01_SESSION_35_SOURCE,
    EPISODE_01_SESSION_36_SOURCE,
    EPISODE_01_SESSION_37_SOURCE,
    EPISODE_01_SESSION_38_SOURCE,
    EPISODE_01_SESSION_39_SOURCE,
    EPISODE_01_SESSION_40_SOURCE,
    EPISODE_01_SESSION_41_SOURCE,
    EPISODE_01_SESSION_42_SOURCE,
    EPISODE_01_SESSION_43_SOURCE,
    EPISODE_01_SESSION_44_SOURCE,
    EPISODE_01_SESSION_45_SOURCE,
    EPISODE_01_SESSION_46_SOURCE,
    EPISODE_01_SESSION_47_SOURCE,
    EPISODE_01_SESSION_48_SOURCE,
    EPISODE_01_SESSION_49_SOURCE,
    EPISODE_01_SESSION_50_SOURCE,
    EPISODE_01_SESSION_51_SOURCE,
    EPISODE_01_SESSION_52_SOURCE,
    EPISODE_01_SESSION_53_SOURCE,
    EPISODE_01_SESSION_54_SOURCE,
    EPISODE_01_SESSION_55_SOURCE,
    EPISODE_01_SESSION_56_SOURCE,
  ]);

/**
 * Превращает авторский текст в осколки сессий того вида, который принимает
 * рантайм. Это вход в конвейер публикации: дальше осколки собираются в пакет
 * курса и уезжают на сервер.
 *
 * Считается лениво и на месте — файлы статические, обращений к сети нет.
 */
export function authoredLearningV2SessionShards(): readonly LearningV2GeneratedSessionShardV1[] {
  return AUTHORED_EPISODE_01_SESSIONS.map((source) => {
    assertLearningV2SessionContentQuality(
      source,
      LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1[source.requiredSessionOrdinal],
    );
    return buildSessionShardFromSource(source);
  });
}

/** Сколько сессий урока написано на самом деле — для честного отчёта о готовности. */
export function authoredLearningV2SessionCount(): number {
  return AUTHORED_EPISODE_01_SESSIONS.length;
}

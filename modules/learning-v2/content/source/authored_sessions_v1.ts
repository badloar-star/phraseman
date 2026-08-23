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
import {
  validateLearningV2GeneratedSessionShardV1,
  type LearningV2GeneratedSessionShardV1,
} from '../generator_session_shard';

/** Осколок одной написанной сессии в том виде, который принимает рантайм. */
export type AuthoredLearningV2SessionShard = LearningV2GeneratedSessionShardV1;
import { assertLearningV2SessionContentQuality } from './learning_content_quality_gate_v1';
import {
  isLearningV2SessionContentClean,
  learningV2SessionQualityReceipt,
} from './learning_content_quality_autopass_v1';
import { upgradeLesson1SessionDistractorsV2 } from './lesson1_distractor_catalog_v2';

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
  ].map(upgradeLesson1SessionDistractorsV2));

/**
 * Превращает авторский текст в осколки сессий того вида, который принимает
 * рантайм. Это вход в конвейер публикации: дальше осколки собираются в пакет
 * курса и уезжают на сервер.
 *
 * Считается лениво и на месте — файлы статические, обращений к сети нет.
 */
export function authoredLearningV2SessionShards(): readonly LearningV2GeneratedSessionShardV1[] {
  return AUTHORED_EPISODE_01_SESSIONS.map(buildPlayableShard).filter(
    (shard): shard is LearningV2GeneratedSessionShardV1 => shard !== null,
  );
}

/**
 * Сессии, которые реально можно отдать человеку: чистые по содержанию либо с
 * ручной квитанцией владельца.
 *
 * зачем (владелец, 2026-08-23): раньше пачка строилась целиком, и ОДНА
 * недописанная сессия (№15) роняла выдачу всех остальных, включая первую.
 * Человек видел «Сессия недоступна» на материале, который давно готов.
 */
export function playableAuthoredLearningV2Sessions(): readonly SessionSource[] {
  return AUTHORED_EPISODE_01_SESSIONS.filter(
    (source) => buildPlayableShard(source) !== null,
  );
}

/**
 * Собирает осколок, только если он и по качеству чист, и по СТРУКТУРЕ принят
 * валидатором рантайма.
 *
 * зачем структурная проверка (владелец, 2026-08-23): гейт качества смотрит на
 * текст, но не на форму осколка. Сессия 44 проходила качество и падала на
 * errorExplanationByLocale уже в рантайме — человек снова видел «Сессия
 * недоступна». Отдаём только то, что приложение гарантированно примет.
 */
// зачем кэш (владелец, правило скорости): сборка одной сессии — это гейт
// качества по восьми локалям плюс валидатор осколка, ~200–270 мс. Экран
// открывается синхронно этим путём, и без памяти цена платилась бы при КАЖДОМ
// открытии. Источники статические и заморожены, поэтому результат по ссылке на
// источник неизменен — кэш не может отдать устаревшее.
const shardCache = new WeakMap<
  SessionSource,
  { readonly shard: LearningV2GeneratedSessionShardV1 | null }
>();

function buildPlayableShard(
  source: SessionSource,
): LearningV2GeneratedSessionShardV1 | null {
  const cached = shardCache.get(source);
  if (cached) return cached.shard;
  const built = computePlayableShard(source);
  shardCache.set(source, { shard: built });
  return built;
}

function computePlayableShard(
  source: SessionSource,
): LearningV2GeneratedSessionShardV1 | null {
  if (!isLearningV2SessionContentClean(source)) return null;
  if (learningV2SessionQualityReceipt(source) === undefined) return null;
  let shard: LearningV2GeneratedSessionShardV1;
  try {
    shard = buildAuthoredSessionShard(source);
  } catch {
    return null;
  }
  try {
    validateLearningV2GeneratedSessionShardV1(shard, {
      packageId: shard.packageId,
      targetLanguage: shard.targetLanguage,
      episodeOrdinal: shard.episodeOrdinal,
      requiredSessionOrdinal: shard.requiredSessionOrdinal,
      generationInputFingerprint: shard.generationInputFingerprint,
    });
  } catch {
    return null;
  }
  return shard;
}

/** Собирает ОДНУ сессию. Ошибка здесь не может задеть соседние сессии. */
export function buildAuthoredSessionShard(
  source: SessionSource,
): LearningV2GeneratedSessionShardV1 {
  assertLearningV2SessionContentQuality(
    source,
    learningV2SessionQualityReceipt(source),
  );
  return buildSessionShardFromSource(source);
}

/**
 * Осколок одной сессии по её номеру — путь для рантайма. Возвращает null,
 * когда сессия не написана или не прошла гейт: вызывающая сторона тогда идёт
 * в сеть, а не падает вместе со всем уроком.
 */
export function authoredLearningV2SessionShard(
  sessionOrdinal: number,
): LearningV2GeneratedSessionShardV1 | null {
  const source = AUTHORED_EPISODE_01_SESSIONS.find(
    (candidate) => candidate.requiredSessionOrdinal === sessionOrdinal,
  );
  return source ? buildPlayableShard(source) : null;
}

/** Сколько сессий сейчас реально играбельны — честное число для отчётов. */
export function playableAuthoredLearningV2SessionCount(): number {
  return playableAuthoredLearningV2Sessions().length;
}

/** Сколько сессий урока написано на самом деле — для честного отчёта о готовности. */
export function authoredLearningV2SessionCount(): number {
  return AUTHORED_EPISODE_01_SESSIONS.length;
}

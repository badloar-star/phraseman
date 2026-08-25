// зачем этот файл отдельный от authored_sessions_v1.ts (владелец,
// СТАРТ ES.md: "испанский контур никогда не трогает английские файлы
// episode_01_*"; расширенное по аналогии — тот же принцип на файл-мост в
// приложение): испанский контур строит свой мост в приложение независимо,
// не редактируя английский authored_sessions_v1.ts вообще. Структура и
// имена скопированы 1-в-1 с английского файла — та же ленивая загрузка,
// та же двойная проверка качества, тот же принцип "падение одной сессии не
// должно закрыть готовые соседние".
//
// зачем ленивая загрузка и Metro-совместимые статические require — см.
// комментарий в authored_sessions_v1.ts: тот же класс ограничения (Metro
// требует require со строкой-литералом) действует одинаково для обоих
// контуров.
import {
  buildSessionShardFromSource,
  type SessionSource,
} from './session_shard_from_source_v1';
import {
  validateLearningV2GeneratedSessionShardV1,
  type LearningV2GeneratedSessionShardV1,
} from '../generator_session_shard';
import { assertLearningV2SessionContentQuality } from './learning_content_quality_gate_v1';
import {
  isLearningV2SessionContentClean,
  learningV2SessionQualityReceipt,
} from './learning_content_quality_autopass_v1';
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from '../course_topology_v1';

const ES_SESSION_LOADERS: readonly (() => SessionSource)[] = Object.freeze([
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_01_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_01_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_02_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_02_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_03_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_03_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_04_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_04_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_05_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_05_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_06_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_06_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_07_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_07_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_08_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_08_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_09_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_09_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_10_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_10_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_11_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_11_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_12_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_12_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_13_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_13_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_14_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_14_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_15_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_15_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_16_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_16_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_17_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_17_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_18_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_18_SOURCE,
]);


const loadedEsSources = new Map<number, SessionSource>();

function esSessionSource(ordinal: number): SessionSource | null {
  const cached = loadedEsSources.get(ordinal);
  if (cached) return cached;
  const loader = ES_SESSION_LOADERS[ordinal - 1];
  if (!loader) return null;
  // зачем без upgradeLesson1SessionDistractorsV2 (в отличие от английского
  // authored_sessions_v1.ts): та функция читает АНГЛИЙСКИЙ каталог групп
  // слов (lesson1_distractor_catalog_v2.ts) и падает или молча теряет смысл
  // на испанских токенах. Испанские дистракторы уже полные в самом
  // источнике (es_episode_01_session_01_phrases_v1.ts, es_episode_01_
  // session_01_vocabulary_v1.ts) — апгрейд им не нужен и был бы неверным.
  const prepared = deepFreezeSource(loader());
  loadedEsSources.set(ordinal, prepared);
  return prepared;
}

function deepFreezeSource<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>))
    deepFreezeSource(nested);
  return value;
}

// зачем ЗАПЕЧЕНА, а не вычисляется — см. тот же комментарий в
// authored_sessions_v1.ts: граница урока не меняется в рантайме.
export const ES_AUTHORED_EPISODE_01_CONTIGUOUS_CEILING_V1 = 1 as const;

const playableVerdictCache = new WeakMap<SessionSource, boolean>();
let lastBuilt: Readonly<{
  source: SessionSource;
  shard: LearningV2GeneratedSessionShardV1 | null;
}> | null = null;

function isEsPlayable(source: SessionSource): boolean {
  const known = playableVerdictCache.get(source);
  if (known !== undefined) return known;
  return buildEsPlayableShard(source) !== null;
}

function buildEsPlayableShard(
  source: SessionSource,
): LearningV2GeneratedSessionShardV1 | null {
  if (lastBuilt?.source === source) return lastBuilt.shard;
  const built = computeEsPlayableShard(source);
  playableVerdictCache.set(source, built !== null);
  lastBuilt = { source, shard: built };
  return built;
}

function computeEsPlayableShard(
  source: SessionSource,
): LearningV2GeneratedSessionShardV1 | null {
  if (!isLearningV2SessionContentClean(source)) return null;
  if (learningV2SessionQualityReceipt(source) === undefined) return null;
  let shard: LearningV2GeneratedSessionShardV1;
  try {
    shard = buildEsAuthoredSessionShard(source);
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

export function buildEsAuthoredSessionShard(
  source: SessionSource,
): LearningV2GeneratedSessionShardV1 {
  assertLearningV2SessionContentQuality(
    source,
    learningV2SessionQualityReceipt(source),
  );
  return buildSessionShardFromSource(source);
}

/**
 * Осколок одной испанской сессии по её номеру — путь для рантайма.
 * Возвращает null, когда сессия не написана или не прошла гейт.
 */
export function authoredEsLearningV2SessionShard(
  sessionOrdinal: number,
): LearningV2GeneratedSessionShardV1 | null {
  const source = esSessionSource(sessionOrdinal);
  if (!source) return null;
  if (sessionOrdinal > ES_AUTHORED_EPISODE_01_CONTIGUOUS_CEILING_V1) return null;
  return buildEsPlayableShard(source);
}

export function esAuthoredLearningV2SessionCount(): number {
  return LEARNING_V2_LESSON_SESSION_COUNT_V1;
}

let materializedAllEs: readonly SessionSource[] | null = null;

/** Все написанные испанские сессии — только для публикации/тестов, не для рантайма экрана. */
export function allAuthoredEsEpisode01Sessions(): readonly SessionSource[] {
  if (!materializedAllEs) {
    const written: SessionSource[] = [];
    for (let ordinal = 1; ordinal <= ES_SESSION_LOADERS.length; ordinal += 1) {
      const source = esSessionSource(ordinal);
      if (source) written.push(source);
    }
    materializedAllEs = Object.freeze(written);
  }
  return materializedAllEs;
}

// зачем экспортирую isEsPlayable, хотя нигде выше не используется вне файла:
// оставлено для будущего расширения (playableAuthoredEsLearningV2Sessions),
// когда появится вторая испанская сессия и понадобится проверка
// непрерывности, как в английском контуре. Одна написанная сессия сегодня
// не нуждается в проверке "стены между сессиями".
export { isEsPlayable };

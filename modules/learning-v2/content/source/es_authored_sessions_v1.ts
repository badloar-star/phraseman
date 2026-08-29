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

// зачем только сессия 1 (владелец, 2026-08-28: «удали все написанные сессии
// и весь материал для испанского»): сессии 2-34 были признаны непригодными
// и удалены целиком вместе с исходниками — грузчики на них были бы мёртвым
// require() на несуществующий файл. Единственная сохранённая сессия — 1,
// написанная и проверенная ДО этой ночи.
const ES_SESSION_LOADERS: readonly (() => SessionSource)[] = Object.freeze([
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require('./es_episode_01_session_01_v1') as Record<string, SessionSource>)
      .ES_EPISODE_01_SESSION_01_SOURCE,
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

// зачем ВЫЧИСЛЯЕТСЯ, а не запечена (владелец, 2026-08-27, «накорню реши эту
// проблему чтобы никогда больше такого не было»): раньше здесь стояла ручная
// константа = 1. Испанская сессия 2 была написана, лежала в бандле и проходила
// все гейты — но потолок остался равен 1, поэтому authoredEsLearningV2Session-
// Shard(2) возвращал null, клиент уходил в СЕТЬ за контентом, которого на
// сервере нет, и человек видел «Подготавливаем занятие…» и затем «Сессия
// недоступна / stable_identity_unavailable». Симптом выглядел как поломка
// аккаунта, хотя причина — забытая константа.
//
// Теперь потолок = длина непрерывной цепочки РЕАЛЬНО играбельных сессий с
// первой. Написал новую сессию и она проходит гейты — она автоматически
// доступна из бандла, без сети и без ручного шага, о котором можно забыть.
// Непрерывность сохранена намеренно: дыра (сессия 3 готова, 2 нет) не должна
// открывать доступ через пропуск — иначе человек упрётся в недоступную
// середину урока.
// зачем ДОПОЛНИТЕЛЬНО требуется modeNativePlanId (владелец, 2026-08-27:
// «то что было раньше оно забраковано, оставить только как историю, они не
// пригодны потому что писались не под те режимы»): старые испанские сессии
// 3-33 физически лежат в бандле и технически собираются — без этой проверки
// автопотолок открыл бы их человеку сразу после сессии 2. Признак нового
// формата — наличие modeNativePlanId/modeNativePractice: они появляются
// только у переписанных под шесть режимов сессий. Как только очередная
// старая сессия будет переписана, она войдёт в цепочку сама.
// зачем ES_BUNDLED_AUDIO_SESSIONS (владелец, 2026-08-27): сессия со звуковыми
// заданиями обязана иметь СВОЮ озвучку в бандле, иначе материал не соберётся
// (см. learning_v2_course_released_session_client_v3.ts, ветка needsAudio).
// Держим список рядом с потолком, чтобы «написал сессию → забыл озвучку →
// человек упёрся в недоступное занятие» стало невозможным: без озвучки
// сессия просто не входит в цепочку. Пополнять при генерации аудио.
const ES_BUNDLED_AUDIO_SESSIONS: ReadonlySet<number> = new Set([1, 2]);

function computeEsContiguousCeiling(allowDevAudiolessSessions: boolean): number {
  let ceiling = 0;
  for (let ordinal = 1; ordinal <= ES_SESSION_LOADERS.length; ordinal += 1) {
    const source = esSessionSource(ordinal);
    if (!source) break;
    if (!source.modeNativePlanId || !source.modeNativePractice) break;
    if (!isEsPlayable(source)) break;
    const needsAudio = source.modeNativePractice.some(
      (step) =>
        step.family === 'listen_choose' ||
        step.family === 'listen_build_dictation' ||
        step.family === 'scripted_repeat_compare',
    );
    // зачем DEV_LEARNING_V2_AUDIOLESS_SESSIONS (владелец, 2026-08-28): на
    // период разработки авторы пишут испанские сессии быстрее, чем для них
    // генерируют bundled-озвучку. Без этого условия каждая написанная
    // звуковая сессия сверх ES_BUNDLED_AUDIO_SESSIONS обрывает цепочку здесь
    // — потолок стоит на 2, а сессия 3+ честно закрыта и недоступна на
    // устройстве. В dev-сборке пропускаем требование звука (задания играются
    // текстом — см. DEV-обход needsAudio в
    // learning_v2_course_released_session_client_v3.ts); в сторе флаг
    // всегда false, поведение прежнее.
    if (needsAudio && !ES_BUNDLED_AUDIO_SESSIONS.has(ordinal) && !allowDevAudiolessSessions) break;
    ceiling = ordinal;
  }
  return ceiling;
}

const esCeilingCache = new Map<boolean, number>();

export function esAuthoredEpisode01ContiguousCeilingV1(
  allowDevAudiolessSessions = false,
): number {
  const cached = esCeilingCache.get(allowDevAudiolessSessions);
  if (cached !== undefined) return cached;
  const ceiling = computeEsContiguousCeiling(allowDevAudiolessSessions);
  esCeilingCache.set(allowDevAudiolessSessions, ceiling);
  return ceiling;
}

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
  allowDevAudiolessSessions = false,
): LearningV2GeneratedSessionShardV1 | null {
  const source = esSessionSource(sessionOrdinal);
  if (!source) return null;
  if (sessionOrdinal > esAuthoredEpisode01ContiguousCeilingV1(allowDevAudiolessSessions)) return null;
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

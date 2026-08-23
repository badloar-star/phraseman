// зачем: недостающее звено между авторским текстом и приложением. Восемь
// сессий были написаны и покрыты тестами, но их не импортировал НИ ОДИН файл
// вне этой папки — владелец включил ЛАН-метро и увидел пустой раздел.
//
// Здесь единственное место, где перечислены все написанные сессии. Добавил
// сессию — добавь строку сюда, иначе приложение её не увидит; за этим следит
// tests/learning_v2_authored_sessions_reach_the_player.test.ts, который
// требует, чтобы номера шли подряд с первого без дырок.
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
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from '../course_topology_v1';

/**
 * Все написанные сессии урока 1, по порядку прохождения.
 *
 * Порядок здесь — не украшение: приложение открывает сессии подряд, и пропуск
 * означает, что человек упрётся в стену посреди главы.
 */
// зачем ленивая загрузка (владелец, 2026-08-23: «при открытии сессии оно
// висит секунды три»): раньше здесь стояли 56 статических импортов, и КАЖДЫЙ
// строил полный текст сессии на восьми языках прямо при загрузке модуля —
// ~1.3 с на компьютере и втрое-впятеро больше на телефоне. Платилось это при
// открытии ЛЮБОЙ сессии, хотя нужна ровно одна.
//
// Теперь источник строится при первом обращении именно к нему. Порядковый
// номер известен без построения, поэтому выбор нужной сессии ничего не стоит.
const SESSION_LOADERS: readonly (() => SessionSource)[] = Object.freeze(
  Array.from({ length: LEARNING_V2_LESSON_SESSION_COUNT_V1 }, (_, index) => {
    const ordinal = index + 1;
    const padded = String(ordinal).padStart(2, '0');
    return () =>
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      require(`./episode_01_session_${padded}_v1`)[
        `EPISODE_01_SESSION_${padded}_SOURCE`
      ] as SessionSource;
  }),
);

const loadedSources = new Map<number, SessionSource>();

/** Источник сессии, построенный по требованию и подготовленный один раз. */
function sessionSource(ordinal: number): SessionSource | null {
  const cached = loadedSources.get(ordinal);
  if (cached) return cached;
  const loader = SESSION_LOADERS[ordinal - 1];
  if (!loader) return null;
  const prepared = deepFreezeSource(
    upgradeLesson1SessionDistractorsV2(loader()),
  );
  loadedSources.set(ordinal, prepared);
  return prepared;
}

/**
 * Все написанные сессии урока 1, по порядку прохождения.
 *
 * ВНИМАНИЕ: обращение к этому списку строит ВСЕ сессии — это дорого и нужно
 * только публикации и тестам. Экран приложения обязан идти через
 * authoredLearningV2SessionShard(ordinal), который строит одну.
 */
/**
 * Все написанные сессии урока 1, по порядку прохождения.
 *
 * ВНИМАНИЕ: это ГЕТТЕР — обращение строит ВСЕ 56 сессий (~1.3 с). Он нужен
 * публикации и тестам, которым действительно требуется весь урок. Экран
 * приложения обязан идти через authoredLearningV2SessionShard(ordinal),
 * который строит ровно одну запрошенную.
 */
export function allAuthoredEpisode01Sessions(): readonly SessionSource[] {
  if (!materializedAll)
    materializedAll = Object.freeze(
      Array.from(
        { length: LEARNING_V2_LESSON_SESSION_COUNT_V1 },
        (_unused, index) => sessionSource(index + 1)!,
      ),
    );
  return materializedAll;
}

let materializedAll: readonly SessionSource[] | null = null;

// зачем геттер, а не константа (владелец, 2026-08-23): имя сохранено — его
// используют полтора десятка тестов и гейтов. Но теперь это ЛЕНИВОЕ свойство:
// пока к нему не обратились, ни одна из 56 сессий не строится. Экран
// приложения к нему не обращается вовсе и потому платит только за свою.
export const AUTHORED_EPISODE_01_SESSIONS: readonly SessionSource[] =
  new Proxy([] as SessionSource[], {
    get: (_unused, key) =>
      Reflect.get(allAuthoredEpisode01Sessions() as SessionSource[], key),
    has: (_unused, key) =>
      Reflect.has(allAuthoredEpisode01Sessions() as SessionSource[], key),
    ownKeys: () => Reflect.ownKeys(allAuthoredEpisode01Sessions() as SessionSource[]),
    getOwnPropertyDescriptor: (_unused, key) =>
      Reflect.getOwnPropertyDescriptor(
        allAuthoredEpisode01Sessions() as SessionSource[],
        key,
      ),
  }) as readonly SessionSource[];

/**
 * Замораживает источник целиком, а не только верхний уровень.
 *
 * зачем (аудит 2026-08-23): кэш собранных осколков ключуется ссылкой на
 * источник и молча отдал бы устаревший осколок, если материал изменить после
 * первой сборки — то есть автопасс, выданный СТАРОМУ тексту, применился бы к
 * новому. Пересчитывать отпечаток на каждый вызов слишком дорого (39 мс против
 * 0.001 мс), поэтому вместо проверки инварианта делаем его настоящим:
 * upgradeLesson1SessionDistractorsV2 мутирует источники на месте один раз при
 * сборке реестра, после чего мутации запрещены физически.
 */
function deepFreezeSource<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>))
    deepFreezeSource(nested);
  return value;
}

/**
 * Превращает авторский текст в осколки сессий того вида, который принимает
 * рантайм. Это вход в конвейер публикации: дальше осколки собираются в пакет
 * курса и уезжают на сервер.
 *
 * Считается лениво и на месте — файлы статические, обращений к сети нет.
 */
export function authoredLearningV2SessionShards(): readonly LearningV2GeneratedSessionShardV1[] {
  const shards: LearningV2GeneratedSessionShardV1[] = [];
  // зачем непрерывный префикс, а не все годные подряд (владелец, 2026-08-23):
  // карта курса открывает сессии строго по порядку и про дырки не знает. Готовы
  // 1-14 и 17-40, но 15-16 недописаны — показав 17-ю, мы бы упёрли человека в
  // стену на 15-й. Отдаём ровно то, что проходится подряд; остальное ждёт,
  // пока пропуск закроют.
  for (let ordinal = 1; ordinal <= LEARNING_V2_LESSON_SESSION_COUNT_V1; ordinal += 1) {
    const source = sessionSource(ordinal);
    if (!source) break;
    const shard = buildPlayableShard(source);
    if (!shard) break;
    shards.push(shard);
  }
  return Object.freeze(shards);
}

// зачем граница ЗАПЕЧЕНА, а не вычисляется (владелец, 2026-08-23: «при
// открытии сессии оно висит секунды три»):
//
// Требование «не показывать сессию, если между ней и началом есть дырка»
// заставляло проверять всех предшественников при каждом открытии. Открытие
// четырнадцатой сессии строило тринадцать предыдущих — 3147 мс, ровно те
// самые три секунды. Даже облегчённая проверка стоила 216 мс.
//
// Но граница урока не меняется в рантайме: она следует из статического текста
// сессий. Значит её нужно ЗНАТЬ, а не вычислять на телефоне. Константа ниже —
// это ответ, посчитанный один раз; сторож в тестах ломает сборку, если после
// правки контента реальная граница разошлась с записанной.
//
// Допишут сессии 15-16 — сторож потребует поднять число, и сразу откроются
// уже готовые 17-40.
export const AUTHORED_EPISODE_01_CONTIGUOUS_CEILING_V1 = 14 as const;

let cachedCeiling: number | null = null;

/** До какой сессии урок проходится подряд, без стены. */
function contiguousPlayableCeiling(): number {
  return AUTHORED_EPISODE_01_CONTIGUOUS_CEILING_V1;
}

/**
 * Пересчитывает границу честно, обходя сессии. Дорого (секунды) — только для
 * сторожа в тестах, который сверяет запечённую константу с реальностью.
 * Рантайм приложения этим путём НЕ ходит.
 */
export function recomputeContiguousPlayableCeiling(): number {
  let ceiling = 0;
  for (let ordinal = 1; ordinal <= LEARNING_V2_LESSON_SESSION_COUNT_V1; ordinal += 1) {
    const source = sessionSource(ordinal);
    if (!source || !isPlayable(source)) break;
    ceiling = ordinal;
  }
  cachedCeiling = ceiling;
  return ceiling;
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
  const ceiling = contiguousPlayableCeiling();
  return Object.freeze(
    Array.from({ length: ceiling }, (_unused, index) => sessionSource(index + 1)!),
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
// качества по восьми локалям плюс валидатор осколка, ~30 мс. Экран открывается
// синхронно этим путём, и без памяти цена платилась бы при КАЖДОМ открытии.
//
// Корректность кэша (аудит 2026-08-23): раньше здесь стояло утверждение, что
// источники заморожены — оно было ЛОЖНЫМ (заморожен был только массив, а
// upgradeLesson1SessionDistractorsV2 мутирует источники на месте). Теперь
// инвариант настоящий: реестр выше замораживает каждый источник вглубь, так
// что ключ WeakMap не может указывать на изменившийся материал.
// зачем вердикт отдельно от осколка (аудит 2026-08-23): собранный осколок
// весит ~12 МБ, и удержание всех четырнадцати ради проверки непрерывности
// стоило 166 МБ на телефоне. Но для «играбельна ли предыдущая» нужен лишь
// ответ да/нет — его и помним, а тяжёлый осколок держим только для последней
// запрошенной сессии, ту, в которую человек играет прямо сейчас.
const playableVerdictCache = new WeakMap<SessionSource, boolean>();
let lastBuilt: Readonly<{
  source: SessionSource;
  shard: LearningV2GeneratedSessionShardV1 | null;
}> | null = null;

function isPlayable(source: SessionSource): boolean {
  const known = playableVerdictCache.get(source);
  if (known !== undefined) return known;
  return buildPlayableShard(source) !== null;
}

function buildPlayableShard(
  source: SessionSource,
): LearningV2GeneratedSessionShardV1 | null {
  if (lastBuilt?.source === source) return lastBuilt.shard;
  if (prefetchedNext && sessionSourceIfLoaded(prefetchedNext.ordinal) === source) {
    const ready = prefetchedNext.shard;
    prefetchedNext = null;
    playableVerdictCache.set(source, ready !== null);
    lastBuilt = { source, shard: ready };
    return ready;
  }
  const built = computePlayableShard(source);
  playableVerdictCache.set(source, built !== null);
  lastBuilt = { source, shard: built };
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
  const source = sessionSource(sessionOrdinal);
  if (!source) return null;
  // Сначала сама сессия: если она не готова, соседей проверять незачем.
  if (sessionOrdinal > AUTHORED_EPISODE_01_CONTIGUOUS_CEILING_V1) return null;
  const shard = buildPlayableShard(source);
  scheduleNextSessionPrefetch(sessionOrdinal + 1);
  return shard;
}

/**
 * Сколько сессий человек пройдёт подряд, не упершись в стену.
 *
 * зачем рядом есть второе число (аудит 2026-08-23): это НЕ количество годных
 * сессий. Годных сейчас больше — 17-40 написаны и чисты, но заперты пропуском
 * на 15-16. Одно число скрывало бы, что закрытие двух сессий разблокирует
 * сразу два десятка; для честного отчёта владельцу нужны оба.
 */
export function playableAuthoredLearningV2SessionCount(): number {
  return playableAuthoredLearningV2Sessions().length;
}

/**
 * Сколько сессий готовы по существу — прошли гейт и приняты валидатором, вне
 * зависимости от пропусков. Разница с непрерывным числом показывает, сколько
 * готового материала заперто недописанными сессиями.
 */
export function qualifiedAuthoredLearningV2SessionOrdinals(): readonly number[] {
  return Object.freeze(
    allAuthoredEpisode01Sessions().filter(isPlayable).map(
      (source) => source.requiredSessionOrdinal,
    ),
  );
}

// зачем предзагрузка (владелец, 2026-08-23): человек проходит сессии подряд,
// и следующая почти наверняка будет открыта через несколько минут. Готовим её
// заранее, но ТОЛЬКО когда поток свободен — иначе предзагрузка отняла бы время
// у сессии, в которую играют прямо сейчас. Ошибку глотаем намеренно: это
// подготовка впрок, её провал не должен ничего ломать — сессию всё равно
// соберут при настоящем открытии.
let prefetchScheduled = false;

function scheduleNextSessionPrefetch(nextOrdinal: number): void {
  if (prefetchScheduled) return;
  if (nextOrdinal > AUTHORED_EPISODE_01_CONTIGUOUS_CEILING_V1) return;
  if (lastBuilt?.source === sessionSourceIfLoaded(nextOrdinal)) return;
  prefetchScheduled = true;
  setTimeout(() => {
    prefetchScheduled = false;
    try {
      prefetchedNext = { ordinal: nextOrdinal, shard: computeShardFor(nextOrdinal) };
    } catch {
      prefetchedNext = null;
    }
  }, 0);
}

let prefetchedNext: Readonly<{
  ordinal: number;
  shard: LearningV2GeneratedSessionShardV1 | null;
}> | null = null;

/** Источник, если он уже построен — без построения нового. */
function sessionSourceIfLoaded(ordinal: number): SessionSource | undefined {
  return loadedSources.get(ordinal);
}

function computeShardFor(ordinal: number): LearningV2GeneratedSessionShardV1 | null {
  const source = sessionSource(ordinal);
  return source ? computePlayableShard(source) : null;
}

/** Сколько сессий урока написано на самом деле — для честного отчёта о готовности. */
export function authoredLearningV2SessionCount(): number {
  return LEARNING_V2_LESSON_SESSION_COUNT_V1;
}

import {
  NEW_TOURNAMENT_POOL_CONTENT_SHA256,
  NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256,
  NEW_TOURNAMENT_POOL_VERSION,
} from './tournament_pool_v2_factory';

/**
 * Договор документа `arena_v2_config/current`.
 *
 * Это САМЫЙ ВАЖНЫЙ документ Арены: бэкенд закрыт по умолчанию и без него любой
 * вызов падает с `arena_config_missing`. Именно поэтому «Арена не работает» —
 * её ни разу не включали.
 *
 * До сих пор документ можно было создать только руками, из консоли, и любая
 * опечатка в версии схемы или в хеше содержимого превращала отказ
 * `arena_config_missing` в неотличимый от него `arena_config_incompatible`.
 * Здесь договор записан один раз, проверяется и собирается кодом.
 *
 * Чистый модуль: ни сети, ни Firestore.
 */

export const ARENA_CONFIG_SCHEMA_VERSION = 'arena-v2-config.v1' as const;
export const ARENA_PRODUCT_CONFIG_VERSION = 'arena-v2-product.v1' as const;
export const ARENA_CONFIG_DOC_ID = 'current' as const;

/** Переключатели. Порядок фиксирован: по нему рисуется экран админки. */
export const ARENA_CONFIG_FLAGS = [
  'enabled',
  'quickEnabled',
  'rankedEnabled',
  'friendEnabled',
  'rewardsEnabled',
  'spinEnabled',
] as const;

export type ArenaConfigFlag = typeof ARENA_CONFIG_FLAGS[number];

/** Переключатели расширения. Разбор матча к ним больше НЕ относится. */
export const ARENA_CONFIG_EXPANSION_FLAGS = [
  'arenaExpansionEnabled',
  'arenaMatchLabEnabled',
  'arenaMasteryEnabled',
  'arenaPartnerEnabled',
] as const;

export type ArenaConfigExpansionFlag = typeof ARENA_CONFIG_EXPANSION_FLAGS[number];

export type ArenaConfigDoc = Readonly<{
  schemaVersion: typeof ARENA_CONFIG_SCHEMA_VERSION;
  productConfigVersion: typeof ARENA_PRODUCT_CONFIG_VERSION;
  minClientVersion: string;
  contentPublication: Readonly<{
    poolVersion: string;
    manifestSha256: string;
    merkleRootSha256: string;
  }>;
}> & Readonly<Record<ArenaConfigFlag, boolean>>
  & Partial<Readonly<Record<ArenaConfigExpansionFlag, boolean>>>;

const VERSION_RE = /^\d{1,4}(\.\d{1,4}){0,2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type ArenaConfigProblem =
  | 'schema_version'
  | 'product_version'
  | 'min_client_version'
  | 'pool_version'
  | 'manifest_sha'
  | 'merkle_root'
  | 'flags';

/**
 * Что именно не так с документом.
 *
 * Возвращается СПИСОК, а не первая ошибка: администратор, чинящий конфиг по
 * одной ошибке за проход, каждый раз ждёт нового деплоя, чтобы узнать про
 * следующую.
 */
export function arenaConfigProblems(raw: unknown): readonly ArenaConfigProblem[] {
  const problems: ArenaConfigProblem[] = [];
  const doc = isRecord(raw) ? raw : {};
  if (doc.schemaVersion !== ARENA_CONFIG_SCHEMA_VERSION) problems.push('schema_version');
  if (doc.productConfigVersion !== ARENA_PRODUCT_CONFIG_VERSION) problems.push('product_version');
  if (typeof doc.minClientVersion !== 'string' || !VERSION_RE.test(doc.minClientVersion)) {
    problems.push('min_client_version');
  }
  const publication = isRecord(doc.contentPublication) ? doc.contentPublication : {};
  if (publication.poolVersion !== NEW_TOURNAMENT_POOL_VERSION) problems.push('pool_version');
  if (publication.manifestSha256 !== NEW_TOURNAMENT_POOL_CONTENT_SHA256) problems.push('manifest_sha');
  if (publication.merkleRootSha256 !== NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256) problems.push('merkle_root');
  if (ARENA_CONFIG_FLAGS.some((flag) => typeof doc[flag] !== 'boolean')) problems.push('flags');
  return problems;
}

export function arenaConfigIsValid(raw: unknown): boolean {
  return arenaConfigProblems(raw).length === 0;
}

/**
 * Собирает документ из того немногого, что администратор действительно
 * выбирает: переключатели и минимальная версия клиента.
 *
 * Версии схемы и хеши содержимого администратор НЕ вводит руками — они берутся
 * из сборки. Ровно на них ломался конфиг: опечатка в шестидесятизначном хеше
 * даёт отказ, неотличимый от «документа нет».
 */
export function arenaBuildConfigDoc(input: Readonly<{
  flags?: Partial<Record<ArenaConfigFlag, boolean>>;
  expansionFlags?: Partial<Record<ArenaConfigExpansionFlag, boolean>>;
  minClientVersion?: string;
}>): ArenaConfigDoc {
  const flags = {} as Record<ArenaConfigFlag, boolean>;
  for (const flag of ARENA_CONFIG_FLAGS) flags[flag] = input.flags?.[flag] === true;
  const expansion: Partial<Record<ArenaConfigExpansionFlag, boolean>> = {};
  for (const flag of ARENA_CONFIG_EXPANSION_FLAGS) {
    expansion[flag] = input.expansionFlags?.[flag] === true;
  }
  const minClientVersion = typeof input.minClientVersion === 'string'
    && VERSION_RE.test(input.minClientVersion)
    ? input.minClientVersion
    // Ноль означает «любая сборка подходит». Это честнее выдуманного числа:
    // выдуманное отрезало бы часть игроков молча.
    : '0.0.0';
  return {
    schemaVersion: ARENA_CONFIG_SCHEMA_VERSION,
    productConfigVersion: ARENA_PRODUCT_CONFIG_VERSION,
    minClientVersion,
    contentPublication: {
      poolVersion: NEW_TOURNAMENT_POOL_VERSION,
      manifestSha256: NEW_TOURNAMENT_POOL_CONTENT_SHA256,
      merkleRootSha256: NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256,
    },
    ...flags,
    ...expansion,
  } as ArenaConfigDoc;
}

/**
 * Что показать администратору про текущее состояние.
 *
 * Отдельно «документа нет» и «документ есть, но не сходится»: первое лечится
 * одной кнопкой, второе означает, что сборка ушла вперёд содержимого, и
 * включать Арену нельзя, пока не выкачено новое.
 */
export type ArenaConfigStatus = Readonly<{
  exists: boolean;
  valid: boolean;
  problems: readonly ArenaConfigProblem[];
  /** Арена реально отвечает игрокам. */
  liveForPlayers: boolean;
  flags: Readonly<Record<ArenaConfigFlag, boolean>>;
  expansionFlags: Readonly<Record<ArenaConfigExpansionFlag, boolean>>;
  minClientVersion: string;
  expected: Readonly<{ poolVersion: string; manifestSha256: string; merkleRootSha256: string }>;
}>;

export function arenaConfigStatus(raw: unknown): ArenaConfigStatus {
  const exists = isRecord(raw) && Object.keys(raw).length > 0;
  const doc = isRecord(raw) ? raw : {};
  const problems = arenaConfigProblems(raw);
  const flags = {} as Record<ArenaConfigFlag, boolean>;
  for (const flag of ARENA_CONFIG_FLAGS) flags[flag] = doc[flag] === true;
  const expansionFlags = {} as Record<ArenaConfigExpansionFlag, boolean>;
  for (const flag of ARENA_CONFIG_EXPANSION_FLAGS) expansionFlags[flag] = doc[flag] === true;
  return {
    exists,
    valid: problems.length === 0,
    problems,
    // Включённый флаг при несходящемся документе игрокам ничего не даёт:
    // проверка договора стоит раньше проверки флага.
    liveForPlayers: problems.length === 0 && flags.enabled,
    flags,
    expansionFlags,
    minClientVersion: typeof doc.minClientVersion === 'string' ? doc.minClientVersion : '',
    expected: {
      poolVersion: NEW_TOURNAMENT_POOL_VERSION,
      manifestSha256: NEW_TOURNAMENT_POOL_CONTENT_SHA256,
      merkleRootSha256: NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256,
    },
  };
}

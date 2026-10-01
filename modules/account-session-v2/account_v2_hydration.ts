import type { AccountScopeHandle, ScopeJson } from './account_scope_store';
import { isAccountsV2DisabledError } from './account_sync_callable_transport';
import { accountsV2ProducerEntityKey, accountsV2ProducerListIndexKey } from './account_sync_producer';
import { canonicalJson, listIndexKey, type EntityMirror } from './account_sync_producer_plan';

/*
 * Account V2, Пакет 6G (TG-4CAC183BF512) — перенос при первом входе (OD21) и
 * гидрация новой установки из V2.
 *
 * зачем: область V2 (SQLCipher) живёт на одной установке и одном uid. Новая
 * установка / новый телефон / смена аккаунта = пустая область. Поэтому один раз
 * на область:
 *   1) попросить сервер перенести старые данные (accountsV2MigrateMine) —
 *      сервер авторитетен, клиент только просит; hold — не ошибка;
 *   2) вытянуть своё состояние постранично (accountsV2PullMine, ≤ 200 на страницу);
 *   3) засеять зеркало производителя (только там, где его ещё нет — свежие
 *      локальные правки в очереди не трогаем), иначе первый снимок приложения
 *      отправил бы всё заново;
 *   4) применить в локальные хранилища приложения (порт applyLocal: урок —
 *      «лучший из», SRS — по времени правки, карточки/наборы — объединение;
 *      tombstone не воскрешается и не удаляет локальное);
 *   5) поставить отметку в области — повторный запуск не ходит в сеть.
 * Порядок строго «перенос → pull → применение»: pull до завершения переноса
 * отметил бы гидрацию сделанной без перенесённых данных.
 * Каждый шаг проверяет isCurrent() (сессия жива, uid тот же) — смена аккаунта
 * посреди гидрации обрывает её без записи. Логи — [ACCOUNT-V2], коды и числа.
 */

const LOG = '[ACCOUNT-V2]';
export const ACCOUNTS_V2_HYDRATION_STATE_KEY = '__account_v2_hydration__:state';
export const ACCOUNTS_V2_HYDRATION_PAGE = 200;
/** Потолок страниц за проход (40 000 сущностей): дальше — лог и повтор при следующем запуске. */
export const ACCOUNTS_V2_HYDRATION_MAX_PAGES = 200;
/** Продолжений переноса (partial) за один проход. */
export const ACCOUNTS_V2_MIGRATION_MAX_ROUNDS = 12;
/** Пауза между продолжениями переноса (сервер пускает partial не чаще раза в 5 с). */
export const ACCOUNTS_V2_MIGRATION_ROUND_PAUSE_MS = 6_000;
/** hold пересматривается сервером раз в сутки — клиент не спрашивает чаще. */
export const ACCOUNTS_V2_MIGRATION_HOLD_RECHECK_MS = 24 * 60 * 60 * 1000;
/** Записей зеркала в одной транзакции области. */
const SEED_CHUNK = 200;
const TARGET = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const DOC_ID = /^[0-9a-f]{64}$/;

export type HydratedLesson = Readonly<{ target: string; lessonId: number; score: number; passed: boolean }>;
export type HydratedCard = Readonly<{
  target: string; list: 'saved' | 'custom'; id: string; deleted: boolean;
  /** Поля карточки (значения), без SRS. */
  fields: Readonly<Record<string, unknown>>;
  /** Значение поля `srs` ({ updatedAtMs, …память }), если есть. */
  srs: Readonly<Record<string, unknown>> | null;
}>;
export type HydratedLibrary = Readonly<{ target: string; items: readonly string[]; removed: readonly string[] }>;
export type HydrationSnapshot = Readonly<{
  lessons: readonly HydratedLesson[];
  cards: readonly HydratedCard[];
  libraries: readonly HydratedLibrary[];
}>;
export type HydrationApplyResult = Readonly<Record<string, number>>;

export type AccountsV2HydrationPorts = Readonly<{
  handle: Pick<AccountScopeHandle, 'readRecord' | 'withTransaction'>;
  /** httpsCallable accountsV2MigrateMine: `{ data }` или ошибка. */
  callMigrate: () => Promise<unknown>;
  /** httpsCallable accountsV2PullMine: `{ data }` или ошибка. */
  callPull: (request: Readonly<{ cursor: string | null; limit: number }>) => Promise<unknown>;
  /** Применение в хранилища приложения (только «не хуже локального»). */
  applyLocal: (snapshot: HydrationSnapshot, isCurrent: () => boolean) => Promise<HydrationApplyResult>;
  /** Сессия жива и uid Firebase = владелец области. */
  isCurrent: () => boolean;
  nowMs: () => number;
  sleep: (ms: number) => Promise<void>;
}>;

export type AccountsV2HydrationOutcome =
  | 'already_hydrated' | 'hydrated' | 'migration_pending' | 'stale' | 'server_disabled'
  | 'migration_failed' | 'migration_wait' | 'pull_failed' | 'apply_failed' | 'state_unreadable';

type State = Readonly<{
  v: 1;
  migration: string | null;
  migrationAtMs: number | null;
  hydratedAtMs: number | null;
  entities: number;
}>;

type PulledEntity = Readonly<{ entityType: string; entityId: string; revision: number; state: unknown }>;

function kindOf(value: unknown): string {
  return value instanceof Error ? value.name : typeof value;
}

function ownData(target: unknown, key: string): unknown {
  if (typeof target !== 'object' || target === null) return undefined;
  // зачем: ответ сервера — внешние данные; только собственные data-свойства, без геттеров.
  const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
}

function plain(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorCode(error: unknown): string {
  try {
    const code = ownData(error, 'code');
    return typeof code === 'string' && /^[\w/-]{1,64}$/.test(code) ? code : kindOf(error);
  } catch {
    return 'unreadable';
  }
}

function parseState(value: ScopeJson | undefined): State | null {
  if (!plain(value) || value.v !== 1) return null;
  const num = (raw: unknown): number | null => (Number.isSafeInteger(raw) ? raw as number : null);
  return Object.freeze({
    v: 1,
    migration: typeof value.migration === 'string' ? value.migration : null,
    migrationAtMs: num(value.migrationAtMs),
    hydratedAtMs: num(value.hydratedAtMs),
    entities: num(value.entities) ?? 0,
  });
}

const EMPTY_STATE: State = Object.freeze({ v: 1, migration: null, migrationAtMs: null, hydratedAtMs: null, entities: 0 });

async function writeState(handle: AccountsV2HydrationPorts['handle'], state: State): Promise<void> {
  await handle.withTransaction(async (tx) => {
    await tx.putRecord({ key: ACCOUNTS_V2_HYDRATION_STATE_KEY, value: state as unknown as ScopeJson });
  });
}

/** Перенос окончателен (done/already_done); hold и not_found_yet — пересматриваются. */
export function migrationFinal(status: string | null): boolean {
  return status === 'done' || status === 'already_done';
}

/** Нужен ли вызов переноса по отметке области (hold / not_found_yet — не чаще раза в сутки). */
export function migrationNeeded(state: State, nowMs: number): boolean {
  if (migrationFinal(state.migration)) return false;
  if ((state.migration === 'hold' || state.migration === 'not_found_yet') && state.migrationAtMs !== null) {
    const age = nowMs - state.migrationAtMs;
    return age < 0 || age >= ACCOUNTS_V2_MIGRATION_HOLD_RECHECK_MS;
  }
  return true;
}

type MigrationStep = Readonly<{ status: string }> | Readonly<{ fail: AccountsV2HydrationOutcome }>;

async function runMigration(ports: AccountsV2HydrationPorts): Promise<MigrationStep> {
  for (let round = 1; round <= ACCOUNTS_V2_MIGRATION_MAX_ROUNDS; round += 1) {
    if (!ports.isCurrent()) return { fail: 'stale' };
    const startedAt = ports.nowMs();
    let response: unknown;
    try {
      response = await ports.callMigrate();
    } catch (error) {
      if (isAccountsV2DisabledError(error)) {
        console.warn(`${LOG} hydrate migrate_server_disabled`);
        return { fail: 'server_disabled' };
      }
      const code = errorCode(error);
      // зачем: «подожди» (лимит частоты) — не провал; повтор при следующем запуске.
      const wait = code.endsWith('resource-exhausted');
      console.warn(`${LOG} hydrate migrate_failed code=${code} round=${round} wait=${wait}`);
      return { fail: wait ? 'migration_wait' : 'migration_failed' };
    }
    const data = ownData(response, 'data');
    const status = ownData(data, 'status');
    const operations = ownData(data, 'operations');
    console.log(`${LOG} hydrate migrate status=${typeof status === 'string' ? status : 'invalid'} `
      + `ops=${Number.isSafeInteger(operations) ? operations as number : -1} round=${round} ms=${ports.nowMs() - startedAt}`);
    if (status === 'done' || status === 'already_done' || status === 'hold' || status === 'not_found_yet') return { status };
    if (status !== 'partial') {
      console.warn(`${LOG} hydrate migrate_response_invalid`);
      return { fail: 'migration_failed' };
    }
    await ports.sleep(ACCOUNTS_V2_MIGRATION_ROUND_PAUSE_MS);
  }
  console.warn(`${LOG} hydrate migrate_rounds_exhausted max=${ACCOUNTS_V2_MIGRATION_MAX_ROUNDS}`);
  return { fail: 'migration_wait' };
}

function parsePulledEntity(raw: unknown): PulledEntity | null {
  const entityType = ownData(raw, 'entityType');
  const entityId = ownData(raw, 'entityId');
  const revision = ownData(raw, 'revision');
  const state = ownData(raw, 'state');
  if (typeof entityType !== 'string' || typeof entityId !== 'string' || entityId.length === 0
    || !Number.isSafeInteger(revision) || (revision as number) < 1 || !plain(state)) return null;
  return Object.freeze({ entityType, entityId, revision: revision as number, state });
}

type PullStep = Readonly<{ entities: readonly PulledEntity[] }> | Readonly<{ fail: AccountsV2HydrationOutcome }>;

async function pullAll(ports: AccountsV2HydrationPorts): Promise<PullStep> {
  const entities: PulledEntity[] = [];
  let cursor: string | null = null;
  let invalid = 0;
  for (let page = 1; page <= ACCOUNTS_V2_HYDRATION_MAX_PAGES; page += 1) {
    if (!ports.isCurrent()) return { fail: 'stale' };
    let response: unknown;
    try {
      response = await ports.callPull({ cursor, limit: ACCOUNTS_V2_HYDRATION_PAGE });
    } catch (error) {
      if (isAccountsV2DisabledError(error)) {
        console.warn(`${LOG} hydrate pull_server_disabled page=${page}`);
        return { fail: 'server_disabled' };
      }
      console.warn(`${LOG} hydrate pull_failed code=${errorCode(error)} page=${page}`);
      return { fail: 'pull_failed' };
    }
    const data = ownData(response, 'data');
    const rows = ownData(data, 'entities');
    const next = ownData(data, 'nextCursor');
    if (!Array.isArray(rows) || (next !== null && (typeof next !== 'string' || !DOC_ID.test(next)))) {
      console.warn(`${LOG} hydrate pull_response_invalid page=${page}`);
      return { fail: 'pull_failed' };
    }
    for (const row of rows) {
      const parsed = parsePulledEntity(row);
      if (parsed === null) invalid += 1;
      else entities.push(parsed);
    }
    if (next === null) {
      console.log(`${LOG} hydrate pull_done pages=${page} entities=${entities.length} invalid=${invalid}`);
      return { entities };
    }
    if (next === cursor) {
      console.warn(`${LOG} hydrate pull_cursor_stuck page=${page}`);
      return { fail: 'pull_failed' };
    }
    cursor = next;
  }
  console.warn(`${LOG} hydrate pull_pages_exhausted max=${ACCOUNTS_V2_HYDRATION_MAX_PAGES} entities=${entities.length}`);
  return { fail: 'pull_failed' };
}

type Parsed = Readonly<{
  snapshot: HydrationSnapshot;
  mirrors: readonly Readonly<{ entityType: 'lesson_progress' | 'flashcard' | 'library_membership'; entityId: string; record: ScopeJson }>[];
  listIndexes: readonly Readonly<{ key: string; ids: readonly string[] }>[];
  skipped: number;
}>;

function splitEntityId(entityId: string): Readonly<{ target: string; rest: string }> | null {
  const colon = entityId.indexOf(':');
  if (colon <= 0) return null;
  const target = entityId.slice(0, colon);
  return TARGET.test(target) ? { target, rest: entityId.slice(colon + 1) } : null;
}

function mirrorRecord(mirror: EntityMirror, base: number | null): ScopeJson {
  // зачем: формат записи производителя (account_sync_producer.ts parseEntityRecord);
  // база = ревизия сервера, которую телефон теперь ВИДЕЛ (применил локально).
  return { v: 1, mirror: mirror as unknown as ScopeJson, sequence: 0, base, lastOperationId: null } as unknown as ScopeJson;
}

function stateFields(state: Record<string, unknown>): Readonly<Record<string, unknown>> | null {
  const fields = state.fields;
  if (!plain(fields)) return null;
  const values: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(fields)) {
    if (!plain(field) || !('value' in field)) return null;
    values[name] = field.value;
  }
  return values;
}

/** Ответ сервера → снимок для приложения + записи зеркала. Непонятное — пропуск (счётчик). */
export function parseHydration(entities: readonly PulledEntity[]): Parsed {
  const lessons: HydratedLesson[] = [];
  const cards: HydratedCard[] = [];
  const libraries: HydratedLibrary[] = [];
  const mirrors: { entityType: 'lesson_progress' | 'flashcard' | 'library_membership'; entityId: string; record: ScopeJson }[] = [];
  const liveByList = new Map<string, string[]>();
  let skipped = 0;
  for (const entity of entities) {
    const split = splitEntityId(entity.entityId);
    const state = entity.state as Record<string, unknown>;
    if (split === null) { skipped += 1; continue; }
    if (entity.entityType === 'lesson_progress') {
      const match = /^lesson:(\d{1,6})$/.exec(split.rest);
      const best = state.best;
      if (match === null || !plain(best) || typeof best.passed !== 'boolean' || typeof best.score !== 'number'
        || !Number.isFinite(best.score) || best.score < 0) { skipped += 1; continue; }
      lessons.push(Object.freeze({ target: split.target, lessonId: Number(match[1]), score: best.score, passed: best.passed }));
      mirrors.push({ entityType: 'lesson_progress', entityId: entity.entityId, record: mirrorRecord({ lessonBest: { passed: best.passed, score: best.score } }, null) });
    } else if (entity.entityType === 'flashcard') {
      const match = /^(saved|custom):(.+)$/.exec(split.rest);
      const values = stateFields(state);
      if (match === null || values === null || typeof state.deleted !== 'boolean') { skipped += 1; continue; }
      const list = match[1] as 'saved' | 'custom';
      const { srs, srsPolicy: _policy, ...fields } = values;
      cards.push(Object.freeze({
        target: split.target, list, id: match[2], deleted: state.deleted,
        fields: Object.freeze(fields), srs: plain(srs) ? Object.freeze({ ...srs }) : null,
      }));
      const mirrorFields: Record<string, string> = {};
      for (const [name, value] of Object.entries(values)) mirrorFields[name] = canonicalJson(value);
      mirrors.push({ entityType: 'flashcard', entityId: entity.entityId, record: mirrorRecord({ fields: mirrorFields, deleted: state.deleted }, entity.revision) });
      if (!state.deleted) {
        const key = listIndexKey(split.target, list);
        liveByList.set(key, [...(liveByList.get(key) ?? []), match[2]]);
      }
    } else if (entity.entityType === 'library_membership') {
      const ids = (raw: unknown): string[] | null => (Array.isArray(raw) && raw.every((pair) => Array.isArray(pair) && typeof pair[0] === 'string')
        ? raw.map((pair) => (pair as unknown[])[0] as string) : null);
      const items = ids(state.items);
      const removed = ids(state.removed);
      if (split.rest !== 'community_packs' || items === null || removed === null) { skipped += 1; continue; }
      libraries.push(Object.freeze({ target: split.target, items: Object.freeze(items), removed: Object.freeze(removed) }));
      mirrors.push({ entityType: 'library_membership', entityId: entity.entityId, record: mirrorRecord({ items }, entity.revision) });
    } else {
      skipped += 1;
    }
  }
  return Object.freeze({
    snapshot: Object.freeze({ lessons, cards, libraries }),
    mirrors,
    listIndexes: [...liveByList].map(([key, ids]) => Object.freeze({ key, ids })),
    skipped,
  });
}

/** Засев зеркала: ТОЛЬКО где записи ещё нет (проверка внутри транзакции). */
type Seeded = Readonly<{ seeded: number; kept: number; keptLibraries: ReadonlySet<string>; keptDeletedCards: ReadonlySet<string> }>;

function mirrorOf(value: ScopeJson | undefined): Readonly<Record<string, unknown>> | null {
  return plain(value) && plain(value.mirror) ? value.mirror : null;
}

async function seedMirrors(ports: AccountsV2HydrationPorts, parsed: Parsed): Promise<Seeded> {
  let seeded = 0;
  let kept = 0;
  const keptLibraries = new Set<string>();
  const keptDeletedCards = new Set<string>();
  for (let start = 0; start < parsed.mirrors.length; start += SEED_CHUNK) {
    if (!ports.isCurrent()) throw new Error('hydration_stale');
    const chunk = parsed.mirrors.slice(start, start + SEED_CHUNK);
    await ports.handle.withTransaction(async (tx) => {
      for (const item of chunk) {
        const key = accountsV2ProducerEntityKey(item.entityType, item.entityId);
        // зачем: запись есть = производитель уже ставил операции этой сущности (свежие
        // локальные правки, возможно ещё не отправленные) — её базу и номер не трогаем.
        const existing = await tx.readRecord(key);
        if (existing !== null) {
          kept += 1;
          // зачем: зеркало уже ведёт производитель (локальные правки, может, ещё в очереди):
          // удалённую тут карточку и библиотеку с локальными удалениями гидрация не воскрешает.
          if (item.entityType === 'library_membership') keptLibraries.add(item.entityId);
          else if (item.entityType === 'flashcard' && mirrorOf(existing.value)?.deleted === true) keptDeletedCards.add(item.entityId);
          continue;
        }
        await tx.putRecord({ key, value: item.record });
        seeded += 1;
      }
    });
  }
  if (parsed.listIndexes.length > 0) {
    await ports.handle.withTransaction(async (tx) => {
      for (const index of parsed.listIndexes) {
        const key = accountsV2ProducerListIndexKey(index.key);
        if (await tx.readRecord(key) !== null) continue;
        await tx.putRecord({ key, value: { v: 1, ids: [...index.ids] } });
      }
    });
  }
  return { seeded, kept, keptLibraries, keptDeletedCards };
}

/** Снимок без того, что локальный производитель уже знает лучше сервера. */
export function withoutLocallyOwned(
  snapshot: HydrationSnapshot, keptLibraries: ReadonlySet<string>, keptDeletedCards: ReadonlySet<string>,
): HydrationSnapshot {
  return Object.freeze({
    lessons: snapshot.lessons,
    cards: snapshot.cards.filter((card) => !keptDeletedCards.has(`${card.target}:${card.list}:${card.id}`)),
    libraries: snapshot.libraries.filter((library) => !keptLibraries.has(`${library.target}:community_packs`)),
  });
}

/**
 * Один проход гидрации области. Никогда не бросает: исход — код (и лог).
 * Отметка ставится ТОЛЬКО после успешного применения; любой провал = повтор
 * при следующем старте сессии (не опрос: проход один на открытие области).
 */
export async function hydrateAccountsV2Scope(ports: AccountsV2HydrationPorts): Promise<AccountsV2HydrationOutcome> {
  const startedAt = ports.nowMs();
  let state: State;
  try {
    const record = await ports.handle.readRecord(ACCOUNTS_V2_HYDRATION_STATE_KEY);
    state = record === null ? EMPTY_STATE : (parseState(record.value) ?? EMPTY_STATE);
    if (record !== null && parseState(record.value) === null) console.warn(`${LOG} hydrate state_corrupt -> restart`);
  } catch (error) {
    console.warn(`${LOG} hydrate state_unreadable code=${errorCode(error)}`);
    return 'state_unreadable';
  }
  const wasHydrated = state.hydratedAtMs !== null;
  // зачем (ревью 6G, ремонт №1): гидрированная область ОКОНЧАТЕЛЬНА только при окончательном
  // переносе. После hold / not_found_yet (старый документ ещё не найден) перенос
  // перепроверяется раз в сутки; стал done — тянем и применяем ещё раз (идемпотентно).
  if (wasHydrated && !migrationNeeded(state, ports.nowMs())) {
    console.log(`${LOG} hydrate skip reason=already_hydrated entities=${state.entities} migration=${state.migration ?? 'none'}`);
    return 'already_hydrated';
  }
  if (migrationNeeded(state, ports.nowMs())) {
    const migration = await runMigration(ports);
    if ('fail' in migration) return migration.fail;
    state = Object.freeze({ ...state, migration: migration.status, migrationAtMs: ports.nowMs() });
    try {
      if (!ports.isCurrent()) return 'stale';
      await writeState(ports.handle, state);
    } catch (error) {
      // зачем: отметка переноса не записалась — не страшно, сервер ответит already_done.
      console.warn(`${LOG} hydrate migrate_mark_failed code=${errorCode(error)}`);
    }
  } else {
    console.log(`${LOG} hydrate migrate_skip status=${state.migration ?? 'none'}`);
  }
  if (wasHydrated && !migrationFinal(state.migration)) {
    // Перенос всё ещё не окончателен — новых данных в V2 от него нет, повторный pull не нужен.
    console.log(`${LOG} hydrate migration_still_pending status=${state.migration ?? 'none'} recheckHours=24`);
    return 'migration_pending';
  }
  const pulled = await pullAll(ports);
  if ('fail' in pulled) return pulled.fail;
  const parsed = parseHydration(pulled.entities);
  if (parsed.skipped > 0) console.warn(`${LOG} hydrate entities_skipped count=${parsed.skipped}`);
  let applied: HydrationApplyResult;
  try {
    if (!ports.isCurrent()) return 'stale';
    const mirror = await seedMirrors(ports, parsed);
    console.log(`${LOG} hydrate mirror seeded=${mirror.seeded} kept=${mirror.kept} `
      + `keptLibraries=${mirror.keptLibraries.size} keptDeletedCards=${mirror.keptDeletedCards.size}`);
    if (!ports.isCurrent()) return 'stale';
    applied = await ports.applyLocal(withoutLocallyOwned(parsed.snapshot, mirror.keptLibraries, mirror.keptDeletedCards), ports.isCurrent);
  } catch (error) {
    if (!ports.isCurrent()) {
      console.warn(`${LOG} hydrate stale_midway code=${errorCode(error)}`);
      return 'stale';
    }
    console.warn(`${LOG} hydrate apply_failed code=${errorCode(error)}`);
    return 'apply_failed';
  }
  if (!ports.isCurrent()) return 'stale';
  try {
    await writeState(ports.handle, Object.freeze({ ...state, hydratedAtMs: ports.nowMs(), entities: pulled.entities.length }));
  } catch (error) {
    // зачем: без отметки следующий старт повторит гидрацию — применение идемпотентно («не хуже локального»).
    console.warn(`${LOG} hydrate mark_failed code=${errorCode(error)}`);
  }
  const summary = Object.entries(applied).map(([key, value]) => `${key}=${value}`).join(' ');
  console.log(`${LOG} hydrate done entities=${pulled.entities.length} ${summary} ms=${ports.nowMs() - startedAt}`);
  return 'hydrated';
}

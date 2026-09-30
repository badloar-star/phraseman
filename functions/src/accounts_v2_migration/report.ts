import { createHash } from 'crypto';
import {
  type AccountsV2EntityType,
  type AccountsV2Envelope,
  type JsonValue,
  type ValidatedBatch,
} from '../accounts_v2_contract';
import { canonicalJson } from '../accounts_v2_merge';
import {
  SAVED_CARD_FIELDS,
  SRS_CARD_FIELDS,
  classifyProgressKey,
  classifyRootField,
  classifySubcollection,
  inventorySummary,
  type Classification,
  type Disposition,
} from './inventory';
import { compare, type ConflictEntry, type Ledger, type ReportEntry } from './ledger';

/*
 * Account V2, Пакет 5 — отчёт dry-run и контракты исполнителей (перенос, чистка).
 *
 * зачем (ремонт №2, решение Fable за владельца «домены вне ядра V2»): Account V2
 * владеет только уроками, карточками (+SRS) и библиотекой. Монеты (леджер рун),
 * серия, экзамены, достижения/статистика и открытые уроки ОСТАЮТСЯ в действующих
 * хранилищах 2.0 (keep_in_place). Поэтому чистка легаси удаляет только
 * перенесённое, Plus-ссылки и отброшенное по решению, а keep_in_place — явный
 * allowlist «не трогать», который сторожится повторной классификацией пути.
 * Чистые функции, без сети и Firestore.
 */

export const MIGRATION_REPORT_SCHEMA = 'accounts-v2-migration-dry-run.report.v1';
/** Руны → монеты по курсу владельца (решение 10: 1:1) — информационно, баланс остаётся в леджере. */
export const RUNES_TO_COINS_RATE = 1;
const LOG = '[ACCOUNTS-V2-MIGRATION]';
const CARD_FIELD_SET: ReadonlySet<string> = new Set(SAVED_CARD_FIELDS);
const SRS_FIELD_SET: ReadonlySet<string> = new Set(SRS_CARD_FIELDS);

export type MigrationStatus = 'ready' | 'hold';
export type RunesToCoins = Readonly<{ rate: number; runes: number; coins: number }>;
export type MigrationReport = Readonly<{
  schema: typeof MIGRATION_REPORT_SCHEMA;
  uidHash: string;
  status: MigrationStatus;
  applyAllowed: boolean;
  /** Поля без домена И без решения (carry_pending_domain). Пока > 0 — старый users/{uid} НЕ чистить. */
  pendingDomainCount: number;
  /** Поля, которые остаются в действующих хранилищах 2.0 (keep_in_place): не переносятся и не удаляются. */
  keptInPlaceCount: number;
  /** Перенесённые поля, которые 2.0 ещё читает из старого места: перенесены, но чистка их НЕ удаляет. */
  carriedAndKeptCount: number;
  inventory: Readonly<Record<Disposition, number>>;
  totals: Readonly<{ carried: number; dropped: number; derived: number; held: number; informational: number; keptInPlace: number }>;
  carried: Readonly<Record<AccountsV2EntityType, number>>;
  /** Откуда взяты перенесённые операции (базовые пути полей) — только они и попадают в чистку как «перенесено». */
  carriedSources: readonly ReportEntry[];
  dropped: readonly ReportEntry[];
  derived: readonly ReportEntry[];
  held: readonly ReportEntry[];
  informational: readonly ReportEntry[];
  keptInPlace: readonly ReportEntry[];
  runesToCoins: RunesToCoins;
  conflicts: readonly ConflictEntry[];
  operations: Readonly<{
    count: number; batches: number; byEntityType: Readonly<Record<AccountsV2EntityType, number>>; sha256: string;
  }>;
  disallowedFieldsCopied: number;
}>;

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function emptyByType(): Record<AccountsV2EntityType, number> {
  return { lesson_progress: 0, flashcard: 0, library_membership: 0 };
}

function disallowedFields(envelope: AccountsV2Envelope): number {
  const payload = envelope.payload as Readonly<Record<string, JsonValue>>;
  const allowed = envelope.entityType === 'lesson_progress' ? ['passed', 'score']
    : envelope.entityType === 'library_membership' ? ['itemIds'] : ['op', 'fields'];
  let count = Object.keys(payload).filter((key) => !allowed.includes(key)).length;
  if (envelope.entityType === 'flashcard') {
    const fields = payload.fields as Readonly<Record<string, JsonValue>>;
    count += Object.keys(fields).filter((key) => !CARD_FIELD_SET.has(key) && !SRS_FIELD_SET.has(key)).length;
  }
  return count;
}

function sumCounts(entries: readonly ReportEntry[]): number {
  return entries.reduce((total, entry) => total + entry.count, 0);
}

function statusOf(held: readonly ReportEntry[], conflicts: readonly ConflictEntry[]): MigrationStatus {
  // зачем (решение 10): курс рун известен (1:1), статус needs_owner_rate снят — блокирует только HOLD/конфликт.
  return held.length > 0 || conflicts.length > 0 ? 'hold' : 'ready';
}

export function buildReport(uidHash: string, ledger: Ledger, batches: readonly ValidatedBatch[], runesTotal: number): MigrationReport {
  const envelopes = batches.flatMap((batch) => batch.operations.map(({ operation }) => operation));
  const byEntityType = emptyByType();
  const carried = emptyByType();
  const seen = new Set<string>();
  for (const envelope of envelopes) {
    byEntityType[envelope.entityType] += 1;
    const key = JSON.stringify([envelope.entityType, envelope.entityId]);
    if (!seen.has(key)) {
      seen.add(key);
      carried[envelope.entityType] += 1;
    }
  }
  const dropped = ledger.list('dropped');
  const derived = ledger.list('derived');
  const held = ledger.list('held');
  const informational = ledger.list('informational');
  const keptInPlace = ledger.list('keptInPlace');
  const conflicts = ledger.conflicts();
  const status = statusOf(held, conflicts);
  return {
    schema: MIGRATION_REPORT_SCHEMA,
    uidHash,
    status,
    applyAllowed: status === 'ready',
    pendingDomainCount: sumCounts(informational.filter((entry) => entry.reason === 'carry_pending_domain')),
    keptInPlaceCount: sumCounts(keptInPlace),
    carriedAndKeptCount: sumCounts(ledger.list('carried').filter((entry) => classifyReportPath(entry.path)?.retention === 'carried_and_kept')),
    inventory: inventorySummary(),
    totals: {
      carried: seen.size, dropped: sumCounts(dropped), derived: sumCounts(derived), held: sumCounts(held),
      informational: sumCounts(informational), keptInPlace: sumCounts(keptInPlace),
    },
    carried,
    carriedSources: ledger.list('carried'),
    dropped,
    derived,
    held,
    informational,
    keptInPlace,
    runesToCoins: { rate: RUNES_TO_COINS_RATE, runes: runesTotal, coins: runesTotal * RUNES_TO_COINS_RATE },
    conflicts,
    operations: {
      count: envelopes.length, batches: batches.length, byEntityType,
      sha256: sha256Hex(canonicalJson(batches as unknown as JsonValue)),
    },
    disallowedFieldsCopied: envelopes.reduce((total, envelope) => total + disallowedFields(envelope), 0),
  };
}

/**
 * Контракт исполнителя переноса: пакеты dry-run применяются ТОЛЬКО при
 * status === 'ready'. hold — есть блокирующие поля/конфликты. ready ≠ полный
 * перенос: чистку старого users/{uid} решают assertLegacyCleanupAllowed и legacyCleanupPaths.
 */
export function assertMigrationApplyAllowed(report: Pick<MigrationReport, 'status' | 'applyAllowed'>): void {
  if (report.status !== 'ready' || report.applyAllowed !== true) {
    console.warn(LOG, 'apply forbidden by report status', report.status);
    throw new Error(`accounts_v2_migration_apply_forbidden:${report.status}`);
  }
}

/**
 * Контракт чистки старых данных: только при status === 'ready' и
 * pendingDomainCount === 0 (нет полей без домена и без решения). keep_in_place
 * чистку не блокирует — эти поля просто не удаляются (legacyCleanupPaths).
 */
export function assertLegacyCleanupAllowed(report: Pick<MigrationReport, 'status' | 'applyAllowed' | 'pendingDomainCount'>): void {
  if (report.status !== 'ready' || report.applyAllowed !== true) {
    console.warn(LOG, 'legacy cleanup forbidden by report status', report.status);
    throw new Error(`accounts_v2_migration_cleanup_forbidden:${report.status}`);
  }
  if (report.pendingDomainCount !== 0) {
    // зачем: иначе чистка удалила бы данные, у которых ещё нет дома и решения.
    console.warn(LOG, 'legacy cleanup forbidden: fields wait for a V2 domain', report.pendingDomainCount);
    throw new Error(`accounts_v2_migration_cleanup_forbidden:pending_domain:${report.pendingDomainCount}`);
  }
}

/**
 * Путь поля из пути отчёта: снимается ТОЛЬКО собственная разметка отчёта в
 * конце (`[*]`, `[*].<поле карточки>`, `[official:*]`). Ключи со скобками dry-run
 * не классифицирует (HOLD ambiguous_key), поэтому разметка однозначна.
 * зачем (P3 ревью): прежний basePath резал по первой `[` и мог склеить чужой ключ с нашим.
 */
export function fieldPath(path: string): string {
  return path.replace(/\[(?:\*|[a-z]+:\*)\](?:\.[^[\]]*)?$/, '');
}

const CLEANUP_ROOTS: ReadonlySet<string> = new Set(['', 'progress', 'subcollections', 'stars']);
// зачем (ремонт №2 после повторного ревью, P3): «…» (обрезанный ключ), `<uid>` и `<masked>` — это
// разметка отчёта, а не настоящее имя поля; такой путь удалять нельзя никогда.
const UNSAFE_PATH = /[\s\u0000-\u001f\u007f[\]<>…]/;
const CLEANUP_DISPOSITIONS: ReadonlySet<Disposition> = new Set<Disposition>(['carry', 'derive', 'drop']);

/** Как классифицировать одно поле по областям; в проде — таблица инвентаря. */
export type InventoryLookup = Readonly<{
  progress: (key: string) => Classification;
  root: (key: string) => Classification;
  subcollection: (name: string) => Classification;
}>;

const INVENTORY_LOOKUP: InventoryLookup = Object.freeze({
  progress: classifyProgressKey, root: classifyRootField, subcollection: classifySubcollection,
});

/** Классификация пути отчёта по таблице инвентаря; null — путь не является одним полем/подколлекцией. */
function classifyReportPath(path: string, lookup: InventoryLookup = INVENTORY_LOOKUP): Classification | null {
  if (path.startsWith('progress.')) {
    const key = path.slice('progress.'.length);
    return key.length === 0 || key.includes('.') ? null : lookup.progress(key);
  }
  if (path.startsWith('subcollections.')) {
    const name = path.slice('subcollections.'.length).split('/')[0];
    return name.length === 0 || name.includes('.') ? null : lookup.subcollection(name);
  }
  return path.length === 0 || path.includes('.') ? null : lookup.root(path);
}

/**
 * Сторож allowlist: путь относится к keep_in_place по ТАБЛИЦЕ инвентаря, а не
 * по корзине отчёта (отчёт может быть подделан — валюту, серию, достижения не удаляем).
 */
export function isKeepInPlacePath(path: string): boolean {
  return classifyReportPath(fieldPath(path))?.disposition === 'keep_in_place';
}

/**
 * БЕЛЫЙ список удаляемого (ремонт после ревью, P1): путь допустим, только если
 * это ровно одно поле/подколлекция (без лишней точки, `/`, скобок, пробелов и
 * управляющих символов), не корень, и таблица инвентаря заново классифицирует
 * его как carry|derive|drop БЕЗ пометки «остаётся в легаси».
 */
export function isCleanupAllowedPath(path: string): boolean {
  return cleanupAllowedPathForLookup(path, INVENTORY_LOOKUP);
}

/**
 * Механика белого списка с явной таблицей. зачем: сейчас ВСЕ правила таблицы
 * помечены удержанием (живые читатели), и проверку формы пути (корни, точки,
 * скобки, маркеры) иначе нечем было бы проверить тестом. Прод — только isCleanupAllowedPath.
 */
export function cleanupAllowedPathForLookup(path: string, lookup: InventoryLookup): boolean {
  if (CLEANUP_ROOTS.has(path) || UNSAFE_PATH.test(path)) return false;
  if (path.startsWith('subcollections.') && path.slice('subcollections.'.length).includes('/')) return false;
  const found = classifyReportPath(path, lookup);
  return found !== null && found.ruleId !== null && CLEANUP_DISPOSITIONS.has(found.disposition) && found.retention === undefined;
}

type CleanupReport = Pick<MigrationReport, 'status' | 'applyAllowed' | 'pendingDomainCount' | 'carriedSources' | 'derived' | 'dropped'
  | 'held' | 'informational' | 'keptInPlace'>;

/**
 * Что исполнитель чистки ИМЕЕТ ПРАВО удалить из старого users/{uid}: пути из
 * carriedSources/derived/dropped, прошедшие белый список isCleanupAllowedPath
 * (только drop без пометки удержания; сейчас таких нет — все читает живой код, см. LegacyRetention).
 * Путь, который хоть частично в HOLD / информационный / keep_in_place, не удаляется.
 */
export function legacyCleanupPaths(report: CleanupReport): string[] {
  return legacyCleanupPathsForLookup(report, INVENTORY_LOOKUP);
}

/** legacyCleanupPaths с явной таблицей (для проверки механики тестом; прод — legacyCleanupPaths). */
export function legacyCleanupPathsForLookup(report: CleanupReport, lookup: InventoryLookup): string[] {
  assertLegacyCleanupAllowed(report);
  const blocked = new Set([...report.held, ...report.informational, ...report.keptInPlace].map((entry) => fieldPath(entry.path)));
  const allowed = new Set<string>();
  for (const entry of [...report.carriedSources, ...report.derived, ...report.dropped]) {
    // зачем: путь берётся как есть (без обрезки) и обязан пройти белый список — иначе не удаляем.
    if (blocked.has(entry.path) || !cleanupAllowedPathForLookup(entry.path, lookup)) continue;
    allowed.add(entry.path);
  }
  return [...allowed].sort(compare);
}

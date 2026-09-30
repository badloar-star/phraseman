import { createHash } from 'crypto';
import {
  ACCOUNTS_V2_ENTITY_TYPES,
  ACCOUNTS_V2_LIMITS,
  accountsV2JsonWireBytes,
  entityIdString,
  identityString,
  type AccountsV2EntityType,
  type AccountsV2Envelope,
  type AccountsV2OwnedOperation,
  type JsonObject,
  type JsonValue,
  type ValidatedBatch,
} from '../accounts_v2_contract';
import { canonicalJson } from '../accounts_v2_merge';
import { validateBatch } from '../accounts_v2_validate';
import {
  SAVED_CARD_FIELDS,
  SRS_CARD_FIELDS,
  classifyProgressKey,
  classifyRootField,
  classifySubcollection,
  type Classification,
} from './inventory';
import { Ledger, compare, pathKey } from './ledger';
import { MIGRATION_REPORT_SCHEMA, buildReport, fieldPath, type MigrationReport } from './report';
import { editTimeInFuture, parseTrainingKey, srsFromMemoryRow, validEditTime } from './srs_memory';

/*
 * Account V2, Пакет 5 — чистый детерминированный dry-run миграции.
 *
 * зачем: из ЛОКАЛЬНОГО снимка старых данных одного пользователя (документ
 * users/{uid} + подколлекции) построить план переноса в Account V2 и отчёт,
 * НИЧЕГО не записывая. Операции — те же конверты и лимиты, что шлёт клиент
 * (ACCOUNTS_V2_LIMITS = ACCOUNT_SYNC_LIMITS), каждый пакет выдан validateBatch
 * ядра, поэтому сервер их примет. operationId — хэш uid + сущности + куска +
 * СОДЕРЖИМОГО: повторный прогон того же содержимого даёт те же id (ядро
 * ответит duplicate), новая/изменённая сущность — новый id (ремонт №1, P1).
 * Отчёт — только счётчики и пути полей: ни значений, ни uid (хэш).
 * Никакого Firebase SDK, сети и файловой системы: чистая функция.
 *
 * Контракт исполнителя переноса (ремонт №1, P2): пакеты применяются ТОЛЬКО при
 * report.status === 'ready' (report.applyAllowed, assertMigrationApplyAllowed).
 *
 * TEMP (решения этой сессии, до ревью): формат entityId
 * (`<target>:lesson:<N>`, `<target>:saved|custom:<cardId>`,
 * `<target>:community_packs`); урок `{passed, score}` со score в старой шкале
 * 0–5; библиотека порциями по 500 id.
 */

export const MIGRATION_EXPORT_FORMAT = 'phraseman-legacy-user-export.v1';
const OPERATION_NAMESPACE = 'accounts-v2-migration.v1';
const LESSON_MAX_SCORE = 5;
// зачем (D121 в обе стороны, доработка после ревью P2-а): passed повторяет
// previousLessonScoreOpensNext (app/lesson_star_scale.ts). От 60% (3 из 5) —
// всегда. От старых 40% (2 из 5) — ТОЛЬКО если следующий урок уже лежит в
// unlocked_lessons: так перенос не закрывает открытое и не открывает новое.
const LESSON_UNLOCK_PERCENT = 60;
const LEGACY_LESSON_UNLOCK_PERCENT = 40;
const PERCENT_EPSILON = 1e-6;
// зачем (ремонт №2, хвост P3): у ES/DE список открытых уроков мог не попасть в снимок —
// без него 40–59% нельзя ни открыть, ни закрыть доказуемо → HOLD, а не тихий passed:false.
const TARGETS_REQUIRING_UNLOCK_LIST: ReadonlySet<string> = new Set(['es', 'de']);
// зачем (P3 ревью): `[` и `]` — разметка путей отчёта (`[*]`, `[official:*]`); ключ с ними неоднозначен → HOLD.
const AMBIGUOUS_KEY = /[[\]]/;
const LIBRARY_CHUNK = 500;
const MAX_UID_LENGTH = 128;
const INPUT_KEYS = ['format', 'uid', 'user', 'subcollections'] as const;
const PAGE_KEYS = ['target', 'index', 'count', 'cards', 'updatedAt'] as const;
const CARD_FIELD_SET: ReadonlySet<string> = new Set(SAVED_CARD_FIELDS);
const SRS_FIELD_SET: ReadonlySet<string> = new Set(SRS_CARD_FIELDS);
export { MIGRATION_REPORT_SCHEMA };
const PAGE_ID_DIGITS = 4;
const LOG = '[ACCOUNTS-V2-MIGRATION]';

export type MigrationInputErrorCode =
  | 'input_not_object' | 'input_unknown_field' | 'format_unsupported'
  | 'uid_invalid' | 'user_invalid' | 'subcollections_invalid';

export class MigrationInputError extends Error {
  readonly code: MigrationInputErrorCode;

  constructor(code: MigrationInputErrorCode) {
    super(code);
    this.name = 'MigrationInputError';
    this.code = code;
  }
}

export type { ConflictEntry, ReportEntry } from './ledger';
// зачем (ревью №3, P3): *ForLookup с произвольной таблицей обходят удержание — наружу не отдаём, только report.ts и тесты.
export {
  RUNES_TO_COINS_RATE,
  assertLegacyCleanupAllowed,
  assertMigrationApplyAllowed,
  fieldPath,
  isCleanupAllowedPath,
  isKeepInPlacePath,
  legacyCleanupPaths,
  type InventoryLookup,
  type MigrationReport,
  type MigrationStatus,
  type RunesToCoins,
} from './report';
export type MigrationDryRunResult = Readonly<{
  operations: Readonly<Record<AccountsV2EntityType, readonly AccountsV2Envelope[]>>;
  batches: readonly ValidatedBatch[];
  report: MigrationReport;
}>;
export type MigrationDryRunOptions = Readonly<{
  /** Часы исполнителя: SRS-время дальше допуска ядра — HOLD (ядро окончательно отклонило бы карточку). */
  nowMs?: number;
}>;

type PlainObject = Readonly<Record<string, unknown>>;
type Doc = Readonly<{ id: unknown; data: unknown }>;
type Input = Readonly<{ uid: string; user: PlainObject | null; subcollections: ReadonlyMap<string, readonly unknown[]> }>;
type Candidate = Readonly<{
  entityType: AccountsV2EntityType; entityId: string; chunk: number; payload: JsonValue; sourcePath: string;
  /** Доп. источники (память SRS), которые переносятся вместе с этой операцией. */
  extraSources?: readonly Readonly<{ reason: string; path: string }>[];
}>;
type Decoded = Readonly<{ ok: true; value: unknown }> | Readonly<{ ok: false }>;
type Source = Readonly<{ value: unknown; path: string }>;
type Runes = { total: number };
type Context = Readonly<{ uid: string; ledger: Ledger; nowMs?: number; runes: Runes }>;

// ─── вспомогательное ───────────────────────────────────────────────────────

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sortedKeys(value: PlainObject): string[] {
  return Object.keys(value).sort();
}

/** Значение progress: Firestore хранит строки AsyncStorage (JSON), старые формы — уже разобранные значения. */
function decode(raw: unknown, path: string): Decoded {
  if (typeof raw !== 'string') return { ok: true, value: raw };
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch (error) {
    // зачем: не немой catch — путь (без значения) и класс ошибки в лог, поле уходит в hold.
    console.warn(LOG, 'decode: JSON.parse failed', path, error instanceof Error ? error.name : typeof error);
    return { ok: false };
  }
}

// ─── вход ──────────────────────────────────────────────────────────────────

function readInput(snapshot: unknown): Input {
  if (!isPlainObject(snapshot)) throw new MigrationInputError('input_not_object');
  if (Object.keys(snapshot).some((key) => !(INPUT_KEYS as readonly string[]).includes(key))) {
    throw new MigrationInputError('input_unknown_field');
  }
  if (snapshot.format !== MIGRATION_EXPORT_FORMAT) throw new MigrationInputError('format_unsupported');
  const uid = snapshot.uid;
  if (!identityString(uid) || uid.length > MAX_UID_LENGTH) throw new MigrationInputError('uid_invalid');
  const user = snapshot.user;
  if (user !== null && !isPlainObject(user)) throw new MigrationInputError('user_invalid');
  const rawSubs = snapshot.subcollections;
  const subcollections = new Map<string, readonly unknown[]>();
  if (rawSubs !== undefined) {
    if (!isPlainObject(rawSubs)) throw new MigrationInputError('subcollections_invalid');
    for (const name of sortedKeys(rawSubs)) {
      const docs = rawSubs[name];
      if (!Array.isArray(docs)) throw new MigrationInputError('subcollections_invalid');
      subcollections.set(name, docs);
    }
  }
  return { uid, user, subcollections };
}

/**
 * Причина HOLD всего аккаунта или null.
 * зачем (инвентарь «Wrong UID admission» + ремонт №1, P2): данные чужого,
 * скрытого или ещё не слитого анонимного аккаунта нельзя приписать uid снимка
 * только потому, что их нашли рядом — сначала решает вход Account V2.
 */
function accountHoldReason(user: PlainObject, uid: string): string | null {
  const canonical = user.canonicalStableId;
  if (canonical !== undefined && canonical !== null && canonical !== uid) return 'owner_mismatch';
  const duplicateOf = user.duplicateOfStableId;
  if (typeof duplicateOf === 'string' && duplicateOf.length > 0) return 'owner_mismatch';
  if (user.identityHidden === true) return 'identity_hidden';
  const mergeClaim = user.anon_merge_claim;
  if (mergeClaim !== undefined && mergeClaim !== null && mergeClaim !== false) return 'anon_merge_pending';
  return null;
}

// ─── карточки ──────────────────────────────────────────────────────────────

type CardSources = { doc?: Source; alias?: Source; custom?: Source; memory?: Source };
type PageSet = Readonly<{ ok: true; cards: readonly unknown[] }> | Readonly<{ ok: false }>;
type PageRow = Readonly<{ index: number; count: unknown; cards: unknown; id: unknown }>;

/** Как flashcardPageDocId (app/flashcards_cloud_pages.ts): `${target}_${String(index).padStart(4, '0')}`. */
function pageDocId(target: string, index: number): string {
  return `${target}_${String(index).padStart(PAGE_ID_DIGITS, '0')}`;
}

function readPages(docs: readonly unknown[]): ReadonlyMap<string, PageSet> {
  const byTarget = new Map<string, PageRow[]>();
  const broken = new Set<string>();
  let untargeted = false;
  for (const raw of docs) {
    const data = isPlainObject(raw) ? (raw as Doc).data : undefined;
    if (!isPlainObject(data) || typeof data.target !== 'string' || data.target.length === 0) {
      untargeted = true;
      continue;
    }
    const target = data.target;
    const rows = byTarget.get(target) ?? [];
    byTarget.set(target, rows);
    const extra = Object.keys(data).some((key) => !(PAGE_KEYS as readonly string[]).includes(key));
    if (extra || typeof data.index !== 'number' || !Number.isSafeInteger(data.index) || data.index < 0) {
      broken.add(target);
      continue;
    }
    rows.push({ index: data.index, count: data.count, cards: data.cards, id: (raw as Doc).id });
  }
  const result = new Map<string, PageSet>();
  if (untargeted) result.set('', { ok: false });
  for (const [target, rows] of byTarget) {
    result.set(target, broken.has(target) ? { ok: false } : assemblePages(target, rows));
  }
  return result;
}

function assemblePages(target: string, rows: readonly PageRow[]): PageSet {
  // зачем (инвентарь, риск 2): обычный restore склеивает что осталось и может
  // отдать частичную библиотеку. Миграция принимает только полный набор:
  // индексы 0..n-1 без дыр и повторов, id документа (как пишет клиент), count, валидный JSON.
  const ordered = [...rows].sort((left, right) => left.index - right.index);
  const cards: unknown[] = [];
  for (let position = 0; position < ordered.length; position += 1) {
    const row = ordered[position];
    if (row.index !== position || row.id !== pageDocId(target, position) || typeof row.cards !== 'string') return { ok: false };
    const decoded = decode(row.cards, `subcollections.flashcard_pages/${target}`);
    if (!decoded.ok || !Array.isArray(decoded.value) || decoded.value.length !== row.count) return { ok: false };
    cards.push(...(decoded.value as unknown[]));
  }
  return { ok: true, cards };
}

function embeddedSrsProblem(value: unknown, nowMs: number | undefined): string | null {
  // зачем (решение 9): встроенное SRS-поле переносится, только если несёт своё время правки.
  const time = isPlainObject(value) ? value.updatedAtMs : undefined;
  if (!validEditTime(time)) return 'srs_time_missing';
  return editTimeInFuture(time, nowMs) ? 'srs_time_in_future' : null;
}

function cardProblems(item: PlainObject, ctx: Context): Readonly<{ reason: string; field: string }>[] {
  const problems: { reason: string; field: string }[] = [];
  for (const key of sortedKeys(item)) {
    if (SRS_FIELD_SET.has(key)) {
      const problem = embeddedSrsProblem(item[key], ctx.nowMs);
      if (problem !== null) problems.push({ reason: problem, field: key });
    } else if (!CARD_FIELD_SET.has(key)) {
      problems.push({ reason: 'unknown_card_field', field: pathKey(key, ctx.uid, false) });
    }
  }
  if (!entityIdString(item.id)) problems.push({ reason: 'malformed_value', field: 'id' });
  return problems;
}

function collectCards(list: readonly unknown[], kind: 'saved' | 'custom', target: string, path: string, ctx: Context, out: Candidate[]): void {
  const accepted = new Map<string, Readonly<{ canonical: string; candidate: Candidate }>>();
  const conflicted = new Set<string>();
  for (const item of list) {
    if (!isPlainObject(item)) {
      ctx.ledger.add('held', 'malformed_value', `${path}[*]`);
      continue;
    }
    const problems = cardProblems(item, ctx);
    if (problems.length > 0) {
      for (const { reason, field } of problems) ctx.ledger.add('held', reason, `${path}[*].${field}`);
      continue;
    }
    const id = item.id as string;
    if (conflicted.has(id)) continue;
    const canonical = canonicalJson(item as unknown as JsonValue);
    const prior = accepted.get(id);
    if (prior !== undefined) {
      if (prior.canonical === canonical) continue;
      accepted.delete(id);
      conflicted.add(id);
      ctx.ledger.add('held', 'duplicate_card_id', `${path}[*]`);
      continue;
    }
    accepted.set(id, { canonical, candidate: {
      entityType: 'flashcard', entityId: `${target}:${kind}:${id}`, chunk: 0,
      payload: { op: 'upsert', fields: item as unknown as JsonValue }, sourcePath: `${path}[*]`,
    } });
  }
  for (const { candidate } of accepted.values()) out.push(candidate);
}

function listFrom(source: Source, ledger: Ledger): readonly unknown[] | null {
  const decoded = decode(source.value, source.path);
  if (!decoded.ok || !Array.isArray(decoded.value)) {
    ledger.add('held', 'malformed_value', source.path);
    return null;
  }
  return decoded.value;
}

function resolveTargetCards(target: string, own: CardSources, pageSet: PageSet | undefined, ctx: Context, out: Candidate[]): void {
  const pagesPath = `subcollections.flashcard_pages/${target}`;
  if (pageSet !== undefined && !pageSet.ok) ctx.ledger.add('held', 'pages_incomplete', pagesPath);
  if (own.doc !== undefined) {
    // Документ главнее страниц (как restore: страницы читаются, только когда поля нет).
    const list = listFrom(own.doc, ctx.ledger);
    if (list !== null) {
      if (pageSet !== undefined && pageSet.ok
        && canonicalJson(list as JsonValue) !== canonicalJson(pageSet.cards as JsonValue)) {
        ctx.ledger.conflict('saved_cards_document_and_pages_differ', own.doc.path);
      }
      collectCards(list, 'saved', target, own.doc.path, ctx, out);
    }
  } else if (pageSet !== undefined) {
    // Неполные страницы — стоп: псевдоним не подставляем, частичную библиотеку не переносим.
    if (pageSet.ok) collectCards(pageSet.cards, 'saved', target, pagesPath, ctx, out);
  } else if (own.alias !== undefined) {
    const list = listFrom(own.alias, ctx.ledger);
    if (list !== null) collectCards(list, 'saved', target, own.alias.path, ctx, out);
  }
  if (own.custom !== undefined) {
    const list = listFrom(own.custom, ctx.ledger);
    if (list !== null) collectCards(list, 'custom', target, own.custom.path, ctx, out);
  }
}

function resolveCards(sources: ReadonlyMap<string, CardSources>, pages: ReadonlyMap<string, PageSet>, ctx: Context, out: Candidate[]): void {
  if (pages.get('') !== undefined) ctx.ledger.add('held', 'pages_incomplete', 'subcollections.flashcard_pages');
  const targets = [...new Set([...sources.keys(), ...pages.keys()])].filter((target) => target !== '').sort();
  for (const target of targets) {
    const own = sources.get(target) ?? {};
    const cards: Candidate[] = [];
    resolveTargetCards(target, own, pages.get(target), ctx, cards);
    out.push(...(own.memory === undefined ? cards : mergeSrsMemory(own.memory, target, cards, ctx)));
  }
}

// ─── SRS-память (решение владельца 9) ──────────────────────────────────────

type SrsPick = Readonly<{ srs: JsonObject; time: number; path: string }>;

function withSrs(candidate: Candidate, pick: SrsPick | undefined): Candidate {
  if (pick === undefined) return candidate;
  const payload = candidate.payload as Readonly<{ op: string; fields: Readonly<Record<string, JsonValue>> }>;
  const embedded = payload.fields.srs;
  const embeddedTime = isPlainObject(embedded) ? embedded.updatedAtMs : undefined;
  // зачем: при двух источниках побеждает более свежая правка — то же правило, что LWW ядра.
  if (validEditTime(embeddedTime) && embeddedTime >= pick.time) return candidate;
  // зачем (ремонт №2): путь памяти SRS считается перенесённым только вместе с принятой операцией карточки.
  const extraSources = [...(candidate.extraSources ?? []), { reason: 'flashcard_srs', path: pick.path }];
  return { ...candidate, payload: { op: payload.op, fields: { ...payload.fields, srs: pick.srs } }, extraSources };
}

function mergeSrsMemory(source: Source, target: string, cards: readonly Candidate[], ctx: Context): readonly Candidate[] {
  const decoded = decode(source.value, source.path);
  if (!decoded.ok || !isPlainObject(decoded.value)) {
    ctx.ledger.add('held', 'malformed_value', source.path);
    return cards;
  }
  const entityIds = new Set(cards.map((candidate) => candidate.entityId));
  const picks = new Map<string, SrsPick>();
  const memory = decoded.value;
  for (const key of sortedKeys(memory)) {
    const parsed = parseTrainingKey(key);
    if (parsed === null) {
      ctx.ledger.add('held', 'malformed_key', `${source.path}[*]`);
      continue;
    }
    if (parsed.source === 'official') {
      ctx.ledger.add('dropped', 'official_packs_removed', `${source.path}[official:*]`, ['D68']);
      continue;
    }
    if (parsed.source === 'community') {
      // Карточки набора сообщества — не сущности пользователя в Account V2: домена нет.
      ctx.ledger.add('informational', 'carry_pending_domain', `${source.path}[community:*]`);
      continue;
    }
    const row = srsFromMemoryRow(memory[key], ctx.nowMs);
    if (!row.ok) {
      const field = row.field === undefined ? '' : `.${pathKey(row.field, ctx.uid, false)}`;
      ctx.ledger.add('held', row.reason, `${source.path}[*]${field}`);
      continue;
    }
    const entityId = `${target}:${parsed.source}:${parsed.cardId}`;
    if (!entityIds.has(entityId)) {
      // Карточка удалена или не перенесена (тогда аккаунт уже в HOLD по самой карточке).
      ctx.ledger.add('informational', 'srs_card_absent', `${source.path}[${parsed.source}:*]`);
      continue;
    }
    picks.set(entityId, { srs: row.srs, time: row.updatedAtMs, path: source.path });
  }
  return cards.map((candidate) => withSrs(candidate, picks.get(candidate.entityId)));
}

// ─── урок и библиотека ─────────────────────────────────────────────────────

type LessonScore = Readonly<{ target: string; lessonId: number; value: unknown; path: string }>;
type LessonScan = { scores: LessonScore[]; unlocked: Map<string, ReadonlySet<number>> };

/** Как lessonScoreMeetsPercent (app/lesson_star_scale.ts): оценка 0…5 → процент с допуском. */
function scoreMeetsPercent(score: number, percent: number): boolean {
  return (Math.min(score, LESSON_MAX_SCORE) * 100) / LESSON_MAX_SCORE + PERCENT_EPSILON >= percent;
}

/** unlocked_lessons: массив номеров уроков (числа или строки-числа); иначе null → HOLD. */
function unlockedLessonIds(raw: unknown, path: string): ReadonlySet<number> | null {
  const decoded = decode(raw, path);
  if (!decoded.ok || !Array.isArray(decoded.value)) return null;
  const ids = new Set<number>();
  for (const item of decoded.value as unknown[]) {
    const id = typeof item === 'string' && /^\d{1,4}$/.test(item) ? Number(item) : item;
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0) return null;
    ids.add(id);
  }
  return ids;
}

function lessonCandidate(entry: LessonScore, unlocked: ReadonlySet<number> | undefined, ledger: Ledger): Candidate | null {
  const decoded = decode(entry.value, entry.path);
  const score = decoded.ok ? decoded.value : undefined;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > LESSON_MAX_SCORE) {
    ledger.add('held', 'malformed_value', entry.path);
    return null;
  }
  if (unlocked === undefined && TARGETS_REQUIRING_UNLOCK_LIST.has(entry.target)
    && scoreMeetsPercent(score, LEGACY_LESSON_UNLOCK_PERCENT) && !scoreMeetsPercent(score, LESSON_UNLOCK_PERCENT)) {
    ledger.add('held', 'lesson_unlock_unprovable', entry.path);
    return null;
  }
  if (unlocked === undefined && scoreMeetsPercent(score, LEGACY_LESSON_UNLOCK_PERCENT) && !scoreMeetsPercent(score, LESSON_UNLOCK_PERCENT)) {
    // зачем (P3 ревью): EN/FR — не молча: passed:false, но с отметкой, что списка открытых нет.
    ledger.add('informational', 'lesson_unlock_list_absent', entry.path);
  }
  // зачем (D121, P2-а): старый порог 40% засчитывается только за уже открытый следующий урок.
  const nextAlreadyUnlocked = unlocked !== undefined && unlocked.has(entry.lessonId + 1);
  const passed = scoreMeetsPercent(score, LESSON_UNLOCK_PERCENT)
    || (nextAlreadyUnlocked && scoreMeetsPercent(score, LEGACY_LESSON_UNLOCK_PERCENT));
  return {
    entityType: 'lesson_progress', entityId: `${entry.target}:lesson:${entry.lessonId}`, chunk: 0,
    payload: { passed, score }, sourcePath: entry.path,
  };
}

function libraryCandidates(raw: unknown, target: string, path: string, ledger: Ledger): Candidate[] {
  const decoded = decode(raw, path);
  if (!decoded.ok || !Array.isArray(decoded.value)) {
    ledger.add('held', 'malformed_value', path);
    return [];
  }
  const items = decoded.value as unknown[];
  const valid = items.filter((item): item is string => entityIdString(item));
  ledger.add('held', 'malformed_value', `${path}[*]`, [], items.length - valid.length);
  const ids = [...new Set(valid)].sort(compare);
  const out: Candidate[] = [];
  for (let start = 0; start < ids.length; start += LIBRARY_CHUNK) {
    out.push({
      entityType: 'library_membership', entityId: `${target}:community_packs`, chunk: start / LIBRARY_CHUNK,
      payload: { itemIds: ids.slice(start, start + LIBRARY_CHUNK) }, sourcePath: path,
    });
  }
  return out;
}

// ─── классификация документа ───────────────────────────────────────────────

/** Баланс рун: число или `{ balance }` (stars_ledger.normalizeStars) — целое ≥ 0; иначе null. */
function balanceOf(raw: unknown): number | null {
  const value = isPlainObject(raw) ? raw.balance : raw;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function recordRunes(found: Classification, value: unknown, path: string, ctx: Context): void {
  // зачем (решения 6, 10 и решение Fable): руны → монеты 1:1 = переименование в серверном
  // леджере; баланс остаётся на месте (keep_in_place), сумма — информационно; операций нет.
  const amount = balanceOf(value);
  if (amount === null) {
    ctx.ledger.add('held', 'malformed_value', path);
    return;
  }
  ctx.runes.total += amount;
  ctx.ledger.add('keptInPlace', found.reason, path, found.decisions);
}

function record(found: Classification, value: unknown, path: string, ctx: Context, count = 1): void {
  const { ledger } = ctx;
  if (found.ruleId === 'r.runes_balance') recordRunes(found, value, path, ctx);
  else if (found.disposition === 'drop') ledger.add('dropped', found.reason, path, found.decisions, count);
  else if (found.disposition === 'derive') ledger.add('derived', found.reason, path, found.decisions, count);
  else if (found.disposition === 'keep_in_place') ledger.add('keptInPlace', found.reason, path, found.decisions, count);
  else if (found.disposition === 'info' || found.disposition === 'carry_pending_domain') {
    ledger.add('informational', found.reason, path, found.decisions, count);
  } else if (found.disposition === 'hold') ledger.add('held', found.reason, path, found.decisions, count);
  else ledger.add('held', 'carry_without_handler', path);
}

function scanProgress(progress: PlainObject, ctx: Context, out: Candidate[], cards: Map<string, CardSources>): void {
  const lessons: LessonScan = { scores: [], unlocked: new Map() };
  for (const key of sortedKeys(progress)) {
    if (AMBIGUOUS_KEY.test(key)) {
      ctx.ledger.add('held', 'ambiguous_key', `progress.${pathKey(key, ctx.uid, false)}`);
      continue;
    }
    const found = classifyProgressKey(key);
    const path = `progress.${pathKey(key, ctx.uid, found.ruleId !== null)}`;
    const value = progress[key];
    if (found.ruleId === 'p.lesson_access') {
      // зачем (P2-а): список открытых нужен для passed; цель — та же, что у оценок (parseProgressKey).
      const ids = unlockedLessonIds(value, path);
      if (ids === null) ctx.ledger.add('held', 'malformed_value', path);
      else lessons.unlocked.set(found.target, ids);
    }
    if (found.disposition !== 'carry') {
      record(found, value, path, ctx);
      continue;
    }
    const sources = cards.get(found.target) ?? {};
    cards.set(found.target, sources);
    if (found.ruleId === 'p.lesson_best' && found.lessonId !== undefined) {
      // Ключи отсортированы, unlocked_lessons идёт после оценок — решаем passed после обхода.
      lessons.scores.push({ target: found.target, lessonId: found.lessonId, value, path });
    } else if (found.ruleId === 'p.community_packs') {
      out.push(...libraryCandidates(value, found.target, path, ctx.ledger));
    } else if (found.ruleId === 'p.saved_cards') {
      // null — поле вынесено в страницы (restore так же читает страницы).
      if (value !== null && value !== undefined) sources.doc = { value, path };
    } else if (found.ruleId === 'p.saved_cards_alias') {
      if (value !== null && value !== undefined && value !== '') sources.alias = { value, path };
    } else if (found.ruleId === 'p.custom_cards') {
      sources.custom = { value, path };
    } else if (found.ruleId === 'p.srs_memory') {
      if (value !== null && value !== undefined && value !== '') sources.memory = { value, path };
    } else {
      ctx.ledger.add('held', 'carry_without_handler', path);
    }
  }
  for (const entry of lessons.scores) {
    const candidate = lessonCandidate(entry, lessons.unlocked.get(entry.target), ctx.ledger);
    if (candidate !== null) out.push(candidate);
  }
}

function scanUser(input: Input, ctx: Context, out: Candidate[]): void {
  const { user } = input;
  const cards = new Map<string, CardSources>();
  if (user !== null) {
    for (const key of sortedKeys(user)) {
      if (key === 'progress') continue;
      if (AMBIGUOUS_KEY.test(key)) {
        ctx.ledger.add('held', 'ambiguous_key', pathKey(key, ctx.uid, false));
        continue;
      }
      const found = classifyRootField(key);
      record(found, user[key], pathKey(key, ctx.uid, found.ruleId !== null), ctx);
    }
    const progress = user.progress;
    if (isPlainObject(progress)) scanProgress(progress, ctx, out, cards);
    else if (progress !== undefined && progress !== null) ctx.ledger.add('held', 'malformed_value', 'progress');
  }
  let pages: ReadonlyMap<string, PageSet> = new Map();
  for (const [name, docs] of input.subcollections) {
    if (docs.length === 0) continue;
    if (AMBIGUOUS_KEY.test(name)) {
      ctx.ledger.add('held', 'ambiguous_key', `subcollections.${pathKey(name, ctx.uid, false)}`, [], docs.length);
      continue;
    }
    const found = classifySubcollection(name);
    if (found.ruleId === 's.flashcard_pages') pages = readPages(docs);
    else record(found, undefined, `subcollections.${pathKey(name, ctx.uid, found.ruleId !== null)}`, ctx, docs.length);
  }
  resolveCards(cards, pages, ctx, out);
}

// ─── операции и пакеты ─────────────────────────────────────────────────────

function operationIdFor(uid: string, candidate: Candidate): string {
  // зачем (ремонт №1, P1): id зависит от СОДЕРЖИМОГО куска, а не от места в общем
  // списке — новая карточка не сдвигает id старых (иначе ядро ответит operation_id_reused).
  return `m1-${sha256Hex(canonicalJson([OPERATION_NAMESPACE, uid, candidate.entityType, candidate.entityId, candidate.chunk,
    sha256Hex(canonicalJson(candidate.payload))]))}`;
}

function byEntity(left: Candidate, right: Candidate): number {
  const typeOrder = ACCOUNTS_V2_ENTITY_TYPES.indexOf(left.entityType) - ACCOUNTS_V2_ENTITY_TYPES.indexOf(right.entityType);
  return typeOrder || compare(left.entityId, right.entityId) || left.chunk - right.chunk;
}

/** Каждая операция по отдельности обязана пройти проверку ядра; иначе — hold, а не падение прогона. */
function admitOperations(uid: string, candidates: readonly Candidate[], ledger: Ledger): AccountsV2OwnedOperation[][] {
  const groups = new Map<string, AccountsV2OwnedOperation[]>();
  const rejected = new Set<string>();
  [...candidates].sort(byEntity).forEach((candidate, index) => {
    const entityKey = JSON.stringify([candidate.entityType, candidate.entityId]);
    if (rejected.has(entityKey)) return;
    const operation: AccountsV2Envelope = {
      schemaVersion: 1, operationId: operationIdFor(uid, candidate), entityType: candidate.entityType,
      // зачем (ремонт №1, P1): порядковый номер внутри СУЩНОСТИ (кусок + 1), не общий индекс прогона.
      entityId: candidate.entityId, clientSequence: candidate.chunk + 1, baseRevision: null, payload: candidate.payload,
    };
    const owned: AccountsV2OwnedOperation = { ownerUid: uid, operation };
    const single = validateBatch({ batchId: `m1b-probe-${index}`, operations: [owned] });
    if (!single.ok) {
      const reason = single.code === 'envelope_too_large' || single.code === 'batch_too_large'
        ? 'envelope_too_large' : `envelope_${single.code}`;
      ledger.add('held', reason, candidate.sourcePath);
      for (const extra of candidate.extraSources ?? []) ledger.add('held', reason, extra.path);
      rejected.add(entityKey);
      groups.delete(entityKey);
      return;
    }
    groups.set(entityKey, [...(groups.get(entityKey) ?? []), owned]);
  });
  return [...groups.values()];
}

const BATCH_ID_BYTES = 4 + 64;

function packBatches(uid: string, groups: readonly AccountsV2OwnedOperation[][], ledger: Ledger): ValidatedBatch[] {
  // зачем: операции одной сущности — в одном пакете (TEMP-контракт ядра (а)).
  const emptyBytes = accountsV2JsonWireBytes({ batchId: 'x'.repeat(BATCH_ID_BYTES), operations: [] });
  const sizes = (ops: readonly AccountsV2OwnedOperation[]): number => ops.reduce(
    (total, owned) => total + accountsV2JsonWireBytes(owned as unknown as JsonValue) + 1, 0,
  );
  const packs: AccountsV2OwnedOperation[][] = [];
  let current: AccountsV2OwnedOperation[] = [];
  let currentBytes = emptyBytes;
  for (const group of groups) {
    const groupBytes = sizes(group);
    if (group.length > ACCOUNTS_V2_LIMITS.maxBatchOperations || emptyBytes + groupBytes > ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes) {
      ledger.add('held', 'entity_too_large_for_batch', `${group[0].operation.entityType}`);
      continue;
    }
    if (current.length + group.length > ACCOUNTS_V2_LIMITS.maxBatchOperations
      || currentBytes + groupBytes > ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes) {
      packs.push(current);
      current = [];
      currentBytes = emptyBytes;
    }
    current = [...current, ...group];
    currentBytes += groupBytes;
  }
  if (current.length > 0) packs.push(current);
  return packs.map((operations) => {
    const batchId = `m1b-${sha256Hex(canonicalJson([`${OPERATION_NAMESPACE}.batch`, uid,
      operations.map(({ operation }) => operation.operationId)]))}`;
    const result = validateBatch({ batchId, operations });
    if (!result.ok) {
      // Не должно случаться: каждая операция и размер пакета проверены выше.
      console.error(LOG, 'packBatches: core rejected batch', result.code, result.path);
      throw new Error(`accounts_v2_migration_batch_rejected:${result.code}`);
    }
    return result.batch;
  });
}

/**
 * Источники реально выданных операций → корзина carried (базовый путь поля).
 * зачем (ремонт №2): чистка легаси удаляет «перенесённое» только по этим путям;
 * операция, не попавшая в пакет, путь не освобождает.
 */
function recordCarriedSources(candidates: readonly Candidate[], batches: readonly ValidatedBatch[], ledger: Ledger): void {
  const issued = new Set(batches.flatMap((batch) => batch.operations.map(({ operation }) => (
    JSON.stringify([operation.entityType, operation.entityId, operation.clientSequence])))));
  for (const candidate of candidates) {
    if (!issued.has(JSON.stringify([candidate.entityType, candidate.entityId, candidate.chunk + 1]))) continue;
    ledger.add('carried', candidate.entityType, fieldPath(candidate.sourcePath));
    for (const extra of candidate.extraSources ?? []) ledger.add('carried', extra.reason, fieldPath(extra.path));
  }
}

/**
 * Dry-run миграции одного пользователя. Вход — снимок формата
 * MIGRATION_EXPORT_FORMAT: `{ format, uid, user: users/{uid} | null,
 * subcollections?: { <имя>: [{ id, data }] } }`. Ничего не пишет.
 * Неверный конверт снимка — MigrationInputError; битые поля внутри — hold.
 */
export function runMigrationDryRun(snapshot: unknown, options: MigrationDryRunOptions = {}): MigrationDryRunResult {
  const input = readInput(snapshot);
  const uidHash = sha256Hex(`${OPERATION_NAMESPACE}:uid:${input.uid}`);
  const ctx: Context = { uid: input.uid, ledger: new Ledger(), nowMs: options.nowMs, runes: { total: 0 } };
  const accountHold = input.user === null ? null : accountHoldReason(input.user, input.uid);
  if (accountHold !== null) {
    console.warn(LOG, 'account held entirely', accountHold, uidHash);
    ctx.ledger.add('held', accountHold, '$');
    return {
      operations: { lesson_progress: [], flashcard: [], library_membership: [] },
      batches: [],
      report: buildReport(uidHash, ctx.ledger, [], ctx.runes.total),
    };
  }
  const candidates: Candidate[] = [];
  scanUser(input, ctx, candidates);
  const batches = packBatches(input.uid, admitOperations(input.uid, candidates, ctx.ledger), ctx.ledger);
  recordCarriedSources(candidates, batches, ctx.ledger);
  const operations: Record<AccountsV2EntityType, AccountsV2Envelope[]> = { lesson_progress: [], flashcard: [], library_membership: [] };
  for (const batch of batches) {
    for (const { operation } of batch.operations) operations[operation.entityType].push(operation);
  }
  return { operations, batches, report: buildReport(uidHash, ctx.ledger, batches, ctx.runes.total) };
}

import fs from 'fs';
import path from 'path';
import * as ts from 'typescript';
import {
  ACCOUNTS_V2_BATCH_KEYS,
  ACCOUNTS_V2_ENTITY_TYPES,
  ACCOUNTS_V2_ENVELOPE_KEYS,
  ACCOUNTS_V2_LIMITS,
  ACCOUNTS_V2_OWNED_OPERATION_KEYS,
  ACCOUNTS_V2_RECEIPT_KEYS,
  ACCOUNTS_V2_RECEIPT_OUTCOMES,
  ACCOUNTS_V2_REJECT_CODES,
  ACCOUNTS_V2_SCHEMA_VERSION,
  accountsV2JsonWireBytes,
  applyBatch,
  validateBatch,
  type AccountsV2TxPort,
  type JsonValue,
} from './accounts_v2_apply_core';
import {
  ACCOUNTS_V2_CLIENT_ERROR_CONTRACT,
  accountsV2ClientAction,
  accountsV2IsWaitResponse,
} from './accounts_v2_adapter/errors';
import { ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS } from './accounts_v2_contract';

/*
 * Сторож паритета конверта синхронизации Account V2.
 *
 * зачем: клиент (`modules/account-session-v2/account_sync.ts`) и сервер
 * (`functions/src/accounts_v2_*.ts`) живут в разных пакетах и не импортируют
 * друг друга. Если клиент поменяет лимит, поле конверта или допустимый
 * entityType, а сервер нет — пакеты начнут молча отклоняться (или, хуже,
 * приниматься с другой схемой). Поэтому сверяем ТЕКСТ клиентского исходника с
 * серверными константами, а правила строк клиента (identityString,
 * entityIdString, ключи captureJson) исполняем прямо из его текста: сервер не
 * должен быть строже клиента — иначе одна «кривая» операция навсегда
 * блокирует очередь. Сработал — синхронизируй обе стороны, а не ослабляй сторож.
 */

const CLIENT_SOURCE_PATH = path.resolve(
  __dirname, '..', '..', 'modules', 'account-session-v2', 'account_sync.ts',
);

/** Все модули серверного ядра (кроме тестов): ядро можно дробить, сторож это видит. */
function serverModules(): readonly (readonly [string, string])[] {
  return fs.readdirSync(__dirname)
    .filter((name) => /^accounts_v2_[\w]+\.ts$/.test(name) && !name.endsWith('.test.ts'))
    .sort()
    .map((name) => [name, fs.readFileSync(path.join(__dirname, name), 'utf8')] as const);
}

function capture(source: string, pattern: RegExp, label: string, problems: string[]): string | null {
  const match = pattern.exec(source);
  if (match === null) {
    problems.push(`${label}: блок не найден в клиентском исходнике`);
    return null;
  }
  return match[1];
}

function typeFields(body: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const match of body.matchAll(/(\w+)\??\s*:\s*([^;]+);/g)) {
    fields.set(match[1], match[2].replace(/\s+/g, ' ').trim());
  }
  return fields;
}

function literals(text: string): string[] {
  return [...text.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function sameList(label: string, client: readonly unknown[], server: readonly unknown[], problems: string[]): void {
  const left = JSON.stringify([...client]);
  const right = JSON.stringify([...server]);
  if (left !== right) problems.push(`${label}: клиент ${left} ≠ сервер ${right}`);
}

// зачем: форма rejected-квитанции берётся из НАСТОЯЩЕГО ответа applyBatch,
// а не из объявления типа — сверяется то, что уйдёт клиенту по проводу.
function serverReceiptKeys(): Readonly<Record<string, readonly string[]>> {
  const port: AccountsV2TxPort = {
    getOp: () => null, getEntity: () => null, putEntity: () => undefined, putReceipt: () => undefined,
  };
  const op = (operationId: string, entityType: string, baseRevision: number | null, payload: JsonValue) => ({
    ownerUid: 'u', operation: {
      schemaVersion: 1, operationId, entityType, entityId: 'e', clientSequence: 1, baseRevision, payload,
    },
  });
  const result = validateBatch({ batchId: 'b', operations: [
    op('a', 'flashcard', null, { op: 'tombstone' }),
    op('c', 'library_membership', null, { itemIds: ['x'] }),
    op('k', 'flashcard', 5, { op: 'upsert', fields: { f: 1 } }),
    op('r', 'lesson_progress', null, { score: 'bad' }),
  ] });
  if (!result.ok) throw new Error(`serverReceiptKeys: ${result.code}`);
  const receipts = applyBatch(port, 'u', result.batch, 1);
  return Object.fromEntries(receipts.map((receipt) => [receipt.outcome, Object.keys(receipt).sort()]));
}

function checkReceiptShapes(source: string, problems: string[]): void {
  const server = serverReceiptKeys();
  const serverOutcomes = ACCOUNTS_V2_RECEIPT_OUTCOMES as readonly string[];
  const known = new Set<string>();
  // Все объявления квитанций клиента: объектные типы с полями outcome и serverRevision.
  for (const match of source.matchAll(/Readonly<\{([^{}]*\boutcome\??\s*:[^{}]*)\}>/g)) {
    const fields = typeFields(`${match[1]};`);
    if (!fields.has('serverRevision')) continue;
    const outcomes = literals(fields.get('outcome') ?? '');
    outcomes.forEach((item) => known.add(item));
    const unknown = outcomes.filter((item) => !serverOutcomes.includes(item));
    if (unknown.length > 0) problems.push(`квитанция клиента: исходы ${JSON.stringify(unknown)} сервер не выдаёт`);
    const keys = [...fields.keys()].sort();
    for (const outcome of outcomes) {
      const expected = server[outcome];
      if (expected === undefined) continue;
      if (outcome === 'rejected' && JSON.stringify(keys) !== JSON.stringify(expected)) {
        problems.push(`квитанция rejected: клиент ${JSON.stringify(keys)} ≠ сервер ${JSON.stringify(expected)}`);
      }
      if (outcome !== 'rejected' && !keys.every((key) => expected.includes(key) || key === 'code')) {
        problems.push(`квитанция ${outcome}: клиент ждёт поля ${JSON.stringify(keys)}, сервер шлёт ${JSON.stringify(expected)}`);
      }
    }
  }
  // зачем (TG-831C22D22486): клиент научен conflict/rejected — теперь он обязан знать
  // КАЖДЫЙ исход сервера, иначе после подключения callable операции с новым исходом
  // навсегда застрянут в sync_receipt_invalid.
  const missing = serverOutcomes.filter((item) => !known.has(item));
  if (missing.length > 0) problems.push(`квитанции клиента: не знают исходов сервера ${JSON.stringify(missing)}`);
}

function collectParityMismatches(source: string): string[] {
  const problems: string[] = [];

  const limitsBody = capture(source,
    /export const ACCOUNT_SYNC_LIMITS = Object\.freeze\(\{([\s\S]*?)\}\s*as const\);/,
    'ACCOUNT_SYNC_LIMITS', problems);
  if (limitsBody !== null) {
    const clientLimits: Record<string, number> = {};
    for (const match of limitsBody.matchAll(/(\w+)\s*:\s*(\d+)\s*,?/g)) {
      clientLimits[match[1]] = Number(match[2]);
    }
    const serverLimits: Record<string, number> = { ...ACCOUNTS_V2_LIMITS };
    sameList('ACCOUNT_SYNC_LIMITS ключи', Object.keys(clientLimits).sort(),
      Object.keys(serverLimits).sort(), problems);
    for (const key of Object.keys(serverLimits)) {
      if (clientLimits[key] !== serverLimits[key]) {
        problems.push(`ACCOUNT_SYNC_LIMITS.${key}: клиент ${clientLimits[key]} ≠ сервер ${serverLimits[key]}`);
      }
    }
  }

  const envelopeBody = capture(source,
    /export type LocalOperationEnvelope = Readonly<\{([\s\S]*?)\}>;/,
    'LocalOperationEnvelope', problems);
  if (envelopeBody !== null) {
    const fields = typeFields(envelopeBody);
    sameList('LocalOperationEnvelope поля', [...fields.keys()], ACCOUNTS_V2_ENVELOPE_KEYS, problems);
    if (fields.get('schemaVersion') !== String(ACCOUNTS_V2_SCHEMA_VERSION)) {
      problems.push(`schemaVersion: клиент ${fields.get('schemaVersion')} ≠ сервер ${ACCOUNTS_V2_SCHEMA_VERSION}`);
    }
    sameList('LocalOperationEnvelope.entityType', literals(fields.get('entityType') ?? ''),
      ACCOUNTS_V2_ENTITY_TYPES, problems);
    const expectedTypes: Record<string, string> = {
      operationId: 'string', entityId: 'string', clientSequence: 'number',
      baseRevision: 'number | null', payload: 'unknown',
    };
    for (const [key, type] of Object.entries(expectedTypes)) {
      if (fields.get(key) !== type) problems.push(`LocalOperationEnvelope.${key}: тип ${fields.get(key)} ≠ ${type}`);
    }
  }

  const runtimeTypes = capture(source,
    /const ENTITY_TYPES = Object\.freeze\(\[([\s\S]*?)\]/, 'ENTITY_TYPES', problems);
  if (runtimeTypes !== null) {
    sameList('ENTITY_TYPES (рантайм клиента)', literals(runtimeTypes), ACCOUNTS_V2_ENTITY_TYPES, problems);
  }

  const ownedBody = capture(source,
    /export type AccountSyncOwnedOperation = Readonly<\{([\s\S]*?)\}>;/,
    'AccountSyncOwnedOperation', problems);
  if (ownedBody !== null) {
    sameList('AccountSyncOwnedOperation поля', [...typeFields(ownedBody).keys()],
      ACCOUNTS_V2_OWNED_OPERATION_KEYS, problems);
  }

  const batchBody = capture(source,
    /export type AccountSyncBatch = Readonly<\{([\s\S]*?)\}>;/, 'AccountSyncBatch', problems);
  if (batchBody !== null) {
    sameList('AccountSyncBatch поля', [...typeFields(batchBody).keys()], ACCOUNTS_V2_BATCH_KEYS, problems);
  }

  const receiptBody = capture(source,
    /export type AccountSyncReceipt = Readonly<\{([\s\S]*?)\}>;/, 'AccountSyncReceipt', problems);
  if (receiptBody !== null) {
    const fields = typeFields(receiptBody);
    sameList('AccountSyncReceipt поля', [...fields.keys()], ACCOUNTS_V2_RECEIPT_KEYS, problems);
    // зачем: клиент будет обновлён до conflict/rejected ДО подключения callable.
    // Поэтому сверяем «исходы клиента ⊆ исходов сервера», а не точное равенство:
    // клиент может знать меньше, но никогда — исход, которого сервер не выдаёт.
    const clientOutcomes = literals(fields.get('outcome') ?? '');
    if (clientOutcomes.length === 0) problems.push('AccountSyncReceipt.outcome: исходы не найдены');
    const unknown = clientOutcomes.filter((item) => !(ACCOUNTS_V2_RECEIPT_OUTCOMES as readonly string[]).includes(item));
    if (unknown.length > 0) {
      problems.push(`AccountSyncReceipt.outcome: клиент ждёт ${JSON.stringify(unknown)}, сервер их не выдаёт`);
    }
  }
  checkReceiptShapes(source, problems);

  const rejectCodes = capture(source,
    /export const ACCOUNT_SYNC_REJECT_CODES = Object\.freeze\(\[([\s\S]*?)\]/,
    'ACCOUNT_SYNC_REJECT_CODES', problems);
  if (rejectCodes !== null) {
    sameList('ACCOUNT_SYNC_REJECT_CODES', literals(rejectCodes), ACCOUNTS_V2_REJECT_CODES, problems);
  }

  const loadEffect = capture(source,
    /type: 'LOAD_OUTBOX_BATCH';([\s\S]*?)\}>/, 'LOAD_OUTBOX_BATCH', problems);
  if (loadEffect !== null) {
    // Последнее поле эффекта закрывается `}>` без `;` — добавляем разделитель.
    const fields = typeFields(`${loadEffect};`);
    if (fields.get('maxOperations') !== String(ACCOUNTS_V2_LIMITS.maxBatchOperations)) {
      problems.push(`LOAD_OUTBOX_BATCH.maxOperations ${fields.get('maxOperations')} ≠ сервер`);
    }
    if (fields.get('maxBatchUtf8Bytes') !== String(ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes)) {
      problems.push(`LOAD_OUTBOX_BATCH.maxBatchUtf8Bytes ${fields.get('maxBatchUtf8Bytes')} ≠ сервер`);
    }
  }
  return problems;
}

// Тело цикла подсчёта байт строки: без пробелов и без клиентского досрочного
// выхода по `maximum` (сервер считает целиком и сравнивает с лимитом после).
function wireLoopBody(source: string, problems: string[], label: string): string | null {
  const start = source.indexOf('function stringWireBytes(');
  if (start < 0) {
    problems.push(`${label}: stringWireBytes не найдена`);
    return null;
  }
  const loop = source.indexOf('for (let index = 0;', start);
  const end = source.indexOf('return bytes;', start);
  if (loop < 0 || end < 0 || loop > end) {
    problems.push(`${label}: цикл stringWireBytes не найден`);
    return null;
  }
  return source.slice(loop, end)
    .replace(/if \(bytes > maximum\) throw new ContentInvalid\(\);/g, '')
    .replace(/\s+/g, '');
}

// ─── правила строк клиента, исполняемые из его текста ──────────────────────

type StringPredicate = (value: unknown) => boolean;

function clientPredicate(source: string, name: string): StringPredicate {
  const pattern = new RegExp(`function ${name}\\(value: unknown\\): value is string \\{\\s*return ([^;]+);\\s*\\}`);
  const match = pattern.exec(source);
  if (match === null) throw new Error(`${name}: не найдена в клиентском исходнике`);
  // Выражение клиента — чистый JS без TS-синтаксиса; исполняем его как есть.
  return new Function('value', `return (${match[1]});`) as StringPredicate;
}

/** Проблемы, если клиентский captureJson начал проверять СОДЕРЖИМОЕ ключей. */
function captureJsonKeyRuleProblems(source: string): string[] {
  const start = source.indexOf('function captureJson(');
  const end = source.indexOf('function objectBaseWireBytes(', start);
  if (start < 0 || end < 0) return ['captureJson: не найдена в клиентском исходнике'];
  const body = source.slice(start, end);
  const problems: string[] = [];
  if (!body.includes("typeof key !== 'string'")) problems.push('captureJson: нет проверки typeof key');
  const contentChecks = body.match(
    /\bkey\s*\.\s*\w+|\bkey\s*[!=]==?(?!=)(?!\s*'string')|\b\w+\(\s*key\s*\)|\.test\(\s*key\b/g,
  );
  if (contentChecks !== null) {
    problems.push(`captureJson: клиент проверяет содержимое ключей ${JSON.stringify(contentChecks)} — сервер обязан совпасть`);
  }
  return problems;
}

type StringField = 'batchId' | 'operationId' | 'entityId' | 'ownerUid' | 'payloadKey';
const STRING_FIELDS: readonly StringField[] = ['batchId', 'operationId', 'entityId', 'ownerUid', 'payloadKey'];

function batchWith(field: StringField, value: string): Record<string, JsonValue> {
  const operation: Record<string, JsonValue> = {
    schemaVersion: 1, operationId: 'op-1', entityType: 'flashcard', entityId: 'card',
    clientSequence: 1, baseRevision: null, payload: { op: 'tombstone' },
  };
  let ownerUid = 'user-A';
  let batchId = 'batch-1';
  if (field === 'batchId') batchId = value;
  if (field === 'operationId') operation.operationId = value;
  if (field === 'entityId') operation.entityId = value;
  if (field === 'ownerUid') ownerUid = value;
  if (field === 'payloadKey') operation.payload = Object.defineProperty({}, value, { value: 1, enumerable: true });
  return { batchId, operations: [{ ownerUid, operation }] };
}

function clientAccepts(
  field: StringField,
  value: string,
  raw: Record<string, JsonValue>,
  rules: Readonly<{ identity: StringPredicate; entityId: StringPredicate }>,
): boolean {
  const idBytes = accountsV2JsonWireBytes(value) - 2;
  let fieldOk = true;
  if (field === 'batchId') fieldOk = rules.identity(value) && idBytes <= ACCOUNTS_V2_LIMITS.maxBatchIdUtf8Bytes;
  if (field === 'operationId') fieldOk = rules.identity(value) && idBytes <= ACCOUNTS_V2_LIMITS.maxOperationIdUtf8Bytes;
  if (field === 'entityId') fieldOk = rules.entityId(value);
  if (field === 'ownerUid') fieldOk = rules.identity(value);
  // payloadKey: captureJson клиента не проверяет содержимое ключей (сверено текстом отдельно).
  const operation = ((raw.operations as JsonValue[])[0] as Record<string, JsonValue>).operation;
  return fieldOk
    && accountsV2JsonWireBytes(operation) <= ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes
    && accountsV2JsonWireBytes(raw) <= ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes;
}

const ALL_ACCEPT: Readonly<Record<StringField, boolean>> = {
  batchId: true, operationId: true, entityId: true, ownerUid: true, payloadKey: true,
};

function longFor(field: StringField): string {
  if (field === 'batchId') return 'z'.repeat(ACCOUNTS_V2_LIMITS.maxBatchIdUtf8Bytes + 1);
  if (field === 'operationId') return 'z'.repeat(ACCOUNTS_V2_LIMITS.maxOperationIdUtf8Bytes + 1);
  if (field === 'ownerUid') return 'z'.repeat(ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes);
  return 'z'.repeat(ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes);
}

// Таблица «принять/отклонить»: ожидаемый вердикт — у ОБЕИХ сторон.
const STRING_TABLE: readonly (readonly [string, (field: StringField) => string, Readonly<Record<StringField, boolean>>])[] = [
  ['управляющий символ', () => 'a\u0001b', ALL_ACCEPT],
  ['NUL', () => 'a\u0000b', ALL_ACCEPT],
  ['DEL', () => 'op\u007f', ALL_ACCEPT],
  ['одиночный высокий суррогат', () => 'x\uD800', ALL_ACCEPT],
  ['одиночный низкий суррогат', () => '\uDC00y', ALL_ACCEPT],
  ['перевод строки внутри', () => 'a\nb', ALL_ACCEPT],
  ['эмодзи', () => 'op-😀', ALL_ACCEPT],
  ['служебные символы Firestore', () => '__x__/..', ALL_ACCEPT],
  ['пробелы по краям', () => ' x ',
    { batchId: false, operationId: false, entityId: true, ownerUid: false, payloadKey: true }],
  ['пустая строка', () => '',
    { batchId: false, operationId: false, entityId: false, ownerUid: false, payloadKey: true }],
  ['сверх лимита клиента', longFor,
    { batchId: false, operationId: false, entityId: false, ownerUid: false, payloadKey: false }],
];

// ─── таблица решений клиента по ошибкам транспорта (TG-831C22D22486) ───────
// зачем: клиент КОПИРУЕТ эталон сервера (accountsV2ClientAction / IsWaitResponse
// и ACCOUNTS_V2_CLIENT_ERROR_CONTRACT), а не импортирует его через границу
// пакетов. Сторож сверяет текст копии и исполняет её на общей таблице случаев:
// разойдутся — клиент начнёт класть живые пакеты в карантин или крутить мёртвые.

const CLIENT_TRANSPORT_PATH = path.resolve(
  __dirname, '..', '..', 'modules', 'account-session-v2', 'account_sync_transport.ts',
);
const SERVER_ERRORS_PATH = path.join(__dirname, 'accounts_v2_adapter', 'errors.ts');

/** Имена клиента → имена сервера: после замены тексты функций обязаны совпасть. */
const TRANSPORT_RENAMES: readonly (readonly [RegExp, string])[] = [
  [/\bACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS\b/g, 'ACCOUNTS_V2_CLIENT_MAX_ATTEMPTS'],
  [/\bACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS\b/g, 'ACCOUNTS_V2_CLIENT_MIN_FAILURE_SPAN_MS'],
  [/\baccountSyncIsWaitResponse\b/g, 'accountsV2IsWaitResponse'],
  [/\baccountSyncClientAction\b/g, 'accountsV2ClientAction'],
  [/\bAccountSyncClientAction\b/g, 'AccountsV2ClientAction'],
];

function functionText(source: string, name: string): string | null {
  const start = source.indexOf(`export function ${name}(`);
  if (start < 0) return null;
  const end = source.indexOf('\n}\n', start);
  if (end < 0) return null;
  return source.slice(start, end + 2)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s+/g, '');
}

/**
 * Значение константы-произведения из исходника (`24 * 60 * 60 * 1000`, `180 * DAY_MS`).
 * зачем: сторож читает ТЕКСТ обеих сторон, а не зашитые в тест числа.
 */
function constProduct(source: string, name: string, known: Readonly<Record<string, number>> = {}): number {
  const match = new RegExp(`(?:export )?const ${name} = ([\\w\\s*]+);`).exec(source);
  if (match === null) return Number.NaN;
  return match[1].split('*').map((token) => token.trim()).reduce((product, token) => {
    // Числовой литерал может быть с разделителями (60_000); имя константы — нет.
    if (/^\d[\d_]*$/.test(token)) return product * Number(token.replace(/_/g, ''));
    return product * (known[token] ?? Number.NaN);
  }, 1);
}

function booleanField(body: string, key: string): boolean | undefined {
  const value = new RegExp(`\\b${key}: (true|false)`).exec(body)?.[1];
  return value === undefined ? undefined : value === 'true';
}

function clientContractValues(source: string, problems: string[]): Record<string, unknown> | null {
  const body = capture(source,
    /export const ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT = Object\.freeze\(\{([\s\S]*?)\}\);/,
    'ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT', problems);
  const maxAttempts = capture(source, /export const ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS = (\d+);/,
    'ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS', problems);
  if (body === null || maxAttempts === null) return null;
  const list = (key: string): string[] => literals(new RegExp(`\\b${key}: Object\\.freeze\\(\\[([^\\]]*)\\]`).exec(body)?.[1] ?? '');
  const decideBy = /decideBy: '([^']+)'/.exec(body)?.[1];
  const maxRef = /maxAttempts: (\w+)/.exec(body)?.[1];
  const spanRef = /minFailureSpanMs: (\w+)/.exec(body)?.[1];
  return {
    decideBy,
    final: list('final'),
    retryable: list('retryable'),
    reauth: list('reauth'),
    maxAttempts: maxRef === 'ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS' ? Number(maxAttempts) : Number(maxRef),
    retryAfterConsumesAttempt: booleanField(body, 'retryAfterConsumesAttempt'),
    minFailureSpanMs: spanRef === undefined ? undefined : constProduct(source, spanRef),
    attemptsExhaustedRequeue: booleanField(body, 'attemptsExhaustedRequeue'),
  };
}

function collectTransportMismatches(clientSource: string, serverSource: string): string[] {
  const problems: string[] = [];
  const client = clientContractValues(clientSource, problems);
  if (client !== null) {
    const server = JSON.parse(JSON.stringify(ACCOUNTS_V2_CLIENT_ERROR_CONTRACT)) as Record<string, unknown>;
    for (const key of Object.keys(server)) {
      if (JSON.stringify(client[key]) !== JSON.stringify(server[key])) {
        problems.push(`таблица решений ${key}: клиент ${JSON.stringify(client[key])} ≠ сервер ${JSON.stringify(server[key])}`);
      }
    }
  }
  const renamed = TRANSPORT_RENAMES.reduce((text, [pattern, name]) => text.replace(pattern, name), clientSource);
  for (const name of ['accountsV2IsWaitResponse', 'accountsV2ClientAction']) {
    const left = functionText(renamed, name);
    const right = functionText(serverSource, name);
    if (left === null || right === null) problems.push(`функция ${name}: не найдена (клиент ${left !== null}, сервер ${right !== null})`);
    else if (left !== right) problems.push(`функция ${name}: текст клиента расходится с эталоном сервера`);
  }
  return problems;
}

type ClientDecision = Readonly<{
  accountSyncClientAction: (error: Readonly<{ code: string; details?: unknown }>, failed: number, failingForMs: number) => string;
  accountSyncIsWaitResponse: (error: Readonly<{ code: string; details?: unknown }>) => boolean;
  ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT: unknown;
}>;

/** Исполняет КЛИЕНТСКУЮ копию: модуль без runtime-импортов, транспиляция TypeScript → JS. */
function loadClientDecision(clientSource: string): ClientDecision {
  const js = ts.transpileModule(clientSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  }).outputText;
  const exports: Record<string, unknown> = {};
  const requireStub = (name: string): never => {
    throw new Error(`клиентский транспорт не должен иметь runtime-импортов: ${name}`);
  };
  new Function('exports', 'require', js)(exports, requireStub);
  return exports as unknown as ClientDecision;
}

/** Сколько длятся неудачи пакета: без суток, ровно сутки, больше, «часы назад». */
const FAILING_FOR_CASES: readonly number[] = [
  -1, 0, 15_000, ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.minFailureSpanMs - 1,
  ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.minFailureSpanMs, ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.minFailureSpanMs * 3,
];

const DECISION_CASES: readonly Readonly<{ code: string; details?: unknown }>[] = [
  { code: 'invalid-argument', details: { final: true } },
  { code: 'permission-denied', details: { final: true, code: 'uid_mismatch' } },
  { code: 'failed-precondition', details: { final: true, code: 'batch_rejected' } },
  { code: 'failed-precondition' },
  { code: 'invalid-argument', details: { final: 'true' } },
  { code: 'unauthenticated', details: { final: false } },
  { code: 'unauthenticated', details: { final: true } },
  { code: 'resource-exhausted', details: { final: false, retryAfterMs: 1 } },
  { code: 'resource-exhausted', details: { final: false, retryAfterMs: 0 } },
  { code: 'resource-exhausted', details: { final: false, retryAfterMs: Number.NaN } },
  { code: 'resource-exhausted', details: { final: true, retryAfterMs: 50 } },
  { code: 'resource-exhausted' },
  { code: 'unavailable', details: { final: false } },
  { code: 'unavailable', details: null },
  { code: 'internal' },
  { code: 'deadline-exceeded', details: 'text' },
];

describe('паритет конверта Account V2: клиент ↔ сервер', () => {
  const source = fs.readFileSync(CLIENT_SOURCE_PATH, 'utf8');
  const modules = serverModules();
  const serverSource = modules.map(([, text]) => text).join('\n');

  test('формула байт строки на сервере — текстом та же, что клиентская stringWireBytes', () => {
    const problems: string[] = [];
    const client = wireLoopBody(source, problems, 'клиент');
    const server = wireLoopBody(serverSource, problems, 'сервер');
    expect(problems).toEqual([]);
    expect(server).toBe(client);
  });

  // Общие тест-векторы: суррогаты (пара и одиночные), экранирование JSON,
  // управляющие символы, U+2028, числа в экспоненте. Эталон — JSON.stringify
  // (как на клиенте при отправке) + UTF-8 длина по Buffer.
  test.each([
    ['пустая строка', ''],
    ['ASCII', 'hello'],
    ['кириллица', 'привет'],
    ['эмодзи (пара суррогатов)', 'a😀b'],
    ['одиночный высокий суррогат', 'x\uD800y'],
    ['одиночный низкий суррогат', '\uDC00'],
    ['высокий в конце', 'end\uDBFF'],
    ['кавычка и обратный слеш', 'a"b\\c'],
    ['короткие экранирования', '\b\f\n\r\t'],
    ['прочие управляющие', '\u0000\u0001\u001f'],
    ['DEL и U+2028', '\u007f  '],
    ['BMP 3 байта', 'ࠀ￿'],
    ['1e21', 1e21],
    ['1e-7', 1e-7],
    ['0.1', 0.1],
    ['большое целое', 123456789012345680000],
    ['отрицательное', -42.5],
    ['объект со спецключами', { 'k"\n': ['\uD800', 1e21, null, true, false], ключ: { '😀': '' } }],
  ] as readonly (readonly [string, JsonValue])[])('байты «%s» = Buffer.byteLength(JSON.stringify())', (_label, value) => {
    expect(accountsV2JsonWireBytes(value)).toBe(Buffer.byteLength(JSON.stringify(value), 'utf8'));
  });

  test('клиентский исходник совпадает с серверным контрактом', () => {
    expect(collectParityMismatches(source)).toEqual([]);
  });

  test('ядро разбито на модули ≤ 800 строк и импортирует только crypto и свои модули', () => {
    expect(modules.map(([name]) => name)).toContain('accounts_v2_apply_core.ts');
    for (const [name, text] of modules) {
      expect({ name, lines: text.split('\n').length <= 800 }).toEqual({ name, lines: true });
      const imports = [...text.matchAll(/(?:\bfrom\s+|\brequire\(\s*|\bimport\(\s*)['"]([^'"]+)['"]/g)]
        .map((match) => match[1]);
      // Никакого firebase-admin/functions и клиентских модулей через границу пакетов.
      const foreign = imports.filter((item) => item !== 'crypto' && !/^\.\/accounts_v2_\w+$/.test(item));
      expect({ name, foreign }).toEqual({ name, foreign: [] });
    }
  });

  test('клиентский captureJson не проверяет содержимое ключей (значит, и сервер не вправе)', () => {
    expect(captureJsonKeyRuleProblems(source)).toEqual([]);
  });

  describe('таблица строк: сервер не строже и не мягче клиента', () => {
    const rules = {
      identity: clientPredicate(source, 'identityString'),
      entityId: clientPredicate(source, 'entityIdString'),
    };
    const cases = STRING_TABLE.flatMap(([label, make, expected]) =>
      STRING_FIELDS.map((field) => [`${field}: ${label}`, field, make(field), expected[field]] as const));

    test.each(cases)('%s', (_label, field, value, expected) => {
      const raw = batchWith(field, value);
      const client = clientAccepts(field, value, raw, rules);
      const server = validateBatch(raw).ok;
      expect({ client, server }).toEqual({ client: expected, server: expected });
    });
  });

  test('сервер пускает всё, что пускают правила клиента, на случайных коротких строках', () => {
    const rules = {
      identity: clientPredicate(source, 'identityString'),
      entityId: clientPredicate(source, 'entityIdString'),
    };
    // Детерминированный перебор: все одно- и двухсимвольные строки из «опасного» алфавита.
    const alphabet = ['', 'a', ' ', '\n', '\u0000', '\u001f', '\u007f', '\u0085', '\uD800', '\uDC00', '￿', '"', '\\'];
    const mismatches: string[] = [];
    for (const first of alphabet) {
      for (const second of alphabet) {
        const value = `${first}${second}`;
        for (const field of STRING_FIELDS) {
          const raw = batchWith(field, value);
          if (clientAccepts(field, value, raw, rules) !== validateBatch(raw).ok) {
            mismatches.push(`${field}:${JSON.stringify(value)}`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  // Мутационная проверка: портим КОПИЮ строки исходника, клиентский файл не трогаем.
  test.each([
    ['лимит глубины', (text: string) => text.replace('maxPayloadDepth: 32', 'maxPayloadDepth: 33'),
      'ACCOUNT_SYNC_LIMITS.maxPayloadDepth'],
    ['лимит пакета', (text: string) => text.replace('maxBatchUtf8Bytes: 524288,', 'maxBatchUtf8Bytes: 524289,'),
      'ACCOUNT_SYNC_LIMITS.maxBatchUtf8Bytes'],
    ['новый лимит', (text: string) => text.replace('maxBatchOperations: 50,', 'maxBatchOperations: 50,\n  maxFoo: 1,'),
      'ACCOUNT_SYNC_LIMITS ключи'],
    ['entityType убран', (text: string) => text.replace(
      "entityType: 'lesson_progress' | 'flashcard' | 'library_membership';",
      "entityType: 'lesson_progress' | 'flashcard';"), 'LocalOperationEnvelope.entityType'],
    ['entityType добавлен в рантайм', (text: string) => text.replace(
      "'lesson_progress', 'flashcard', 'library_membership',\n] as const);",
      "'lesson_progress', 'flashcard', 'library_membership', 'wallet',\n] as const);"),
    'ENTITY_TYPES (рантайм клиента)'],
    ['новое поле конверта', (text: string) => text.replace('  payload: unknown;', '  payload: unknown;\n  deviceId: string;'),
      'LocalOperationEnvelope поля'],
    ['schemaVersion 2', (text: string) => text.replace('schemaVersion: 1;', 'schemaVersion: 2;'), 'schemaVersion'],
    ['baseRevision без null', (text: string) => text.replace('baseRevision: number | null;', 'baseRevision: number;'),
      'LocalOperationEnvelope.baseRevision'],
    ['исход квитанции, которого сервер не выдаёт', (text: string) => text.replace(
      "outcome: 'applied' | 'duplicate' | 'conflict';", "outcome: 'applied' | 'duplicate' | 'conflict' | 'refunded';"),
    'AccountSyncReceipt.outcome'],
    ['клиент забыл исход conflict', (text: string) => text.replace(
      "outcome: 'applied' | 'duplicate' | 'conflict';", "outcome: 'applied' | 'duplicate';"),
    'квитанции клиента: не знают'],
    ['клиент забыл rejected-квитанцию', (text: string) => text.replace(
      "  outcome: 'rejected';\n  code: AccountSyncRejectCode;", "  outcome: 'applied';\n  code: AccountSyncRejectCode;"),
    'квитанции клиента: не знают'],
    ['код отказа разошёлся', (text: string) => text.replace(
      "'revision_overflow',\n  'srs_time_in_future',\n] as const);", "'revision_overflow',\n] as const);"),
    'ACCOUNT_SYNC_REJECT_CODES'],
    ['формула байт разошлась', (text: string) => text.replace(
      'else if (unit < 0x800) bytes += 2;', 'else if (unit < 0x800) bytes += 3;'),
    '__wire__'],
    ['поле квитанции', (text: string) => text.replace('  serverRevision: number;\n}>;', '  serverRevision: number;\n  code: string;\n}>;'),
      'AccountSyncReceipt поля'],
    ['блок исчез', (text: string) => text.replace('export type AccountSyncBatch =', 'export type AccountSyncBatchX ='),
      'AccountSyncBatch: блок не найден'],
    ['rejected-квитанция клиента без code', (text: string) => text.replace('export type AccountSyncBatch =',
      "export type AccountSyncRejected = Readonly<{\n  operationId: string;\n  outcome: 'rejected';\n"
      + '  reason: string;\n  serverRevision: number;\n}>;\nexport type AccountSyncBatch ='),
    'квитанция rejected'],
    ['клиент проверяет содержимое ключа', (text: string) => text.replace(
      '    for (const key of keys as string[]) {\n      bytes += stringWireBytes(',
      '    for (const key of keys as string[]) {\n      if (key.trim() !== key) throw new ContentInvalid();\n'
      + '      bytes += stringWireBytes('),
    '__keys__'],
  ])('мутация «%s» ловится', (_label, mutate, expectedProblem) => {
    const normalized = source.replace(/\r\n/g, '\n');
    const mutated = mutate(normalized);
    expect(mutated).not.toBe(normalized);
    if (expectedProblem === '__wire__') {
      expect(wireLoopBody(mutated, [], 'клиент')).not.toBe(wireLoopBody(serverSource, [], 'сервер'));
      return;
    }
    if (expectedProblem === '__keys__') {
      expect(captureJsonKeyRuleProblems(mutated).some((problem) => problem.startsWith('captureJson: клиент проверяет')))
        .toBe(true);
      return;
    }
    const problems = collectParityMismatches(mutated);
    expect(problems.some((problem) => problem.startsWith(expectedProblem))).toBe(true);
  });

  test('клиент, ужесточивший identityString, ловится таблицей (сервер стал бы мягче)', () => {
    const normalized = source.replace(/\r\n/g, '\n');
    const stricter = normalized.replace(
      "return typeof value === 'string' && value.length > 0 && value.trim() === value;",
      "return typeof value === 'string' && value.length > 0 && value.trim() === value && !/[\\u0000-\\u001f]/.test(value);");
    expect(stricter).not.toBe(normalized);
    const identity = clientPredicate(stricter, 'identityString');
    const raw = batchWith('operationId', 'a\u0001b');
    expect(clientAccepts('operationId', 'a\u0001b', raw, { identity, entityId: identity })).toBe(false);
    expect(validateBatch(raw).ok).toBe(true);
  });

  test('клиент знает conflict и rejected c полем code (TG-831C22D22486)', () => {
    const normalized = source.replace(/\r\n/g, '\n');
    expect(normalized).toContain("outcome: 'applied' | 'duplicate' | 'conflict';");
    expect(normalized).toMatch(/outcome: 'rejected';\n {2}code: AccountSyncRejectCode;/);
    expect(collectParityMismatches(normalized)).toEqual([]);
    // А тип, объявляющий rejected без поля code, — расхождение формы.
    const noCode = normalized.replace(
      "outcome: 'applied' | 'duplicate' | 'conflict';", "outcome: 'applied' | 'duplicate' | 'conflict' | 'rejected';");
    expect(collectParityMismatches(noCode).some((problem) => problem.startsWith('квитанция rejected'))).toBe(true);
  });

  describe('таблица решений по ошибкам транспорта: клиентская копия = эталон сервера', () => {
    const transport = fs.readFileSync(CLIENT_TRANSPORT_PATH, 'utf8').replace(/\r\n/g, '\n');
    const serverErrors = fs.readFileSync(SERVER_ERRORS_PATH, 'utf8').replace(/\r\n/g, '\n');

    test('текст контракта и функций решения совпадает', () => {
      expect(collectTransportMismatches(transport, serverErrors)).toEqual([]);
    });

    test('клиентская копия исполняется на общей таблице так же, как эталон', () => {
      const client = loadClientDecision(transport);
      const mismatches: string[] = [];
      for (const error of DECISION_CASES) {
        if (client.accountSyncIsWaitResponse(error) !== accountsV2IsWaitResponse(error)) {
          mismatches.push(`wait ${JSON.stringify(error)}`);
        }
        for (let failed = 0; failed <= ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.maxAttempts + 1; failed += 1) {
          for (const failingFor of FAILING_FOR_CASES) {
            if (client.accountSyncClientAction(error, failed, failingFor) !== accountsV2ClientAction(error, failed, failingFor)) {
              mismatches.push(`action ${JSON.stringify(error)} failed=${failed} failingFor=${failingFor}`);
            }
          }
        }
      }
      expect(mismatches).toEqual([]);
      // Исполненный объект контракта клиента — ровно серверный.
      expect(JSON.parse(JSON.stringify(client.ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT)))
        .toEqual(JSON.parse(JSON.stringify(ACCOUNTS_V2_CLIENT_ERROR_CONTRACT)));
    });

    test('потолок = И ≥5 неудач, И ≥24 ч: короткий офлайн не даёт карантин ни у одной стороны', () => {
      const client = loadClientDecision(transport);
      const retryable = { code: 'unavailable', details: { final: false } };
      const span = ACCOUNTS_V2_CLIENT_ERROR_CONTRACT.minFailureSpanMs;
      expect(span).toBe(24 * 60 * 60 * 1000);
      for (const action of [accountsV2ClientAction, client.accountSyncClientAction]) {
        expect(action(retryable, 5, 15_000)).toBe('retry');
        expect(action(retryable, 4, span * 10)).toBe('retry');
        expect(action(retryable, 5, span)).toBe('quarantine');
      }
    });

    test.each([
      ['потолок попыток', (text: string) => text.replace(
        'export const ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS = 5;', 'export const ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS = 6;'),
      'таблица решений maxAttempts'],
      ['internal стал окончательным', (text: string) => text.replace(
        "retryable: Object.freeze(['resource-exhausted', 'unavailable', 'internal'] as const),",
        "retryable: Object.freeze(['resource-exhausted', 'unavailable'] as const),"),
      'таблица решений retryable'],
      ['решение по коду вместо final', (text: string) => text.replace(
        "if (error.code === 'unauthenticated') return 'reauth';",
        "if (error.code === 'unauthenticated') return 'reauth';\n  if (error.code === 'invalid-argument') return 'quarantine';"),
      'функция accountsV2ClientAction'],
      ['ожидание тратит попытку', (text: string) => text.replace(
        "return typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0;",
        "return typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 1000;"),
      'функция accountsV2IsWaitResponse'],
      ['потолок без времени (5 попыток и всё)', (text: string) => text.replace(
        '  return failedAttempts >= ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS\n    && failingForMs >= ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS ? \'quarantine\' : \'retry\';',
        "  return failedAttempts >= ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS ? 'quarantine' : 'retry';"),
      'функция accountsV2ClientAction'],
      ['сутки до карантина стали часом', (text: string) => text.replace(
        'export const ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS = 24 * 60 * 60 * 1000;',
        'export const ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS = 60 * 60 * 1000;'),
      'таблица решений minFailureSpanMs'],
      ['карантин по потолку стал невозвратным', (text: string) => text.replace(
        'attemptsExhaustedRequeue: true as const,', 'attemptsExhaustedRequeue: false as const,'),
      'таблица решений attemptsExhaustedRequeue'],
    ])('мутация транспорта «%s» ловится', (_label, mutate, expectedProblem) => {
      const mutated = mutate(transport);
      expect(mutated).not.toBe(transport);
      expect(collectTransportMismatches(mutated, serverErrors).some((problem) => problem.startsWith(expectedProblem)))
        .toBe(true);
    });
  });

  // ─── сроки: жизнь операции в outbox < TTL квитанций; окно будущего SRS ───
  // зачем (TG-7CD73967EF61): числа читаются из ИСХОДНИКОВ обеих сторон, а не
  // зашиваются в тест: сервер поднимет/опустит TTL — сторож увидит сразу.
  describe('сроки клиента против серверных (из исходников)', () => {
    const recordsSource = fs.readFileSync(path.resolve(
      __dirname, '..', '..', 'modules', 'account-session-v2', 'account_sync_outbox_records.ts'), 'utf8');
    const portSource = fs.readFileSync(path.join(__dirname, 'accounts_v2_adapter', 'firestore_port.ts'), 'utf8');
    const clockSource = fs.readFileSync(path.resolve(
      __dirname, '..', '..', 'modules', 'account-session-v2', 'account_sync_clock.ts'), 'utf8');

    function lifetimeProblems(records: string, port: string): string[] {
      const clientMaxAge = constProduct(records, 'ACCOUNT_SYNC_OPERATION_MAX_AGE_MS');
      const serverTtl = constProduct(port, 'ACCOUNTS_V2_RECEIPT_TTL_MS', { DAY_MS: constProduct(port, 'DAY_MS') });
      if (!Number.isFinite(clientMaxAge) || !Number.isFinite(serverTtl)) return ['срок жизни: константы не найдены'];
      return clientMaxAge < serverTtl ? [] : [`срок жизни: клиент ${clientMaxAge} ≥ TTL квитанций ${serverTtl}`];
    }

    function skewProblems(clock: string): string[] {
      const clientSkew = constProduct(clock, 'ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS');
      const margin = constProduct(clock, 'ACCOUNT_SYNC_SRS_FUTURE_MARGIN_MS');
      const problems: string[] = [];
      if (clientSkew !== ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS) {
        problems.push(`окно будущего SRS: клиент ${clientSkew} ≠ сервер ${ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS}`);
      }
      if (!(margin > 0 && margin < clientSkew)) problems.push(`запас окна SRS: ${margin}`);
      return problems;
    }

    test('предел жизни операции клиента строго меньше TTL квитанций сервера', () => {
      expect(lifetimeProblems(recordsSource, portSource)).toEqual([]);
      expect(constProduct(recordsSource, 'ACCOUNT_SYNC_OPERATION_MAX_AGE_MS')).toBe(170 * 24 * 60 * 60 * 1000);
    });

    test('окно будущего SRS клиента = серверному, запас внутри окна', () => {
      expect(skewProblems(clockSource)).toEqual([]);
    });

    test.each([
      ['TTL сервера опустили до 170 суток', () => lifetimeProblems(recordsSource,
        portSource.replace('export const ACCOUNTS_V2_RECEIPT_TTL_MS = 180 * DAY_MS;', 'export const ACCOUNTS_V2_RECEIPT_TTL_MS = 170 * DAY_MS;'))],
      ['клиент поднял предел до 180 суток', () => lifetimeProblems(recordsSource.replace(
        'export const ACCOUNT_SYNC_OPERATION_MAX_AGE_MS = 170 * 24 * 60 * 60 * 1000;',
        'export const ACCOUNT_SYNC_OPERATION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;'), portSource)],
      ['окно SRS клиента разошлось', () => skewProblems(clockSource.replace(
        'export const ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS = 10 * 60 * 1000;',
        'export const ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS = 15 * 60 * 1000;'))],
    ])('мутация сроков «%s» ловится', (_label, problems) => {
      expect(problems().length).toBeGreaterThan(0);
    });
  });
});

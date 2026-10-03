import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import {
  ACCOUNT_AUTHORITY_CALLABLE_NAMES,
  accountAuthorityErrorCode,
  accountAuthorityErrorKind,
  accountAuthoritySafeCode,
  consoleAccountAuthorityLogger,
  safeAccountAuthorityLogger,
  sanitizeAccountAuthorityLogFields,
  type AccountAuthorityLogFields,
  type AccountAuthorityLogger,
} from '../modules/account-authority-v2/account_authority_logger';
import {
  ACCOUNT_AUTHORITY_INSTALLATION_BINDING_CALLABLE,
  ACCOUNT_AUTHORITY_LEASE_ACQUIRE_CALLABLE,
  ACCOUNT_AUTHORITY_LEASE_RELEASE_CALLABLE,
  createAccountAuthorityFirebaseInstallationBindingPort,
  createAccountAuthorityFirebaseLeasePort,
  type AccountAuthorityLeaseRevisionStore,
} from '../modules/account-authority-v2/account_authority_lease_transport';
import { createAccountAuthorityProductionBootstrapRegistry } from '../modules/account-authority-v2/account_authority_bootstrap_contract';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
} from '../modules/account-authority-v2/account_authority_ids';

/*
 * AA S1: сторож логов Account Authority (правило владельца «сперва логи»,
 * запрет немого catch, логи без PII).
 *
 * 1. Перепись: КАЖДЫЙ `catch`, КАЖДЫЙ `.catch(h)` и обработчик отказа
 *    `.then(ok, onRejected)` во всех файлах AA (клиент и сервер) пишет в лог.
 *    Засчитывается:
 *      - прямой вызов логгера;
 *      - вызов функции, объявленной в том же файле или явно импортированной
 *        из файла AA, если эта функция сама (до неподвижной точки) пишет в лог;
 *      - прикрепление подробностей к итоговой строке
 *        (`attachAccountAuthorityFailureDetail` из `account_authority_log`).
 *    Совпадение голого имени с чужой функцией не засчитывается (ревью L2).
 * 2. Перепись: аргументы логов не содержат uid/id/хешей/токенов/email/текста
 *    ошибки, `String(x)` и разворота объектов `...x`. Разрешено только
 *    сравнение с null («есть/нет»).
 * 3. Поведение: логи транспорта и bootstrap на живых прогонах не содержат ни
 *    одного идентификатора; последний рубеж очистки режет uid/UUID/пути;
 *    сбой самого логгера не ломает работу.
 *
 * Сработал сторож — добавь лог в catch или убери идентификатор из лога. Не
 * ослабляй проверку.
 */

const ROOT = path.resolve(__dirname, '..');

function listTs(directory: string): string[] {
  return fs.readdirSync(path.join(ROOT, directory))
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => `${directory}/${name}`)
    .sort();
}

const AA_FILES = Object.freeze([
  ...listTs('modules/account-authority-v2'),
  'modules/account-session-v2/account_authority_production_adapter.ts',
  'modules/account-session-v2/accounts_v2_client_runtime.ts',
  ...listTs('functions/src/account_authority'),
]);
const AA_FILE_SET: ReadonlySet<string> = new Set(AA_FILES);
const SERVER_LOG_MODULE = 'functions/src/account_authority/account_authority_log.ts';
/** Делегирующий сток: подробность уходит в единственную итоговую строку (L4). */
const DELEGATING_SINKS: ReadonlySet<string> = new Set([`${SERVER_LOG_MODULE}#attachAccountAuthorityFailureDetail`]);

type ParsedFile = Readonly<{
  file: string;
  source: ts.SourceFile;
  bodies: ReadonlyMap<string, ts.Node>;
  imports: ReadonlyMap<string, string>;
}>;

function parseFile(file: string, text: string): ParsedFile {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const bodies = new Map<string, ts.Node>();
  const imports = new Map<string, string>();
  const walk = (node: ts.Node): void => {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name && node.body) {
      bodies.set(node.name.getText(), node.body);
    }
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
      && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      bodies.set(node.name.text, node.initializer.body);
    }
    if (
      ts.isImportDeclaration(node)
      && ts.isStringLiteral(node.moduleSpecifier)
      && node.moduleSpecifier.text.startsWith('.')
      && node.importClause?.namedBindings
      && ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const target = `${path.posix.normalize(path.posix.join(path.posix.dirname(file), node.moduleSpecifier.text))}.ts`;
      if (AA_FILE_SET.has(target)) {
        for (const element of node.importClause.namedBindings.elements) {
          const imported = (element.propertyName ?? element.name).text;
          imports.set(element.name.text, `${target}#${imported}`);
        }
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(source);
  return Object.freeze({ file, source, bodies, imports });
}

const LOG_METHODS = new Set(['info', 'warn', 'error', 'log']);
const LOG_RECEIVER = /^(log|logger|this\.log|AUTHORITY_LOG|console|target)$/;

function isDirectLogCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isPropertyAccessExpression(callee)) {
    return LOG_METHODS.has(callee.name.text) && LOG_RECEIVER.test(callee.expression.getText());
  }
  // logger[level](...) / target[level](...) внутри самих модулей логгера.
  return ts.isElementAccessExpression(callee) && LOG_RECEIVER.test(callee.expression.getText());
}

/** Ключ функции `<file>#<name>`, если вызов указывает на объявленную или явно импортированную функцию. */
function resolveCallee(parsedFile: ParsedFile, call: ts.CallExpression): string | null {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) {
    if (parsedFile.bodies.has(callee.text)) return `${parsedFile.file}#${callee.text}`;
    return parsedFile.imports.get(callee.text) ?? null;
  }
  if (
    ts.isPropertyAccessExpression(callee)
    && callee.expression.kind === ts.SyntaxKind.ThisKeyword
    && parsedFile.bodies.has(callee.name.text)
  ) {
    return `${parsedFile.file}#${callee.name.text}`;
  }
  return null;
}

function resolveIdentifier(parsedFile: ParsedFile, identifier: ts.Identifier): string | null {
  if (parsedFile.bodies.has(identifier.text)) return `${parsedFile.file}#${identifier.text}`;
  return parsedFile.imports.get(identifier.text) ?? null;
}

function containsCall(root: ts.Node, accept: (call: ts.CallExpression) => boolean): boolean {
  let found = false;
  const walk = (node: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(node) && accept(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, walk);
  };
  walk(root);
  return found;
}

function loggingKeys(files: readonly ParsedFile[]): ReadonlySet<string> {
  const keys = new Set<string>(DELEGATING_SINKS);
  let changed = true;
  while (changed) {
    changed = false;
    for (const parsedFile of files) {
      for (const [name, body] of parsedFile.bodies) {
        const key = `${parsedFile.file}#${name}`;
        if (keys.has(key)) continue;
        if (containsCall(body, (call) => isDirectLogCall(call) || keys.has(resolveCallee(parsedFile, call) ?? ''))) {
          keys.add(key);
          changed = true;
        }
      }
    }
  }
  return keys;
}

type CatchSite = Readonly<{ file: string; line: number; logged: boolean }>;

function catchSites(files: readonly ParsedFile[]): CatchSite[] {
  const keys = loggingKeys(files);
  const sites: CatchSite[] = [];
  for (const parsedFile of files) {
    const { file, source } = parsedFile;
    const lineOf = (node: ts.Node): number => source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const credited = (body: ts.Node): boolean => containsCall(body, (call) => (
      isDirectLogCall(call) || keys.has(resolveCallee(parsedFile, call) ?? '')
    ));
    const handlerLogged = (handler: ts.Expression): boolean => {
      if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) return credited(handler.body);
      if (ts.isIdentifier(handler)) return keys.has(resolveIdentifier(parsedFile, handler) ?? '');
      return false;
    };
    const walk = (node: ts.Node): void => {
      if (ts.isCatchClause(node)) sites.push({ file, line: lineOf(node), logged: credited(node.block) });
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const method = node.expression.name.text;
        const handler = method === 'catch' ? node.arguments[0] : method === 'then' ? node.arguments[1] : undefined;
        if (handler !== undefined) sites.push({ file, line: lineOf(node), logged: handlerLogged(handler) });
      }
      ts.forEachChild(node, walk);
    };
    walk(source);
  }
  return sites;
}

const IDENTIFIER_PROPERTIES = new Set([
  'uid', 'firebaseAuthUid', 'accountId', 'sessionId', 'deviceId', 'installationId',
  'bindingToken', 'deviceBindingId', 'email', 'token', 'operationId', 'idempotencyKey',
  'message', 'uidHash', 'ownerHash', 'providerSubject', 'tenantId', 'claimId', 'jobId', 'nonce', 'key',
]);
/** Вызовы API логов, у которых проверяются аргументы (индексы — поля, а не объект ошибки). */
const LOG_API_FIELD_ARGS: ReadonlyMap<string, (index: number) => boolean> = new Map<string, (index: number) => boolean>([
  [`${SERVER_LOG_MODULE}#accountAuthorityLogInfo`, () => true],
  [`${SERVER_LOG_MODULE}#accountAuthorityLogWarn`, () => true],
  [`${SERVER_LOG_MODULE}#accountAuthorityLogError`, () => true],
  [`${SERVER_LOG_MODULE}#logAccountAuthorityFailureOnce`, (index) => index < 2],
  [`${SERVER_LOG_MODULE}#attachAccountAuthorityFailureDetail`, (index) => index >= 1],
]);

function isNullComparison(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent || !ts.isBinaryExpression(parent)) return false;
  const operator = parent.operatorToken.kind;
  if (
    operator !== ts.SyntaxKind.EqualsEqualsEqualsToken
    && operator !== ts.SyntaxKind.ExclamationEqualsEqualsToken
    && operator !== ts.SyntaxKind.EqualsEqualsToken
    && operator !== ts.SyntaxKind.ExclamationEqualsToken
  ) return false;
  const other = parent.left === node ? parent.right : parent.left;
  return other.kind === ts.SyntaxKind.NullKeyword || other.getText() === 'undefined';
}

function argumentLeaks(parsedFile: ParsedFile, argument: ts.Node): string[] {
  const leaks: string[] = [];
  const { file, source } = parsedFile;
  const report = (node: ts.Node, what: string): void => {
    leaks.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${what}`);
  };
  const inspect = (child: ts.Node): void => {
    if (ts.isSpreadAssignment(child) || ts.isSpreadElement(child)) report(child, child.getText());
    if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === 'String') {
      report(child, child.getText());
    }
    // `x.accountId.value` / `firebaseAuthUid.value` проверяются целиком на узле `.value`.
    const coveredByValueAccess = ts.isPropertyAccessExpression(child.parent)
      && child.parent.name.text === 'value'
      && child.parent.expression === child;
    if (ts.isPropertyAccessExpression(child) && !coveredByValueAccess) {
      const base = child.expression;
      const name = child.name.text !== 'value'
        ? child.name.text
        : ts.isPropertyAccessExpression(base)
          ? base.name.text
          : ts.isIdentifier(base) ? base.text : '';
      if (IDENTIFIER_PROPERTIES.has(name) && !isNullComparison(child)) report(child, child.getText());
    }
    const isMemberName = ts.isPropertyAccessExpression(child.parent) && child.parent.name === child;
    if (
      ts.isIdentifier(child)
      && IDENTIFIER_PROPERTIES.has(child.text)
      && !isMemberName
      && !coveredByValueAccess
      && !(ts.isPropertyAssignment(child.parent) && child.parent.name === child)
      && !isNullComparison(child)
    ) report(child, child.text);
    ts.forEachChild(child, inspect);
  };
  inspect(argument);
  return leaks;
}

function identifierLeaks(files: readonly ParsedFile[]): string[] {
  const leaks: string[] = [];
  for (const parsedFile of files) {
    const walk = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        if (isDirectLogCall(node)) {
          (node as ts.CallExpression).arguments.forEach((argument) => leaks.push(...argumentLeaks(parsedFile, argument)));
        } else {
          const fieldArgs = LOG_API_FIELD_ARGS.get(resolveCallee(parsedFile, node) ?? '');
          if (fieldArgs !== undefined) {
            node.arguments.forEach((argument, index) => {
              if (fieldArgs(index)) leaks.push(...argumentLeaks(parsedFile, argument));
            });
          }
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(parsedFile.source);
  }
  return leaks;
}

function readAll(): ParsedFile[] {
  return AA_FILES.map((file) => parseFile(file, fs.readFileSync(path.join(ROOT, file), 'utf8')));
}

/** Синтетический файл AA (для проверки самих правил сторожа на обходах). */
function withSynthetic(file: string, text: string): ParsedFile[] {
  return [...readAll().filter((entry) => entry.file !== file), parseFile(file, text)];
}

describe('Account Authority logging guard (S1)', () => {
  test('covers every Account Authority module on client and server', () => {
    expect(AA_FILES).toEqual(expect.arrayContaining([
      'modules/account-authority-v2/account_authority_runtime.ts',
      'modules/account-authority-v2/account_authority_lease_transport.ts',
      'modules/account-authority-v2/account_authority_bootstrap_contract.ts',
      'modules/account-authority-v2/account_authority_logger.ts',
      'modules/account-session-v2/account_authority_production_adapter.ts',
      'functions/src/account_authority/callable_boundary.ts',
      'functions/src/account_authority/firebase_lease_callable.ts',
      'functions/src/account_authority/installation_binding_callable.ts',
      'functions/src/account_authority/delete_contract.ts',
      SERVER_LOG_MODULE,
    ]));
    expect(AA_FILES.length).toBeGreaterThanOrEqual(18);
  });

  test('every catch, .catch() and .then(_, onRejected) in Account Authority writes to the log', () => {
    const sites = catchSites(readAll());
    // Перепись не пустая: если парсер перестанет видеть catch, сторож сам упадёт.
    expect(sites.length).toBeGreaterThanOrEqual(50);
    expect(sites.filter((site) => !site.logged).map(({ file, line }) => `${file}:${line}`)).toEqual([]);
  });

  test('log arguments never carry ids, hashes, tokens, email, error text, String(x) or ...spread', () => {
    expect(identifierLeaks(readAll())).toEqual([]);
  });

  // Самопроверка правил на синтетических обходах (ревью L2): каждый обход
  // обязан ловиться, иначе сторож можно обмануть.
  test('the census rejects a bare-name call to a logging function that is not declared or imported here', () => {
    const file = 'modules/account-authority-v2/account_authority_contract.ts';
    const text = [
      "export function probe(port: { rejectLogged(e: unknown): void }): void {",
      '  try { JSON.parse("x"); } catch (error) { port.rejectLogged(error); }',
      '  try { JSON.parse("x"); } catch (error) { mapUnknownAccountAuthorityFailure(error); }',
      '}',
      'declare function mapUnknownAccountAuthorityFailure(error: unknown): void;',
    ].join('\n');
    const silent = catchSites(withSynthetic(file, text)).filter((site) => site.file === file && !site.logged);
    expect(silent.map((site) => site.line)).toEqual([2, 3]);
  });

  test('the census checks .catch(identifier) and the .then(ok, onRejected) rejection handler', () => {
    const file = 'modules/account-authority-v2/account_authority_contract.ts';
    const text = [
      "import { consoleAccountAuthorityLogger as log } from './account_authority_logger';",
      'const silent = (error: unknown): void => { void error; };',
      "const noisy = (error: unknown): void => { log.warn('probe failed', { code: String(typeof error) }); };",
      'export function probe(work: Promise<void>): void {',
      '  void work.catch(silent);',
      '  void work.catch(noisy);',
      '  void work.then(() => undefined, (error: unknown) => { void error; });',
      "  void work.then(() => undefined, (error: unknown) => { log.warn('probe failed', {}); void error; });",
      '}',
    ].join('\n');
    const sites = catchSites(withSynthetic(file, text)).filter((site) => site.file === file);
    expect(sites.map((site) => [site.line, site.logged])).toEqual([
      [5, false],
      [6, true],
      [7, false],
      [8, true],
    ]);
  });

  test('the static PII check catches error text, String(x), hashes and ...spread in log arguments', () => {
    const file = 'functions/src/account_authority/lease_handlers.ts';
    const text = [
      "import { accountAuthorityLogWarn, attachAccountAuthorityFailureDetail } from './account_authority_log';",
      'export function probe(error: Error, record: { uidHash: string; tenantId: string }, extra: object): void {',
      "  accountAuthorityLogWarn('probe', { reason: error.message });",
      "  accountAuthorityLogWarn('probe', { reason: String(error) });",
      "  accountAuthorityLogWarn('probe', { reason: record.uidHash });",
      "  attachAccountAuthorityFailureDetail(error, { reason: record.tenantId });",
      "  accountAuthorityLogWarn('probe', { ...extra });",
      "  accountAuthorityLogWarn('probe', { present: record.uidHash !== null });",
      '}',
    ].join('\n');
    const leaks = identifierLeaks(withSynthetic(file, text)).filter((leak) => leak.startsWith(file));
    expect(leaks.map((leak) => Number(leak.split(':')[1]?.split(' ')[0]))).toEqual([3, 4, 5, 6, 7]);
  });

  test('the last-resort sanitizer redacts uid, UUID, prefixed UUID, paths, email and unknown keys', () => {
    const lines: string[] = [];
    const spy = jest.spyOn(console, 'warn').mockImplementation((line: unknown) => { lines.push(String(line)); });
    try {
      consoleAccountAuthorityLogger.warn('probe event', {
        code: 'account_authority_lease_unavailable',
        reason: 'owner@example.com',
        durationMs: 12,
      });
    } finally {
      spy.mockRestore();
    }
    expect(lines).toEqual([
      '[ACCOUNT-AUTHORITY] probe event code=account_authority_lease_unavailable reason=redacted durationMs=12',
    ]);
    for (const leak of [
      'Xb3kP9qL2mN7vR4tY8wZ1aC5dE6f', // Firebase uid
      'xb3kp9ql2mn7vr4ty8wz1ac5de6f', // тот же uid строчными
      '550e8400-e29b-41d4-a716-446655440000', // UUID
      'acct-550e8400-e29b-41d4-a716-446655440000',
      'session-550e8400-e29b-41d4-a716-446655440000',
      'users/x',
      'functions/unavailable',
      'Login failed',
    ]) {
      expect(sanitizeAccountAuthorityLogFields({ code: leak })).toEqual({ code: 'redacted' });
      expect(accountAuthoritySafeCode(leak)).toBe('other');
    }
    expect(sanitizeAccountAuthorityLogFields({ accountRef: 'lease_acquire' })).toEqual({ accountRef: 'redacted' });
    expect(sanitizeAccountAuthorityLogFields({ kind: 'AccountAuthorityCallableError', phase: 'authenticated' }))
      .toEqual({ kind: 'AccountAuthorityCallableError', phase: 'authenticated' });
    expect(accountAuthoritySafeCode('provider_cancelled')).toBe('provider_cancelled');
    expect(accountAuthoritySafeCode(null)).toBe('none');
    expect(accountAuthorityErrorCode(new Error('users/raw-uid'))).toBe('other');
    expect(accountAuthorityErrorCode(Object.assign(new Error('x'), { code: 'functions/unavailable' }))).toBe('unavailable');
  });

  // зачем (ревью R1): буквенный uid смешанного регистра без цифр не должен
  // проходить под полями вида ошибки и имени callable; виды операций runtime
  // (строчные коды) по-прежнему пишутся.
  test('kind, errorKind and callable accept only fixed names; runtime operation kinds still pass', () => {
    const letterUid = 'QwErTyUiOpAsDfGhJkLzXcVbNmQw';
    expect(sanitizeAccountAuthorityLogFields({ kind: letterUid, errorKind: letterUid, callable: letterUid }))
      .toEqual({ kind: 'redacted', errorKind: 'redacted', callable: 'redacted' });
    expect(sanitizeAccountAuthorityLogFields({ callable: 'accountAuthorityLeaseAcquireX' }))
      .toEqual({ callable: 'redacted' });
    for (const operationKind of ['sign_in', 'sign_out', 'delete', 'revoke', 'resume', 'commit']) {
      expect(sanitizeAccountAuthorityLogFields({ kind: operationKind })).toEqual({ kind: operationKind });
    }
    expect(sanitizeAccountAuthorityLogFields({ errorKind: 'AccountLeaseError', kind: 'TypeError' }))
      .toEqual({ errorKind: 'AccountLeaseError', kind: 'TypeError' });
    for (const name of ACCOUNT_AUTHORITY_CALLABLE_NAMES) {
      expect(sanitizeAccountAuthorityLogFields({ callable: name })).toEqual({ callable: name });
    }
    // Список имён в логгере совпадает с константами транспорта.
    expect([...ACCOUNT_AUTHORITY_CALLABLE_NAMES].sort()).toEqual([
      ACCOUNT_AUTHORITY_INSTALLATION_BINDING_CALLABLE,
      ACCOUNT_AUTHORITY_LEASE_ACQUIRE_CALLABLE,
      ACCOUNT_AUTHORITY_LEASE_RELEASE_CALLABLE,
    ].sort());
    // Неизвестное имя класса нормализуется ещё до очистки.
    const odd = new Error('x');
    odd.name = letterUid;
    expect(accountAuthorityErrorKind(odd)).toBe('Error');
    expect(accountAuthorityErrorKind(new TypeError('x'))).toBe('TypeError');
    expect(accountAuthorityErrorKind('text')).toBe('string');
  });

  test('a throwing injected logger never breaks the caller (ревью L3)', () => {
    const lines: string[] = [];
    const spy = jest.spyOn(console, 'warn').mockImplementation((line: unknown) => { lines.push(String(line)); });
    try {
      const safe = safeAccountAuthorityLogger({
        info: () => { throw new Error('sink down'); },
        warn: () => { throw new TypeError('sink down'); },
      });
      expect(() => safe.info('probe', { code: 'x' })).not.toThrow();
      expect(() => safe.warn('probe', { code: 'x' })).not.toThrow();
    } finally {
      spy.mockRestore();
    }
    expect(lines).toEqual([
      '[ACCOUNT-AUTHORITY] logger_failed level=info kind=Error',
      '[ACCOUNT-AUTHORITY] logger_failed level=warn kind=TypeError',
    ]);
  });

  test('transport and bootstrap logs on live runs carry no identifier', async () => {
    const recorded: Array<Readonly<{ event: string; fields?: AccountAuthorityLogFields }>> = [];
    const logger: AccountAuthorityLogger = {
      info: (event, fields) => { recorded.push({ event, fields }); },
      warn: (event, fields) => { recorded.push({ event, fields }); },
    };
    const leases = new Map<string, number>();
    let uidRevision: number | null = null;
    const revisionStore: AccountAuthorityLeaseRevisionStore = {
      read: async () => uidRevision,
      write: async (_uid, next) => { uidRevision = next; },
      readLease: async (owner) => leases.get(`${owner.accountId.value}/${owner.sessionId.value}`) ?? null,
      bindLease: async (_uid, owner, next) => {
        uidRevision = next;
        leases.set(`${owner.accountId.value}/${owner.sessionId.value}`, next);
      },
      writeLease: async (owner, next) => {
        uidRevision = next;
        leases.set(`${owner.accountId.value}/${owner.sessionId.value}`, next);
      },
    };
    let credentials: Readonly<{ bindingToken: string; deviceBindingId: string }> | null = null;
    const invoke = jest.fn(async (name: string) => {
      if (name === 'accountAuthorityInstallationBindingCreate') {
        return { data: { bindingToken: 'secret-binding-token', deviceBindingId: 'server-binding-device' } };
      }
      if (name === 'accountAuthorityLeaseAcquire') {
        return {
          data: {
            schemaVersion: 'account-authority-lease.v1',
            type: 'acquired',
            accountId: 'account-guard',
            sessionId: 'session-guard',
            revision: 1,
            idempotent: false,
            previousLeaseRevoked: false,
          },
        };
      }
      return { data: { schemaVersion: 'account-authority-lease-release.v1', type: 'released', idempotent: false, revision: 2 } };
    });
    const binding = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke,
      installationId: '550e8400-e29b-41d4-a716-446655440000',
      credentials: {
        read: async () => credentials,
        write: async (next) => { credentials = Object.freeze({ ...next }); },
      },
      logger,
    });
    const lease = createAccountAuthorityFirebaseLeasePort({
      invoke, revisionStore, installationBinding: binding, logger,
    });
    const owner = await lease.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-guard-uid'),
      deviceId: parseDeviceId('device-guard'),
      operationId: parseOperationId('operation-guard-acquire'),
    });
    await lease.release({
      accountId: owner.accountId,
      sessionId: owner.sessionId,
      deviceId: parseDeviceId('device-guard'),
      operationId: parseOperationId('operation-guard-release'),
    });
    await expect(lease.release({
      accountId: parseAccountId('account-unknown'),
      sessionId: parseSessionId('session-unknown'),
      deviceId: parseDeviceId('device-guard'),
      operationId: parseOperationId('operation-guard-release-2'),
    })).rejects.toThrow('account_authority_lease_revision_unavailable');

    const registry = createAccountAuthorityProductionBootstrapRegistry(logger);
    expect(() => registry.install({ deviceId: 'device-guard' })).toThrow('account_authority_bootstrap_invalid');
    expect(() => registry.requireInstalled()).toThrow('account_authority_bootstrap_missing');

    const events = recorded.map((entry) => entry.event);
    expect(events).toEqual(expect.arrayContaining([
      'lease acquire_start', 'lease acquire_call', 'lease acquire_ok',
      'lease release_ok', 'lease release_revision_unavailable',
      'installation_binding create_call', 'installation_binding obtain_ok',
      'bootstrap install_rejected', 'bootstrap require_missing',
    ]));
    const serialized = JSON.stringify(recorded);
    for (const identifier of [
      'firebase-guard-uid', 'device-guard', 'operation-guard', 'account-guard', 'session-guard',
      'account-unknown', 'session-unknown', 'secret-binding-token', 'server-binding-device', '550e8400',
    ]) {
      expect(serialized).not.toContain(identifier);
    }
  });
});

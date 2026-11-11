import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOTS = ['app', 'components'] as const;
const PROTECTED_KEYS = /^(premium_active|premium_plan|premium_expiry|premium_rc_.+)$/;

function sourceFiles(root: string): string[] {
  const result: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.[jt]sx?$/.test(entry.name)) result.push(absolute);
    }
  };
  walk(root);
  return result;
}

function analysisForSource(source: string, file: string): {
  ast: ts.SourceFile;
  checker: ts.TypeChecker;
} {
  const normalizedFile = path.resolve(file);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    skipLibCheck: true,
    noResolve: true,
  };
  const host = ts.createCompilerHost(options, true);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (requestedFile, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (path.resolve(requestedFile) === normalizedFile) {
      return ts.createSourceFile(requestedFile, source, languageVersion, true);
    }
    return originalGetSourceFile(requestedFile, languageVersion, onError, shouldCreateNewSourceFile);
  };
  const program = ts.createProgram([normalizedFile], options, host);
  const ast = program.getSourceFile(normalizedFile);
  if (!ast) throw new Error(`raw_reader_guard_source_missing:${normalizedFile}`);
  return { ast, checker: program.getTypeChecker() };
}

function analysisForFiles(files: readonly string[]): {
  program: ts.Program;
  checker: ts.TypeChecker;
} {
  const program = ts.createProgram([...files], {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    skipLibCheck: true,
    noResolve: true,
  });
  return { program, checker: program.getTypeChecker() };
}

function constInitializerForSymbol(symbol: ts.Symbol): ts.Expression | null {
  for (const declaration of symbol.declarations ?? []) {
    if (
      ts.isVariableDeclaration(declaration)
      && declaration.initializer
      && ts.isVariableDeclarationList(declaration.parent)
      && (declaration.parent.flags & ts.NodeFlags.Const) !== 0
    ) return declaration.initializer;
  }
  return null;
}

function resolvedStringValues(
  node: ts.Node,
  checker: ts.TypeChecker,
  seen: ReadonlySet<ts.Symbol> = new Set(),
  depth = 0,
): string[] {
  if (depth > 8) return [];
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isIdentifier(node)) {
    const symbol = checker.getSymbolAtLocation(node);
    if (!symbol || seen.has(symbol)) return [];
    const initializer = constInitializerForSymbol(symbol);
    if (!initializer) return [];
    return resolvedStringValues(initializer, checker, new Set([...seen, symbol]), depth + 1);
  }
  if (
    ts.isAsExpression(node)
    || ts.isTypeAssertionExpression(node)
    || ts.isParenthesizedExpression(node)
    || ts.isSatisfiesExpression(node)
    || ts.isNonNullExpression(node)
  ) return resolvedStringValues(node.expression, checker, seen, depth + 1);
  if (ts.isSpreadElement(node)) return resolvedStringValues(node.expression, checker, seen, depth + 1);
  const values: string[] = [];
  ts.forEachChild(node, (child) => {
    values.push(...resolvedStringValues(child, checker, seen, depth + 1));
  });
  return values;
}

function isAsyncStorageImportSymbol(symbol: ts.Symbol): boolean {
  return (symbol.declarations ?? []).some((declaration) => {
    if (!ts.isImportClause(declaration) || !declaration.parent) return false;
    return ts.isStringLiteral(declaration.parent.moduleSpecifier)
      && declaration.parent.moduleSpecifier.text === '@react-native-async-storage/async-storage';
  });
}

function isAsyncStorageReceiver(
  node: ts.Expression,
  checker: ts.TypeChecker,
  seen: ReadonlySet<ts.Symbol> = new Set(),
  depth = 0,
): boolean {
  if (depth > 8 || !ts.isIdentifier(node)) return false;
  const symbol = checker.getSymbolAtLocation(node);
  if (!symbol) return node.text === 'AsyncStorage';
  if (seen.has(symbol)) return false;
  if (isAsyncStorageImportSymbol(symbol)) return true;
  const initializer = constInitializerForSymbol(symbol);
  return Boolean(
    initializer
    && isAsyncStorageReceiver(
      initializer,
      checker,
      new Set([...seen, symbol]),
      depth + 1,
    )
  );
}

function asyncStorageReadMethod(
  node: ts.CallExpression,
  checker: ts.TypeChecker,
): 'getItem' | 'multiGet' | null {
  if (ts.isPropertyAccessExpression(node.expression)) {
    const method = node.expression.name.text;
    if (
      (method === 'getItem' || method === 'multiGet')
      && isAsyncStorageReceiver(node.expression.expression, checker)
    ) return method;
    return null;
  }
  if (!ts.isIdentifier(node.expression)) return null;
  const symbol = checker.getSymbolAtLocation(node.expression);
  if (!symbol) return null;
  for (const declaration of symbol.declarations ?? []) {
    if (
      !ts.isBindingElement(declaration)
      || !ts.isObjectBindingPattern(declaration.parent)
      || !ts.isVariableDeclaration(declaration.parent.parent)
      || !declaration.parent.parent.initializer
    ) continue;
    const propertyName = declaration.propertyName ?? declaration.name;
    if (
      ts.isIdentifier(propertyName)
      && (propertyName.text === 'getItem' || propertyName.text === 'multiGet')
      && isAsyncStorageReceiver(declaration.parent.parent.initializer, checker)
    ) return propertyName.text;
  }
  return null;
}

function enclosingFunctionName(node: ts.Node): string | null {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    if (
      (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current))
      && current.name
      && ts.isIdentifier(current.name)
    ) return current.name.text;
    if (
      ts.isArrowFunction(current)
      && ts.isVariableDeclaration(current.parent)
      && ts.isIdentifier(current.parent.name)
    ) return current.parent.name.text;
  }
  return null;
}

function isExactCompatibilityRead(
  relativeFile: string,
  node: ts.CallExpression,
  ast: ts.SourceFile,
): boolean {
  if (relativeFile === 'app/premium_vip_storage.ts') {
    return enclosingFunctionName(node) === 'migrateLegacyVipSnapshotOnce';
  }
  if (relativeFile !== 'app/cloud_sync.ts') return false;
  const functionName = enclosingFunctionName(node);
  return Boolean(
    (functionName === 'doSyncToCloud' || functionName === 'forceSyncToCloud')
    && isRuntimeSyncKeysRead(node)
    && node.getStart(ast) > 0,
  );
}

function isRuntimeSyncKeysRead(node: ts.CallExpression): boolean {
  if (!ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'multiGet') return false;
  const firstArgument = node.arguments[0];
  return Boolean(
    firstArgument
    && ts.isCallExpression(firstArgument)
    && ts.isIdentifier(firstArgument.expression)
    && firstArgument.expression.text === 'getRuntimeSyncKeys'
    && firstArgument.arguments.length === 0
  );
}

function directProtectedReadsFromAnalysis(
  source: string,
  file: string,
  ast: ts.SourceFile,
  checker: ts.TypeChecker,
): string[] {
  const relativeFile = path.relative(ROOT, file).replace(/\\/g, '/');
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && asyncStorageReadMethod(node, checker)) {
      const keys = node.arguments.flatMap((argument) => resolvedStringValues(argument, checker))
        .filter((key) => PROTECTED_KEYS.test(key));
      if (isRuntimeSyncKeysRead(node)) keys.push('premium_* via getRuntimeSyncKeys');
      if (keys.length > 0 && !isExactCompatibilityRead(relativeFile, node, ast)) {
        const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
        violations.push(`${relativeFile}:${line} -> ${keys.join(',')}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);

  // This helper hides AsyncStorage.getItem behind a generic key parameter.
  // Its protected-key call site is still an account-specific raw read.
  if (/readStorageMs\(PLUS_SPLASH_PLUS_EXPIRY_KEY\)/.test(source)) {
    violations.push(`${relativeFile}:indirect -> premium_rc_expiry_ms`);
  }
  return violations;
}

function directProtectedReadsFromSource(source: string, file: string): string[] {
  const { ast, checker } = analysisForSource(source, file);
  return directProtectedReadsFromAnalysis(source, file, ast, checker);
}

function directProtectedReads(files: readonly string[]): string[] {
  const { program, checker } = analysisForFiles(files);
  return files.flatMap((file) => {
    const ast = program.getSourceFile(path.resolve(file));
    if (!ast) throw new Error(`raw_reader_guard_source_missing:${file}`);
    return directProtectedReadsFromAnalysis(fs.readFileSync(file, 'utf8'), file, ast, checker);
  });
}

test('raw-reader guard resolves bounded local const aliases', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'premium-reader-guard-'));
  const fixture = path.join(directory, 'alias.ts');
  try {
    fs.writeFileSync(fixture, [
      "const planKey = 'premium_plan';",
      'const indirectPlanKey = planKey;',
      "const expiryKeys = ['ordinary_key', 'premium_rc_expiry_ms'] as const;",
      'AsyncStorage.getItem(indirectPlanKey);',
      'AsyncStorage.multiGet(expiryKeys);',
    ].join('\n'));
    expect(directProtectedReadsFromSource(fs.readFileSync(fixture, 'utf8'), fixture)).toEqual([
      expect.stringContaining('premium_plan'),
      expect.stringContaining('premium_rc_expiry_ms'),
    ]);
  } finally {
    fs.unlinkSync(fixture);
    fs.rmdirSync(directory);
  }
});

test('raw-reader guard resolves shadowed consts and AsyncStorage receiver aliases', () => {
  const source = [
    "import AsyncStorage from '@react-native-async-storage/async-storage';",
    'function harmless() {',
    "  const key = 'ordinary_key';",
    '  AsyncStorage.getItem(key);',
    '}',
    'function leakedPlan() {',
    "  const key = 'premium_plan';",
    '  const storageAlias = AsyncStorage;',
    '  storageAlias.getItem(key);',
    '}',
    'function leakedExpiry() {',
    "  const keys = ['ordinary_key', 'premium_rc_expiry_ms'];",
    '  const { multiGet: readMany } = AsyncStorage;',
    '  readMany(keys);',
    '}',
  ].join('\n');
  expect(directProtectedReadsFromSource(source, path.join(ROOT, 'app/guard-negative.ts'))).toEqual([
    expect.stringContaining('premium_plan'),
    expect.stringContaining('premium_rc_expiry_ms'),
  ]);
});

test('cloud compatibility exception is one exact runtime-key serialization call', () => {
  const source = [
    'function doSyncToCloud() {',
    '  AsyncStorage.multiGet(getRuntimeSyncKeys());',
    "  const accidentalKey = 'premium_plan';",
    '  AsyncStorage.getItem(accidentalKey);',
    '}',
    'function unrelatedReader() {',
    '  AsyncStorage.multiGet(getRuntimeSyncKeys());',
    '}',
  ].join('\n');
  expect(directProtectedReadsFromSource(source, path.join(ROOT, 'app/cloud_sync.ts'))).toEqual([
    expect.stringContaining('premium_plan'),
    expect.stringContaining('getRuntimeSyncKeys'),
  ]);
});

test('VIP exception is limited to the explicit legacy migration function', () => {
  const source = [
    'function migrateLegacyVipSnapshotOnce() {',
    "  const migrationKeys = ['premium_plan', 'premium_expiry'];",
    '  AsyncStorage.multiGet(migrationKeys);',
    '}',
    'function accidentalReader() {',
    "  const accidentalKey = 'premium_plan';",
    '  AsyncStorage.getItem(accidentalKey);',
    '}',
  ].join('\n');
  expect(directProtectedReadsFromSource(source, path.join(ROOT, 'app/premium_vip_storage.ts'))).toEqual([
    expect.stringContaining('premium_plan'),
  ]);
});

test('account-specific code has no raw readers of ownerless Premium keys', () => {
  const files = SOURCE_ROOTS.flatMap((directory) => sourceFiles(path.join(ROOT, directory)));
  const violations = directProtectedReads(files).sort();

  expect(violations).toEqual([]);
});


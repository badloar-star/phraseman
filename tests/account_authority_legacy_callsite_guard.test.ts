import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..');

const read = (relativePath: string): string => (
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
);

const parse = (relativePath: string): ts.SourceFile => ts.createSourceFile(
  relativePath,
  read(relativePath),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

function visit(root: ts.Node, inspect: (node: ts.Node) => void): void {
  const walk = (node: ts.Node): void => {
    inspect(node);
    ts.forEachChild(node, walk);
  };
  walk(root);
}

function callName(call: ts.CallExpression): string | null {
  if (ts.isIdentifier(call.expression)) return call.expression.text;
  if (ts.isPropertyAccessExpression(call.expression)) return call.expression.name.text;
  return null;
}

function countCalls(sourceFile: ts.SourceFile, names: readonly string[]): number {
  const wanted = new Set(names);
  let count = 0;
  visit(sourceFile, (node) => {
    if (ts.isCallExpression(node) && wanted.has(callName(node) ?? '')) count += 1;
  });
  return count;
}

function countCollectionPath(sourceFile: ts.SourceFile, collection: string): number {
  let count = 0;
  visit(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || callName(node) !== 'collection') return;
    const [argument] = node.arguments;
    if (argument && ts.isStringLiteral(argument) && argument.text === collection) count += 1;
  });
  return count;
}

function countKeyedStorageCalls(sourceFile: ts.SourceFile): number {
  const storageMethods = new Set([
    'deleteItemAsync',
    'getItem',
    'getItemAsync',
    'removeItem',
    'setItem',
    'setItemAsync',
  ]);
  let count = 0;
  visit(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !storageMethods.has(callName(node) ?? '')) return;
    const hasIdentityKey = node.arguments.some((argument) => (
      ts.isIdentifier(argument) && (argument.text === 'SECURE_KEY' || argument.text === 'ASYNC_KEY')
    ));
    if (hasIdentityKey) count += 1;
  });
  return count;
}

function countExportedFunctions(sourceFile: ts.SourceFile, names: readonly string[]): number {
  const wanted = new Set(names);
  let count = 0;
  visit(sourceFile, (node) => {
    if (!ts.isFunctionDeclaration(node) || !node.name || !wanted.has(node.name.text)) return;
    const exported = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
    if (exported) count += 1;
  });
  return count;
}

function countOwnerStateWrites(sourceFile: ts.SourceFile): number {
  const ownerState = new Set(['currentGeneration', 'currentStableId', 'currentPhase']);
  const assignmentOperators = new Set([
    ts.SyntaxKind.EqualsToken,
    ts.SyntaxKind.PlusEqualsToken,
  ]);
  let count = 0;
  visit(sourceFile, (node) => {
    if (!ts.isBinaryExpression(node) || !assignmentOperators.has(node.operatorToken.kind)) return;
    if (ts.isIdentifier(node.left) && ownerState.has(node.left.text)) count += 1;
  });
  return count;
}

function cutoverGateResolvesOnlyToLiteralFalse(source: string): boolean {
  const sourceFile = ts.createSourceFile(
    'accounts_v2_client_flag.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const gate = sourceFile.statements.find((statement): statement is ts.FunctionDeclaration => (
    ts.isFunctionDeclaration(statement)
    && statement.name?.text === 'isAccountAuthorityV2CutoverEnabled'
    && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
  ));
  if (!gate?.body || gate.parameters.length !== 0) return false;

  const returns: ts.ReturnStatement[] = [];
  let hasTrueLiteral = false;
  visit(gate.body, (node) => {
    if (ts.isReturnStatement(node)) returns.push(node);
    if (node.kind === ts.SyntaxKind.TrueKeyword) hasTrueLiteral = true;
  });
  if (hasTrueLiteral || returns.length !== 1 || !returns[0].expression) return false;

  const expression = returns[0].expression;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (!ts.isIdentifier(expression)) return false;

  let shadowedInsideGate = false;
  visit(gate.body, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === expression.text) {
      shadowedInsideGate = true;
    }
  });
  if (shadowedInsideGate) return false;

  return sourceFile.statements.some((statement) => {
    if (!ts.isVariableStatement(statement)) return false;
    if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) return false;
    return statement.declarationList.declarations.some((declaration) => (
      ts.isIdentifier(declaration.name)
      && declaration.name.text === expression.text
      && declaration.initializer?.kind === ts.SyntaxKind.FalseKeyword
    ));
  });
}

const LEGACY_OWNERSHIP_MODULE_BASENAMES = new Set([
  'account_generation',
  'cloud_sync',
  'stable_id',
]);

function isLegacyOwnershipModuleSpecifier(moduleSpecifier: string): boolean {
  const normalized = moduleSpecifier
    .replace(/\\/g, '/')
    .replace(/\.tsx?$/, '')
    .replace(/\/+$/, '');
  const basename = normalized.slice(normalized.lastIndexOf('/') + 1);
  if (!LEGACY_OWNERSHIP_MODULE_BASENAMES.has(basename)) return false;
  return normalized === `./${basename}`
    || normalized.endsWith(`/app/${basename}`);
}

const OWNERSHIP_CALL_NAME = /(?:StableId|AccountGeneration|Generation|wipeLocal|Anon|authLink|AuthRecovery|restoreFromCloud|syncToCloud|signInWithCustomToken|onAuthStateChanged)/;

const normalizedNodeText = (node: ts.Node, sourceFile: ts.SourceFile): string => (
  node.getText(sourceFile).replace(/\s+/g, ' ').trim()
);

const sha256 = (values: readonly string[]): string => crypto
  .createHash('sha256')
  .update(JSON.stringify([...values].sort()))
  .digest('hex');

function exactOwnershipProvenance(
  sourceFile: ts.SourceFile,
  additionalOwnershipCallNames: readonly string[] = [],
): Readonly<{
  occurrences: number;
  occurrenceSha256: string;
  imports: number;
  importSha256: string;
  legacyModuleCalls: number;
  legacyAliasDeclarations: number;
  census: Readonly<Record<string, number>>;
}> {
  const additionalOwnershipCalls = new Set(additionalOwnershipCallNames);
  // Перепись без позиции в дереве: вид + имя вызова/импорта/алиаса → сколько раз.
  const censusKeys: string[] = [];
  const directBindings = new Set<string>();
  const namespaceBindings = new Set<string>();
  const importProvenance: string[] = [];
  const aliasDeclarations = new Set<ts.VariableDeclaration>();
  const variableDeclarations: ts.VariableDeclaration[] = [];
  const functionBindingName = (node: ts.ArrowFunction | ts.FunctionExpression): string => {
    if (ts.isFunctionExpression(node) && node.name) return node.name.text;
    let current: ts.Node = node;
    while (current.parent
      && (ts.isParenthesizedExpression(current.parent) || ts.isAsExpression(current.parent))) {
      current = current.parent;
    }
    if (current.parent && ts.isVariableDeclaration(current.parent)) {
      return current.parent.name.getText(sourceFile);
    }
    if (current.parent && ts.isPropertyAssignment(current.parent)) {
      return current.parent.name.getText(sourceFile);
    }
    return '<anonymous>';
  };
  const structuralNodeName = (node: ts.Node): string => {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      return node.name?.getText(sourceFile) ?? '<anonymous>';
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      return functionBindingName(node);
    }
    if (ts.isVariableDeclaration(node)) return node.name.getText(sourceFile);
    if (ts.isPropertyAssignment(node)) return node.name.getText(sourceFile);
    return '';
  };
  const structuralPath = (node: ts.Node): string => {
    const parts: string[] = [];
    let current: ts.Node = node;
    while (current.parent) {
      const parent = current.parent;
      const children: ts.Node[] = [];
      ts.forEachChild(parent, (child) => { children.push(child); });
      const ordinal = children.indexOf(current);
      const nodeName = structuralNodeName(parent);
      parts.push(`${ts.SyntaxKind[parent.kind]}${nodeName ? `:${nodeName}` : ''}[${ordinal}]`);
      if (ts.isSourceFile(parent)) break;
      current = parent;
    }
    return parts.reverse().join('/');
  };
  const signature = (kind: string, node: ts.Node): string => (
    `${sourceFile.fileName}:${structuralPath(node)}:${kind}:${normalizedNodeText(node, sourceFile)}`
  );
  const unwrap = (expression: ts.Expression): ts.Expression => {
    let current = expression;
    while (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) current = current.expression;
    return current;
  };
  const bindingIdentifiers = (name: ts.BindingName): readonly string[] => {
    if (ts.isIdentifier(name)) return [name.text];
    return name.elements.flatMap((element) => (
      ts.isOmittedExpression(element) ? [] : bindingIdentifiers(element.name)
    ));
  };
  const legacyRequireSpecifier = (initializer: ts.Expression): string | null => {
    let found: string | null = null;
    visit(initializer, (descendant) => {
      if (!ts.isCallExpression(descendant)
        || !ts.isIdentifier(descendant.expression)
        || descendant.expression.text !== 'require') return;
      const [argument] = descendant.arguments;
      if (argument && ts.isStringLiteral(argument) && isLegacyOwnershipModuleSpecifier(argument.text)) {
        found = argument.text;
      }
    });
    return found;
  };
  const legacyRequireModule = (initializer: ts.Expression): boolean => (
    legacyRequireSpecifier(initializer) !== null
  );

  visit(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)
      && isLegacyOwnershipModuleSpecifier(node.moduleSpecifier.text)) {
      importProvenance.push(signature('import', node));
      censusKeys.push(`import:${node.moduleSpecifier.text}`);
      const clause = node.importClause;
      if (clause?.name) directBindings.add(clause.name.text);
      if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        namespaceBindings.add(clause.namedBindings.name.text);
      }
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        clause.namedBindings.elements.forEach((element) => directBindings.add(element.name.text));
      }
    }
    if (ts.isVariableDeclaration(node)) {
      variableDeclarations.push(node);
      const requiredLegacyModule = node.initializer ? legacyRequireSpecifier(node.initializer) : null;
      if (requiredLegacyModule !== null) {
        censusKeys.push(`require:${requiredLegacyModule}`);
        if (ts.isIdentifier(node.name)) {
          namespaceBindings.add(node.name.text);
        } else {
          bindingIdentifiers(node.name).forEach((binding) => directBindings.add(binding));
          aliasDeclarations.add(node);
        }
        let statement: ts.Node = node;
        while (statement.parent && !ts.isVariableStatement(statement)) statement = statement.parent;
        importProvenance.push(signature('require', statement));
      }
    }
  });

  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of variableDeclarations) {
      if (!declaration.initializer || legacyRequireModule(declaration.initializer)) continue;
      const initializer = unwrap(declaration.initializer);
      const aliasesDirectBinding = ts.isIdentifier(initializer) && directBindings.has(initializer.text);
      const aliasesNamespaceMember = ts.isPropertyAccessExpression(initializer)
        && ts.isIdentifier(initializer.expression)
        && namespaceBindings.has(initializer.expression.text);
      const destructuresNamespace = !ts.isIdentifier(declaration.name)
        && ts.isIdentifier(initializer)
        && namespaceBindings.has(initializer.text);
      if (!aliasesDirectBinding && !aliasesNamespaceMember && !destructuresNamespace) continue;
      for (const binding of bindingIdentifiers(declaration.name)) {
        if (!directBindings.has(binding)) {
          directBindings.add(binding);
          changed = true;
        }
      }
      aliasDeclarations.add(declaration);
    }
  }

  const occurrenceProvenance: string[] = [];
  aliasDeclarations.forEach((declaration) => {
    occurrenceProvenance.push(signature('alias', declaration));
    censusKeys.push(`alias:${declaration.name.getText(sourceFile)}`);
  });
  let legacyModuleCalls = 0;
  visit(sourceFile, (node) => {
    if (ts.isCallExpression(node)) {
      const name = callName(node);
      const directOwnershipCall = name !== null && directBindings.has(name);
      const namespaceOwnershipCall = ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && namespaceBindings.has(node.expression.expression.text);
      const namedOwnershipCall = name !== null
        && (OWNERSHIP_CALL_NAME.test(name) || additionalOwnershipCalls.has(name));
      const authLinksCollection = name === 'collection'
        && node.arguments[0] !== undefined
        && ts.isStringLiteral(node.arguments[0])
        && node.arguments[0].text === 'auth_links';
      if (directOwnershipCall || namespaceOwnershipCall || namedOwnershipCall || authLinksCollection) {
        occurrenceProvenance.push(signature('call', node));
        censusKeys.push(`call:${name ?? normalizedNodeText(node.expression, sourceFile)}`);
      }
      if (directOwnershipCall || namespaceOwnershipCall) legacyModuleCalls += 1;
    }
    if (ts.isBinaryExpression(node)
      && ts.isIdentifier(node.left)
      && ['currentGeneration', 'currentStableId', 'currentPhase'].includes(node.left.text)) {
      occurrenceProvenance.push(signature('state', node));
      censusKeys.push(`state:${node.left.text}`);
    }
  });

  const census: Record<string, number> = {};
  [...censusKeys].sort().forEach((key) => { census[key] = (census[key] ?? 0) + 1; });

  return Object.freeze({
    census: Object.freeze(census),
    occurrences: occurrenceProvenance.length,
    occurrenceSha256: sha256(occurrenceProvenance),
    imports: importProvenance.length,
    importSha256: sha256(importProvenance),
    legacyModuleCalls,
    legacyAliasDeclarations: aliasDeclarations.size,
  });
}

const LEGACY_FALLBACK_FILES = Object.freeze([
  'app/auth_provider.ts',
  'app/cloud_sync.ts',
  'app/stable_id.ts',
  'app/account_generation.ts',
  'app/account_switch_quarantine.ts',
  'app/auth_recovery_adoption.ts',
  'app/auth_recovery_boot_gate.ts',
  'app/auth_clean_install_recovery_adoption.ts',
  'app/flashcards_cloud_upload.ts',
] as const);

const AUTHORITY_CUTOVER_FILES = Object.freeze([
  'app/accounts_v2_client_flag.ts',
  'modules/account-session-v2/accounts_v2_client_runtime.ts',
  'modules/account-authority-v2/account_authority_contract.ts',
  'modules/account-authority-v2/account_authority_ids.ts',
  'modules/account-authority-v2/account_authority_local_store.ts',
  'modules/account-authority-v2/account_authority_reducer.ts',
  'modules/account-authority-v2/account_authority_runtime.ts',
  'modules/account-authority-v2/account_authority_bootstrap_contract.ts',
  'functions/src/account_authority/delete_contract.ts',
  'functions/src/account_authority/lease_contract.ts',
  'functions/src/account_authority/lease_handlers.ts',
  'functions/src/accounts_v2_migration/preserved_domains.ts',
] as const);

const DIRECT_LEGACY_PATH = new RegExp([
  String.raw`from\s+['"][^'"]*stable_id['"]`,
  String.raw`['"]auth_links['"]`,
  String.raw`\b(?:get|set|clear|peek|readExisting)StableId\s*\(`,
  String.raw`\b(?:wipeLocalAccountData|beginAccountGeneration|beginInitialAccountGeneration|invalidateAccountGeneration)\s*\(`,
  String.raw`\b(?:ensureAnonUser|ensureAnonIdentityDetailed)\b`,
].join('|'));

function cleanZoneHasDirectLegacyOwnership(source: string): boolean {
  if (DIRECT_LEGACY_PATH.test(source)) return true;
  const provenance = exactOwnershipProvenance(ts.createSourceFile(
    'clean-zone.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
  ));
  return provenance.imports > 0
    || provenance.legacyModuleCalls > 0
    || provenance.legacyAliasDeclarations > 0;
}

describe('Account Authority 2.0 legacy callsite guard', () => {
  test('pins the exact pre-cutover legacy ownership census behind the source-only fallback boundary', () => {
    const gate = read('app/accounts_v2_client_flag.ts');
    expect(gate).toContain('const ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false;');
    expect(gate).toContain('if (!isAccountAuthorityV2CutoverEnabled())');
    expect(gate).toContain('runLegacyAccountsV2ProviderSignInTransition(legacyAuthenticate)');
    expect(gate).toContain('runLegacyAccountsV2ProviderSignOutTransition(authenticate)');

    const authProvider = parse(LEGACY_FALLBACK_FILES[0]);
    const cloudSync = parse(LEGACY_FALLBACK_FILES[1]);
    const stableId = parse(LEGACY_FALLBACK_FILES[2]);
    const accountGeneration = parse(LEGACY_FALLBACK_FILES[3]);
    const accountSwitchQuarantine = parse(LEGACY_FALLBACK_FILES[4]);
    const authRecoveryAdoption = parse(LEGACY_FALLBACK_FILES[5]);
    const authRecoveryBootGate = parse(LEGACY_FALLBACK_FILES[6]);
    const authCleanInstallRecoveryAdoption = parse(LEGACY_FALLBACK_FILES[7]);
    const flashcardsCloudUpload = parse(LEGACY_FALLBACK_FILES[8]);

    const census = {
      authProvider: {
        stableIdentityReads: countCalls(authProvider, ['getStableId', 'peekStableId', 'readExistingStableId']),
        stableIdentityWrites: countCalls(authProvider, ['setStableId', 'clearStableId']),
        authLinkLookups: countCollectionPath(authProvider, 'auth_links'),
        ownerMergeDecisions: countCalls(authProvider, [
          'ensureStableAuthLinkForStableIdDetailed',
          'mergeStableAccountsViaServer',
        ]),
        generationTransitions: countCalls(authProvider, ['beginAccountGeneration', 'invalidateAccountGeneration']),
        generationFences: countCalls(authProvider, ['captureAccountGeneration', 'isCurrentAccountGeneration']),
        transitionLocks: countCalls(authProvider, [
          'withAccountTransitionLock',
          'withAccountTransitionLockWithDeadline',
        ]),
        anonymousSessionDecisions: countCalls(authProvider, ['ensureAnonUser', 'ensureAnonIdentityDetailed']),
        localAccountWipes: countCalls(authProvider, ['wipeLocalAccountData']),
      },
      cloudSync: {
        stableIdentityReads: countCalls(cloudSync, ['peekStableId']),
        stableIdentityWrites: countCalls(cloudSync, ['setStableId', 'clearStableId']),
        authLinkLookups: countCollectionPath(cloudSync, 'auth_links'),
        generationTransitions: countCalls(cloudSync, ['beginAccountGeneration', 'beginInitialAccountGeneration']),
        generationFences: countCalls(cloudSync, ['captureAccountGeneration', 'isCurrentAccountGeneration']),
        transitionLocks: countCalls(cloudSync, ['withAccountTransitionLock', 'withRestoreApplicationLock']),
        anonymousSessionDecisions: countCalls(cloudSync, ['ensureAnonUser', 'signInAnonymously']),
      },
      stableId: {
        persistedIdentityReadsAndWrites: countKeyedStorageCalls(stableId),
        generatedIdentities: countCalls(stableId, ['randomUUID']),
        generationTransitions: countCalls(stableId, ['beginInitialAccountGeneration', 'invalidateAccountGeneration']),
        exportedLegacyIdentityApis: countExportedFunctions(stableId, [
          'clearStableId',
          'getStableId',
          'peekStableId',
          'readExistingStableId',
          'setStableId',
        ]),
      },
      accountGeneration: {
        ownerStateWrites: countOwnerStateWrites(accountGeneration),
        exportedLegacyOwnerApis: countExportedFunctions(accountGeneration, [
          'beginAccountGeneration',
          'beginInitialAccountGeneration',
          'captureAccountGeneration',
          'ensureAccountGeneration',
          'invalidateAccountGeneration',
          'isCurrentAccountGeneration',
          'withAccountTransitionLock',
          'withAccountTransitionLockWithDeadline',
        ]),
      },
      accountSwitchQuarantine: {
        stableIdentityReads: countCalls(accountSwitchQuarantine, [
          'getStableId',
          'peekStableId',
          'readExistingStableId',
        ]),
        stableIdentityWrites: countCalls(accountSwitchQuarantine, ['clearStableId']),
        generationTransitions: countCalls(accountSwitchQuarantine, [
          'beginAccountGeneration',
          'invalidateAccountGeneration',
        ]),
        ownerGenerationInvalidations: countCalls(accountSwitchQuarantine, ['invalidateGeneration']),
        ownerGenerationActivations: countCalls(accountSwitchQuarantine, ['activateGeneration']),
        localAccountWipes: countCalls(accountSwitchQuarantine, ['wipeLocalData', 'wipeLocalAccountData']),
        anonymousSessionDecisions: countCalls(accountSwitchQuarantine, ['ensureAnonUser']),
      },
      authRecoveryAdoption: {
        stableIdentityReads: countCalls(authRecoveryAdoption, ['getStableId']),
        generationTransitions: countCalls(authRecoveryAdoption, [
          'beginAccountGeneration',
          'invalidateAccountGeneration',
        ]),
        providerSessionAdoptions: countCalls(authRecoveryAdoption, ['signInWithCustomToken']),
      },
      authRecoveryBootGate: {
        generationTransitions: countCalls(authRecoveryBootGate, ['invalidateAccountGeneration']),
        providerSessionObservers: countCalls(authRecoveryBootGate, ['onAuthStateChanged']),
      },
      authCleanInstallRecoveryAdoption: {
        stableIdentityReads: countCalls(authCleanInstallRecoveryAdoption, ['getStableId']),
        stableIdentityWrites: countCalls(authCleanInstallRecoveryAdoption, ['setStableId']),
        generationTransitions: countCalls(authCleanInstallRecoveryAdoption, [
          'beginAccountGeneration',
          'invalidateAccountGeneration',
        ]),
        generationFences: countCalls(authCleanInstallRecoveryAdoption, [
          'captureAccountGeneration',
          'isCurrentAccountGeneration',
        ]),
        transitionLocks: countCalls(authCleanInstallRecoveryAdoption, ['withAccountTransitionLockWithDeadline']),
        localAccountWipes: countCalls(authCleanInstallRecoveryAdoption, [
          'wipeLocalAccountDataForCleanInstallRecoveryWhileLocked',
        ]),
        cloudOwnershipRestores: countCalls(authCleanInstallRecoveryAdoption, ['restoreFromCloudDetailed']),
        providerSessionAdoptions: countCalls(authCleanInstallRecoveryAdoption, ['signInWithCustomToken']),
      },
      flashcardsCloudUpload: {
        generationFenceCallbacks: countCalls(flashcardsCloudUpload, ['isCurrent']),
      },
    };

    expect(census).toEqual({
      authProvider: {
        // S2c: +2 — peekStableId только для меток [AUTH-LINK-GOOGLE] (осознанно, без записи).
        // S1e (c0333fe6d): +1 — peekStableId после возврата в аккаунт: применить локально
        // сохранённые правки карточек к ключу этого аккаунта (только чтение, без записи).
        // 20318946f (Ядро 15.10, Авторизация): +1 — peekStableId владельца A в clearAccountPushBeforeSwitchSignOut: push-токен A
        // снимается с явным владельцем, без ensureAnonUser посреди карантина смены (только чтение, без записи).
        // +1 (Ядро 15.10): stableId для предвыборки метки до окна выбора Google; позднее чтение — сверка.
        stableIdentityReads: 22,
        stableIdentityWrites: 9,
        authLinkLookups: 2,
        ownerMergeDecisions: 8,
        // +1 (блокер выпуска 18.10): Firebase отклонил вход в ветке передачи — запись снята, поколение гостя возвращено.
        generationTransitions: 18,
        generationFences: 9,
        transitionLocks: 5,
        anonymousSessionDecisions: 6,
        // +1 (координатор 18.10 10:10): стирание без сброса согласий для отката прерванной передачи входа
        localAccountWipes: 7,
      },
      cloudSync: {
        stableIdentityReads: 1,
        stableIdentityWrites: 3,
        authLinkLookups: 1,
        generationTransitions: 4,
        // Ядро 14.10: +1 — поколение в трассировке [AUTH-LOOP] ensureStableAuthLink (7f9c95187, только чтение для лога);
        // +2 — память подтверждённого ответа ensure_link: поколение при входе и сверка, что оно не сменилось за запрос.
        // R20-хвост 15.10 (eca3aae21): +1 — currentRestoreOwner(): только чтение stableId владельца для дедупа восстановления,
        // чтобы проверка Plus аккаунта B не присоединилась к восстановлению A (ограда владельца, не смена поколения).
        // Вход 17.10 (💸): +1 — rememberSwapConfirmedStableAuthLink сверяет активное поколение перед переносом подтверждения.
        generationFences: 19,
        transitionLocks: 4,
        anonymousSessionDecisions: 9,
      },
      stableId: {
        // S2c: +1 — чтение AsyncStorage для сверки слоёв [PROFILE-FLIP] (осознанно).
        // S2d 🔴3: +5 — метка «SecureStore отстал» (чтение/снятие), починка отставшего слоя,
        // чтение AsyncStorage при доказательстве владения; +1 поколение — ветка расхождения слоёв.
        persistedIdentityReadsAndWrites: 26,
        generatedIdentities: 1,
        generationTransitions: 9,
        exportedLegacyIdentityApis: 5,
      },
      accountGeneration: {
        ownerStateWrites: 9,
        exportedLegacyOwnerApis: 8,
      },
      accountSwitchQuarantine: {
        stableIdentityReads: 4,
        stableIdentityWrites: 3,
        generationTransitions: 3,
        ownerGenerationInvalidations: 3,
        ownerGenerationActivations: 4,
        localAccountWipes: 3,
        anonymousSessionDecisions: 1,
      },
      authRecoveryAdoption: {
        stableIdentityReads: 4,
        generationTransitions: 5,
        providerSessionAdoptions: 1,
      },
      authRecoveryBootGate: {
        generationTransitions: 4,
        providerSessionObservers: 1,
      },
      authCleanInstallRecoveryAdoption: {
        stableIdentityReads: 2,
        stableIdentityWrites: 1,
        generationTransitions: 3,
        generationFences: 4,
        transitionLocks: 2,
        localAccountWipes: 1,
        cloudOwnershipRestores: 1,
        providerSessionAdoptions: 1,
      },
      flashcardsCloudUpload: {
        generationFenceCallbacks: 2,
      },
    });
  });

  // зачем (AA S0, 2026-10-03): раньше здесь был sha256 от структурного пути
  // каждого вызова (порядковые номера узлов в дереве). Любая посторонняя правка
  // выше вызова — например, мультиязычная синхронизация в cloud_sync.ts — меняла
  // хеш, хотя ни один вызов владения не появился и не исчез. Сторож краснел
  // ложно, и его «чинили» перепрошивкой хеша, то есть переставали читать.
  // Теперь пиним перепись: вид + имя вызова/импорта/алиаса и сколько раз он
  // встречается. Новый, удалённый или переименованный вызов владения ломает
  // проверку; перестановка соседнего кода — нет. Чувствительность самой
  // функции к перемещениям по-прежнему проверяют синтетические тесты ниже.
  test('pins the legacy ownership callsite and import census for every census file', () => {
    const provenance = Object.fromEntries(LEGACY_FALLBACK_FILES.map((file) => {
      const exact = exactOwnershipProvenance(
        parse(file),
        file === 'app/flashcards_cloud_upload.ts' ? ['isCurrent'] : [],
      );
      return [file, { occurrences: exact.occurrences, imports: exact.imports, census: exact.census }];
    }));
    expect(provenance).toEqual({
      'app/auth_provider.ts': {
        // AA S2b (пункт 9): +2 — nonce M-1 (приём ответа метки, стирание по завершении входа).
        // AA S2c: +2 — peekStableId только для меток трассировки [AUTH-LINK-GOOGLE].
        // AA S2d раунд 2 (H-S2d-2): +2 — аварийная копия гостя и чтение её сводки перед стиранием.
        // AA S2d раунд 3 (§135 ❓2): +2 — откладывание копии без merge, очистка отложенных >30 дн.
        // AA S1e (c0333fe6d): +1 — peekStableId для правок карточек «из будущего» после возврата.
        // TG-20707BD701DC (удаление гостя, 2026-10-10): +3 — прямой accountDeleteMine гостя без
        // замка, дожатие гостевого замка после перезапуска (startCloudDeletionEnqueue) и
        // квитанция по ключу перед запасным прямым вызовом (waitForAccountDeletionCredentialSafe).
        // 52429d419 (2026-10-12): +1 — гость ставит удаление своим вызовом startCloudDeletionEnqueue с дедлайном 25 с в фоне
        // (холодный старт accountDeleteEnqueue ≈9 с), связанные — прежним; та же постановка, другой потолок ожидания.
        // 20318946f (15.10): +1 — peekStableId владельца в снятии push при смене аккаунта.
        // +1 (Ядро 15.10): stableId для предвыборки метки до окна выбора Google; позднее чтение — сверка.
        // +1 (R15, ревью Opus 15.10): перепроверка чистоты гостя под замком перехода, если первая сказала «чист» (гонка записей).
        // +1 (Вход 17.10, 💸): перенос подтверждения привязки этого входа в новое поколение после свапа (rememberSwapConfirmedStableAuthLink).
        // +1 (блокер выпуска 18.10): возврат поколения гостя после снятия записи передачи (Firebase отклонил вход).
        // +1 (координатор 18.10 10:10): стирание без сброса согласий для отката прерванной передачи входа.
        // +9 (координатор 18.10, «вход — главная задача»): completeInterruptedProviderHandoff — довод прерванного входа вперёд тем же хвостом, что обычный свап.
        // +1 (решение владельца 18.10 «Входить само»): Apple + почта, занятая аккаунтом с Google, — вход custom token после серверной привязки.
        // +2 (прогон Сверки №3): затишье восстановления и синхронизации ждём ДО замка передачи входа (взаимное ожидание под замком).
        occurrences: 138,
        imports: 3,
        census: {
          'call:acceptAnonMergeStampResponse': 1,
          'call:beginAccountGeneration': 13,
          'call:captureAccountGeneration': 2,
          'call:clearStableId': 5,
          'call:collection': 2,
          'call:ensureAnonIdentityDetailed': 1,
          'call:ensureAnonUser': 5,
          'call:ensureFreshStableIdentityForLiveProvider': 1,
          'call:ensureStableAuthLinkForStableIdDetailed': 6,
          // AA S2d 🔴2: presync входа — forceSyncToCloud без adopt вместо syncToCloud({forceNow}).
          'call:forceSyncToCloud': 2,
          'call:forgetAllAnonMergeNonces': 1,
          // +1 (Ядро 15.10): stableId для предвыборки метки до окна выбора Google; позднее чтение — сверка.
          'call:getStableId': 12,
          'call:invalidateAccountGeneration': 5,
          'call:isCurrentAccountGeneration': 7,
          'call:isLocalAnonymousIdentityProvenCleanForCredentialHandoff': 2,
          'call:mergeStableAccountsViaServer': 2,
          'call:onAuthStateChanged': 2,
          'call:peekStableId': 9,
          'call:pruneShelvedAccountSwitchBackups': 1,
          'call:quiesceCloudSyncForAccountTransition': 5,
          'call:quiesceSyncBeforeStableIdSwap': 4,
          'call:readExistingStableId': 1,
          'call:rememberSwapConfirmedStableAuthLink': 2,
          'call:resetAnonAuthCacheForSignOut': 3,
          'call:readAccountSwitchEmergencyBackupSummary': 1,
          'call:restoreFromCloudDetailed': 1,
          'call:saveAccountSwitchEmergencyBackup': 6,
          'call:setStableId': 4,
          'call:shelveAccountSwitchEmergencyBackupOf': 1,
          'call:signInWithCustomToken': 1,
          'call:stampAnonOwnershipBeforeSignIn': 2,
          'call:startCloudDeletionDirect': 1,
          'call:startCloudDeletionEnqueue': 4,
          'call:syncToCloud': 2,
          'call:waitForAccountDeletionCredentialSafe': 4,
          'call:waitForRestoreApplicationIdleWithDeadline': 5,
          'call:wipeLocalAccountData': 7,
          'call:withAccountTransitionLock': 3,
          'call:withAccountTransitionLockWithDeadline': 2,
          'import:./account_generation': 1,
          'import:./cloud_sync': 1,
          'import:./stable_id': 1,
        },
      },
      'app/cloud_sync.ts': {
        // AA S2b (пункт 9): +1 — стирание nonce M-1 после успешного слияния.
        // AA S2c (L-S2b-4): +2 — различение отказа из-за потерянного nonce (ensureLink, merge).
        // Пункт (а) 11.10: +1 — forceSyncToCloud перепроверяет поколение после ожидания отложенного восстановления.
        // Ядро 14.10: +1 — поколение в трассировке [AUTH-LOOP] (7f9c95187); +2 — память подтверждённого ответа ensure_link.
        // R20-хвост 15.10 (eca3aae21): +1 — currentRestoreOwner() (владелец дедупа восстановления, только чтение).
        // Вход 17.10 (💸): +1 — поколение при переносе подтверждения привязки после свапа (rememberSwapConfirmedStableAuthLink).
        // Вход 18.10 (координатор): +1 isForceGenerationCurrent — перепроверка поколения перед пропуском записи документа при выходе
        // (077deccd0); +1 wipeLocalAccountDataUnsafe — замок стирания зовёт тело через обёртку режима 'full' | 'signout' (89da06443).
        occurrences: 81,
        imports: 2,
        census: {
          'call:adoptAuthoritativeStableIdentity': 1,
          'call:beginAccountGeneration': 1,
          'call:beginInitialAccountGeneration': 3,
          'call:captureAccountGeneration': 10,
          'call:classifyAnonMergeNonceRejection': 2,
          'call:clearStableId': 2,
          'call:collection': 1,
          'call:ensureAnonAuthReady': 1,
          'call:ensureAnonIdentityDetailed': 1,
          'call:ensureAnonUser': 8,
          'call:ensureStableAuthLinkForStableIdDetailed': 8,
          'call:forgetAnonMergeNonce': 1,
          'call:isCurrentAccountGeneration': 9,
          'call:isForceGenerationCurrent': 6,
          'call:isSyncGenerationCurrent': 15,
          'call:peekStableId': 1,
          'call:setStableId': 1,
          'call:signInAnonymously': 1,
          'call:syncToCloud': 1,
          'call:wipeLocalAccountDataUnsafe': 3,
          'call:wipeLocalAccountDataUnsafeBody': 1,
          'call:withAccountTransitionLock': 3,
          'call:withRestoreApplicationLock': 1,
          'import:./account_generation': 1,
          'import:./stable_id': 1,
        },
      },
      'app/stable_id.ts': {
        // AA S2d 🔴3: +5 — ветка расхождения слоёв на старте (проверки эпохи/удаления,
        // поколение) и повторное чтение владения; 🔴1: +2 — сообщение о смене аккаунта.
        occurrences: 41,
        imports: 1,
        census: {
          'call:assertAccountDeleteStableIdentityAvailable': 2,
          'call:assertCurrentStableIdRead': 14,
          'call:assertStableIdentityAvailableAtStartup': 6,
          'call:beginInitialAccountGeneration': 5,
          'call:clearStableIdStorage': 1,
          'call:emitStableIdChange': 2,
          'call:getStableId': 1,
          'call:invalidateAccountGeneration': 4,
          'call:persistStableId': 1,
          'call:readExistingStableId': 4,
          'call:readOrCreateStableId': 1,
          'import:./account_generation': 1,
        },
      },
      'app/account_generation.ts': {
        occurrences: 31,
        imports: 0,
        census: {
          'call:beginAccountGeneration': 2,
          'call:captureAccountGeneration': 6,
          'call:isCurrentAccountGeneration': 2,
          'call:normalizedStableId': 3,
          'call:notifyAccountGeneration': 2,
          'call:subscribeAccountGeneration': 1,
          'state:currentGeneration': 3,
          'state:currentPhase': 8,
          'state:currentStableId': 4,
        },
      },
      'app/account_switch_quarantine.ts': {
        occurrences: 36,
        imports: 3,
        census: {
          'call:activateGeneration': 4,
          'call:beginAccountGeneration': 1,
          'call:clearStableId': 3,
          'call:ensureAnonUser': 1,
          'call:ensureAnonymousIdentity': 2,
          'call:getStableId': 1,
          'call:invalidateAccountGeneration': 2,
          'call:invalidateGeneration': 3,
          'call:peekStableId': 2,
          'call:quiesceCloudSyncForAccountTransition': 1,
          'call:readCachedStableId': 1,
          'call:readExistingStableId': 1,
          'call:readStableId': 9,
          'call:resetAnonAuthCacheForSignOut': 1,
          'call:waitForRestoreApplicationIdleWithDeadline': 1,
          // 18.10 (координатор): откат прерванной передачи входа — стирание без сброса согласий (wipeLocalDataForHandoffRollback)
          'call:wipeLocalAccountData': 2,
          'call:wipeLocalData': 1,
          'require:./account_generation': 1,
          'require:./cloud_sync': 1,
          'require:./stable_id': 1,
        },
      },
      'app/auth_recovery_adoption.ts': {
        occurrences: 13,
        imports: 3,
        census: {
          'call:beginAccountGeneration': 4,
          'call:completeAuthRecoveryHandoffViaServer': 2,
          'call:getStableId': 4,
          'call:invalidateAccountGeneration': 1,
          'call:quiesceCloudSyncForAccountTransition': 1,
          'call:signInWithCustomToken': 1,
          'import:./account_generation': 1,
          'import:./cloud_sync': 1,
          'import:./stable_id': 1,
        },
      },
      'app/auth_recovery_boot_gate.ts': {
        occurrences: 6,
        imports: 2,
        census: {
          'call:invalidateAccountGeneration': 4,
          'call:onAuthStateChanged': 1,
          'call:quiesceCloudSyncForAccountTransition': 1,
          'import:./account_generation': 1,
          'import:./cloud_sync': 1,
        },
      },
      'app/auth_clean_install_recovery_adoption.ts': {
        occurrences: 28,
        imports: 3,
        census: {
          'call:assertHydratedAnonymous': 3,
          'call:assertSourceGeneration': 1,
          'call:assertTransitionGeneration': 2,
          'call:beginAccountGeneration': 1,
          'call:captureAccountGeneration': 2,
          'call:completeAuthRecoveryHandoffViaServer': 1,
          'call:getStableId': 2,
          'call:invalidateAccountGeneration': 2,
          'call:isCurrentAccountGeneration': 2,
          'call:quiesceCloudSyncForAccountTransition': 2,
          'call:restoreFromCloudDetailed': 1,
          'call:saveAccountSwitchEmergencyBackup': 1,
          'call:setStableId': 1,
          'call:signInWithCustomToken': 1,
          'call:wipeLocalAccountDataForCleanInstallRecoveryWhileLocked': 1,
          'call:withAccountTransitionLockWithDeadline': 2,
          'import:./account_generation': 1,
          'import:./cloud_sync': 1,
          'import:./stable_id': 1,
          'state:currentStableId': 3,
        },
      },
      'app/flashcards_cloud_upload.ts': {
        occurrences: 2,
        imports: 0,
        census: {
          'call:isCurrent': 2,
        },
      },
    });
  });

  test('the census ignores unrelated edits but catches a new ownership call', () => {
    const source = read('app/account_switch_quarantine.ts');
    const marker = "const cloud = require('./cloud_sync') as typeof import('./cloud_sync');";
    expect(source).toContain(marker);
    const parseText = (text: string) => exactOwnershipProvenance(ts.createSourceFile(
      'app/account_switch_quarantine.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    const base = parseText(source);
    const unrelated = parseText(`const reviewUnrelatedPrelude = 1;\nvoid reviewUnrelatedPrelude;\n${source}`);
    const withCall = parseText(source.replace(marker, `${marker}\n  void cloud.ensureAnonUser();`));

    expect(unrelated.census).toEqual(base.census);
    expect(withCall.census).not.toEqual(base.census);
    expect(withCall.census['call:ensureAnonUser']).toBe((base.census['call:ensureAnonUser'] ?? 0) + 1);
  });

  test('preserves both generation fences when flashcard upload ownership moves out of cloud_sync', () => {
    const cloudSync = read('app/cloud_sync.ts');
    const helper = parse('app/flashcards_cloud_upload.ts');
    const helperSource = helper.getFullText();

    expect(cloudSync.match(/isCurrent:\s*isSyncGenerationCurrent/g)).toHaveLength(1);
    expect(cloudSync.match(/isCurrent:\s*isForceGenerationCurrent/g)).toHaveLength(1);
    expect(countCalls(helper, ['isCurrent'])).toBe(2);
    expect(helperSource).toMatch(/await deps\.readLocks\(keys\);\s*if \(!isCurrent\(\)\)/);
    expect(helperSource).toMatch(/await deps\.writePages\([\s\S]*?\);\s*if \(!isCurrent\(\)\)/);
  });

  test('tracks an ownership function aliased from an existing legacy namespace binding', () => {
    const source = read('app/account_switch_quarantine.ts');
    const marker = "const cloud = require('./cloud_sync') as typeof import('./cloud_sync');";
    expect(source).toContain(marker);
    const mutated = source.replace(
      marker,
      `${marker}\n  const reviewAlias = cloud.ensureAnonUser;\n  void reviewAlias();`,
    );
    const base = exactOwnershipProvenance(ts.createSourceFile(
      'app/account_switch_quarantine.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    const withAlias = exactOwnershipProvenance(ts.createSourceFile(
      'app/account_switch_quarantine.ts', mutated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    expect(withAlias.occurrences).toBe(base.occurrences + 2);
    expect(withAlias.occurrenceSha256).not.toBe(base.occurrenceSha256);
  });

  test('tracks an ownership function aliased from a destructured legacy require', () => {
    const source = read('app/account_switch_quarantine.ts');
    const marker = "const cloud = require('./cloud_sync') as typeof import('./cloud_sync');";
    expect(source).toContain(marker);
    const mutated = source.replace(
      marker,
      `${marker}\n  const { ensureAnonUser: reviewAlias } = require('./cloud_sync');\n  void reviewAlias();`,
    );
    const base = exactOwnershipProvenance(ts.createSourceFile(
      'app/account_switch_quarantine.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    const withAlias = exactOwnershipProvenance(ts.createSourceFile(
      'app/account_switch_quarantine.ts', mutated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    expect(withAlias.occurrences).toBe(base.occurrences + 2);
    expect(withAlias.occurrenceSha256).not.toBe(base.occurrenceSha256);
    expect(withAlias.imports).toBe(base.imports + 1);
    expect(withAlias.importSha256).not.toBe(base.importSha256);
  });

  test('tracks transitive ownership aliases until the binding set reaches a fixpoint', () => {
    const source = read('app/account_switch_quarantine.ts');
    const marker = "const cloud = require('./cloud_sync') as typeof import('./cloud_sync');";
    const mutated = source.replace(
      marker,
      `${marker}\n  const reviewAlias = cloud.ensureAnonUser;\n  const reviewAlias2 = reviewAlias;\n  void reviewAlias2();`,
    );
    const base = exactOwnershipProvenance(ts.createSourceFile(
      'app/account_switch_quarantine.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    const withAlias = exactOwnershipProvenance(ts.createSourceFile(
      'app/account_switch_quarantine.ts', mutated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    expect(withAlias.occurrences).toBe(base.occurrences + 3);
    expect(withAlias.occurrenceSha256).not.toBe(base.occurrenceSha256);
  });

  test.each([
    `
      import { beginAccountGeneration as activateOwner } from './account_generation';
      void activateOwner('owner-a');
    `,
    `
      import * as legacyGeneration from './account_generation';
      const activateOwner = legacyGeneration.beginAccountGeneration;
      void activateOwner('owner-a');
    `,
    `
      import { wipeLocalAccountData as wipeOwner } from './cloud_sync';
      void wipeOwner();
    `,
    `
      import { beginAccountGeneration as activateOwner } from '../../app/account_generation';
      void activateOwner('owner-a');
    `,
    `
      import * as legacyCloud from '../../../app/cloud_sync';
      const wipeOwner = legacyCloud.wipeLocalAccountData;
      void wipeOwner();
    `,
    `
      const { getStableId: readOwner } = require('../../../../app/stable_id');
      void readOwner();
    `,
  ])('clean-zone analysis rejects aliased legacy ownership imports and calls', (unsafeSource) => {
    expect(cleanZoneHasDirectLegacyOwnership(unsafeSource)).toBe(true);
  });

  test('provenance changes when an identical ownership call moves to another control-flow path', () => {
    const before = `
      import { getStableId } from './stable_id';
      export function owner(flag: boolean): Promise<string> | null {
        if (flag) return getStableId();
        return null;
      }
    `;
    const after = `
      import { getStableId } from './stable_id';
      export function owner(flag: boolean): Promise<string> | null {
        if (!flag) return null;
        return getStableId();
      }
    `;
    const beforeProvenance = exactOwnershipProvenance(ts.createSourceFile(
      'synthetic.ts', before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    const afterProvenance = exactOwnershipProvenance(ts.createSourceFile(
      'synthetic.ts', after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    expect(afterProvenance.occurrenceSha256).not.toBe(beforeProvenance.occurrenceSha256);
  });

  test('provenance changes when an identical ownership call moves between named arrow bindings', () => {
    const before = `
      import { getStableId } from './stable_id';
      const safeCheck = () => getStableId();
    `;
    const after = `
      import { getStableId } from './stable_id';
      const ownerSwitch = () => getStableId();
    `;
    const beforeProvenance = exactOwnershipProvenance(ts.createSourceFile(
      'synthetic.ts', before, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    const afterProvenance = exactOwnershipProvenance(ts.createSourceFile(
      'synthetic.ts', after, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
    ));
    expect(afterProvenance.occurrences).toBe(beforeProvenance.occurrences);
    expect(afterProvenance.occurrenceSha256).not.toBe(beforeProvenance.occurrenceSha256);
  });

  test('the exported cutover gate resolves only to a hardcoded false literal', () => {
    expect(cutoverGateResolvesOnlyToLiteralFalse(read('app/accounts_v2_client_flag.ts'))).toBe(true);
  });

  test('rejects a dead false constant when the exported cutover gate can return true', () => {
    const unsafeSource = `
      const ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false;
      export function isAccountAuthorityV2CutoverEnabled(): boolean {
        return true;
      }
    `;
    expect(cutoverGateResolvesOnlyToLiteralFalse(unsafeSource)).toBe(false);
  });

  test.each([
    `
      const ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false;
      export function isAccountAuthorityV2CutoverEnabled(): boolean {
        const ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = Boolean(1);
        return ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED;
      }
    `,
    `
      const ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false;
      export function isAccountAuthorityV2CutoverEnabled(
        ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = Boolean(1),
      ): boolean {
        return ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED;
      }
    `,
  ])('rejects a shadowed false cutover binding', (unsafeSource) => {
    expect(cutoverGateResolvesOnlyToLiteralFalse(unsafeSource)).toBe(false);
  });

  test.each(AUTHORITY_CUTOVER_FILES)('%s has no direct stable-id, auth-link, or legacy-wipe ownership path', (file) => {
    expect(cleanZoneHasDirectLegacyOwnership(read(file))).toBe(false);
  });
});

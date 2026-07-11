import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const ROOT = path.join(__dirname, "..");
const CLI_RELATIVE = path.join("scripts", "audit_production_xp_integrity.ts");
const CLI_PATH = path.join(ROOT, CLI_RELATIVE);
const AUDIT_SOURCE_ROOT = path.join(ROOT, "scripts", "xp_integrity");
const FIRESTORE_READER_PATH = path.join(
  AUDIT_SOURCE_ROOT,
  "firestore_reader.ts",
);
const REPORT_PATH = path.join(AUDIT_SOURCE_ROOT, "report.ts");
const TSX_CLI_PATH = require.resolve("tsx/cli");

const FILESYSTEM_WRITE_NAMES = new Set([
  "appendFile",
  "appendFileSync",
  "copyFile",
  "copyFileSync",
  "cp",
  "cpSync",
  "createWriteStream",
  "link",
  "linkSync",
  "mkdir",
  "mkdirSync",
  "mkdtemp",
  "mkdtempSync",
  "open",
  "openSync",
  "rename",
  "renameSync",
  "rm",
  "rmSync",
  "symlink",
  "symlinkSync",
  "truncate",
  "truncateSync",
  "unlink",
  "unlinkSync",
  "writeFile",
  "writeFileSync",
]);
const APPROVED_REPORT_WRITES = new Set([
  "lstatSync",
  "mkdirSync",
  "realpathSync",
  "renameSync",
  "rmSync",
  "writeFileSync",
]);

function expectCliImplementation(): void {
  expect(existsSync(CLI_PATH)).toBe(true);
}

function runCli(args: readonly string[]) {
  return spawnSync(process.execPath, [TSX_CLI_PATH, CLI_RELATIVE, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function listTypeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(absolute);
    return entry.isFile() && entry.name.endsWith(".ts") ? [absolute] : [];
  });
}

function parseSource(sourcePath: string): ts.SourceFile {
  return ts.createSourceFile(
    sourcePath,
    readFileSync(sourcePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function parseFixture(name: string, source: string): ts.SourceFile {
  return ts.createSourceFile(
    name,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function stringValue(node: ts.Node | undefined): string | null {
  return node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : null;
}

function moduleReferences(source: ts.SourceFile, matcher: RegExp): string[] {
  const references: string[] = [];
  const record = (node: ts.Node | undefined): void => {
    const value = stringValue(node);
    if (value && matcher.test(value)) references.push(value);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      record(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      record(node.moduleReference.expression);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      record(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return references;
}

function calledProperty(expression: ts.LeftHandSideExpression): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (ts.isElementAccessExpression(expression))
    return stringValue(expression.argumentExpression);
  return null;
}

function filesystemWriteCalls(source: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = calledProperty(node.expression);
      if (name && FILESYSTEM_WRITE_NAMES.has(name)) calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return calls;
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

function nonReportCapabilityViolations(source: ts.SourceFile): string[] {
  const violations = moduleReferences(
    source,
    /^(?:node:)?fs(?:\/promises)?$/,
  ).map((moduleName) => `filesystem_module:${moduleName}`);
  for (const call of filesystemWriteCalls(source)) {
    violations.push(
      `filesystem_write:${calledProperty(call.expression)}:${lineOf(source, call)}`,
    );
  }
  return violations;
}

function isDirectAssertedDestination(
  expression: ts.Expression | undefined,
): boolean {
  return (
    expression !== undefined &&
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "assertAuditOutputPath"
  );
}

function isApprovedReportImport(node: ts.ImportDeclaration): boolean {
  if (!/^(?:node:)?fs$/.test(stringValue(node.moduleSpecifier) ?? ""))
    return true;
  const clause = node.importClause;
  return (
    clause !== undefined &&
    clause.name === undefined &&
    clause.namedBindings !== undefined &&
    ts.isNamedImports(clause.namedBindings) &&
    clause.namedBindings.elements.length > 0 &&
    clause.namedBindings.elements.every(
      (element) =>
        element.propertyName === undefined &&
        APPROVED_REPORT_WRITES.has(element.name.text),
    )
  );
}

function hasBindingOrAssignment(source: ts.SourceFile, name: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (
      (ts.isVariableDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isBindingElement(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name
    ) {
      found = true;
    }
    if (
      ts.isBinaryExpression(node) &&
      ts.isIdentifier(node.left) &&
      node.left.text === name &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      found = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function escapedWriteCapabilityReferences(
  source: ts.SourceFile,
  importedWriteCapabilities: ReadonlySet<string>,
): string[] {
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && importedWriteCapabilities.has(node.text)) {
      const parent = node.parent;
      const isExactImportSpecifier =
        ts.isImportSpecifier(parent) &&
        parent.name === node &&
        parent.propertyName === undefined;
      const isDirectCallCallee =
        ts.isCallExpression(parent) && parent.expression === node;
      if (!isExactImportSpecifier && !isDirectCallCallee) {
        violations.push(
          `escaped_write_capability:${node.text}:${lineOf(source, node)}`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

function pathBindingViolations(source: ts.SourceFile): string[] {
  const violations: string[] = [];
  const pathReferences = moduleReferences(source, /^(?:node:)?path$/);
  const pathImports = source.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      /^(?:node:)?path$/.test(stringValue(statement.moduleSpecifier) ?? ""),
  );
  const hasExactImport =
    pathReferences.length === 1 &&
    pathImports.length === 1 &&
    stringValue(pathImports[0].moduleSpecifier) === "node:path" &&
    pathImports[0].importClause?.isTypeOnly !== true &&
    pathImports[0].importClause?.name?.text === "path" &&
    pathImports[0].importClause?.namedBindings === undefined;
  if (!hasExactImport) violations.push("invalid_node_path_binding");
  if (hasBindingOrAssignment(source, "path")) {
    violations.push("shadowed_or_reassigned:path");
  }

  const allowedMethods = new Set(["isAbsolute", "join", "relative", "resolve"]);
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "path") {
      const parent = node.parent;
      const isExactDefaultImport =
        ts.isImportClause(parent) &&
        parent.name === node &&
        parent.namedBindings === undefined &&
        ts.isImportDeclaration(parent.parent) &&
        stringValue(parent.parent.moduleSpecifier) === "node:path";
      const isDirectApprovedMethodCall =
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node &&
        allowedMethods.has(parent.name.text) &&
        ts.isCallExpression(parent.parent) &&
        parent.parent.expression === parent;
      if (!isExactDefaultImport && !isDirectApprovedMethodCall) {
        violations.push(`escaped_path_binding:${lineOf(source, node)}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

function assertHelperReferenceViolations(
  source: ts.SourceFile,
  importedWriteCapabilities: ReadonlySet<string>,
): string[] {
  const violations: string[] = [];
  const declarations = source.statements.filter(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "assertAuditOutputPath",
  );
  const exactDeclaration = declarations.length === 1 ? declarations[0] : null;
  if (hasBindingOrAssignment(source, "assertAuditOutputPath")) {
    violations.push("shadowed_or_reassigned:assertAuditOutputPath");
  }
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "assertAuditOutputPath") {
      const parent = node.parent;
      const isExactDeclaration =
        parent === exactDeclaration &&
        ts.isFunctionDeclaration(parent) &&
        parent.name === node;
      const wrapperCall =
        ts.isCallExpression(parent) && parent.expression === node
          ? parent
          : null;
      const writeCall = wrapperCall?.parent;
      const isDirectWriteDestination =
        wrapperCall !== null &&
        writeCall !== undefined &&
        ts.isCallExpression(writeCall) &&
        ts.isIdentifier(writeCall.expression) &&
        importedWriteCapabilities.has(writeCall.expression.text) &&
        (writeCall.arguments[0] === wrapperCall ||
          (writeCall.expression.text === "renameSync" &&
            writeCall.arguments[1] === wrapperCall));
      if (!isExactDeclaration && !isDirectWriteDestination) {
        violations.push(
          `escaped_assertAuditOutputPath:${lineOf(source, node)}`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

function isPathMethodCall(
  expression: ts.Expression | undefined,
  method: "resolve" | "relative" | "isAbsolute",
  argumentNames: readonly string[],
): boolean {
  return (
    expression !== undefined &&
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.expression.text === "path" &&
    expression.expression.name.text === method &&
    expression.arguments.length === argumentNames.length &&
    expression.arguments.every((argument, index) => {
      const expected = argumentNames[index];
      return expected.startsWith('"')
        ? stringValue(argument) === expected.slice(1, -1)
        : ts.isIdentifier(argument) && argument.text === expected;
    })
  );
}

function assertHelperViolations(source: ts.SourceFile): string[] {
  const helpers = source.statements.filter(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "assertAuditOutputPath",
  );
  if (helpers.length !== 1)
    return ["invalid_assertAuditOutputPath_declaration"];
  const [helper] = helpers;
  if (
    !helper.body ||
    helper.asteriskToken !== undefined ||
    (helper.modifiers?.length ?? 0) !== 0
  ) {
    return ["invalid_assertAuditOutputPath_declaration"];
  }
  if (
    helper.parameters.length !== 2 ||
    !ts.isIdentifier(helper.parameters[0].name) ||
    helper.parameters[0].name.text !== "root" ||
    !ts.isIdentifier(helper.parameters[1].name) ||
    helper.parameters[1].name.text !== "candidate"
  ) {
    return ["invalid_assertAuditOutputPath_parameters"];
  }

  const isTraversalCheck = (expression: ts.Expression): boolean =>
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.expression.text === "relative" &&
    expression.expression.name.text === "startsWith" &&
    stringValue(expression.arguments[0]) === "..";
  const exactConstDeclaration = (
    statement: ts.Statement | undefined,
    name: string,
    initializer: (expression: ts.Expression | undefined) => boolean,
  ): boolean => {
    if (
      !statement ||
      !ts.isVariableStatement(statement) ||
      (statement.declarationList.flags & ts.NodeFlags.Const) === 0 ||
      statement.declarationList.declarations.length !== 1
    ) {
      return false;
    }
    const [declaration] = statement.declarationList.declarations;
    return (
      ts.isIdentifier(declaration.name) &&
      declaration.name.text === name &&
      initializer(declaration.initializer)
    );
  };
  const directThrow = (statement: ts.Statement): boolean =>
    ts.isThrowStatement(statement) ||
    (ts.isBlock(statement) &&
      statement.statements.length === 1 &&
      ts.isThrowStatement(statement.statements[0]));
  const [approvedRoot, resolvedCandidate, relative, boundary, finalReturn] =
    helper.body.statements;
  const hasExactBoundary =
    boundary !== undefined &&
    ts.isIfStatement(boundary) &&
    boundary.elseStatement === undefined &&
    ts.isBinaryExpression(boundary.expression) &&
    boundary.expression.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
    ((isTraversalCheck(boundary.expression.left) &&
      isPathMethodCall(boundary.expression.right, "isAbsolute", [
        "relative",
      ])) ||
      (isPathMethodCall(boundary.expression.left, "isAbsolute", ["relative"]) &&
        isTraversalCheck(boundary.expression.right))) &&
    directThrow(boundary.thenStatement);
  const hasExactFinalReturn =
    finalReturn !== undefined &&
    ts.isReturnStatement(finalReturn) &&
    finalReturn.expression !== undefined &&
    ts.isIdentifier(finalReturn.expression) &&
    finalReturn.expression.text === "resolvedCandidate";
  const exactControlFlow =
    helper.body.statements.length === 5 &&
    exactConstDeclaration(approvedRoot, "approvedRoot", (initializer) =>
      isPathMethodCall(initializer, "resolve", [
        "root",
        '".codex-tmp"',
        '"xp-integrity-audit"',
      ]),
    ) &&
    exactConstDeclaration(
      resolvedCandidate,
      "resolvedCandidate",
      (initializer) => isPathMethodCall(initializer, "resolve", ["candidate"]),
    ) &&
    exactConstDeclaration(relative, "relative", (initializer) =>
      isPathMethodCall(initializer, "relative", [
        "approvedRoot",
        "resolvedCandidate",
      ]),
    ) &&
    hasExactBoundary &&
    hasExactFinalReturn;

  return exactControlFlow ? [] : ["invalid_assertAuditOutputPath_control_flow"];
}

function reportCapabilityViolations(source: ts.SourceFile): string[] {
  const violations: string[] = [...pathBindingViolations(source)];
  const importedWriteCapabilities = new Set<string>();
  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      !isApprovedReportImport(statement)
    ) {
      violations.push(`invalid_fs_import:${lineOf(source, statement)}`);
    }
    if (
      ts.isImportDeclaration(statement) &&
      /^(?:node:)?fs$/.test(stringValue(statement.moduleSpecifier) ?? "") &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      for (const element of statement.importClause.namedBindings.elements) {
        if (
          element.propertyName === undefined &&
          APPROVED_REPORT_WRITES.has(element.name.text)
        ) {
          importedWriteCapabilities.add(element.name.text);
        }
      }
    }
  }
  const nonStaticFsReferences = moduleReferences(
    source,
    /^(?:node:)?fs(?:\/promises)?$/,
  ).length;
  const staticFsImports = source.statements.filter(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      /^(?:node:)?fs$/.test(stringValue(statement.moduleSpecifier) ?? ""),
  ).length;
  if (nonStaticFsReferences !== staticFsImports)
    violations.push("require_or_dynamic_fs_forbidden");

  for (const approvedName of APPROVED_REPORT_WRITES) {
    if (hasBindingOrAssignment(source, approvedName)) {
      violations.push(`shadowed_or_reassigned:${approvedName}`);
    }
  }
  violations.push(
    ...escapedWriteCapabilityReferences(source, importedWriteCapabilities),
    ...assertHelperReferenceViolations(source, importedWriteCapabilities),
  );
  for (const call of filesystemWriteCalls(source)) {
    const name = calledProperty(call.expression);
    if (
      !name ||
      !APPROVED_REPORT_WRITES.has(name) ||
      !ts.isIdentifier(call.expression) ||
      !importedWriteCapabilities.has(name)
    ) {
      violations.push(`unapproved_write_call:${name}:${lineOf(source, call)}`);
    } else if (
      !isDirectAssertedDestination(call.arguments[0]) ||
      (name === "renameSync" && !isDirectAssertedDestination(call.arguments[1]))
    ) {
      violations.push(
        `unasserted_write_destination:${name}:${lineOf(source, call)}`,
      );
    }
  }
  violations.push(...assertHelperViolations(source));
  return violations;
}

function firebaseModuleReferences(source: ts.SourceFile): string[] {
  return moduleReferences(source, /^(?:firebase|firebase-admin)(?:\/|$)/);
}

const FIRESTORE_MUTATIONS = new Set([
  "add",
  "commit",
  "create",
  "delete",
  "set",
  "update",
]);
const AUTH_MUTATIONS = new Set([
  "createUser",
  "updateUser",
  "deleteUser",
  "deleteUsers",
  "importUsers",
  "setCustomUserClaims",
  "revokeRefreshTokens",
]);

function firebaseMutationCalls(source: ts.SourceFile): string[] {
  const violations: string[] = [];
  const firestoreBindings = new Set<string>();
  const isFirestoreReceiver = (node: ts.Expression): boolean => {
    if (ts.isIdentifier(node)) return firestoreBindings.has(node.text);
    if (ts.isCallExpression(node)) {
      const method = calledProperty(node.expression);
      if (
        ["collection", "doc", "batch", "runTransaction"].includes(method ?? "")
      )
        return true;
      return isFirestoreReceiver(node.expression);
    }
    if (ts.isPropertyAccessExpression(node))
      return isFirestoreReceiver(node.expression);
    if (ts.isElementAccessExpression(node))
      return isFirestoreReceiver(node.expression);
    return false;
  };
  const collectBindings = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      isFirestoreReceiver(node.initializer)
    ) {
      firestoreBindings.add(node.name.text);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) &&
      isFirestoreReceiver(node.right)
    ) {
      firestoreBindings.add(node.left.text);
    }
    if (
      ts.isCallExpression(node) &&
      calledProperty(node.expression) === "runTransaction" &&
      isFirestoreReceiver(node)
    ) {
      const callback = node.arguments[0];
      if (
        callback &&
        (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
      ) {
        const parameter = callback.parameters[0];
        if (parameter && ts.isIdentifier(parameter.name)) {
          firestoreBindings.add(parameter.name.text);
        }
      }
    }
    ts.forEachChild(node, collectBindings);
  };
  collectBindings(source);
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = calledProperty(node.expression);
      const receiver = ts.isPropertyAccessExpression(node.expression)
        ? node.expression.expression
        : ts.isElementAccessExpression(node.expression)
          ? node.expression.expression
          : null;
      if (
        name &&
        (AUTH_MUTATIONS.has(name) ||
          (FIRESTORE_MUTATIONS.has(name) &&
            receiver &&
            isFirestoreReceiver(receiver)))
      ) {
        violations.push(`${name}:${lineOf(source, node)}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

describe("production XP integrity audit read-only contract", () => {
  it("forbids filesystem capabilities outside report.ts without trusting names", () => {
    const source = parseFixture(
      "outside-report.ts",
      [
        'import { writeFileSync as save } from "node:fs";',
        "let writeFileSync = () => undefined;",
        "writeFileSync = () => undefined;",
        'writeFileSync("docs/shadowed.json", "unsafe");',
        'save("docs/aliased.json", "unsafe");',
        'filesystem["writeFileSync"]("docs/computed.json", "unsafe");',
      ].join("\n"),
    );

    expect(nonReportCapabilityViolations(source)).toEqual([
      "filesystem_module:node:fs",
      "filesystem_write:writeFileSync:4",
      "filesystem_write:writeFileSync:6",
    ]);
  });

  it("rejects report aliases, computed writes, and unwrapped destinations", () => {
    const source = parseFixture(
      "report.ts",
      [
        'import { mkdirSync as make, writeFileSync } from "node:fs";',
        "function assertAuditOutputPath(root: string, candidate: string) { return candidate; }",
        "let writeFileSync = () => undefined;",
        "writeFileSync = () => undefined;",
        "const save = writeFileSync;",
        'save("docs/aliased.json", "unsafe");',
        'writeFileSync.call(null, "docs/call.json", "unsafe");',
        "consume(writeFileSync);",
        'writeFileSync("docs/unwrapped.json", "unsafe");',
        'filesystem["writeFileSync"](assertAuditOutputPath(root, candidate), "unsafe");',
      ].join("\n"),
    );

    expect(reportCapabilityViolations(source)).toEqual(
      expect.arrayContaining([
        "invalid_fs_import:1",
        "shadowed_or_reassigned:writeFileSync",
        "escaped_write_capability:writeFileSync:5",
        "escaped_write_capability:writeFileSync:7",
        "escaped_write_capability:writeFileSync:8",
        "unasserted_write_destination:writeFileSync:9",
        "unapproved_write_call:writeFileSync:10",
      ]),
    );
  });

  it("accepts only the exact report capability and runtime confinement shape", () => {
    const source = parseFixture(
      "report.ts",
      [
        'import path from "node:path";',
        'import { mkdirSync, writeFileSync } from "node:fs";',
        "function assertAuditOutputPath(root: string, candidate: string) {",
        '  const approvedRoot = path.resolve(root, ".codex-tmp", "xp-integrity-audit");',
        "  const resolvedCandidate = path.resolve(candidate);",
        "  const relative = path.relative(approvedRoot, resolvedCandidate);",
        '  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("outside");',
        "  return resolvedCandidate;",
        "}",
        "mkdirSync(assertAuditOutputPath(root, candidate), { recursive: true });",
        'writeFileSync(assertAuditOutputPath(root, candidate), "safe");',
      ].join("\n"),
    );

    expect(reportCapabilityViolations(source)).toEqual([]);
  });

  it("rejects a fake local path implementation", () => {
    const source = parseFixture(
      "report.ts",
      [
        'import { writeFileSync } from "node:fs";',
        "const path = {",
        "  resolve: (...parts: string[]) => parts.at(-1)!,",
        "  relative: () => '',",
        "  isAbsolute: () => false,",
        "};",
        "function assertAuditOutputPath(root: string, candidate: string) {",
        '  const approvedRoot = path.resolve(root, ".codex-tmp", "xp-integrity-audit");',
        "  const resolvedCandidate = path.resolve(candidate);",
        "  const relative = path.relative(approvedRoot, resolvedCandidate);",
        '  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("outside");',
        "  return resolvedCandidate;",
        "}",
        'writeFileSync(assertAuditOutputPath(root, candidate), "unsafe");',
      ].join("\n"),
    );

    expect(reportCapabilityViolations(source)).toEqual(
      expect.arrayContaining([
        "invalid_node_path_binding",
        "shadowed_or_reassigned:path",
      ]),
    );
  });

  it("rejects post-definition assertAuditOutputPath reassignment", () => {
    const source = parseFixture(
      "report.ts",
      [
        'import path from "node:path";',
        'import { writeFileSync } from "node:fs";',
        "function assertAuditOutputPath(root: string, candidate: string) {",
        '  const approvedRoot = path.resolve(root, ".codex-tmp", "xp-integrity-audit");',
        "  const resolvedCandidate = path.resolve(candidate);",
        "  const relative = path.relative(approvedRoot, resolvedCandidate);",
        '  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("outside");',
        "  return resolvedCandidate;",
        "}",
        "assertAuditOutputPath = (_root, candidate) => candidate;",
        'writeFileSync(assertAuditOutputPath(root, candidate), "unsafe");',
      ].join("\n"),
    );

    expect(reportCapabilityViolations(source)).toEqual(
      expect.arrayContaining([
        "shadowed_or_reassigned:assertAuditOutputPath",
        "escaped_assertAuditOutputPath:10",
      ]),
    );
  });

  it("rejects deceptive nested or unreachable boundary control flow", () => {
    const source = parseFixture(
      "report.ts",
      [
        "function assertAuditOutputPath(root: string, candidate: string) {",
        '  const approvedRoot = path.resolve(root, ".codex-tmp", "xp-integrity-audit");',
        "  const resolvedCandidate = path.resolve(candidate);",
        "  const relative = path.relative(approvedRoot, resolvedCandidate);",
        "  function neverCalled() {",
        '    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("outside");',
        "  }",
        "  return candidate;",
        "  return resolvedCandidate;",
        "}",
      ].join("\n"),
    );

    expect(assertHelperViolations(source)).toEqual([
      "invalid_assertAuditOutputPath_control_flow",
    ]);
  });

  it("documents the planned runtime output boundary behavior", () => {
    const assertPlannedAuditOutputPath = (
      root: string,
      candidate: string,
    ): string => {
      const approvedRoot = path.resolve(
        root,
        ".codex-tmp",
        "xp-integrity-audit",
      );
      const resolvedCandidate = path.resolve(candidate);
      const relative = path.relative(approvedRoot, resolvedCandidate);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error("xp_audit_output_path_outside_approved_root");
      }
      return resolvedCandidate;
    };
    const approvedCandidate = path.join(
      ROOT,
      ".codex-tmp",
      "xp-integrity-audit",
      "fixture-run",
      "report.json",
    );

    expect(assertPlannedAuditOutputPath(ROOT, approvedCandidate)).toBe(
      path.resolve(approvedCandidate),
    );
    expect(() =>
      assertPlannedAuditOutputPath(
        ROOT,
        path.join(ROOT, "docs", "escaped-report.json"),
      ),
    ).toThrow("xp_audit_output_path_outside_approved_root");
  });

  it("detects every supported Firebase module-loading form", () => {
    const source = parseFixture(
      "firebase-import-fixture.ts",
      [
        'import "firebase-admin/app";',
        'import { getFirestore } from "firebase-admin/firestore";',
        'const dynamicModule = import("firebase/app");',
        'const commonJsModule = require("firebase-admin/auth");',
      ].join("\n"),
    );
    expect(firebaseModuleReferences(source)).toEqual([
      "firebase-admin/app",
      "firebase-admin/firestore",
      "firebase/app",
      "firebase-admin/auth",
    ]);
  });

  it.each(["--apply", "--write", "--repair", "--send"])(
    "rejects forbidden flag %s before reading Firebase",
    (flag) => {
      expectCliImplementation();
      const result = runCli([flag]);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toMatch(
        /forbidden|unknown|read[- ]only/i,
      );
    },
  );

  it("confines all filesystem output capability to report.ts", () => {
    expect(existsSync(REPORT_PATH)).toBe(true);
    const auditSources = [
      ...listTypeScriptFiles(AUDIT_SOURCE_ROOT),
      CLI_PATH,
    ].filter(existsSync);
    for (const sourcePath of auditSources) {
      const source = parseSource(sourcePath);
      expect(
        sourcePath === REPORT_PATH
          ? reportCapabilityViolations(source)
          : nonReportCapabilityViolations(source),
      ).toEqual([]);
    }
  });

  it("isolates Firebase imports in firestore_reader.ts", () => {
    const auditSources = [
      ...listTypeScriptFiles(AUDIT_SOURCE_ROOT),
      ...(existsSync(CLI_PATH) ? [CLI_PATH] : []),
    ];
    for (const sourcePath of auditSources) {
      if (sourcePath === FIRESTORE_READER_PATH) continue;
      expect(firebaseModuleReferences(parseSource(sourcePath))).toEqual([]);
    }
  });

  it("detects Firestore dot/bracket and Auth mutations without flagging Set.add", () => {
    const source = parseFixture(
      "mutations.ts",
      [
        'db.collection("users").doc("u").set({ xp: 1 });',
        'db.collection("users").doc("u")["delete"]();',
        'db.collection("users").add({ xp: 1 });',
        'auth["setCustomUserClaims"]("u", {});',
        'auth.revokeRefreshTokens("u");',
        'new Set<string>().add("safe");',
        'const ref = db.collection("users").doc("ref");',
        "ref.set({ xp: 2 });",
        "const batch = db.batch();",
        "batch.set(ref, { xp: 3 });",
        "batch.commit();",
        'db.runTransaction(async (tx) => { tx.update(ref, { xp: 4 }); tx["delete"](ref); });',
        "let lateRef;",
        'lateRef = db.collection("users").doc("late");',
        "lateRef.set({ xp: 5 });",
        "let lateBatch;",
        "lateBatch = db.batch();",
        "lateBatch.commit();",
      ].join("\n"),
    );
    expect(firebaseMutationCalls(source)).toEqual([
      "set:1",
      "delete:2",
      "add:3",
      "setCustomUserClaims:4",
      "revokeRefreshTokens:5",
      "set:8",
      "set:10",
      "commit:11",
      "update:12",
      "delete:12",
      "set:15",
      "commit:18",
    ]);
  });

  it("keeps every XP audit source free of Firebase mutations", () => {
    const auditSources = [
      ...listTypeScriptFiles(AUDIT_SOURCE_ROOT),
      ...(existsSync(CLI_PATH) ? [CLI_PATH] : []),
    ];
    for (const sourcePath of auditSources) {
      expect(firebaseMutationCalls(parseSource(sourcePath))).toEqual([]);
    }
  });

  it("exposes only the production reader factory without dependency overrides", () => {
    const source = readFileSync(FIRESTORE_READER_PATH, "utf8");
    expect(source).not.toMatch(/export\s+type\s+XpAuditReaderDependencies/);
    expect(source).not.toMatch(/readonly\s+dependencies\??:/);
  });
});

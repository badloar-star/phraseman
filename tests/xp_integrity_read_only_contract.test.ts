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
const APPROVED_REPORT_WRITES = new Set(["mkdirSync", "writeFileSync"]);

function expectCliImplementation(): void {
  expect(existsSync(CLI_PATH)).toBe(true);
}

function runCli(args: readonly string[]) {
  if (process.platform === "win32") {
    return spawnSync(
      "cmd.exe",
      ["/d", "/s", "/c", ["npx", "tsx", CLI_RELATIVE, ...args].join(" ")],
      { cwd: ROOT, encoding: "utf8" },
    );
  }

  return spawnSync("npx", ["tsx", CLI_RELATIVE, ...args], {
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
  const helper = source.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "assertAuditOutputPath",
  );
  if (!helper?.body) return ["missing_assertAuditOutputPath"];
  if (
    helper.parameters.length !== 2 ||
    !ts.isIdentifier(helper.parameters[0].name) ||
    helper.parameters[0].name.text !== "root" ||
    !ts.isIdentifier(helper.parameters[1].name) ||
    helper.parameters[1].name.text !== "candidate"
  ) {
    return ["invalid_assertAuditOutputPath_parameters"];
  }

  const variables = new Map<string, ts.Expression>();
  let hasRuntimeBoundaryRejection = false;
  let returnsResolvedCandidate = false;
  const isTraversalCheck = (expression: ts.Expression): boolean =>
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.expression.text === "relative" &&
    expression.expression.name.text === "startsWith" &&
    stringValue(expression.arguments[0]) === "..";
  const containsThrow = (node: ts.Node): boolean => {
    let found = false;
    const find = (child: ts.Node): void => {
      if (ts.isThrowStatement(child)) found = true;
      ts.forEachChild(child, find);
    };
    find(node);
    return found;
  };
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      variables.set(node.name.text, node.initializer);
    }
    if (
      ts.isIfStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
      ((isTraversalCheck(node.expression.left) &&
        isPathMethodCall(node.expression.right, "isAbsolute", ["relative"])) ||
        (isPathMethodCall(node.expression.left, "isAbsolute", ["relative"]) &&
          isTraversalCheck(node.expression.right))) &&
      containsThrow(node.thenStatement)
    ) {
      hasRuntimeBoundaryRejection = true;
    }
    if (
      ts.isReturnStatement(node) &&
      node.expression !== undefined &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "resolvedCandidate"
    ) {
      returnsResolvedCandidate = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(helper.body);

  const violations: string[] = [];
  if (
    !isPathMethodCall(variables.get("approvedRoot"), "resolve", [
      "root",
      '".codex-tmp"',
      '"xp-integrity-audit"',
    ])
  ) {
    violations.push("approved_root_not_resolved");
  }
  if (
    !isPathMethodCall(variables.get("resolvedCandidate"), "resolve", [
      "candidate",
    ])
  ) {
    violations.push("candidate_not_resolved");
  }
  if (
    !isPathMethodCall(variables.get("relative"), "relative", [
      "approvedRoot",
      "resolvedCandidate",
    ])
  ) {
    violations.push("relative_path_not_computed");
  }
  if (!hasRuntimeBoundaryRejection) {
    violations.push("missing_runtime_boundary_rejection");
  }
  if (!returnsResolvedCandidate)
    violations.push("resolved_candidate_not_returned");
  return violations;
}

function reportCapabilityViolations(source: ts.SourceFile): string[] {
  const violations: string[] = [];
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
  for (const call of filesystemWriteCalls(source)) {
    const name = calledProperty(call.expression);
    if (
      !name ||
      !APPROVED_REPORT_WRITES.has(name) ||
      !ts.isIdentifier(call.expression) ||
      !importedWriteCapabilities.has(name)
    ) {
      violations.push(`unapproved_write_call:${name}:${lineOf(source, call)}`);
    } else if (!isDirectAssertedDestination(call.arguments[0])) {
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
        'writeFileSync("docs/unwrapped.json", "unsafe");',
        'filesystem["writeFileSync"](assertAuditOutputPath(root, candidate), "unsafe");',
      ].join("\n"),
    );

    expect(reportCapabilityViolations(source)).toEqual(
      expect.arrayContaining([
        "invalid_fs_import:1",
        "shadowed_or_reassigned:writeFileSync",
        "unasserted_write_destination:writeFileSync:5",
        "unapproved_write_call:writeFileSync:6",
      ]),
    );
  });

  it("accepts only the exact report capability and runtime confinement shape", () => {
    const source = parseFixture(
      "report.ts",
      [
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
});

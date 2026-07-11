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

const WRITE_PATH_ARGUMENTS: Readonly<Record<string, readonly number[]>> = {
  appendFile: [0],
  appendFileSync: [0],
  copyFile: [1],
  copyFileSync: [1],
  cp: [1],
  cpSync: [1],
  createWriteStream: [0],
  link: [1],
  linkSync: [1],
  mkdir: [0],
  mkdirSync: [0],
  mkdtemp: [0],
  mkdtempSync: [0],
  open: [0],
  openSync: [0],
  rename: [0, 1],
  renameSync: [0, 1],
  rm: [0],
  rmSync: [0],
  symlink: [1],
  symlinkSync: [1],
  truncate: [0],
  truncateSync: [0],
  unlink: [0],
  unlinkSync: [0],
  writeFile: [0],
  writeFileSync: [0],
};

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

function stringLiteralValue(node: ts.Node | undefined): string | null {
  return node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : null;
}

function isPathCall(
  expression: ts.Expression,
  methods: readonly string[],
): expression is ts.CallExpression {
  return (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.expression.text === "path" &&
    methods.includes(expression.expression.name.text)
  );
}

function isFsModuleName(node: ts.Node | undefined): boolean {
  const moduleName = stringLiteralValue(node);
  return (
    moduleName !== null && /^(?:node:)?fs(?:\/promises)?$/.test(moduleName)
  );
}

function isRequireOfFs(
  expression: ts.Expression | undefined,
): expression is ts.CallExpression {
  return (
    expression !== undefined &&
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "require" &&
    isFsModuleName(expression.arguments[0])
  );
}

type FsBindings = {
  functions: ReadonlyMap<string, string>;
  namespaces: ReadonlySet<string>;
};

function accessedPropertyName(expression: ts.Expression): string | null {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (ts.isElementAccessExpression(expression)) {
    return stringLiteralValue(expression.argumentExpression);
  }
  return null;
}

function collectFsBindings(sourceFile: ts.SourceFile): FsBindings {
  const functions = new Map<string, string>();
  const namespaces = new Set<string>();
  const declarations: ts.VariableDeclaration[] = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      isFsModuleName(statement.moduleSpecifier)
    ) {
      const clause = statement.importClause;
      if (clause?.name) namespaces.add(clause.name.text);
      if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        namespaces.add(clause.namedBindings.name.text);
      } else if (
        clause?.namedBindings &&
        ts.isNamedImports(clause.namedBindings)
      ) {
        for (const element of clause.namedBindings.elements) {
          const importedName = element.propertyName?.text ?? element.name.text;
          if (WRITE_PATH_ARGUMENTS[importedName]) {
            functions.set(element.name.text, importedName);
          }
        }
      }
    } else if (
      ts.isImportEqualsDeclaration(statement) &&
      ts.isExternalModuleReference(statement.moduleReference) &&
      isFsModuleName(statement.moduleReference.expression)
    ) {
      namespaces.add(statement.name.text);
    }
  }

  const collectDeclarations = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) declarations.push(node);
    ts.forEachChild(node, collectDeclarations);
  };
  collectDeclarations(sourceFile);

  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of declarations) {
      const initializer = declaration.initializer;
      if (ts.isIdentifier(declaration.name)) {
        const localName = declaration.name.text;
        if (isRequireOfFs(initializer) && !namespaces.has(localName)) {
          namespaces.add(localName);
          changed = true;
          continue;
        }
        if (
          initializer &&
          ts.isIdentifier(initializer) &&
          functions.has(initializer.text)
        ) {
          const canonicalName = functions.get(initializer.text)!;
          if (functions.get(localName) !== canonicalName) {
            functions.set(localName, canonicalName);
            changed = true;
          }
          continue;
        }
        if (
          initializer &&
          (ts.isPropertyAccessExpression(initializer) ||
            ts.isElementAccessExpression(initializer)) &&
          isFsNamespaceExpression(initializer.expression, namespaces)
        ) {
          const canonicalName = accessedPropertyName(initializer);
          if (
            canonicalName &&
            WRITE_PATH_ARGUMENTS[canonicalName] &&
            functions.get(localName) !== canonicalName
          ) {
            functions.set(localName, canonicalName);
            changed = true;
          }
        }
      } else if (
        ts.isObjectBindingPattern(declaration.name) &&
        (isRequireOfFs(initializer) ||
          (initializer &&
            ts.isIdentifier(initializer) &&
            namespaces.has(initializer.text)))
      ) {
        for (const element of declaration.name.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const importedName = element.propertyName
            ? (stringLiteralValue(element.propertyName) ??
              (ts.isIdentifier(element.propertyName)
                ? element.propertyName.text
                : null))
            : element.name.text;
          if (
            importedName &&
            WRITE_PATH_ARGUMENTS[importedName] &&
            functions.get(element.name.text) !== importedName
          ) {
            functions.set(element.name.text, importedName);
            changed = true;
          }
        }
      }
    }
  }

  return { functions, namespaces };
}

function isFsNamespaceExpression(
  expression: ts.Expression,
  namespaces: ReadonlySet<string>,
): boolean {
  if (ts.isIdentifier(expression)) return namespaces.has(expression.text);
  if (isRequireOfFs(expression)) return true;
  if (
    ts.isPropertyAccessExpression(expression) ||
    ts.isElementAccessExpression(expression)
  ) {
    return (
      accessedPropertyName(expression) === "promises" &&
      isFsNamespaceExpression(expression.expression, namespaces)
    );
  }
  return false;
}

function calledFsName(
  expression: ts.LeftHandSideExpression,
  bindings: FsBindings,
): string | null {
  if (ts.isIdentifier(expression))
    return bindings.functions.get(expression.text) ?? null;
  if (
    ts.isPropertyAccessExpression(expression) ||
    ts.isElementAccessExpression(expression)
  ) {
    if (!isFsNamespaceExpression(expression.expression, bindings.namespaces))
      return null;
    const name = accessedPropertyName(expression);
    return name && WRITE_PATH_ARGUMENTS[name] ? name : null;
  }
  return null;
}

function isApprovedOutputRoot(expression: ts.Expression): boolean {
  if (!isPathCall(expression, ["join"])) return false;
  const [root, temp, audit, runId] = expression.arguments;
  return (
    expression.arguments.length === 4 &&
    ts.isIdentifier(root) &&
    root.text === "root" &&
    stringLiteralValue(temp) === ".codex-tmp" &&
    stringLiteralValue(audit) === "xp-integrity-audit" &&
    ts.isIdentifier(runId) &&
    runId.text === "runId"
  );
}

function isSafeOutputPath(
  expression: ts.Expression,
  safeNames: ReadonlySet<string>,
): boolean {
  if (isApprovedOutputRoot(expression)) return true;
  if (ts.isIdentifier(expression)) return safeNames.has(expression.text);
  if (!isPathCall(expression, ["join"])) return false;
  const [base, ...segments] = expression.arguments;
  return (
    base !== undefined &&
    isSafeOutputPath(base, safeNames) &&
    segments.length > 0 &&
    segments.every((segment) => {
      const value = stringLiteralValue(segment);
      return (
        value !== null &&
        !path.isAbsolute(value) &&
        !value.split(/[\\/]+/).includes("..")
      );
    })
  );
}

function collectSafeOutputNames(sourceFile: ts.SourceFile): Set<string> {
  const declarations: Array<{ name: string; initializer: ts.Expression }> = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      declarations.push({
        name: node.name.text,
        initializer: node.initializer,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const safeNames = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of declarations) {
      if (
        !safeNames.has(declaration.name) &&
        isSafeOutputPath(declaration.initializer, safeNames)
      ) {
        safeNames.add(declaration.name);
        changed = true;
      }
    }
  }
  return safeNames;
}

function unsafeWritePaths(sourceFile: ts.SourceFile): string[] {
  const safeNames = collectSafeOutputNames(sourceFile);
  const fsBindings = collectFsBindings(sourceFile);
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = calledFsName(node.expression, fsBindings);
      const pathArguments = name ? WRITE_PATH_ARGUMENTS[name] : undefined;
      for (const index of pathArguments ?? []) {
        const argument = node.arguments[index];
        if (!argument || !isSafeOutputPath(argument, safeNames)) {
          const position = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(),
          );
          violations.push(
            `${sourceFile.fileName}:${position.line + 1}:${name}[${index}]`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}

function firebaseModuleReferences(sourceFile: ts.SourceFile): string[] {
  const references: string[] = [];
  const record = (node: ts.Node | undefined): void => {
    const moduleName = stringLiteralValue(node);
    if (moduleName && /^(?:firebase|firebase-admin)(?:\/|$)/.test(moduleName)) {
      references.push(moduleName);
    }
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
  visit(sourceFile);
  return references;
}

describe("production XP integrity audit read-only contract", () => {
  it("detects an additional write outside the approved output root", () => {
    const fixture = ts.createSourceFile(
      "unsafe-output-fixture.ts",
      [
        'import { writeFileSync, writeFileSync as save } from "node:fs";',
        'import * as filesystem from "node:fs";',
        'const { appendFileSync: append } = require("node:fs");',
        'const directSave = require("node:fs")["writeFileSync"];',
        'const outputDir = path.join(root, ".codex-tmp", "xp-integrity-audit", runId);',
        'writeFileSync(path.join(outputDir, "report.json"), "safe");',
        'save(path.join(root, "docs", "alias-leak.json"), "unsafe");',
        'filesystem["writeFileSync"](path.join(outputDir, "..", "computed-leak.json"), "unsafe");',
        'append(path.join(root, "docs", "require-leak.json"), "unsafe");',
        'directSave(path.join(root, "docs", "direct-require-leak.json"), "unsafe");',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    expect(unsafeWritePaths(fixture)).toEqual([
      "unsafe-output-fixture.ts:7:writeFileSync[0]",
      "unsafe-output-fixture.ts:8:writeFileSync[0]",
      "unsafe-output-fixture.ts:9:appendFileSync[0]",
      "unsafe-output-fixture.ts:10:writeFileSync[0]",
    ]);
  });

  it("detects every supported Firebase module-loading form", () => {
    const fixture = ts.createSourceFile(
      "firebase-import-fixture.ts",
      [
        'import "firebase-admin/app";',
        'import { getFirestore } from "firebase-admin/firestore";',
        'const dynamicModule = import("firebase/app");',
        'const commonJsModule = require("firebase-admin/auth");',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    expect(firebaseModuleReferences(fixture)).toEqual([
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

  it("pins every report path below .codex-tmp/xp-integrity-audit", () => {
    expectCliImplementation();

    const auditSources = [...listTypeScriptFiles(AUDIT_SOURCE_ROOT), CLI_PATH];
    const parsedSources = auditSources.map(parseSource);
    expect(
      parsedSources.some((source) => {
        let approvedRootFound = false;
        const visit = (node: ts.Node): void => {
          if (ts.isExpression(node) && isApprovedOutputRoot(node))
            approvedRootFound = true;
          ts.forEachChild(node, visit);
        };
        visit(source);
        return approvedRootFound;
      }),
    ).toBe(true);
    expect(parsedSources.flatMap(unsafeWritePaths)).toEqual([]);
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

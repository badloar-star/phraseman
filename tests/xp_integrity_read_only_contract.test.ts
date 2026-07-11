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

function calledName(expression: ts.LeftHandSideExpression): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
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
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = calledName(node.expression);
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
        'const outputDir = path.join(root, ".codex-tmp", "xp-integrity-audit", runId);',
        'writeFileSync(path.join(outputDir, "report.json"), "safe");',
        'writeFileSync(path.join(root, "docs", "leak.json"), "unsafe");',
        'writeFileSync(path.join(outputDir, "..", "leak.json"), "traversal");',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    expect(unsafeWritePaths(fixture)).toEqual([
      "unsafe-output-fixture.ts:3:writeFileSync[0]",
      "unsafe-output-fixture.ts:4:writeFileSync[0]",
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

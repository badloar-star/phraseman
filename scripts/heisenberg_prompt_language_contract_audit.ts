/**
 * heisenberg_prompt_language_contract_audit.ts — read-only audit that every ACTIVE app locale is
 * actually wired into the AI prompt / server-copy language contract.
 *
 * Problem this closes: Heisenberg's existing batch/UI/semantic audits check translated CONTENT,
 * but nothing checks that a newly activated locale (scripts/lib/heisenberg_locales.cjs →
 * ACTIVE_APP_LOCALES) is also wired into:
 *  1. functions/src/explain/explain_prompts.ts → PROMPT_LANGUAGES (which language the "Explain"
 *     generation prompt is WRITTEN in).
 *  2. functions/src/ai_language_contract.ts → AiOutputLang (the union type gating every AI output
 *     language check across the app).
 *  3. Server user-facing copy maps in re_engage_push.ts / premium_expiry_reminder.ts /
 *     compass_chat_content.ts (Record<locale, text> style maps for push/chat copy).
 *
 * A forgotten locale in any of these silently falls back to Russian for that user — this script
 * turns that into a loud, listed finding instead of a silent runtime fallback.
 *
 * Parsing is done with the `typescript` compiler API (AST), NOT regex, so string literals inside
 * comments/other contexts cannot produce false positives/negatives.
 *
 * Read-only: this script NEVER writes to any source file. It only reads functions/src/**.ts and
 * writes its own report under docs/heisenberg/prompt-language/<run-id>/ (or a caller-supplied
 * --out-dir, always constrained to docs/heisenberg or .codex-tmp).
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const heisenbergLocales = require('./lib/heisenberg_locales.cjs') as {
  ACTIVE_APP_LOCALES: string[];
};

type CliOptions = {
  outputDir?: string;
  generatedAt?: string;
  strict?: boolean;
};

type Status = 'PASS' | 'HOLD';

/** One place in the codebase that is supposed to carry every active locale. */
export type PromptLanguageFinding = {
  file: string;
  kind: 'object-map' | 'union-type';
  context: string;
  presentLocales: string[];
  missingLocales: string[];
};

export type PromptLanguageContractAuditReport = {
  schemaVersion: 'heisenberg-prompt-language-contract-audit-v1';
  mode: 'prompt-language-contract-audit';
  generatedAt: string;
  status: Status;
  strict: boolean;
  activeLocales: string[];
  summary: {
    filesScanned: number;
    contractsChecked: number;
    findings: number;
    missingLocaleInstances: number;
    byFile: Record<string, number>;
  };
  sections: {
    explainPrompts: SectionResult;
    aiLanguageContract: SectionResult;
    serverCopyMaps: SectionResult;
  };
  findings: PromptLanguageFinding[];
};

type SectionResult = {
  file: string;
  status: Status;
  checked: number;
  findings: PromptLanguageFinding[];
};

type WriteResult = {
  report: PromptLanguageContractAuditReport;
  outputDir: string;
  jsonPath: string;
  markdownPath: string;
};

const EXPLAIN_PROMPTS_FILE = path.join('functions', 'src', 'explain', 'explain_prompts.ts');
const AI_LANGUAGE_CONTRACT_FILE = path.join('functions', 'src', 'ai_language_contract.ts');
const SERVER_COPY_FILES = [
  path.join('functions', 'src', 're_engage_push.ts'),
  path.join('functions', 'src', 'premium_expiry_reminder.ts'),
  path.join('functions', 'src', 'compass_chat_content.ts'),
];

/** Minimum number of active-locale keys an object literal must have before we treat it as a
 *  locale-copy map worth checking for completeness (per the task's heuristic). */
const MIN_ACTIVE_LOCALE_KEYS_FOR_MAP = 3;

export function writeHeisenbergPromptLanguageContractAudit(
  repoRoot: string,
  options: CliOptions = {},
): WriteResult {
  const report = buildHeisenbergPromptLanguageContractAudit(repoRoot, options);
  const outputDir = resolveAllowedPath(
    repoRoot,
    options.outputDir,
    path.join('docs', 'heisenberg', 'prompt-language', timestampSlug(report.generatedAt)),
    'Heisenberg prompt language contract audit output',
  );
  const jsonPath = path.join(outputDir, 'prompt_language_contract_audit.json');
  const markdownPath = path.join(outputDir, 'prompt_language_contract_audit.md');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${renderMarkdown(report)}\n`, 'utf8');

  return { report, outputDir, jsonPath, markdownPath };
}

export function buildHeisenbergPromptLanguageContractAudit(
  repoRoot: string,
  options: CliOptions = {},
): PromptLanguageContractAuditReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const activeLocales = [...heisenbergLocales.ACTIVE_APP_LOCALES].sort();

  const explainPrompts = auditExplainPrompts(repoRoot, activeLocales);
  const aiLanguageContract = auditAiLanguageContract(repoRoot, activeLocales);
  const serverCopyMaps = auditServerCopyMaps(repoRoot, activeLocales);

  const allFindings = [
    ...explainPrompts.findings,
    ...aiLanguageContract.findings,
    ...serverCopyMaps.findings,
  ];
  const byFile = countBy(allFindings.map((finding) => finding.file));
  const missingLocaleInstances = allFindings.reduce((sum, finding) => sum + finding.missingLocales.length, 0);
  const filesScanned = new Set([
    explainPrompts.file,
    aiLanguageContract.file,
    ...SERVER_COPY_FILES.map((file) => normalizePath(file)),
  ]).size;
  const contractsChecked = explainPrompts.checked + aiLanguageContract.checked + serverCopyMaps.checked;

  const status: Status = allFindings.length === 0 ? 'PASS' : 'HOLD';

  return {
    schemaVersion: 'heisenberg-prompt-language-contract-audit-v1',
    mode: 'prompt-language-contract-audit',
    generatedAt,
    status,
    strict: Boolean(options.strict),
    activeLocales,
    summary: {
      filesScanned,
      contractsChecked,
      findings: allFindings.length,
      missingLocaleInstances,
      byFile,
    },
    sections: {
      explainPrompts,
      aiLanguageContract,
      serverCopyMaps,
    },
    findings: allFindings,
  };
}

// ── Section 1: functions/src/explain/explain_prompts.ts → PROMPT_LANGUAGES ─────────────────────
function auditExplainPrompts(repoRoot: string, activeLocales: readonly string[]): SectionResult {
  const file = normalizePath(EXPLAIN_PROMPTS_FILE);
  const source = readSourceFile(repoRoot, EXPLAIN_PROMPTS_FILE);
  if (!source) {
    return {
      file,
      status: 'HOLD',
      checked: 0,
      findings: [missingFileFinding(file, 'object-map', 'PROMPT_LANGUAGES')],
    };
  }

  const promptLanguagesObject = findExportedConstObjectLiteral(source, 'PROMPT_LANGUAGES');
  if (!promptLanguagesObject) {
    return {
      file,
      status: 'HOLD',
      checked: 0,
      findings: [{
        file,
        kind: 'object-map',
        context: 'PROMPT_LANGUAGES',
        presentLocales: [],
        missingLocales: [...activeLocales],
      }],
    };
  }

  const keys = [...objectLiteralStringKeys(promptLanguagesObject)];
  const missing = activeLocales.filter((locale) => !keys.includes(locale));
  const findings: PromptLanguageFinding[] = missing.length
    ? [{
        file,
        kind: 'object-map',
        context: 'PROMPT_LANGUAGES',
        presentLocales: keys.filter((key) => activeLocales.includes(key)).sort(),
        missingLocales: missing,
      }]
    : [];

  return { file, status: findings.length ? 'HOLD' : 'PASS', checked: 1, findings };
}

// ── Section 2: functions/src/ai_language_contract.ts → AiOutputLang ────────────────────────────
function auditAiLanguageContract(repoRoot: string, activeLocales: readonly string[]): SectionResult {
  const file = normalizePath(AI_LANGUAGE_CONTRACT_FILE);
  const source = readSourceFile(repoRoot, AI_LANGUAGE_CONTRACT_FILE);
  if (!source) {
    return {
      file,
      status: 'HOLD',
      checked: 0,
      findings: [missingFileFinding(file, 'union-type', 'AiOutputLang')],
    };
  }

  const literals = findExportedUnionTypeStringLiterals(source, 'AiOutputLang');
  if (!literals) {
    return {
      file,
      status: 'HOLD',
      checked: 0,
      findings: [{
        file,
        kind: 'union-type',
        context: 'AiOutputLang',
        presentLocales: [],
        missingLocales: [...activeLocales, 'en'],
      }],
    };
  }

  // AiOutputLang is the AI OUTPUT axis: every active app locale plus the 'en' fallback must be
  // representable, or a user in that locale (or an English-forced feature) has no valid output lang.
  const required = uniqueStrings([...activeLocales, 'en']);
  const missing = required.filter((locale) => !literals.includes(locale));
  const findings: PromptLanguageFinding[] = missing.length
    ? [{
        file,
        kind: 'union-type',
        context: 'AiOutputLang',
        presentLocales: literals.filter((literal) => required.includes(literal)).sort(),
        missingLocales: missing,
      }]
    : [];

  return { file, status: findings.length ? 'HOLD' : 'PASS', checked: 1, findings };
}

// ── Section 3: server copy maps in re_engage_push / premium_expiry_reminder / compass_chat ─────
function auditServerCopyMaps(repoRoot: string, activeLocales: readonly string[]): SectionResult {
  const findings: PromptLanguageFinding[] = [];
  let checked = 0;
  let anyFileMissing = false;

  for (const relFile of SERVER_COPY_FILES) {
    const file = normalizePath(relFile);
    const source = readSourceFile(repoRoot, relFile);
    if (!source) {
      anyFileMissing = true;
      findings.push(missingFileFinding(file, 'object-map', 'file-not-found'));
      continue;
    }

    const maps = findLocaleCopyObjectLiterals(source, activeLocales);
    for (const map of maps) {
      checked += 1;
      const missing = activeLocales.filter((locale) => !map.keys.includes(locale));
      if (missing.length) {
        findings.push({
          file,
          kind: 'object-map',
          context: map.context,
          presentLocales: map.keys.filter((key) => activeLocales.includes(key)).sort(),
          missingLocales: missing,
        });
      }
    }
  }

  return {
    file: SERVER_COPY_FILES.map((relFile) => normalizePath(relFile)).join(', '),
    status: findings.length || anyFileMissing ? 'HOLD' : 'PASS',
    checked,
    findings,
  };
}

function missingFileFinding(file: string, kind: PromptLanguageFinding['kind'], context: string): PromptLanguageFinding {
  return { file, kind, context, presentLocales: [], missingLocales: [] };
}

// ── TypeScript AST helpers ──────────────────────────────────────────────────────────────────────
function readSourceFile(repoRoot: string, relFile: string): ts.SourceFile | null {
  const absFile = path.join(repoRoot, relFile);
  if (!fs.existsSync(absFile)) return null;
  const text = fs.readFileSync(absFile, 'utf8');
  return ts.createSourceFile(absFile, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function propName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/** Finds `export const <name> = { ... }` (optionally with a type annotation/cast) and returns the
 *  object literal expression, or null when the declaration or its initializer is not found. */
function findExportedConstObjectLiteral(source: ts.SourceFile, name: string): ts.ObjectLiteralExpression | null {
  let found: ts.ObjectLiteralExpression | null = null;

  const visit = (node: ts.Node): void => {
    if (found) return;
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === name &&
          declaration.initializer
        ) {
          const initializer = unwrapExpression(declaration.initializer);
          if (ts.isObjectLiteralExpression(initializer)) {
            found = initializer;
            return;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return found;
}

/** Collects the string-literal keys of an object literal (property assignments only). */
function objectLiteralStringKeys(node: ts.ObjectLiteralExpression): Set<string> {
  const keys = new Set<string>();
  for (const property of node.properties) {
    if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
      const name = propName(property.name);
      if (name) keys.add(name);
    }
  }
  return keys;
}

/** Finds `export type <name> = 'a' | 'b' | ...;` and returns the string literal members, or null
 *  when the type alias is not found or is not a plain union of string literals. */
function findExportedUnionTypeStringLiterals(source: ts.SourceFile, name: string): string[] | null {
  let found: string[] | null = null;

  const visit = (node: ts.Node): void => {
    if (found) return;
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === name &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const literals = collectUnionStringLiterals(node.type);
      if (literals) found = literals;
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return found;
}

function collectUnionStringLiterals(typeNode: ts.TypeNode): string[] | null {
  if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
    return [typeNode.literal.text];
  }
  if (ts.isUnionTypeNode(typeNode)) {
    const out: string[] = [];
    for (const member of typeNode.types) {
      const literals = collectUnionStringLiterals(member);
      if (!literals) return null;
      out.push(...literals);
    }
    return out;
  }
  return null;
}

type LocaleCopyObjectLiteral = { context: string; keys: string[] };

/**
 * Walks the whole source file for object literals that look like a locale-copy map: an object
 * literal whose direct property keys include at least MIN_ACTIVE_LOCALE_KEYS_FOR_MAP active
 * locales. Deliberately does NOT descend further into a matched map's own property values (a
 * locale-copy map's per-locale value is a leaf string/expression, not another locale map), but DOES
 * keep walking sibling/parent structures so multiple maps in one file (e.g. STREAK_AT_RISK_COPY,
 * INACTIVE_RETURN_COPY, INACTIVE_LONG_COPY) are all found, and nested locale maps (e.g. poll option
 * `label: { ru: ..., ... }` inside a bigger i18n object) are also found independently.
 */
function findLocaleCopyObjectLiterals(
  source: ts.SourceFile,
  activeLocales: readonly string[],
): LocaleCopyObjectLiteral[] {
  const results: LocaleCopyObjectLiteral[] = [];
  const activeSet = new Set(activeLocales);

  const contextFor = (node: ts.ObjectLiteralExpression): string => {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }
    if (ts.isPropertyAssignment(parent)) {
      const name = propName(parent.name);
      if (name) return name;
    }
    if (ts.isCallExpression(parent)) {
      const argIndex = parent.arguments.indexOf(node as unknown as ts.Expression);
      const calleeText = ts.isIdentifier(parent.expression) ? parent.expression.text : parent.expression.getText();
      return `${calleeText}(arg ${argIndex >= 0 ? argIndex : '?'})`;
    }
    if (ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) {
      return 'returned-object-literal';
    }
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    return `object-literal:line-${line + 1}`;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const keys = [...objectLiteralStringKeys(node)];
      const activeKeyCount = keys.filter((key) => activeSet.has(key)).length;
      if (activeKeyCount >= MIN_ACTIVE_LOCALE_KEYS_FOR_MAP) {
        results.push({ context: contextFor(node), keys });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return results;
}

// ── Markdown rendering ──────────────────────────────────────────────────────────────────────────
function renderMarkdown(report: PromptLanguageContractAuditReport): string {
  const rows = report.findings.map((finding) =>
    `| ${finding.file} | ${finding.kind} | ${finding.context} | ${finding.missingLocales.join(', ') || 'none'} |`,
  );
  return [
    '# Heisenberg Prompt Language Contract Audit',
    '',
    `- Status: ${report.status}`,
    `- Generated at: ${report.generatedAt}`,
    `- Strict: ${report.strict}`,
    `- Active locales: ${report.activeLocales.join(', ')}`,
    `- Files scanned: ${report.summary.filesScanned}`,
    `- Contracts checked: ${report.summary.contractsChecked}`,
    `- Findings: ${report.summary.findings}`,
    `- Missing-locale instances: ${report.summary.missingLocaleInstances}`,
    '',
    '## Sections',
    '',
    `- explain_prompts.ts (PROMPT_LANGUAGES): ${report.sections.explainPrompts.status}`,
    `- ai_language_contract.ts (AiOutputLang): ${report.sections.aiLanguageContract.status}`,
    `- Server copy maps (re_engage_push / premium_expiry_reminder / compass_chat_content): ${report.sections.serverCopyMaps.status}`,
    '',
    '## By file',
    '',
    ...Object.entries(report.summary.byFile).map(([file, count]) => `- ${file}: ${count}`),
    '',
    '## Findings',
    '',
    '| File | Kind | Context | Missing locales |',
    '| --- | --- | --- | --- |',
    ...(rows.length ? rows : ['| none | none | none | none |']),
  ].join('\n');
}

// ── Small shared utilities (mirrors conventions from other heisenberg_*.ts scripts) ─────────────
function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function timestampSlug(value: string): string {
  return value.replace(/[:.]/g, '-');
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function resolveAllowedPath(repoRoot: string, requestedPath: string | undefined, fallbackPath: string, label: string): string {
  const requested = path.resolve(repoRoot, requestedPath ?? fallbackPath);
  const allowedRoots = [
    path.resolve(repoRoot, '.codex-tmp'),
    path.resolve(repoRoot, 'docs', 'heisenberg'),
  ];
  if (!allowedRoots.some((root) => requested === root || requested.startsWith(`${root}${path.sep}`))) {
    throw new Error(`${label} must stay under .codex-tmp or docs/heisenberg`);
  }
  return requested;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out-dir') {
      options.outputDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--strict') {
      options.strict = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

if (require.main === module) {
  try {
    const options = parseCli(process.argv.slice(2));
    const result = writeHeisenbergPromptLanguageContractAudit(process.cwd(), options);
    console.log(`Heisenberg prompt language contract audit: ${result.report.status}`);
    console.log(`Findings: ${result.report.summary.findings}`);
    console.log(`Missing-locale instances: ${result.report.summary.missingLocaleInstances}`);
    console.log(`Report: ${normalizePath(path.relative(process.cwd(), result.jsonPath))}`);
    if (options.strict && result.report.status !== 'PASS') process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

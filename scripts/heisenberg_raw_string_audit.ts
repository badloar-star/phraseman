// Heisenberg RAW STRING AUDIT (read-only).
//
// Why this script exists: the Heisenberg localization extractor only sees strings that sit
// behind an explicit locale key (ru/uk/es/... or a legacy Ru/Uk/Es suffix). A literal baked
// directly into JSX or into an Alert.alert(...) call, with no triLang/bundleLang wrapper and
// no locale key anywhere nearby, is invisible to it. That is exactly how bugs like the
// hardcoded 'Не разрешать' / 'Разрешить' / 'Не сейчас' strings in
// components/CleanOnboarding.tsx slipped past every Heisenberg locale audit: there was no
// locale-keyed field to find.
//
// This script inverts the extractor's logic: instead of asking "did we translate this key
// into every locale", it asks "is this a user-facing literal that has NO localization
// machinery around it at all". Any such literal is a finding.
//
// Read-only: this script never writes to app/**, components/**, or any source file. It only
// writes its own report under docs/heisenberg/raw-strings/<run-id>/.

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const heisenbergCore = require('./lib/heisenberg_core.cjs') as {
  isExplicitLocaleKey: (name: string) => boolean;
};
const { isExplicitLocaleKey } = heisenbergCore;
const DIRECT_LOCALE_OBJECT_KEYS = new Set(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'en']);

// ---------------------------------------------------------------------------------------
// Allowlist: files that are already triaged/known and should not be re-flagged.
// Triage owners: add `relative/path/from/repo/root.tsx` entries here once a file has been
// reviewed and either fixed or explicitly accepted. Keep this list intentionally short —
// it is a triage tool, not a permanent suppression list.
// ---------------------------------------------------------------------------------------
const RAW_STRING_ALLOWLIST: readonly string[] = [
  // e.g. 'components/SomeReviewedFile.tsx',
];

const SCAN_ROOT_DIRS = ['app', 'components'] as const;

const SKIP_DIR_NAMES = new Set(['__tests__', 'node_modules']);

type Finding = {
  file: string;
  line: number;
  column: number;
  kind: 'raw-cyrillic-literal' | 'latin-sentence-literal';
  severity: 'blocker-candidate' | 'warning';
  sample: string;
  context: 'jsx-text' | 'jsx-expression-child' | 'jsx-attribute' | 'object-copy' | 'alert-arg' | 'toast-arg';
};

type CliOptions = {
  outputDir?: string;
  generatedAt?: string;
  strict?: boolean;
};

type RawStringAuditReport = {
  schemaVersion: 'heisenberg-raw-string-audit-v1';
  mode: 'raw-string-audit';
  generatedAt: string;
  readOnly: true;
  sourceMutationApplied: false;
  scannedDirs: string[];
  allowlist: string[];
  totalFindings: number;
  byKind: Record<string, number>;
  bySeverity: Record<string, number>;
  totalFiles: number;
  topFiles: Array<{ file: string; count: number }>;
  findings: Finding[];
};

// ---------------------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------------------

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function isSourceFile(rel: string): boolean {
  const ext = path.extname(rel).toLowerCase();
  if (ext !== '.ts' && ext !== '.tsx') return false;
  if (rel.endsWith('.d.ts')) return false;
  const base = path.basename(rel);
  if (base.includes('.test.')) return false;
  return true;
}

function shouldSkipDirEntry(name: string): boolean {
  if (SKIP_DIR_NAMES.has(name)) return true;
  if (name === '__tests__') return true;
  return false;
}

function listScanFiles(repoRoot: string): string[] {
  const out: string[] = [];
  for (const dir of SCAN_ROOT_DIRS) {
    const absDir = path.join(repoRoot, dir);
    if (!fs.existsSync(absDir)) continue;
    walk(absDir, dir, out);
  }
  return out.sort((a, b) => a.localeCompare(b));

  function walk(absDir: string, relDir: string, acc: string[]): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch (_err) {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldSkipDirEntry(entry.name)) continue;
        walk(path.join(absDir, entry.name), `${relDir}/${entry.name}`, acc);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = normalizePath(`${relDir}/${entry.name}`);
      if (!isSourceFile(rel)) continue;
      acc.push(rel);
    }
  }
}

// ---------------------------------------------------------------------------------------
// Text classification helpers
// ---------------------------------------------------------------------------------------

const CYRILLIC_RE = /[Ѐ-ӿ]/;
const HAS_LETTER_RE = /\p{L}/u;
const URL_LIKE_RE = /^(?:https?:\/\/|\/\/|www\.)/i;
const PATH_LIKE_RE = /^[.\/]|^[a-z0-9_-]+\/[a-z0-9_/.-]+$/i;
const HEX_COLOR_RE = /^#[0-9a-f]{3,8}$/i;
const IDENTIFIER_LIKE_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const EM_DASH_CODE_RE = /^[–—\-_.]+$/;
const ONLY_PUNCT_OR_DIGITS_RE = /^[\d\s.,:;!?()%-]+$/;

function trimmedVisibleText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function isUrlOrPathOrIdentifierOrColor(value: string): boolean {
  if (URL_LIKE_RE.test(value)) return true;
  if (HEX_COLOR_RE.test(value)) return true;
  if (EM_DASH_CODE_RE.test(value)) return true;
  if (ONLY_PUNCT_OR_DIGITS_RE.test(value)) return true;
  if (!value.includes(' ') && (IDENTIFIER_LIKE_RE.test(value) || PATH_LIKE_RE.test(value))) return true;
  return false;
}

function isLatinSentence(value: string): boolean {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  if (!/[a-z]/.test(value)) return false;
  if (isUrlOrPathOrIdentifierOrColor(value)) return false;
  if (CYRILLIC_RE.test(value)) return false;
  return true;
}

function classifyLiteral(rawValue: string): { kind: Finding['kind']; severity: Finding['severity'] } | null {
  const value = trimmedVisibleText(rawValue);
  if (value.length < 2) return null;
  if (!HAS_LETTER_RE.test(value)) return null;
  if (CYRILLIC_RE.test(value)) {
    return { kind: 'raw-cyrillic-literal', severity: 'blocker-candidate' };
  }
  if (isLatinSentence(value)) {
    return { kind: 'latin-sentence-literal', severity: 'warning' };
  }
  return null;
}

function truncateSample(value: string, max = 120): string {
  const collapsed = trimmedVisibleText(value);
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 3)}...`;
}

// ---------------------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------------------

const LOCALIZATION_CALLEE_RE = /\b(triLang|bundleLang|tri)\b/;
const ALERT_CALLEE_RE = /Alert\s*\.\s*alert/;
const TOAST_CALLEE_RE = /toast/i;

function calleeText(node: ts.CallExpression, sourceFile: ts.SourceFile): string {
  try {
    return node.expression.getText(sourceFile);
  } catch (_err) {
    return '';
  }
}

/** Walk up from a node to see if it is (transitively) an argument of a localization call. */
function isInsideLocalizationCall(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isCallExpression(current)) {
      const callee = calleeText(current, sourceFile);
      if (LOCALIZATION_CALLEE_RE.test(callee)) return true;
    }
    current = current.parent;
  }
  return false;
}

/** True if this object literal has sibling properties whose keys are locale keys (ru/uk/es/...). */
function isInsideLocaleContainerObject(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isObjectLiteralExpression(current)) {
      let localeKeySiblings = 0;
      for (const prop of current.properties) {
        if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue;
        const name = propertyKeyName(prop.name);
        if (name && (isExplicitLocaleKey(name) || DIRECT_LOCALE_OBJECT_KEYS.has(name))) localeKeySiblings += 1;
      }
      if (localeKeySiblings >= 1) return true;
    }
    current = current.parent;
  }
  return false;
}

function propertyKeyName(name: ts.PropertyName): string {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name)) return name.text;
  if (ts.isNumericLiteral(name)) return name.text;
  return '';
}

const TEXT_LIKE_JSX_TAGS = new Set([
  'Text',
  'Button',
  'ThemedText',
  'AppText',
  'Title',
  'Subtitle',
  'Label',
  'Heading',
]);

/** JSX properties whose literal value is presented to the user or a screen reader. */
const USER_VISIBLE_JSX_ATTRIBUTES = new Set([
  'accessibilityHint',
  'accessibilityLabel',
  'buttonText',
  'cancelText',
  'confirmText',
  'headerTitle',
  'label',
  'placeholder',
  'title',
]);

/** Object keys conventionally rendered as UI copy in static screen configuration. */
const USER_VISIBLE_OBJECT_KEYS = new Set([
  'body',
  'description',
  'label',
  'placeholder',
  'subtitle',
  'title',
  'tone',
]);

function jsxTagName(node: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxOpeningElement): string {
  const tag = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  return tag.getText();
}

/** True if this JsxExpression's nearest enclosing JSX element is a Text/Button-like component. */
function isInsideTextLikeJsxElement(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isJsxElement(current)) {
      const name = jsxTagName(current);
      if (TEXT_LIKE_JSX_TAGS.has(name) || /Text|Button|Label/.test(name)) return true;
    }
    current = current.parent;
  }
  return false;
}

// ---------------------------------------------------------------------------------------
// Core analysis (pure function used by both the CLI and the tests)
// ---------------------------------------------------------------------------------------

function positionOf(sourceFile: ts.SourceFile, node: ts.Node): { line: number; column: number } {
  const pos = node.getStart(sourceFile);
  const loc = sourceFile.getLineAndCharacterOfPosition(Math.max(0, pos));
  return { line: loc.line + 1, column: loc.character + 1 };
}

function scriptKindFor(rel: string): ts.ScriptKind {
  return rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

export function analyzeSourceText(rel: string, text: string): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const sourceFile = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, scriptKindFor(rel));

  function addFinding(node: ts.Node, rawValue: string, context: Finding['context']): void {
    const classified = classifyLiteral(rawValue);
    if (!classified) return;
    const pos = positionOf(sourceFile, node);
    const key = `${pos.line}:${pos.column}:${context}:${rawValue}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({
      file: normalizePath(rel),
      line: pos.line,
      column: pos.column,
      kind: classified.kind,
      severity: classified.severity,
      sample: truncateSample(rawValue),
      context,
    });
  }

  function visitJsxText(node: ts.JsxText): void {
    const value = node.text;
    if (!trimmedVisibleText(value)) return;
    addFinding(node, value, 'jsx-text');
  }

  function visitJsxExpressionStringChild(node: ts.JsxExpression): void {
    const expr = node.expression;
    if (!expr || !ts.isStringLiteralLike(expr)) return;
    if (isInsideLocalizationCall(node, sourceFile)) return;
    if (isInsideLocaleContainerObject(node)) return;
    if (!isInsideTextLikeJsxElement(node)) return;
    addFinding(expr, expr.text, 'jsx-expression-child');
  }

  function visitJsxAttribute(node: ts.JsxAttribute): void {
    const attributeName = node.name.getText(sourceFile);
    if (!USER_VISIBLE_JSX_ATTRIBUTES.has(attributeName)) return;
    const initializer = node.initializer;
    if (!initializer) return;
    if (ts.isStringLiteral(initializer)) {
      addFinding(initializer, initializer.text, 'jsx-attribute');
      return;
    }
    if (!ts.isJsxExpression(initializer) || !initializer.expression) return;
    if (isInsideLocalizationCall(initializer, sourceFile)) return;
    if (isInsideLocaleContainerObject(initializer)) return;
    if (ts.isStringLiteralLike(initializer.expression)) {
      addFinding(initializer.expression, initializer.expression.text, 'jsx-attribute');
      return;
    }
    if (ts.isTemplateExpression(initializer.expression)) {
      const literalText = [
        initializer.expression.head.text,
        ...initializer.expression.templateSpans.map((span) => span.literal.text),
      ].join('');
      addFinding(initializer.expression, literalText, 'jsx-attribute');
    }
  }

  function visitObjectCopyProperty(node: ts.PropertyAssignment): void {
    const key = propertyKeyName(node.name);
    if (!USER_VISIBLE_OBJECT_KEYS.has(key) || !ts.isStringLiteralLike(node.initializer)) return;
    if (isInsideLocalizationCall(node, sourceFile)) return;
    if (isInsideLocaleContainerObject(node)) return;
    addFinding(node.initializer, node.initializer.text, 'object-copy');
  }

  function visitCallExpression(node: ts.CallExpression): void {
    const callee = calleeText(node, sourceFile);
    const isAlertCall = ALERT_CALLEE_RE.test(callee);
    const isToastCall = !isAlertCall && TOAST_CALLEE_RE.test(callee);
    if (!isAlertCall && !isToastCall) return;
    if (isInsideLocalizationCall(node, sourceFile)) return;
    for (const arg of node.arguments) {
      if (!ts.isStringLiteralLike(arg)) continue;
      if (isInsideLocalizationCall(arg, sourceFile)) continue;
      addFinding(arg, arg.text, isAlertCall ? 'alert-arg' : 'toast-arg');
    }
  }

  function walk(node: ts.Node): void {
    if (ts.isJsxText(node)) {
      visitJsxText(node);
    } else if (ts.isJsxExpression(node)) {
      visitJsxExpressionStringChild(node);
    } else if (ts.isJsxAttribute(node)) {
      visitJsxAttribute(node);
    } else if (ts.isPropertyAssignment(node)) {
      visitObjectCopyProperty(node);
    } else if (ts.isCallExpression(node)) {
      visitCallExpression(node);
    }
    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
}

// ---------------------------------------------------------------------------------------
// Repo-wide scan
// ---------------------------------------------------------------------------------------

function analyzeRepo(repoRoot: string, allowlist: readonly string[]): { findings: Finding[]; filesScanned: number } {
  const allowSet = new Set(allowlist.map(normalizePath));
  const files = listScanFiles(repoRoot);
  const findings: Finding[] = [];
  for (const rel of files) {
    if (allowSet.has(rel)) continue;
    let text: string;
    try {
      text = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
    } catch (_err) {
      continue;
    }
    findings.push(...analyzeSourceText(rel, text));
  }
  return { findings, filesScanned: files.length };
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topFilesFrom(findings: Finding[], limit = 5): Array<{ file: string; count: number }> {
  const byFile = countBy(findings.map((finding) => finding.file));
  return Object.entries(byFile)
    .slice(0, limit)
    .map(([file, count]) => ({ file, count }));
}

export function buildRawStringAuditReport(
  repoRoot: string,
  generatedAt: string,
  allowlist: readonly string[] = RAW_STRING_ALLOWLIST,
): RawStringAuditReport {
  const { findings, filesScanned } = analyzeRepo(repoRoot, allowlist);
  return {
    schemaVersion: 'heisenberg-raw-string-audit-v1',
    mode: 'raw-string-audit',
    generatedAt,
    readOnly: true,
    sourceMutationApplied: false,
    scannedDirs: [...SCAN_ROOT_DIRS],
    allowlist: [...allowlist],
    totalFindings: findings.length,
    byKind: countBy(findings.map((finding) => finding.kind)),
    bySeverity: countBy(findings.map((finding) => finding.severity)),
    totalFiles: filesScanned,
    topFiles: topFilesFrom(findings),
    findings,
  };
}

// ---------------------------------------------------------------------------------------
// Output (JSON + Markdown), CLI
// ---------------------------------------------------------------------------------------

function timestampSlug(value: string): string {
  return value.replace(/[:.]/g, '-');
}

function resolveOutputDir(repoRoot: string, requested: string | undefined, generatedAt: string): string {
  const fallback = path.join('docs', 'heisenberg', 'raw-strings', timestampSlug(generatedAt));
  const resolved = path.resolve(repoRoot, requested ?? fallback);
  const allowedRoots = [
    path.resolve(repoRoot, '.codex-tmp'),
    path.resolve(repoRoot, 'docs', 'heisenberg'),
  ];
  if (!allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))) {
    throw new Error('Heisenberg raw string audit output must stay under .codex-tmp or docs/heisenberg');
  }
  return resolved;
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function renderMarkdown(report: RawStringAuditReport): string {
  const byFile = countBy(report.findings.map((finding) => finding.file));
  const rows = report.findings.map(
    (finding) =>
      `| ${finding.file}:${finding.line} | ${finding.kind} | ${finding.severity} | ${finding.sample.replace(/\|/g, '/')} |`,
  );
  return [
    '# Heisenberg Raw String Audit',
    '',
    'Read-only inversion of the Heisenberg locale extractor: finds user-facing literals that',
    'have NO localization key/wrapper around them at all (raw JSX text, raw JSX-expression',
    'string children of Text/Button-like components, and raw Alert/toast arguments).',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Scanned dirs: ${report.scannedDirs.join(', ')}`,
    `- Files scanned: ${report.totalFiles}`,
    `- Total findings: ${report.totalFindings}`,
    `- Read-only: ${report.readOnly}`,
    `- Source mutation applied: ${report.sourceMutationApplied}`,
    `- Allowlist size: ${report.allowlist.length}`,
    '',
    '## By Kind',
    '',
    ...Object.entries(report.byKind).map(([kind, count]) => `- ${kind}: ${count}`),
    '',
    '## By Severity',
    '',
    ...Object.entries(report.bySeverity).map(([severity, count]) => `- ${severity}: ${count}`),
    '',
    '## Top Files',
    '',
    ...Object.entries(byFile)
      .slice(0, 5)
      .map(([file, count]) => `- ${file}: ${count}`),
    '',
    '## Findings',
    '',
    '| Location | Kind | Severity | Sample |',
    '| --- | --- | --- | --- |',
    ...(rows.length ? rows : ['| none | none | none | none |']),
  ].join('\n');
}

function writeRawStringAudit(
  repoRoot: string,
  options: CliOptions = {},
): { report: RawStringAuditReport; outputDir: string; jsonPath: string; markdownPath: string } {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const report = buildRawStringAuditReport(repoRoot, generatedAt);
  const outputDir = resolveOutputDir(repoRoot, options.outputDir, generatedAt);
  const jsonPath = path.join(outputDir, 'raw_string_audit.json');
  const markdownPath = path.join(outputDir, 'raw_string_audit.md');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${renderMarkdown(report)}\n`, 'utf8');

  return { report, outputDir, jsonPath, markdownPath };
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out-dir') {
      const value = argv[index + 1];
      if (!value) throw new Error('--out-dir requires a value');
      options.outputDir = value;
      index += 1;
    } else if (arg === '--generated-at') {
      const value = argv[index + 1];
      if (!value) throw new Error('--generated-at requires a value');
      options.generatedAt = value;
      index += 1;
    } else if (arg === '--strict') {
      options.strict = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

if (require.main === module) {
  try {
    const options = parseCli(process.argv.slice(2));
    const result = writeRawStringAudit(process.cwd(), options);
    const cyrillicOutsideAllowlist = result.report.findings.filter(
      (finding) => finding.kind === 'raw-cyrillic-literal',
    );

    console.log('Heisenberg raw string audit (read-only)');
    console.log(`Files scanned: ${result.report.totalFiles}`);
    console.log(`Total findings: ${result.report.totalFindings}`);
    console.log(`By kind: ${JSON.stringify(result.report.byKind)}`);
    console.log(`By severity: ${JSON.stringify(result.report.bySeverity)}`);
    console.log('Top files:');
    for (const { file, count } of result.report.topFiles) {
      console.log(`  ${file}: ${count}`);
    }
    console.log(`Report: ${relativePath(process.cwd(), result.jsonPath)}`);

    if (options.strict && cyrillicOutsideAllowlist.length > 0) {
      console.error(
        `Found ${cyrillicOutsideAllowlist.length} raw-cyrillic-literal finding(s) outside the allowlist.`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

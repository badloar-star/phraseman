import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

import { HEISENBERG_BATCH_SOURCE_LOCALES, type HeisenbergSourceLocale } from '../app/source_locales';

const cjsRequire = createRequire(__filename);

const { hasMojibake } = cjsRequire('./lib/heisenberg_semantic_core.cjs') as typeof import('./lib/heisenberg_semantic_core.cjs');

type PlannedUiLocale = Exclude<HeisenbergSourceLocale, 'es'>;
type EncodingScanLocale = HeisenbergSourceLocale;
type Severity = 'warning' | 'blocker';

type UiLocaleFinding = {
  severity: Severity;
  code: string;
  file: string;
  line?: number;
  column?: number;
  keyPath?: string;
  missing?: string[];
  message: string;
  sample?: string;
};

type UiLocaleAuditReport = {
  generatedAt: string;
  mode: 'ui-locale-audit';
  plannedLocales: PlannedUiLocale[];
  activationReady: boolean;
  summary: {
    filesScanned: number;
    triLangCalls: number;
    staticTriLangCalls: number;
    dynamicTriLangCalls: number;
    legacyLangHelperCalls: number;
    localeObjectFindings: number;
    triLangMissingLocaleUnits: number;
    triLangMissingAllPlannedUnits: number;
    helperMissingLocaleUnits: number;
    localeObjectMissingLocaleUnits: number;
    localeObjectMissingAllPlannedUnits: number;
    bundleMissingLocaleUnits: number;
    findings: number;
    byCode: Record<string, number>;
  };
  topFiles: {
    file: string;
    findings: number;
    missingLocaleUnits: number;
  }[];
  findings: UiLocaleFinding[];
};

type StaticBindings = Map<string, ts.Expression>;
type CompleteCopyParameterTypes = Set<string>;

export const PLANNED_UI_LOCALES = HEISENBERG_BATCH_SOURCE_LOCALES.filter(
  (locale): locale is PlannedUiLocale => locale !== 'es',
);
const ENCODING_SCAN_LOCALES = HEISENBERG_BATCH_SOURCE_LOCALES as readonly EncodingScanLocale[];

const SCAN_ROOTS = ['app', 'components', 'constants', 'admin'];
const SKIP_DIRS = new Set([
  '.expo',
  '.git',
  'android',
  'build',
  'coverage',
  'dist',
  'ios',
  'node_modules',
]);
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const LANG_CONTEXT_BUNDLE_NAMES: Record<PlannedUiLocale, readonly string[]> = {
  'pt-BR': ['PT_BR', 'PTBR'],
  vi: ['VI'],
  id: ['ID'],
  tr: ['TR'],
  pl: ['PL'],
};

function timestampSlug(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(abs: string, text: string): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

function propName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function objectLiteralKeys(node: ts.ObjectLiteralExpression): Set<string> {
  const keys = new Set<string>();
  for (const property of node.properties) {
    if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
      const name = propName(property.name);
      if (name) keys.add(name);
    }
  }
  return keys;
}

function plannedLocaleAliasKey(name: string): PlannedUiLocale | null {
  const normalized = name.toLowerCase().replace(/[_-]/g, '');
  if (normalized === 'ptbr') return 'pt-BR';
  return null;
}

function objectLiteralPropertyObject(node: ts.ObjectLiteralExpression, key: string): ts.ObjectLiteralExpression | null {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (propName(property.name) !== key) continue;
    const initializer = unwrapExpression(property.initializer as ts.Expression);
    return ts.isObjectLiteralExpression(initializer) ? initializer : null;
  }
  return null;
}

function effectiveLocaleObjectKeys(node: ts.ObjectLiteralExpression): Set<string> {
  const keys = objectLiteralKeys(node);
  for (const key of [...keys]) {
    const alias = plannedLocaleAliasKey(key);
    if (alias) keys.add(alias);
  }
  const sourceLocales = objectLiteralPropertyObject(node, 'sourceLocales');
  if (sourceLocales) {
    for (const locale of objectLiteralKeys(sourceLocales)) {
      keys.add(plannedLocaleAliasKey(locale) ?? locale);
    }
  }
  return keys;
}

function scriptKindForFile(file: string): ts.ScriptKind {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  if (ext === '.js') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
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

function compactSample(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function objectLiteralStringValue(node: ts.ObjectLiteralExpression, key: string): string | null {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (propName(property.name) !== key) continue;
    const initializer = unwrapExpression(property.initializer as ts.Expression);
    return ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)
      ? initializer.text
      : null;
  }
  return null;
}

function objectLiteralPropertyExpression(node: ts.ObjectLiteralExpression, key: string): ts.Expression | null {
  for (const property of node.properties) {
    if (ts.isPropertyAssignment(property) && propName(property.name) === key) {
      return unwrapExpression(property.initializer as ts.Expression);
    }
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === key) {
      return property.name;
    }
  }
  return null;
}

function arrayLiteralElementExpression(node: ts.ArrayLiteralExpression, key: string): ts.Expression | null {
  const index = Number(key);
  if (!Number.isInteger(index) || index < 0 || index >= node.elements.length) return null;
  return unwrapExpression(node.elements[index] as ts.Expression);
}

function isCompleteTriLangCopyObject(node: ts.ObjectLiteralExpression): boolean {
  const keys = objectLiteralKeys(node);
  return keys.has('ru') &&
    keys.has('uk') &&
    keys.has('es') &&
    PLANNED_UI_LOCALES.every((locale) => keys.has(locale));
}

function typeName(node: ts.TypeNode | undefined): string | null {
  if (!node) return null;
  if (ts.isTypeReferenceNode(node)) return node.typeName.getText();
  return null;
}

function typeNodeRequiresCompleteLangRecord(node: ts.TypeNode): boolean {
  if (ts.isTypeReferenceNode(node) && node.typeName.getText() === 'Record') {
    const [keyType] = node.typeArguments ?? [];
    return Boolean(keyType && keyType.getText() === 'Lang');
  }
  if (ts.isTypeLiteralNode(node)) {
    const keys = new Set<string>();
    for (const member of node.members) {
      if (!ts.isPropertySignature(member)) continue;
      const name = propName(member.name);
      if (name) keys.add(name);
    }
    return keys.has('ru') &&
      keys.has('uk') &&
      keys.has('es') &&
      PLANNED_UI_LOCALES.every((locale) => keys.has(locale));
  }
  return false;
}

function collectCompleteCopyParameterTypes(source: ts.SourceFile): CompleteCopyParameterTypes {
  const types: CompleteCopyParameterTypes = new Set();
  const visit = (node: ts.Node): void => {
    if (
      ts.isTypeAliasDeclaration(node) &&
      typeNodeRequiresCompleteLangRecord(node.type)
    ) {
      types.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return types;
}

function isConstVariableDeclaration(node: ts.VariableDeclaration): boolean {
  const list = node.parent;
  return ts.isVariableDeclarationList(list) && (list.flags & ts.NodeFlags.Const) !== 0;
}

function resolveRelativeImportFile(importerFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const importerDir = path.dirname(path.resolve(process.cwd(), importerFile));
  const base = path.resolve(importerDir, specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function collectExportedConstBindings(absFile: string): StaticBindings {
  const bindings: StaticBindings = new Map();
  const text = fs.readFileSync(absFile, 'utf8');
  const source = ts.createSourceFile(absFile, text, ts.ScriptTarget.Latest, true, scriptKindForFile(absFile));
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      isConstVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.canHaveModifiers(node.parent.parent)
    ) {
      const modifiers = ts.getModifiers(node.parent.parent);
      if (modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        bindings.set(node.name.text, unwrapExpression(node.initializer as ts.Expression));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return bindings;
}

function collectImportedStaticBindings(file: string, source: ts.SourceFile): StaticBindings {
  const bindings: StaticBindings = new Map();
  const exportCache = new Map<string, StaticBindings>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const namedBindings = statement.importClause.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;
    const resolved = resolveRelativeImportFile(file, statement.moduleSpecifier.text);
    if (!resolved) continue;
    let exported = exportCache.get(resolved);
    if (!exported) {
      exported = collectExportedConstBindings(resolved);
      exportCache.set(resolved, exported);
    }
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      const expression = exported.get(importedName);
      if (expression) bindings.set(element.name.text, expression);
    }
  }
  return bindings;
}

function collectStaticBindings(source: ts.SourceFile, file?: string): StaticBindings {
  const bindings: StaticBindings = new Map();
  if (file) {
    for (const [name, expression] of collectImportedStaticBindings(file, source)) {
      bindings.set(name, expression);
    }
  }
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      isConstVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      bindings.set(node.name.text, unwrapExpression(node.initializer as ts.Expression));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return bindings;
}

function isCompleteCopyTypedParameter(
  node: ts.Expression,
  completeCopyTypes: CompleteCopyParameterTypes,
): boolean {
  if (!ts.isIdentifier(node)) return false;
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionLike(current)) {
      const parameter = current.parameters.find((candidate) =>
        ts.isIdentifier(candidate.name) && candidate.name.text === node.text,
      );
      const name = typeName(parameter?.type);
      return Boolean(name && completeCopyTypes.has(name));
    }
    current = current.parent;
  }
  return false;
}

function expressionProvesCompleteTriLangCopy(
  expression: ts.Expression,
  bindings: StaticBindings,
  completeCopyTypes: CompleteCopyParameterTypes = new Set(),
  seen = new Set<string>(),
): boolean {
  const node = unwrapExpression(expression);

  if (ts.isObjectLiteralExpression(node)) return isCompleteTriLangCopyObject(node);
  if (isCompleteCopyTypedParameter(node, completeCopyTypes)) return true;

  if (ts.isBinaryExpression(node) && (
    node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
    node.operatorToken.kind === ts.SyntaxKind.BarBarToken
  )) {
    return expressionProvesCompleteTriLangCopy(node.left, bindings, completeCopyTypes, seen) &&
      expressionProvesCompleteTriLangCopy(node.right, bindings, completeCopyTypes, seen);
  }

  if (ts.isConditionalExpression(node)) {
    return expressionProvesCompleteTriLangCopy(node.whenTrue, bindings, completeCopyTypes, seen) &&
      expressionProvesCompleteTriLangCopy(node.whenFalse, bindings, completeCopyTypes, seen);
  }

  if (ts.isIdentifier(node)) {
    if (seen.has(node.text)) return false;
    const bound = bindings.get(node.text);
    if (!bound) return false;
    seen.add(node.text);
    const result = expressionProvesCompleteTriLangCopy(bound, bindings, completeCopyTypes, seen);
    seen.delete(node.text);
    return result;
  }

  if (ts.isPropertyAccessExpression(node)) {
    const parent = unwrapExpression(node.expression);
    if (ts.isIdentifier(parent)) {
      if (seen.has(parent.text)) return false;
      const bound = bindings.get(parent.text);
      if (!bound) return false;
      seen.add(parent.text);
      const resolvedParent = unwrapExpression(bound);
      const property = ts.isObjectLiteralExpression(resolvedParent)
        ? objectLiteralPropertyExpression(resolvedParent, node.name.text)
        : null;
      const result = property
        ? expressionProvesCompleteTriLangCopy(property, bindings, completeCopyTypes, seen)
        : expressionPropertyProvesCompleteTriLangCopy(resolvedParent, node.name.text, bindings, completeCopyTypes, seen);
      seen.delete(parent.text);
      return result;
    }
  }

  if (ts.isElementAccessExpression(node)) {
    const target = unwrapExpression(node.expression);
    const argument = node.argumentExpression ? unwrapExpression(node.argumentExpression) : null;
    const resolvedTarget = ts.isIdentifier(target) ? bindings.get(target.text) ?? target : target;
    const container = unwrapExpression(resolvedTarget);

    if (ts.isObjectLiteralExpression(container)) {
      if (argument && (ts.isStringLiteral(argument) || ts.isNumericLiteral(argument))) {
        const property = objectLiteralPropertyExpression(container, argument.text);
        return property ? expressionProvesCompleteTriLangCopy(property, bindings, completeCopyTypes, seen) : false;
      }
      if (!container.properties.length) return false;
      return container.properties.every((property) => {
        if (!ts.isPropertyAssignment(property)) return false;
        return expressionProvesCompleteTriLangCopy(property.initializer as ts.Expression, bindings, completeCopyTypes, seen);
      });
    }

    if (ts.isArrayLiteralExpression(container)) {
      if (argument && ts.isNumericLiteral(argument)) {
        const element = arrayLiteralElementExpression(container, argument.text);
        return element ? expressionProvesCompleteTriLangCopy(element, bindings, completeCopyTypes, seen) : false;
      }
      if (!container.elements.length) return false;
      return container.elements.every((element) =>
        expressionProvesCompleteTriLangCopy(element as ts.Expression, bindings, completeCopyTypes, seen),
      );
    }
  }

  return false;
}

function expressionPropertyProvesCompleteTriLangCopy(
  expression: ts.Expression,
  propertyName: string,
  bindings: StaticBindings,
  completeCopyTypes: CompleteCopyParameterTypes = new Set(),
  seen = new Set<string>(),
): boolean {
  const node = unwrapExpression(expression);

  if (ts.isIdentifier(node)) {
    if (seen.has(node.text)) return false;
    const bound = bindings.get(node.text);
    if (!bound) return false;
    seen.add(node.text);
    const result = expressionPropertyProvesCompleteTriLangCopy(bound, propertyName, bindings, completeCopyTypes, seen);
    seen.delete(node.text);
    return result;
  }

  if (ts.isObjectLiteralExpression(node)) {
    const property = objectLiteralPropertyExpression(node, propertyName);
    return property ? expressionProvesCompleteTriLangCopy(property, bindings, completeCopyTypes, seen) : false;
  }

  if (ts.isElementAccessExpression(node)) {
    const target = unwrapExpression(node.expression);
    const argument = node.argumentExpression ? unwrapExpression(node.argumentExpression) : null;
    const resolvedTarget = ts.isIdentifier(target) ? bindings.get(target.text) ?? target : target;
    const container = unwrapExpression(resolvedTarget);

    if (ts.isObjectLiteralExpression(container)) {
      if (argument && (ts.isStringLiteral(argument) || ts.isNumericLiteral(argument))) {
        const value = objectLiteralPropertyExpression(container, argument.text);
        return value ? expressionPropertyProvesCompleteTriLangCopy(value, propertyName, bindings, completeCopyTypes, seen) : false;
      }
      if (!container.properties.length) return false;
      return container.properties.every((property) => {
        if (!ts.isPropertyAssignment(property)) return false;
        return expressionPropertyProvesCompleteTriLangCopy(property.initializer as ts.Expression, propertyName, bindings, completeCopyTypes, seen);
      });
    }

    if (ts.isArrayLiteralExpression(container)) {
      if (argument && ts.isNumericLiteral(argument)) {
        const value = arrayLiteralElementExpression(container, argument.text);
        return value ? expressionPropertyProvesCompleteTriLangCopy(value, propertyName, bindings, completeCopyTypes, seen) : false;
      }
      if (!container.elements.length) return false;
      return container.elements.every((element) =>
        expressionPropertyProvesCompleteTriLangCopy(element as ts.Expression, propertyName, bindings, completeCopyTypes, seen),
      );
    }
  }

  return false;
}

function expressionTextFragments(node: ts.Expression): string[] {
  const initializer = unwrapExpression(node);
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return [initializer.text];
  }
  if (ts.isTemplateExpression(initializer)) {
    return [
      initializer.head.text,
      ...initializer.templateSpans.map((span) => span.literal.text),
    ];
  }
  return [];
}

function collectLocaleEncodingFindings(
  file: string,
  source: ts.SourceFile,
  node: ts.ObjectLiteralExpression,
): UiLocaleFinding[] {
  const keys = objectLiteralKeys(node);
  const localeKeys = ENCODING_SCAN_LOCALES.filter((locale) => keys.has(locale));
  if (localeKeys.length < 2) return [];

  const findings: UiLocaleFinding[] = [];
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = propName(property.name);
    if (!name || !ENCODING_SCAN_LOCALES.includes(name as EncodingScanLocale)) continue;

    for (const fragment of expressionTextFragments(property.initializer as ts.Expression)) {
      if (!fragment.trim() || !hasMojibake(fragment)) continue;
      findings.push({
        severity: 'blocker',
        code: 'locale-string-mojibake',
        file,
        ...location(source, property),
        keyPath: name,
        message: 'Locale string looks corrupted by mojibake or replacement question marks.',
        sample: compactSample(fragment),
      });
    }
  }
  return findings;
}

function isTriLangCopyObject(node: ts.ObjectLiteralExpression): boolean {
  const parent = node.parent;
  return (
    ts.isCallExpression(parent) &&
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === 'triLang' &&
    parent.arguments[1] === node
  );
}

function isTriTextHelperSeedObject(node: ts.ObjectLiteralExpression): boolean {
  const parent = node.parent;
  return (
    ts.isVariableDeclaration(parent) &&
    parent.initializer === node &&
    ts.isIdentifier(parent.name) &&
    parent.name.text === 'copy' &&
    parent.type?.getText() === 'TriText'
  );
}

function isPropertyValue(node: ts.Node, propertyName: string): boolean {
  const parent = node.parent;
  if (!ts.isPropertyAssignment(parent) || parent.initializer !== node) return false;
  return propName(parent.name) === propertyName;
}

function hasAncestorMatching(node: ts.Node, predicate: (ancestor: ts.Node) => boolean): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (predicate(current)) return true;
    current = current.parent;
  }
  return false;
}

function isPrepositionExplanationCoveredByPlannedFallback(file: string, node: ts.ObjectLiteralExpression): boolean {
  if (!normalizePath(file).endsWith('app/preposition_explanations.ts')) return false;
  if (!isPropertyValue(node, 'explain')) return false;
  return hasAncestorMatching(node, (ancestor) => (
    ts.isVariableDeclaration(ancestor) &&
    ts.isIdentifier(ancestor.name) &&
    ancestor.name.text === 'phraseRules'
  ));
}

let lessonWordSourceLocaleCoverageCache: Set<string> | null = null;

function lessonWordSourceLocaleCoverage(): Set<string> {
  if (lessonWordSourceLocaleCoverageCache) return lessonWordSourceLocaleCoverageCache;
  const covered = new Set<string>();
  const sourceLocalePath = path.join(process.cwd(), 'app', 'lesson_words_source_locales.ts');
  if (!fs.existsSync(sourceLocalePath)) {
    lessonWordSourceLocaleCoverageCache = covered;
    return covered;
  }

  const text = fs.readFileSync(sourceLocalePath, 'utf8');
  const source = ts.createSourceFile(sourceLocalePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'LESSON_WORD_SOURCE_LOCALES_BY_EN' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) continue;
        const key = propName(property.name);
        if (!key) continue;
        const keys = objectLiteralKeys(property.initializer);
        if (PLANNED_UI_LOCALES.every((locale) => keys.has(locale))) covered.add(key.trim().toLowerCase());
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  lessonWordSourceLocaleCoverageCache = covered;
  return covered;
}

function isLessonWordCoveredBySourceLocaleMap(file: string, node: ts.ObjectLiteralExpression): boolean {
  if (!normalizePath(file).endsWith('app/lesson_words.tsx')) return false;
  const english = objectLiteralStringValue(node, 'en');
  if (!english) return false;
  const lowerEnglish = english.trim().toLowerCase();
  const coverage = lessonWordSourceLocaleCoverage();
  if (coverage.has(lowerEnglish)) return true;
  const pos = objectLiteralStringValue(node, 'pos');
  return Boolean(pos && coverage.has(`${lowerEnglish}::${pos}`));
}

function isLocaleObjectCoveredElsewhere(file: string, node: ts.ObjectLiteralExpression): boolean {
  if (isLessonWordCoveredBySourceLocaleMap(file, node)) return true;
  return isPrepositionExplanationCoveredByPlannedFallback(file, node);
}

function isLocaleObjectMissingPlanned(node: ts.ObjectLiteralExpression): {
  missing: PlannedUiLocale[];
  hasAllBase: boolean;
} {
  const keys = effectiveLocaleObjectKeys(node);
  const hasAllBase = keys.has('ru') && keys.has('uk') && keys.has('es');
  return {
    hasAllBase,
    missing: hasAllBase ? PLANNED_UI_LOCALES.filter((locale) => !keys.has(locale)) : [],
  };
}

function location(source: ts.SourceFile, node: ts.Node): Pick<UiLocaleFinding, 'line' | 'column'> {
  const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
  return { line: pos.line + 1, column: pos.character + 1 };
}

function isTriLangCopyMissingPlanned(call: ts.CallExpression): boolean {
  if (!ts.isIdentifier(call.expression) || call.expression.text !== 'triLang') return false;
  const copyArg = call.arguments[1];
  const copyExpression = copyArg ? unwrapExpression(copyArg as ts.Expression) : null;
  if (!copyExpression || !ts.isObjectLiteralExpression(copyExpression)) return false;
  const keys = objectLiteralKeys(copyExpression);
  return keys.has('ru') && keys.has('uk') && keys.has('es') && PLANNED_UI_LOCALES.some((locale) => !keys.has(locale));
}

function expressionReturnsTriLangMissingPlanned(expr: ts.Expression): boolean {
  const unwrapped = unwrapExpression(expr);
  if (ts.isCallExpression(unwrapped)) return isTriLangCopyMissingPlanned(unwrapped);
  if (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped)) {
    if (unwrapped.parameters.length < 3) return false;
    if (ts.isCallExpression(unwrapped.body)) return isTriLangCopyMissingPlanned(unwrapped.body);
    if (!ts.isBlock(unwrapped.body)) return false;
    let found = false;
    const visitReturn = (node: ts.Node): void => {
      if (found) return;
      if (ts.isReturnStatement(node) && node.expression) {
        const returned = unwrapExpression(node.expression);
        if (ts.isCallExpression(returned) && isTriLangCopyMissingPlanned(returned)) found = true;
        return;
      }
      ts.forEachChild(node, visitReturn);
    };
    visitReturn(unwrapped.body);
    return found;
  }
  return false;
}

function collectLocalTriLangHelpersMissingPlanned(source: ts.SourceFile): Set<string> {
  const helpers = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      expressionReturnsTriLangMissingPlanned(node.initializer)
    ) {
      helpers.add(node.name.text);
    }
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.parameters.length >= 3 &&
      node.body
    ) {
      let found = false;
      const visitReturn = (child: ts.Node): void => {
        if (found) return;
        if (ts.isReturnStatement(child) && child.expression) {
          const returned = unwrapExpression(child.expression);
          if (ts.isCallExpression(returned) && isTriLangCopyMissingPlanned(returned)) found = true;
          return;
        }
        ts.forEachChild(child, visitReturn);
      };
      visitReturn(node.body);
      if (found) helpers.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return helpers;
}

export function analyzeUiLocaleSource(file: string, text: string): {
  triLangCalls: number;
  staticTriLangCalls: number;
  dynamicTriLangCalls: number;
  legacyLangHelperCalls: number;
  localeObjectFindings: number;
  findings: UiLocaleFinding[];
} {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindForFile(file));
  const findings: UiLocaleFinding[] = [];
  let triLangCalls = 0;
  let staticTriLangCalls = 0;
  let dynamicTriLangCalls = 0;
  let legacyLangHelperCalls = 0;
  let localeObjectFindings = 0;
  const localTriLangHelpersMissingPlanned = collectLocalTriLangHelpersMissingPlanned(source);
  const staticBindings = collectStaticBindings(source, file);
  const completeCopyTypes = collectCompleteCopyParameterTypes(source);

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      findings.push(...collectLocaleEncodingFindings(file, source, node));
      if (!isTriLangCopyObject(node) && !isTriTextHelperSeedObject(node)) {
        const { hasAllBase, missing } = isLocaleObjectMissingPlanned(node);
        if (hasAllBase && missing.length > 0 && !isLocaleObjectCoveredElsewhere(file, node)) {
          localeObjectFindings += 1;
          findings.push({
            severity: 'warning',
            code: missing.length === PLANNED_UI_LOCALES.length
              ? 'locale-object-missing-all-planned-locales'
              : 'locale-object-missing-planned-locales',
            file,
            ...location(source, node),
            missing,
            message: 'Object literal has ru/uk/es locale keys, but planned interface locales are not present yet.',
            sample: compactSample(node.getText(source)),
          });
        }
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'triLang') {
      triLangCalls += 1;
      const copyArg = node.arguments[1];
      const copyExpression = copyArg ? unwrapExpression(copyArg as ts.Expression) : null;
      if (!copyExpression || !ts.isObjectLiteralExpression(copyExpression)) {
        if (
          copyExpression &&
          (
            expressionProvesCompleteTriLangCopy(copyExpression, staticBindings, completeCopyTypes)
          )
        ) {
          staticTriLangCalls += 1;
        } else {
          dynamicTriLangCalls += 1;
          findings.push({
            severity: 'warning',
            code: 'dynamic-trilang-copy',
            file,
            ...location(source, node),
            message: 'triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present.',
            sample: compactSample(node.getText(source)),
          });
        }
      } else {
        staticTriLangCalls += 1;
        const keys = objectLiteralKeys(copyExpression);
        const hasBase = keys.has('ru') && keys.has('uk') && keys.has('es');
        if (hasBase) {
          const missing = PLANNED_UI_LOCALES.filter((locale) => !keys.has(locale));
          if (missing.length > 0) {
            findings.push({
              severity: 'warning',
              code: missing.length === PLANNED_UI_LOCALES.length ? 'trilang-missing-all-planned-locales' : 'trilang-missing-planned-locales',
              file,
              ...location(source, copyExpression),
              missing,
              message: 'Static triLang copy has ru/uk/es, but planned interface locales are not present yet.',
              sample: compactSample(copyExpression.getText(source)),
            });
          }
        }
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'L' &&
      node.arguments.length === 4 &&
      ts.isIdentifier(node.arguments[0]) &&
      node.arguments[0].text === 'lang'
    ) {
      legacyLangHelperCalls += 1;
      findings.push({
        severity: 'warning',
        code: 'legacy-lang-helper-missing-planned-locales',
        file,
        ...location(source, node),
        missing: [...PLANNED_UI_LOCALES],
        message: 'Legacy L(lang, ru, uk, es) helper bypasses planned interface locales.',
        sample: compactSample(node.getText(source)),
      });
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      localTriLangHelpersMissingPlanned.has(node.expression.text) &&
      node.arguments.length === 3
    ) {
      legacyLangHelperCalls += 1;
      findings.push({
        severity: 'warning',
        code: 'local-trilang-helper-missing-planned-locales',
        file,
        ...location(source, node),
        missing: [...PLANNED_UI_LOCALES],
        message: `Local helper ${node.expression.text}(ru, uk, es) returns triLang without planned interface locales.`,
        sample: compactSample(node.getText(source)),
      });
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return {
    triLangCalls,
    staticTriLangCalls,
    dynamicTriLangCalls,
    legacyLangHelperCalls,
    localeObjectFindings,
    findings,
  };
}

function declaredConstNames(source: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

function findConstObject(source: ts.SourceFile, constName: string): ts.ObjectLiteralExpression | null {
  let found: ts.ObjectLiteralExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === constName &&
      node.initializer
    ) {
      const initializer = unwrapExpression(node.initializer);
      if (!ts.isObjectLiteralExpression(initializer)) return;
      found = initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

export function analyzeUiBundleSource(file: string, text: string): UiLocaleFinding[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindForFile(file));
  const findings: UiLocaleFinding[] = [];

  if (normalizePath(file).endsWith('constants/i18n.ts')) {
    const tObject = findConstObject(source, 'T');
    if (tObject) {
      const keys = objectLiteralKeys(tObject);
      const missing = PLANNED_UI_LOCALES.filter((locale) => !keys.has(locale));
      if (missing.length > 0) {
        findings.push({
          severity: 'warning',
          code: 'i18n-t-bundle-missing-planned-locales',
          file,
          ...location(source, tObject),
          keyPath: 'T.<locale>',
          missing,
          message: 'constants/i18n.ts does not define UI string bundles for all planned interface locales.',
        });
      }
    }
  }

  if (normalizePath(file).endsWith('components/LangContext.tsx')) {
    const consts = declaredConstNames(source);
    for (const locale of PLANNED_UI_LOCALES) {
      const names = LANG_CONTEXT_BUNDLE_NAMES[locale];
      if (!names.some((name) => consts.has(name))) {
        findings.push({
          severity: 'warning',
          code: 'lang-context-bundle-missing-planned-locale',
          file,
          keyPath: names.join(' | '),
          missing: [locale],
          message: 'components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.',
        });
      }
    }
  }

  return findings;
}

function collectFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (abs: string, rel: string): void => {
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(path.basename(abs))) return;
      for (const child of fs.readdirSync(abs)) {
        walk(path.join(abs, child), path.join(rel, child));
      }
      return;
    }
    if (stat.isFile() && TEXT_EXTENSIONS.has(path.extname(abs).toLowerCase())) {
      out.push(normalizePath(rel));
    }
  };

  for (const scanRoot of SCAN_ROOTS) {
    const abs = path.join(root, scanRoot);
    if (fs.existsSync(abs)) walk(abs, scanRoot);
  }
  return out.sort();
}

export function buildUiLocaleAudit(root = process.cwd()): UiLocaleAuditReport {
  const files = collectFiles(root);
  const findings: UiLocaleFinding[] = [];
  let triLangCalls = 0;
  let staticTriLangCalls = 0;
  let dynamicTriLangCalls = 0;
  let legacyLangHelperCalls = 0;
  let localeObjectFindings = 0;

  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const triLang = analyzeUiLocaleSource(file, text);
    triLangCalls += triLang.triLangCalls;
    staticTriLangCalls += triLang.staticTriLangCalls;
    dynamicTriLangCalls += triLang.dynamicTriLangCalls;
    legacyLangHelperCalls += triLang.legacyLangHelperCalls;
    localeObjectFindings += triLang.localeObjectFindings;
    findings.push(...triLang.findings);
    findings.push(...analyzeUiBundleSource(file, text));
  }

  const byCode: Record<string, number> = {};
  for (const finding of findings) byCode[finding.code] = (byCode[finding.code] || 0) + 1;
  const byFile = new Map<string, { file: string; findings: number; missingLocaleUnits: number }>();
  for (const finding of findings) {
    const entry = byFile.get(finding.file) || { file: finding.file, findings: 0, missingLocaleUnits: 0 };
    entry.findings += 1;
    entry.missingLocaleUnits += finding.missing?.length || 0;
    byFile.set(finding.file, entry);
  }
  const topFiles = [...byFile.values()]
    .sort((a, b) => b.missingLocaleUnits - a.missingLocaleUnits || b.findings - a.findings || a.file.localeCompare(b.file))
    .slice(0, 40);

  const triLangFindings = findings.filter((finding) => finding.code.startsWith('trilang-'));
  const helperFindings = findings.filter((finding) => finding.code.includes('helper-'));
  const localeObjectFindingsList = findings.filter((finding) => finding.code.startsWith('locale-object-'));
  const bundleFindings = findings.filter((finding) => finding.code.includes('bundle-missing'));
  const activationReady = findings.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    mode: 'ui-locale-audit',
    plannedLocales: [...PLANNED_UI_LOCALES],
    activationReady,
    summary: {
      filesScanned: files.length,
      triLangCalls,
      staticTriLangCalls,
      dynamicTriLangCalls,
      legacyLangHelperCalls,
      localeObjectFindings,
      triLangMissingLocaleUnits: triLangFindings.reduce((sum, finding) => sum + (finding.missing?.length || 0), 0),
      triLangMissingAllPlannedUnits: triLangFindings.filter((finding) => finding.missing?.length === PLANNED_UI_LOCALES.length).length,
      helperMissingLocaleUnits: helperFindings.reduce((sum, finding) => sum + (finding.missing?.length || 0), 0),
      localeObjectMissingLocaleUnits: localeObjectFindingsList.reduce((sum, finding) => sum + (finding.missing?.length || 0), 0),
      localeObjectMissingAllPlannedUnits: localeObjectFindingsList.filter((finding) => finding.missing?.length === PLANNED_UI_LOCALES.length).length,
      bundleMissingLocaleUnits: bundleFindings.reduce((sum, finding) => sum + (finding.missing?.length || 0), 0),
      findings: findings.length,
      byCode,
    },
    topFiles,
    findings,
  };
}

function renderMarkdown(report: UiLocaleAuditReport): string {
  const topFindings = report.findings.slice(0, 80).map((finding) => {
    const where = `${finding.file}${finding.line ? `:${finding.line}` : ''}`;
    const missing = finding.missing?.length ? ` missing: ${finding.missing.join(', ')}` : '';
    const keyPath = finding.keyPath ? ` ${finding.keyPath}` : '';
    return `- [${finding.severity}] ${finding.code} ${where}${keyPath}${missing}: ${finding.message}${finding.sample ? ` | ${finding.sample}` : ''}`;
  });

  return [
    '# Heisenberg UI Locale Audit',
    '',
    `Generated: ${report.generatedAt}`,
    `Activation ready: ${report.activationReady ? 'yes' : 'no'}`,
    `Planned locales: ${report.plannedLocales.join(', ')}`,
    '',
    '## Summary',
    `- Files scanned: ${report.summary.filesScanned}`,
    `- triLang calls: ${report.summary.triLangCalls}`,
    `- Static triLang calls: ${report.summary.staticTriLangCalls}`,
    `- Dynamic triLang calls: ${report.summary.dynamicTriLangCalls}`,
    `- Legacy/local ru/uk/es helper calls: ${report.summary.legacyLangHelperCalls}`,
    `- Locale object findings: ${report.summary.localeObjectFindings}`,
    `- triLang missing locale units: ${report.summary.triLangMissingLocaleUnits}`,
    `- triLang calls missing all planned locales: ${report.summary.triLangMissingAllPlannedUnits}`,
    `- Helper missing locale units: ${report.summary.helperMissingLocaleUnits}`,
    `- Locale object missing locale units: ${report.summary.localeObjectMissingLocaleUnits}`,
    `- Locale objects missing all planned locales: ${report.summary.localeObjectMissingAllPlannedUnits}`,
    `- Bundle missing locale units: ${report.summary.bundleMissingLocaleUnits}`,
    '',
    '## Finding Codes',
    ...Object.entries(report.summary.byCode).map(([code, count]) => `- ${code}: ${count}`),
    '',
    '## Top Files',
    ...report.topFiles.slice(0, 25).map((entry) => (
      `- ${entry.file}: ${entry.findings} findings, ${entry.missingLocaleUnits} missing locale units`
    )),
    '',
    '## First Findings',
    ...(topFindings.length ? topFindings : ['No findings']),
  ].join('\n');
}

function main(): void {
  const root = process.cwd();
  const report = buildUiLocaleAudit(root);
  const runId = timestampSlug();
  const relOutDir = path.join('docs', 'heisenberg', 'ui', runId);
  const outDir = path.join(root, relOutDir);
  writeJson(path.join(outDir, 'ui_locale_audit.json'), report);
  writeText(path.join(outDir, 'ui_locale_audit.md'), renderMarkdown(report));

  console.log(
    `Heisenberg UI locale audit: activationReady=${report.activationReady ? 'yes' : 'no'}, ` +
      `${report.summary.findings} findings, ${report.summary.triLangMissingLocaleUnits} missing triLang locale units`,
  );
  console.log(`Report: ${normalizePath(relOutDir)}`);
}

if (require.main === module) {
  main();
}

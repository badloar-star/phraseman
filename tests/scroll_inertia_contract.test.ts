import fs from 'fs';
import path from 'path';
import * as ts from 'typescript';

const PROJECT_ROOT = path.join(__dirname, '..');
const SOURCE_ROOTS = ['app', 'components', 'hooks', 'modules'].map((root) => path.join(PROJECT_ROOT, root));

function listSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function scriptKindFor(file: string): ts.ScriptKind {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (file.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyNameText(name: ts.PropertyName | ts.JsxAttributeName, _sourceFile: ts.SourceFile): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name)) {
    const expression = unwrapExpression(name.expression);
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  }
  return undefined;
}

type StaticRate = 'normal' | 'fast' | 'unsupported';

function staticRateFromExpression(expression: ts.Expression): StaticRate {
  const value = unwrapExpression(expression);
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
    return value.text === 'normal' || value.text === 'fast' ? value.text : 'unsupported';
  }
  return 'unsupported';
}

function staticRateFromJsxAttribute(attribute: ts.JsxAttribute): StaticRate {
  const initializer = attribute.initializer;
  if (!initializer) return 'unsupported';
  if (ts.isStringLiteral(initializer)) {
    return initializer.text === 'normal' || initializer.text === 'fast' ? initializer.text : 'unsupported';
  }
  if (ts.isJsxExpression(initializer) && initializer.expression) {
    return staticRateFromExpression(initializer.expression);
  }
  return 'unsupported';
}

type ConstInitializers = Map<string, ts.Expression | null>;

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) => (
    ts.isOmittedExpression(element) ? [] : bindingNames(element.name)
  ));
}

function isTopLevelConstDeclaration(node: ts.VariableDeclaration): boolean {
  const declarationList = node.parent;
  const variableStatement = declarationList.parent;
  return ts.isVariableDeclarationList(declarationList)
    && (declarationList.flags & ts.NodeFlags.Const) !== 0
    && ts.isVariableStatement(variableStatement)
    && ts.isSourceFile(variableStatement.parent);
}

function collectConstInitializers(sourceFile: ts.SourceFile): ConstInitializers {
  const initializers: ConstInitializers = new Map();
  const declarationCounts = new Map<string, number>();

  const recordNames = (names: readonly string[]) => {
    names.forEach((name) => declarationCounts.set(name, (declarationCounts.get(name) ?? 0) + 1));
  };

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) {
      recordNames(bindingNames(node.name));
      if (ts.isIdentifier(node.name) && node.initializer && isTopLevelConstDeclaration(node)) {
        initializers.set(node.name.text, node.initializer);
      }
    } else if (ts.isParameter(node)) {
      recordNames(bindingNames(node.name));
    } else if (
      ts.isFunctionDeclaration(node)
      || ts.isFunctionExpression(node)
      || ts.isClassDeclaration(node)
      || ts.isClassExpression(node)
      || ts.isEnumDeclaration(node)
      || ts.isModuleDeclaration(node)
    ) {
      if (node.name && ts.isIdentifier(node.name)) recordNames([node.name.text]);
    } else if (ts.isImportClause(node) && node.name) {
      recordNames([node.name.text]);
    } else if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node) || ts.isImportEqualsDeclaration(node)) {
      recordNames([node.name.text]);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  initializers.forEach((_initializer, name) => {
    if (declarationCounts.get(name) !== 1) initializers.set(name, null);
  });
  return initializers;
}

function resolveConstExpression(
  expression: ts.Expression,
  constInitializers: ConstInitializers,
  seen: ReadonlySet<string>,
): { expression: ts.Expression; seen: ReadonlySet<string> } | undefined {
  const value = unwrapExpression(expression);
  if (!ts.isIdentifier(value)) return { expression: value, seen };
  if (seen.has(value.text)) return undefined;

  const initializer = constInitializers.get(value.text);
  if (!initializer) return undefined;
  return { expression: unwrapExpression(initializer), seen: new Set([...seen, value.text]) };
}

function staticFiniteNumber(
  expression: ts.Expression,
  constInitializers: ConstInitializers,
  seen: ReadonlySet<string> = new Set(),
): number | undefined {
  const resolved = resolveConstExpression(expression, constInitializers, seen);
  if (!resolved) return undefined;
  const value = resolved.expression;

  if (ts.isNumericLiteral(value)) {
    const numericValue = Number(value.text);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }
  if (ts.isPrefixUnaryExpression(value)) {
    const operand = staticFiniteNumber(value.operand, constInitializers, resolved.seen);
    if (operand === undefined) return undefined;
    if (value.operator === ts.SyntaxKind.PlusToken) return operand;
    if (value.operator === ts.SyntaxKind.MinusToken) return -operand;
    return undefined;
  }
  if (ts.isBinaryExpression(value)) {
    const left = staticFiniteNumber(value.left, constInitializers, resolved.seen);
    const right = staticFiniteNumber(value.right, constInitializers, resolved.seen);
    if (left === undefined || right === undefined) return undefined;

    let result: number;
    switch (value.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken: result = left + right; break;
      case ts.SyntaxKind.MinusToken: result = left - right; break;
      case ts.SyntaxKind.AsteriskToken: result = left * right; break;
      case ts.SyntaxKind.SlashToken: result = left / right; break;
      default: return undefined;
    }
    return Number.isFinite(result) ? result : undefined;
  }
  return undefined;
}

function staticFiniteNumberArray(
  expression: ts.Expression,
  constInitializers: ConstInitializers,
  seen: ReadonlySet<string> = new Set(),
): number[] | undefined {
  const resolved = resolveConstExpression(expression, constInitializers, seen);
  if (!resolved || !ts.isArrayLiteralExpression(resolved.expression)) return undefined;

  const values: number[] = [];
  for (const element of resolved.expression.elements) {
    if (ts.isSpreadElement(element) || ts.isOmittedExpression(element)) return undefined;
    const value = staticFiniteNumber(element, constInitializers, resolved.seen);
    if (value === undefined) return undefined;
    values.push(value);
  }
  return values;
}

function snapExpressionIsActive(
  name: string,
  expression: ts.Expression,
  constInitializers: ConstInitializers,
): boolean {
  if (name === 'snapToInterval') {
    const interval = staticFiniteNumber(expression, constInitializers);
    return interval !== undefined && interval > 0;
  }

  const offsets = staticFiniteNumberArray(expression, constInitializers);
  return !!offsets && offsets.every((offset) => offset >= 0) && offsets.some((offset) => offset > 0);
}

function jsxBooleanPropIsTrue(attribute: ts.JsxAttribute): boolean {
  if (!attribute.initializer) return true;
  return ts.isJsxExpression(attribute.initializer)
    && attribute.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword;
}

function jsxSnapPropIsEnabled(
  name: string,
  attribute: ts.JsxAttribute,
  constInitializers: ConstInitializers,
): boolean {
  return !!attribute.initializer
    && ts.isJsxExpression(attribute.initializer)
    && !!attribute.initializer.expression
    && snapExpressionIsActive(name, attribute.initializer.expression, constInitializers);
}

function jsxHasIntentionalStop(
  attribute: ts.JsxAttribute,
  sourceFile: ts.SourceFile,
  constInitializers: ConstInitializers,
): boolean {
  const opening = attribute.parent.parent;
  if (!ts.isJsxOpeningElement(opening) && !ts.isJsxSelfClosingElement(opening)) return false;

  return opening.attributes.properties.some((property) => {
    if (!ts.isJsxAttribute(property)) return false;
    const name = propertyNameText(property.name, sourceFile);
    if (name === 'pagingEnabled') return jsxBooleanPropIsTrue(property);
    return (name === 'snapToInterval' || name === 'snapToOffsets')
      && jsxSnapPropIsEnabled(name, property, constInitializers);
  });
}

function objectBooleanPropIsTrue(property: ts.PropertyAssignment): boolean {
  return unwrapExpression(property.initializer).kind === ts.SyntaxKind.TrueKeyword;
}

function objectHasIntentionalStop(
  property: ts.PropertyAssignment,
  sourceFile: ts.SourceFile,
  constInitializers: ConstInitializers,
): boolean {
  const object = property.parent;
  if (!ts.isObjectLiteralExpression(object)) return false;

  return object.properties.some((candidate) => {
    if (!ts.isPropertyAssignment(candidate)) return false;
    const name = propertyNameText(candidate.name, sourceFile);
    if (name === 'pagingEnabled') return objectBooleanPropIsTrue(candidate);
    return (name === 'snapToInterval' || name === 'snapToOffsets')
      && snapExpressionIsActive(name, candidate.initializer, constInitializers);
  });
}

function lineNumberAt(sourceFile: ts.SourceFile, position: number): number {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function collectUnsafeDecelerationRates(source: string, file: string): string[] {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(file),
  );
  const constInitializers = collectConstInitializers(sourceFile);
  const offenders: string[] = [];

  const addOffender = (node: ts.Node, rate: StaticRate) => {
    const reason = rate === 'fast' ? 'fast without snap/paging' : 'dynamic or numeric rate';
    offenders.push(`${file}:${lineNumberAt(sourceFile, node.getStart(sourceFile))} (${reason})`);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && propertyNameText(node.name, sourceFile) === 'decelerationRate') {
      const rate = staticRateFromJsxAttribute(node);
      if (
        rate !== 'normal'
        && !(rate === 'fast' && jsxHasIntentionalStop(node, sourceFile, constInitializers))
      ) {
        addOffender(node, rate);
      }
    } else if (ts.isPropertyAssignment(node) && propertyNameText(node.name, sourceFile) === 'decelerationRate') {
      const rate = staticRateFromExpression(node.initializer);
      if (
        rate !== 'normal'
        && !(rate === 'fast' && objectHasIntentionalStop(node, sourceFile, constInitializers))
      ) {
        addOffender(node, rate);
      }
    } else if (
      !!node.parent
      && ts.isObjectLiteralExpression(node.parent)
      && (
        ts.isShorthandPropertyAssignment(node)
        || ts.isGetAccessorDeclaration(node)
        || ts.isSetAccessorDeclaration(node)
        || ts.isMethodDeclaration(node)
      )
      && propertyNameText(node.name, sourceFile) === 'decelerationRate'
    ) {
      addOffender(node, 'unsupported');
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return offenders;
}

describe('scroll inertia analyzer', () => {
  it.each([
    ['normal vertical scroll', '<ScrollView decelerationRate="normal" />', 0],
    ['ordinary vertical fast scroll', '<ScrollView decelerationRate="fast" />', 1],
    ['ordinary horizontal fast scroll', '<ScrollView horizontal decelerationRate="fast" />', 1],
    ['paged fast scroll', '<ScrollView horizontal pagingEnabled decelerationRate="fast" />', 0],
    ['explicitly enabled paged fast scroll', '<ScrollView pagingEnabled={true} decelerationRate="fast" />', 0],
    ['disabled paging', '<ScrollView pagingEnabled={false} decelerationRate="fast" />', 1],
    ['unresolved snapping', '<ScrollView snapToInterval={ITEM_HEIGHT} decelerationRate="fast" />', 1],
    ['disabled snapping', '<ScrollView snapToInterval={undefined} decelerationRate="fast" />', 1],
    ['expression fast literal', "<ScrollView decelerationRate={'fast'} />", 1],
    ['numeric rate', '<ScrollView decelerationRate={0.9} />', 1],
    ['aliased rate', '<ScrollView decelerationRate={RATE} />', 1],
    ['fast props object without snap', "const props = { decelerationRate: 'fast' as const };", 1],
    ['fast snapping props object', "const props = { snapToInterval: 20, decelerationRate: 'fast' as const };", 0],
    ['shorthand props alias', "const decelerationRate = 'fast'; const props = { decelerationRate };", 1],
    ['computed props key', "const props = { ['decelerationRate']: 'fast' };", 1],
    ['getter props value', "const props = { get decelerationRate() { return 'fast'; } };", 1],
    ['void snapping', '<ScrollView snapToInterval={void 0} decelerationRate="fast" />', 1],
    ['empty snap offsets', '<ScrollView snapToOffsets={[]} decelerationRate="fast" />', 1],
    ['NaN snapping', '<ScrollView snapToInterval={NaN} decelerationRate="fast" />', 1],
    ['zero const snapping', "const ITEM_HEIGHT = 0; <ScrollView snapToInterval={ITEM_HEIGHT} decelerationRate=\"fast\" />", 1],
    ['positive const snapping', "const ITEM_HEIGHT = 44; <ScrollView snapToInterval={ITEM_HEIGHT} decelerationRate=\"fast\" />", 0],
    ['derived const snapping', "const WIDTH = 90; const GAP = 10; <ScrollView snapToInterval={WIDTH + GAP} decelerationRate=\"fast\" />", 0],
    ['parameter shadows positive const', "const ITEM_HEIGHT = 44; function View({ ITEM_HEIGHT }: { ITEM_HEIGHT?: number }) { return <ScrollView snapToInterval={ITEM_HEIGHT} decelerationRate=\"fast\" />; }", 1],
    ['let shadows positive const', "const ITEM_HEIGHT = 44; function View() { let ITEM_HEIGHT = 0; return <ScrollView snapToInterval={ITEM_HEIGHT} decelerationRate=\"fast\" />; }", 1],
    ['nested const is out of scope', "function Other() { const ITEM_HEIGHT = 44; return ITEM_HEIGHT; } <ScrollView snapToInterval={ITEM_HEIGHT} decelerationRate=\"fast\" />", 1],
    ['named function expression shadows positive const', "const ITEM_HEIGHT = 44; const View = function ITEM_HEIGHT() { return <ScrollView snapToInterval={ITEM_HEIGHT as unknown as number} decelerationRate=\"fast\" />; };", 1],
    ['named class expression shadows positive const', "const ITEM_HEIGHT = 44; const View = class ITEM_HEIGHT { render() { return <ScrollView snapToInterval={ITEM_HEIGHT as unknown as number} decelerationRate=\"fast\" />; } };", 1],
    ['non-empty snap offsets', '<ScrollView snapToOffsets={[0, 20]} decelerationRate="fast" />', 0],
    ['comment text', '// <ScrollView decelerationRate="fast" />', 0],
  ])('%s', (_name, source, expectedCount) => {
    expect(collectUnsafeDecelerationRates(source, 'fixture.tsx')).toHaveLength(expectedCount);
  });
});

describe('scroll inertia contract', () => {
  it('keeps fast deceleration only for explicitly enabled snapping or paging controls', () => {
    const offenders = SOURCE_ROOTS.flatMap(listSourceFiles).flatMap((file) => {
      const relativeFile = path.relative(PROJECT_ROOT, file);
      return collectUnsafeDecelerationRates(fs.readFileSync(file, 'utf8'), relativeFile);
    });

    expect(offenders).toEqual([]);
  });
});

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

import { PAYWALL_SOURCE_VALUES } from '../app/paywall_entry_contract';
import { PREMIUM_CONTEXT_SET } from '../app/premium_context';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['app', 'components', 'hooks', 'modules'] as const;
const PREMIUM_ROUTES = new Set([
  '/premium_modal',
  '/paywall_a',
  '/paywall_b',
  '/paywall_c',
  '/paywall_d',
  '/paywall_e',
  '/paywall_f',
  '/paywall_g',
]);
const SOURCE_SET: ReadonlySet<string> = new Set(PAYWALL_SOURCE_VALUES);
const LEGACY_CONTEXT_ALIASES = new Set(['ai_dialog', 'hall_of_fame']);
const TRUSTED_FORWARDERS = new Set([
  'app/paywall_navigation.ts',
  'app/premium_modal.tsx',
]);
const REVIEWED_DYNAMIC_CONTEXTS = new Set([
  'app/(tabs)/lessons.tsx:lessonPaywallContext(lessonNum, effectiveLegacyFreeLessonCap)',
  'app/(tabs)/lessons.tsx:lessonPaywallContext( gateModal.lessonNum, effectiveLegacyFreeLessonCap, )',
  "app/community_pack_create.tsx:creatorPaywallContext('pack')",
  "app/flashcards_card_editor.tsx:creatorPaywallContext('card')",
  'app/lesson_complete.tsx:lessonPaywallContext(next)',
  'app/lesson_complete.tsx:lessonPaywallContext(premiumBannerNextLesson.current)',
  'app/lesson_menu.tsx:lessonPaywallContext(lessonId)',
  'app/lesson_premium_gate.ts:lessonPaywallContext(lessonId)',
  'app/level_exam.tsx:lessonPaywallContext(firstLessonForLevel)',
  'components/AiLimitUpsellCard.tsx:paywallContext',
  'components/NoEnergyModal.tsx:ctx',
  'components/PremiumGoldButton.tsx:paywallContext',
  'components/StatsPremiumBlur.tsx:context',
  'components/EntitlementExpiredHost.tsx:context',
  'app/flashcards/FlashcardsHubScreen.tsx:context',
  // Единый гейт голосовой попытки: контекст/source приходят из вызывающей
  // поверхности типизированными (PremiumContext / PaywallSource).
  'hooks/useSpeakingAttemptGate.ts:input.context',
]);
const REVIEWED_DYNAMIC_SOURCES = new Set([
  'app/flashcards/FlashcardsHubScreen.tsx:source',
  'app/flashcards_swipe.tsx:source',
  'hooks/useSpeakingAttemptGate.ts:input.source',
  // 2026-09-13: source приходит пропом рядом с уже одобренным динамическим
  // контекстом того же компонента (paywallContext) — обе размерности типизированы
  // хостом, а не собираются строкой на месте.
  'components/AiLimitUpsellCard.tsx:paywallSource',
  'components/PremiumGoldButton.tsx:paywallSource',
]);

type FindingKind = 'unknown_context' | 'unknown_source' | 'dynamic_context' | 'dynamic_source';
type Finding = Readonly<{
  file: string;
  line: number;
  kind: FindingKind;
  value: string;
}>;

function sourceFiles(directory: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(ROOT, absolute).replace(/\\/g, '/');
    if (relative.startsWith('app/learning-v2/')) continue;
    if (relative === 'app/ai_companion_session.tsx') continue; // Retired Max AI Tutor is out of Revenue VNext scope.
    if (entry.isDirectory()) out.push(...sourceFiles(absolute));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) out.push(absolute);
  }
  return out;
}

function unwrap(expression: ts.Expression): ts.Expression {
  if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression) || ts.isParenthesizedExpression(expression)) {
    return unwrap(expression.expression);
  }
  return expression;
}

function literalValue(expression: ts.Expression | undefined): string | null {
  if (!expression) return null;
  const value = unwrap(expression);
  return ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value) ? value.text : null;
}

function objectProperty(object: ts.ObjectLiteralExpression | undefined, name: string): ts.Expression | undefined {
  if (!object) return undefined;
  for (const property of object.properties) {
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === name) return property.name;
    if (!ts.isPropertyAssignment(property)) continue;
    const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
      ? property.name.text
      : null;
    if (propertyName === name) return property.initializer;
  }
  return undefined;
}

function objectLiteral(expression: ts.Expression | undefined): ts.ObjectLiteralExpression | undefined {
  if (!expression) return undefined;
  const value = unwrap(expression);
  return ts.isObjectLiteralExpression(value) ? value : undefined;
}

function describe(expression: ts.Expression): string {
  return expression.getText().replace(/\s+/g, ' ').slice(0, 120);
}

function inspectDimension(
  findings: Finding[],
  file: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  expression: ts.Expression | undefined,
  dimension: 'context' | 'source',
): void {
  if (!expression) return; // Explicitly quarantined legacy defaults: generic/direct.
  const literal = literalValue(expression);
  const valid = dimension === 'context' ? PREMIUM_CONTEXT_SET : SOURCE_SET;
  const { line } = sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile));
  if (literal !== null) {
    if (!valid.has(literal as never) && !(dimension === 'context' && LEGACY_CONTEXT_ALIASES.has(literal))) {
      findings.push({ file, line: line + 1, kind: `unknown_${dimension}`, value: literal });
    }
    return;
  }
  const reviewedKey = `${file}:${describe(expression)}`;
  if (dimension === 'context' && REVIEWED_DYNAMIC_CONTEXTS.has(reviewedKey)) return;
  if (dimension === 'source' && REVIEWED_DYNAMIC_SOURCES.has(reviewedKey)) return;
  findings.push({ file, line: line + 1, kind: `dynamic_${dimension}`, value: describe(expression) });
}

function inspectCall(
  findings: Finding[],
  file: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): void {
  if (ts.isIdentifier(call.expression) && file === 'app/flashcards/FlashcardsHubScreen.tsx' && call.expression.text === 'openTrainingPaywall') {
    inspectDimension(findings, file, sourceFile, call, call.arguments[0], 'context');
    inspectDimension(findings, file, sourceFile, call, call.arguments[1], 'source');
    return;
  }
  if (ts.isIdentifier(call.expression) && file === 'app/flashcards_swipe.tsx' && call.expression.text === 'openFlashcardsPlusPaywall') {
    inspectDimension(findings, file, sourceFile, call, undefined, 'context');
    inspectDimension(findings, file, sourceFile, call, call.arguments[0], 'source');
    return;
  }
  let params: ts.ObjectLiteralExpression | undefined;
  if (ts.isIdentifier(call.expression) && call.expression.text === 'openPremiumPaywall') {
    params = objectLiteral(call.arguments[1]);
    if (call.arguments[1] && !params) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile));
      findings.push({ file, line: line + 1, kind: 'dynamic_context', value: describe(call.arguments[1]) });
      findings.push({ file, line: line + 1, kind: 'dynamic_source', value: describe(call.arguments[1]) });
      return;
    }
  } else if (ts.isPropertyAccessExpression(call.expression) && ['push', 'replace'].includes(call.expression.name.text)) {
    const href = objectLiteral(call.arguments[0]);
    if (!href) return;
    const route = literalValue(objectProperty(href, 'pathname'));
    if (!route || !PREMIUM_ROUTES.has(route)) return;
    params = objectLiteral(objectProperty(href, 'params'));
    if (objectProperty(href, 'params') && !params) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile));
      findings.push({ file, line: line + 1, kind: 'dynamic_context', value: describe(objectProperty(href, 'params')!) });
      findings.push({ file, line: line + 1, kind: 'dynamic_source', value: describe(objectProperty(href, 'params')!) });
      return;
    }
  } else {
    return;
  }

  inspectDimension(findings, file, sourceFile, call, objectProperty(params, 'context'), 'context');
  inspectDimension(findings, file, sourceFile, call, objectProperty(params, 'source'), 'source');
}

test('every active Plus acquisition caller uses bounded context and source dimensions', () => {
  const findings: Finding[] = [];
  for (const sourceRoot of SOURCE_ROOTS) {
    for (const absolute of sourceFiles(path.join(ROOT, sourceRoot))) {
      const file = path.relative(ROOT, absolute).replace(/\\/g, '/');
      if (TRUSTED_FORWARDERS.has(file)) continue;
      const source = fs.readFileSync(absolute, 'utf8');
      const sourceFile = ts.createSourceFile(
        absolute,
        source,
        ts.ScriptTarget.Latest,
        true,
        absolute.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) inspectCall(findings, file, sourceFile, node);
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
  }

  expect(findings).toEqual([]);
});

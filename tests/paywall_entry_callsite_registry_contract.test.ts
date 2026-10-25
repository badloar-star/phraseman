import fs from 'fs';
import path from 'path';
import ts from 'typescript';

import { PAYWALL_SOURCE_VALUES } from '../app/paywall_entry_contract';
import { PREMIUM_CONTEXT_SET } from '../app/premium_context';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['app', 'components', 'hooks', 'modules'] as const;
// 2026-09-30 (D78): экраны /paywall_a…g удалены — единственный вход /premium_modal.
const PREMIUM_ROUTES = new Set([
  '/premium_modal',
]);
const SOURCE_SET: ReadonlySet<string> = new Set(PAYWALL_SOURCE_VALUES);
const LEGACY_CONTEXT_ALIASES = new Set(['ai_dialog', 'hall_of_fame']);
const TRUSTED_FORWARDERS = new Set([
  'app/paywall_navigation.ts',
  'app/premium_modal.tsx',
  // зачем (D196, Дизайн 15.10): общий гейт голоса пробрасывает типизированный PaywallSource поверхности (урок, ошибки, ИИ-диалог…), контекст — литерал ai_voice_input
  'hooks/use_voice_attempt_gate.ts',
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
  // 2026-10-12: шторка остановки режима энергии Б — контекст приходит пропом с одобренным значением по умолчанию 'no_energy'
  'components/energy/EnergyStopSheet.tsx:paywallContext',
  'components/StatsPremiumBlur.tsx:context',
  'components/EntitlementExpiredHost.tsx:context',
  'app/flashcards/FlashcardsHubScreen.tsx:context',
  // Единый гейт голосовой попытки: контекст/source приходят из вызывающей
  // поверхности типизированными (PremiumContext / PaywallSource).
  'hooks/useSpeakingAttemptGate.ts:input.context',
  // 2026-09-20: `const upsellContext: PremiumContext = dailyLimitExhausted
  // ? 'dialog_limit' : 'dialog_locked_level'` — обе ветки внутри контракта,
  // выбор по ФАКТУ остатка реплик (иначе человек с целыми репликами читал
  // «дневной лимит исчерпан»).
  'components/DialogsTabContent.tsx:upsellContext',
]);
const REVIEWED_DYNAMIC_SOURCES = new Set([
  'app/flashcards/FlashcardsHubScreen.tsx:source',
  'app/flashcards_swipe.tsx:source',
  'hooks/useSpeakingAttemptGate.ts:input.source',
  // 2026-09-13: source приходит пропом рядом с уже одобренным динамическим
  // контекстом того же компонента (paywallContext) — обе размерности типизированы
  // хостом, а не собираются строкой на месте.
  'components/AiLimitUpsellCard.tsx:paywallSource',
  // 2026-09-20: единый гейт дневного лимита «Работы над ошибками» —
  // `useMistakePracticeStartGate(source: PaywallSource)`. Тип параметра уже
  // замкнут контрактом, вызывающая поверхность передаёт литерал из списка.
  'hooks/useMistakePracticeStartGate.ts:source',
]);

// зачем (координатор и Дизайн 26.10, faf515267): входы dialog_limit строят params помощником dialogLimitPaywallParams('<source>')
// (те же context/source + итог первого разговора). Помощник — не «динамика»: context внутри него литерал 'dialog_limit'
// (проверка исходника ниже), а source — ЕДИНСТВЕННЫЙ аргумент, обязан быть литералом из PAYWALL_SOURCE_VALUES.
// Переменная/выражение в аргументе, пустой вызов или неизвестный литерал — красный, как у обычного вызова.
const DIALOG_LIMIT_PARAMS_HELPER = 'dialogLimitPaywallParams';
const DIALOG_LIMIT_HELPER_CONTEXT = 'dialog_limit';

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
    // зачем (2026-09-20): вырезов быть НЕ должно. Здесь стояло два `continue` —
    // 'app/learning-v2/' и 'app/ai_companion_session.tsx' («retired Max AI Tutor»).
    // Оба экрана живые и ведут на пейвол, и оба прятали по неизвестному source
    // ('learning_v2', 'ai_companion_daily_limit'), из-за чего кнопка Plus на
    // релизе молча закрывала модалку вместо продажи. Сторож без полного охвата
    // не сторож: класс бага возвращается ровно через вырез.
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
  // зачем (Ядро 25.10, combo_lesson_gate: workshop ? 'phrase_workshop' : 'combined_lesson'): условие с литералами в обеих
  // ветках — не «динамика», а два известных значения; проверяем каждую ветку по контракту, а не прячем в список одобренных.
  const unwrapped = unwrap(expression);
  if (ts.isConditionalExpression(unwrapped)) {
    inspectDimension(findings, file, sourceFile, call, unwrapped.whenTrue, dimension);
    inspectDimension(findings, file, sourceFile, call, unwrapped.whenFalse, dimension);
    return;
  }
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

function dialogLimitHelperCall(expression: ts.Expression | undefined): ts.CallExpression | undefined {
  if (!expression) return undefined;
  const value = unwrap(expression);
  return ts.isCallExpression(value) && ts.isIdentifier(value.expression) && value.expression.text === DIALOG_LIMIT_PARAMS_HELPER
    ? value
    : undefined;
}

function inspectDialogLimitHelper(
  findings: Finding[],
  file: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  helper: ts.CallExpression,
): void {
  const { line } = sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile));
  if (!PREMIUM_CONTEXT_SET.has(DIALOG_LIMIT_HELPER_CONTEXT as never)) {
    findings.push({ file, line: line + 1, kind: 'unknown_context', value: DIALOG_LIMIT_HELPER_CONTEXT });
  }
  if (helper.arguments.length !== 1) {
    findings.push({ file, line: line + 1, kind: 'dynamic_source', value: describe(helper) });
    return;
  }
  inspectDimension(findings, file, sourceFile, call, helper.arguments[0], 'source');
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
    const helper = dialogLimitHelperCall(call.arguments[1]);
    if (helper) { inspectDialogLimitHelper(findings, file, sourceFile, call, helper); return; }
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
    const helper = dialogLimitHelperCall(objectProperty(href, 'params'));
    if (helper) { inspectDialogLimitHelper(findings, file, sourceFile, call, helper); return; }
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

// зачем (координатор 25.10, инвентарь Макетов): source 'ai_explain_limit_card' жил литералом в ПРОПЕ компонента
// (<AiLimitUpsellCard paywallSource="…">), а сам компонент пробрасывает его динамически (одобрено выше) — сторож видел только
// вызовы и пропускал литерал у места использования; в стор-сборке кнопка «Посмотреть Plus» молча закрывала окно.
// Теперь литералы JSX-атрибутов paywallSource / paywallContext у ЛЮБОГО компонента тоже сверяются с контрактом.
const PAYWALL_PROP_DIMENSIONS: Readonly<Record<string, 'context' | 'source'>> = {
  paywallSource: 'source',
  paywallContext: 'context',
};

function inspectJsxAttribute(findings: Finding[], file: string, sourceFile: ts.SourceFile, attribute: ts.JsxAttribute): void {
  const name = ts.isIdentifier(attribute.name) ? attribute.name.text : null;
  const dimension = name ? PAYWALL_PROP_DIMENSIONS[name] : undefined;
  if (!dimension || !attribute.initializer) return;
  const init = attribute.initializer;
  const literal = ts.isStringLiteral(init)
    ? init.text
    : ts.isJsxExpression(init) && init.expression ? literalValue(init.expression) : null;
  if (literal === null) return; // выражение — тип пропа замкнут контрактом у компонента (PaywallSource / PremiumContext)
  const valid = dimension === 'context' ? PREMIUM_CONTEXT_SET : SOURCE_SET;
  if (valid.has(literal as never) || (dimension === 'context' && LEGACY_CONTEXT_ALIASES.has(literal))) return;
  const { line } = sourceFile.getLineAndCharacterOfPosition(attribute.getStart(sourceFile));
  findings.push({ file, line: line + 1, kind: `unknown_${dimension}`, value: literal });
}

// зачем (координатор и Ревизор 25.10, «параметры помощников»): корень ai_explain_limit_card — проброс объявлен `string`, и проверка
// типов не видела неизвестный литерал у места вызова. Поле/параметр с именем paywallSource / paywallContext обязаны иметь тип
// контракта (PaywallSource / PremiumContext), а не голый string.
function inspectStringTypedDimension(findings: Finding[], file: string, sourceFile: ts.SourceFile, node: ts.Node): void {
  if (!(ts.isPropertySignature(node) || ts.isParameter(node) || ts.isPropertyDeclaration(node))) return;
  const name = node.name && ts.isIdentifier(node.name) ? node.name.text : null;
  const dimension = name ? PAYWALL_PROP_DIMENSIONS[name] : undefined;
  if (!dimension || !node.type || node.type.kind !== ts.SyntaxKind.StringKeyword) return;
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  findings.push({ file, line: line + 1, kind: `dynamic_${dimension}`, value: `${name}: string` });
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
        if (ts.isJsxAttribute(node)) inspectJsxAttribute(findings, file, sourceFile, node);
        inspectStringTypedDimension(findings, file, sourceFile, node);
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
  }

  expect(findings).toEqual([]);
});

test('the JSX prop check itself catches an unknown literal source/context (self-test)', () => {
  const code = 'const a = <AiLimitUpsellCard paywallSource="definitely_not_a_source" paywallContext={"nope_ctx"} />;\n'
    + 'const b = <AiLimitUpsellCard paywallSource="ai_explain_limit_card" paywallContext="ai_explain" />;\n';
  const sf = ts.createSourceFile('x.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node)) inspectJsxAttribute(findings, 'x.tsx', sf, node);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  expect(findings.map((f) => `${f.kind}:${f.value}`)).toEqual([
    'unknown_source:definitely_not_a_source',
    'unknown_context:nope_ctx',
  ]);
});

test('a forwarder typed as plain string is caught (self-test)', () => {
  const code = 'type P = { paywallSource: string; paywallContext: PremiumContext };\n'
    + 'function f(paywallContext: string, paywallSource: PaywallSource) {}\n';
  const sf = ts.createSourceFile('y.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];
  const visit = (node: ts.Node): void => {
    inspectStringTypedDimension(findings, 'y.tsx', sf, node);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  expect(findings.map((f) => `${f.kind}:${f.value}`)).toEqual([
    'dynamic_source:paywallSource: string',
    'dynamic_context:paywallContext: string',
  ]);
});

test('dialogLimitPaywallParams: context внутри помощника — литерал dialog_limit (без него помощник не доверяется)', () => {
  const helper = fs.readFileSync(path.join(ROOT, 'app/dialog_first_free_summary.ts'), 'utf8').replace(/\r\n/g, '\n');
  expect(helper).toContain("return { context: 'dialog_limit', source };");
  expect(helper).toContain("context: 'dialog_limit',\n    source,");
  // любой другой context в помощнике — красный
  expect([...helper.matchAll(/context: '([a-z0-9_]+)'/g)].map((m) => m[1]).filter((v) => v !== 'dialog_limit')).toEqual([]);
});

test('dialogLimitPaywallParams: не литерал или неизвестный source — красный (self-test)', () => {
  const code = "router.push({ pathname: '/premium_modal', params: dialogLimitPaywallParams('dialogue_v2_hub') });\n"
    + "router.push({ pathname: '/premium_modal', params: dialogLimitPaywallParams('definitely_not_a_source') });\n"
    + "router.push({ pathname: '/premium_modal', params: dialogLimitPaywallParams(someSource) });\n"
    + "openPremiumPaywall(router, dialogLimitPaywallParams('dialogue_' + suffix));\n"
    + "openPremiumPaywall(router, dialogLimitPaywallParams());\n";
  const sf = ts.createSourceFile('z.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) inspectCall(findings, 'z.tsx', sf, node);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  expect(findings.map((f) => `${f.kind}:${f.value}`)).toEqual([
    'unknown_source:definitely_not_a_source',
    'dynamic_source:someSource',
    "dynamic_source:'dialogue_' + suffix",
    'dynamic_source:dialogLimitPaywallParams()',
  ]);
});

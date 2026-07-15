/**
 * Вытаскивает контент раздела «Теория» из лениво загружаемого модуля данных
 * app/lesson_help_theory_data.tsx (объект THEORY + renderLesson1TheoryEs).
 * Не трогает интро-слайды урока.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const LESSON_HELP = path.join(root, "app", "lesson_help_theory_data.tsx");

function exprToSerializable(e: ts.Expression): unknown {
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) {
    return e.text;
  }
  if (ts.isTemplateExpression(e)) {
    return { _template: e.getText() };
  }
  if (ts.isParenthesizedExpression(e)) {
    return exprToSerializable(e.expression);
  }
  if (ts.isConditionalExpression(e)) {
    return {
      uk: exprToSerializable(e.whenTrue),
      ru: exprToSerializable(e.whenFalse),
    };
  }
  if (ts.isArrayLiteralExpression(e)) {
    return e.elements.map((el) => {
      if (ts.isSpreadElement(el)) {
        return { _spread: el.expression.getText() };
      }
      return exprToSerializable(el);
    });
  }
  return { _raw: e.getText() };
}

function jsxTagName(el: ts.JsxOpeningLikeElement): string {
  const tag = el.tagName;
  if (ts.isIdentifier(tag)) return tag.text;
  return tag.getText();
}

function extractJsxAttrs(
  el: ts.JsxOpeningLikeElement,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of el.attributes.properties) {
    if (!ts.isJsxAttribute(a)) continue;
    const name = a.name.getText();
    if (name === "key" || name === "t" || name === "f") continue;
    const init = a.initializer;
    if (init && ts.isJsxExpression(init) && init.expression) {
      out[name] = exprToSerializable(init.expression);
    }
  }
  return out;
}

function extractBlocksFromArray(arr: ts.ArrayLiteralExpression): unknown[] {
  const blocks: unknown[] = [];
  for (const el of arr.elements) {
    if (ts.isJsxSelfClosingElement(el)) {
      const tag = jsxTagName(el);
      blocks.push({ type: tag, ...extractJsxAttrs(el) });
      continue;
    }
    if (ts.isJsxElement(el)) {
      const opening = el.openingElement;
      const tag = jsxTagName(opening);
      blocks.push({ type: tag, ...extractJsxAttrs(opening) });
    }
  }
  return blocks;
}

function getArrayFromRender(
  fn: ts.ArrowFunction,
): ts.ArrayLiteralExpression | undefined {
  const body = fn.body;
  if (ts.isArrayLiteralExpression(body)) return body;
  if (ts.isBlock(body)) {
    for (const st of body.statements) {
      if (
        ts.isReturnStatement(st) &&
        st.expression &&
        ts.isArrayLiteralExpression(st.expression)
      ) {
        return st.expression;
      }
    }
  }
  return undefined;
}

function findTheoryObject(
  sf: ts.SourceFile,
): ts.ObjectLiteralExpression | undefined {
  let theory: ts.ObjectLiteralExpression | undefined;
  function visit(n: ts.Node) {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === "THEORY" &&
      n.initializer &&
      ts.isObjectLiteralExpression(n.initializer)
    ) {
      theory = n.initializer;
      return;
    }
    ts.forEachChild(n, visit);
  }
  visit(sf);
  return theory;
}

function lessonKeyFromPropName(name: ts.PropertyName): number | null {
  if (ts.isNumericLiteral(name)) return parseInt(name.text, 10);
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    const n = parseInt(name.text, 10);
    return Number.isFinite(n) ? n : null;
  }
  if (ts.isIdentifier(name)) {
    const n = parseInt(name.text, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function extractTheoryHelpFromSourceFile(
  sf: ts.SourceFile,
): Record<string, unknown> {
  const theory = findTheoryObject(sf);
  if (!theory) {
    throw new Error("THEORY object not found in lesson_help.tsx");
  }

  const about =
    "Теория из экрана «Теория» (lesson_help.tsx → THEORY). Интро-слайды урока сюда не входят. У условных полей isUK ? uk : ru объект { uk, ru }.";

  const lessons: Record<string, unknown> = {};

  for (const prop of theory.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const lessonId = lessonKeyFromPropName(prop.name);
    if (lessonId === null || !ts.isObjectLiteralExpression(prop.initializer))
      continue;

    let titleRU: string | undefined;
    let titleUK: string | undefined;
    let renderFn: ts.ArrowFunction | undefined;

    for (const p of prop.initializer.properties) {
      if (!ts.isPropertyAssignment(p)) continue;
      const pn = p.name.getText();
      if (
        pn === "titleRU" &&
        p.initializer &&
        ts.isStringLiteral(p.initializer)
      ) {
        titleRU = p.initializer.text;
      }
      if (
        pn === "titleUK" &&
        p.initializer &&
        ts.isStringLiteral(p.initializer)
      ) {
        titleUK = p.initializer.text;
      }
      if (
        pn === "render" &&
        p.initializer &&
        ts.isArrowFunction(p.initializer)
      ) {
        renderFn = p.initializer;
      }
    }

    const blocks: unknown[] = [];
    if (renderFn) {
      const arr = getArrayFromRender(renderFn);
      if (arr) blocks.push(...extractBlocksFromArray(arr));
    }

    lessons[String(lessonId)] = {
      titleRU,
      titleUK,
      blocks,
    };
  }

  let blocksES: unknown[] = [];
  function visitLesson1Es(n: ts.Node) {
    if (
      ts.isFunctionDeclaration(n) &&
      n.name?.text === "renderLesson1TheoryEs" &&
      n.body
    ) {
      for (const st of n.body.statements) {
        if (
          ts.isReturnStatement(st) &&
          st.expression &&
          ts.isArrayLiteralExpression(st.expression)
        ) {
          blocksES = extractBlocksFromArray(st.expression);
        }
      }
    }
    ts.forEachChild(n, visitLesson1Es);
  }
  visitLesson1Es(sf);

  const l1 = lessons["1"];
  if (l1 && typeof l1 === "object" && !Array.isArray(l1)) {
    (l1 as Record<string, unknown>).blocksES = blocksES;
  }

  return {
    _about: about,
    lessons,
  };
}

export function extractTheoryHelpFromDisk(): Record<string, unknown> {
  const text = fs.readFileSync(LESSON_HELP, "utf8");
  const sf = ts.createSourceFile(
    "lesson_help_theory_data.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  return extractTheoryHelpFromSourceFile(sf);
}

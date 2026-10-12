/**
 * Разбор для сторожа scripts/scan_narrowed_ui_lang.mjs: язык, СУЖЕННЫЙ до части языков, подан в переводчик интерфейса.
 *
 * зачем (координатор 12.10, EN-проход Сверки cards-007/010/021): «Тренировать» и «Новая карточка» показывались по-русски на
 * английском интерфейсе, хотя тексты переведены на все 9 языков. Ломался ВЫБОР языка: подписи брались по языку перевода карточек
 * (`lang: FlashcardContentLang` → triLang(lang, …)), а редактор сужал `lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru'` и
 * индексировал полный словарь `STR[strLang]`. Сторож литералов (scan_untranslated_ui) этот класс не видит по построению.
 * Здесь — по синтаксическому дереву, с учётом области видимости (одно имя `lang` в разных функциях — разные переменные).
 */
import ts from 'typescript';

const TRANSLATORS = new Set(['triLang', 'pickLang']);
const LANG_CODES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);

/** Тип объявления — суженный язык: `…ContentLang` или союз 2–8 литералов-кодов языка. */
function isNarrowLangType(typeNode) {
  if (!typeNode) return false;
  if (ts.isTypeReferenceNode(typeNode)) return /ContentLang$/.test(typeNode.typeName.getText());
  if (ts.isUnionTypeNode(typeNode)) {
    const members = typeNode.types;
    return members.length >= 2 && members.length < LANG_CODES.size && members.every((m) => ts.isLiteralTypeNode(m)
      && ts.isStringLiteral(m.literal) && LANG_CODES.has(m.literal.text));
  }
  return false;
}

/** Инициализатор — тернарник сравнений языка, все ветви — коды языка, последний запасной — 'ru'. */
function isNarrowingConditional(node) {
  let current = node;
  while (current && ts.isParenthesizedExpression(current)) current = current.expression;
  if (!current || !ts.isConditionalExpression(current)) return false;
  let tail = current;
  while (ts.isConditionalExpression(tail)) {
    const whenTrue = tail.whenTrue;
    if (!ts.isStringLiteral(whenTrue) || !LANG_CODES.has(whenTrue.text)) return false;
    tail = tail.whenFalse;
    while (ts.isParenthesizedExpression(tail)) tail = tail.expression;
  }
  return ts.isStringLiteral(tail) && tail.text === 'ru';
}

function declarationIsNarrow(decl) {
  if (!decl) return false;
  if (isNarrowLangType(decl.type)) return true;
  return ts.isVariableDeclaration(decl) && isNarrowingConditional(decl.initializer);
}

/** Ближайшее объявление имени: параметры объемлющих функций и переменные объемлющих блоков. */
function resolveDeclaration(identifier) {
  const name = identifier.text;
  for (let node = identifier.parent; node; node = node.parent) {
    if (ts.isFunctionLike(node)) {
      const param = node.parameters?.find((p) => ts.isIdentifier(p.name) && p.name.text === name);
      if (param) return param;
    }
    if (ts.isBlock(node) || ts.isSourceFile(node) || ts.isModuleBlock(node)) {
      for (const statement of node.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        const decl = statement.declarationList.declarations.find((d) => ts.isIdentifier(d.name) && d.name.text === name);
        if (decl) return decl;
      }
    }
  }
  return null;
}

/** Находки файла: [{ line, kind, name, text }]. kind: 'translator' — triLang(x, …); 'dictionary' — СЛОВАРЬ[x]. */
export function findNarrowedUiLangUses(source, fileName = 'file.tsx') {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const found = [];
  const report = (node, what, identifier) => {
    if (!declarationIsNarrow(resolveDeclaration(identifier))) return;
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
    found.push({ line: line + 1, kind: what, name: identifier.text, text: node.getText(file).split('\n')[0].slice(0, 120) });
  };
  // Сужение прямо в месте использования: triLang(lang === 'uk' ? 'uk' : 'ru', …) / STR[lang === 'uk' ? 'uk' : 'ru'].
  const reportInline = (node, what, expression) => {
    if (!isNarrowingConditional(expression)) return;
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
    found.push({ line: line + 1, kind: what, name: '(тернарник)', text: node.getText(file).split('\n')[0].slice(0, 120) });
  };
  const walk = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && TRANSLATORS.has(node.expression.text)) {
      const first = node.arguments[0];
      if (first && ts.isIdentifier(first)) report(node, 'translator', first);
      else if (first) reportInline(node, 'translator', first);
    }
    // Словарь интерфейса принято называть КАПСОМ (STR, COPY, LABELS): `STR[strLang]`.
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && /^[A-Z][A-Z0-9_]*$/.test(node.expression.text)) {
      if (ts.isIdentifier(node.argumentExpression)) report(node, 'dictionary', node.argumentExpression);
      else reportInline(node, 'dictionary', node.argumentExpression);
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  return found;
}

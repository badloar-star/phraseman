// jsx_raw_text_scan.cjs — статический поиск «Text strings must be rendered within a <Text> component» в TSX.
// зачем (координатор 18.10, охота на крэши после находки в m05-C): React Native падает, если строка (даже один пробел)
// оказывается ребёнком не-текстового элемента. JSX выбрасывает пробелы с переводом строки, но пробел на ТОЙ ЖЕ строке
// (`</Text> {x}`) остаётся " ". Второй класс — `{n && <X/>}` при n === 0 рисует «0» вне <Text>.
// Разбор — компилятор TypeScript (тот же, что у проекта), без запуска кода.
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

/** Элементы, внутри которых строка законна: всё, что оканчивается на Text, и известные текстовые обёртки. */
function isTextLike(tagName) {
  return /Text$/.test(tagName) || tagName === 'Trans' || tagName === 'title' || tagName === 'tspan';
}

function tagNameOf(node) {
  const opening = ts.isJsxElement(node) ? node.openingElement : null;
  if (!opening) return null;
  return opening.tagName.getText();
}

/** Похоже на число: `.length`, `count`, `n`, `size`, `total`, `*Count`, `*Length`, числовой литерал. */
function looksNumeric(expr) {
  if (ts.isPropertyAccessExpression(expr)) return /^(length|size|count|total)$/i.test(expr.name.text) || /(Count|Length|Total|Size)$/.test(expr.name.text);
  if (ts.isIdentifier(expr)) return /^(n|count|total|size|len|length)$/i.test(expr.text) || /(Count|Length|Total|Size|Num)$/.test(expr.text);
  if (ts.isNumericLiteral(expr)) return true;
  return false;
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  const line = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const tag = ts.isJsxElement(node) ? tagNameOf(node) : '<>';
      const textOk = ts.isJsxElement(node) && isTextLike(tag);
      if (!textOk) {
        for (const child of node.children) {
          if (ts.isJsxText(child)) {
            const t = child.getFullText(sf);
            const meaningful = t.trim() !== '';
            const sameLineSpace = !meaningful && t.length > 0 && !t.includes('\n');
            if (meaningful || sameLineSpace) {
              // пробел между двумя элементами на одной строке тоже становится " " — React Native падает
              out.push({ file, line: line(child.getStart(sf, true) || child.pos), kind: meaningful ? 'raw_text' : 'same_line_space', parent: tag, text: JSON.stringify(t.slice(0, 40)) });
            }
          }
          if (ts.isJsxExpression(child) && child.expression && ts.isBinaryExpression(child.expression)
            && child.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && looksNumeric(child.expression.left)) {
            out.push({ file, line: line(child.getStart(sf)), kind: 'number_and', parent: tag, text: child.expression.left.getText(sf) });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return out;
}

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  const st = fs.statSync(dir);
  if (st.isFile()) { if (/\.tsx$/.test(dir)) acc.push(dir); return acc; }
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    walk(path.join(dir, name), acc);
  }
  return acc;
}

function scanRoots(root, rels) {
  const files = rels.flatMap((rel) => walk(path.join(root, rel), []));
  return files.flatMap(scanFile).map((f) => ({ ...f, file: path.relative(root, f.file).split(path.sep).join('/') }));
}

module.exports = { scanFile, scanRoots, isTextLike };

if (require.main === module) {
  const root = process.argv[2];
  const rels = process.argv.slice(3);
  const hits = scanRoots(root, rels);
  for (const h of hits) console.log(`${h.file}:${h.line} ${h.kind} parent=${h.parent} ${h.text}`);
  console.log(`total=${hits.length}`);
}

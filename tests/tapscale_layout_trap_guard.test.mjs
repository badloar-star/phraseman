// Сторож «ловушка TapScale» (10.10, Сверка video-001): TapScale кладёт `style` на внешний Pressable, а детей — в обёртку
// анимации без стиля, поэтому flexDirection:'row' / gap / flexWrap в style у TapScale с несколькими детьми НЕ действуют
// (флаг, «EN» и «⌄» вставали столбиком). Раскладку нужно держать во внутреннем View.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LAYOUT = /flexDirection\s*:\s*['"]row|\bgap\s*:|\bflexWrap\s*:/;

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

test('TapScale с несколькими детьми не получает раскладочный стиль (row/gap/wrap)', () => {
  const offenders = [];
  for (const file of [...walk(join(ROOT, 'app'), []), ...walk(join(ROOT, 'components'), [])]) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes('<TapScale')) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'TapScale') {
        const kids = node.children.filter((c) => !(ts.isJsxText(c) && !c.getText().trim()) && !(ts.isJsxExpression(c) && !c.expression));
        const style = node.openingElement.attributes.properties.find((p) => p.name && p.name.getText() === 'style');
        if (kids.length > 1 && style) {
          let text = style.getText();
          for (const m of text.matchAll(/styles\.(\w+)/g)) {
            const def = new RegExp(`\b${m[1]}\s*:\s*\{([^}]*)\}`, 's').exec(src);
            if (def) text += ` ${def[1]}`;
          }
          if (LAYOUT.test(text)) offenders.push(`${file.slice(ROOT.length)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  assert.deepEqual(offenders, [], `TapScale с row/gap в style и несколькими детьми: ${offenders.join(', ')} — вынесите строку во внутренний View`);
});

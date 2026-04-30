/**
 * Обрезает все distractors до первых N элементов в app/lesson_data*.ts
 * Заменяет только литералы массива — остальной файл не трогает.
 * Запуск: npx tsx scripts/trim_distractors_codemod.ts [--dry-run]
 */

import ts from 'typescript';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MAX = 5;
const DRY = process.argv.includes('--dry-run');
const APP = join(process.cwd(), 'app');

function patchFile(path: string): boolean {
  const text = readFileSync(path, 'utf8');
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  type Rep = { start: number; end: number; newText: string };
  const reps: Rep[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.escapedText === 'distractors' &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      const els = node.initializer.elements;
      if (els.length > MAX) {
        const parts = els.slice(0, MAX).map((el) => text.slice(el.getStart(sf), el.getEnd()));
        const newInner = parts.join(', ');
        reps.push({
          start: node.initializer.getStart(sf),
          end: node.initializer.getEnd(),
          newText: `[${newInner}]`,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (reps.length === 0) return false;

  reps.sort((a, b) => b.start - a.start);
  let out = text;
  for (const r of reps) {
    out = out.slice(0, r.start) + r.newText + out.slice(r.end);
  }

  if (!DRY) writeFileSync(path, out, 'utf8');
  return true;
}

const files = readdirSync(APP).filter((f) => /^lesson_data.*\.ts$/.test(f)).map((f) => join(APP, f));
let changed = 0;
for (const f of files.sort()) {
  if (patchFile(f)) {
    console.log(DRY ? '[dry-run would change]' : '[updated]', f);
    changed++;
  }
}
console.log(DRY ? `Dry-run done. Would touch ${changed} files.` : `Done. Updated ${changed} files.`);

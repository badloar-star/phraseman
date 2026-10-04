// PM-229 (сервер) — храповик «не подавлять ошибки молча» для functions/src.
//
// зачем (04.10): клиентская проба (pm229_silent_catch.probe.ts) смотрит только app/components/modules/hooks.
// Сервер не проверялся вовсе: 84 немых обработчика в 41 файле — очереди, рассылки, платежи, оповещения.
// Здесь тот же счётчик по functions/src. База — только сокращать: новый немой обработчик роняет прогон,
// устаревшая запись (стало меньше) — тоже.
//
// Запуск: npx tsx tests/pm229_functions_silent_catch.probe.ts            — проверка
//         PM229_LIST=1 npx tsx tests/pm229_functions_silent_catch.probe.ts — список мест
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '..', 'functions', 'src');

// Ключ — файл относительно functions/src (через /), значение — разрешённый долг. Только сокращать.
const BASELINE: Record<string, number> = {
  // Раздел MAX законсервирован владельцем 04.09 (функции сняты с деплоя) — не правим, долг при возврате.
  'max_voice_mint.ts': 10,
  'max_voice_watchdog.ts': 5,
  'max_voice_finalize.ts': 3,
  'max_voice_session_end.ts': 3,
  'max_voice_usage_recon.ts': 2,
  'max_voice_safety.ts': 1,
};

function isSilentValue(expr: ts.Expression): boolean {
  let e = expr;
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e)) e = e.expression;
  if (ts.isVoidExpression(e)) return isSilentValue(e.expression);
  if (e.kind === ts.SyntaxKind.NullKeyword || e.kind === ts.SyntaxKind.TrueKeyword
    || e.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isIdentifier(e) && e.text === 'undefined') return true;
  if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return true;
  if (ts.isArrayLiteralExpression(e)) return e.elements.length === 0;
  if (ts.isObjectLiteralExpression(e)) return e.properties.length === 0;
  return false;
}

function isSilentHandler(fn: ts.Expression): boolean {
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return false;
  if (ts.isBlock(fn.body)) return fn.body.statements.length === 0;
  return isSilentValue(fn.body);
}

export function silentCatchLines(source: string, fileName = 'x.ts'): number[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lines: number[] = [];
  const visit = (node: ts.Node): void => {
    const empty = ts.isCatchClause(node) && node.block.statements.length === 0;
    const silentCall = ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'catch' && node.arguments.length === 1 && isSilentHandler(node.arguments[0]!);
    if (empty || silentCall) lines.push(sf.getLineAndCharacterOfPosition(node.getStart()).line + 1);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return lines;
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'generated' || name === 'node_modules' || name.startsWith('.')) continue;
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) listFiles(abs, out);
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts')) out.push(abs);
  }
  return out;
}

if (require.main === module) {
  const actual: Record<string, number> = {};
  for (const abs of listFiles(root)) {
    const source = readFileSync(abs, 'utf8');
    const hits = silentCatchLines(source, abs);
    if (hits.length === 0) continue;
    const rel = path.relative(root, abs).split(path.sep).join('/');
    actual[rel] = hits.length;
    if (process.env.PM229_LIST) {
      const text = source.split('\n');
      for (const ln of hits) console.log(`${rel}:${ln}: ${text[ln - 1]!.trim().slice(0, 150)}`);
    }
  }
  if (!process.env.PM229_LIST) {
    const problems: string[] = [];
    for (const [file, count] of Object.entries(actual)) {
      const allowed = BASELINE[file] ?? 0;
      if (count > allowed) problems.push(`${file}: немых обработчиков ${count}, разрешено ${allowed} — запиши причину в лог`);
    }
    for (const [file, allowed] of Object.entries(BASELINE)) {
      const count = actual[file] ?? 0;
      if (count < allowed) problems.push(`${file}: стало ${count} < ${allowed} — сократи BASELINE`);
    }
    assert.deepEqual(problems, [], problems.join('\n'));
    const total = Object.values(actual).reduce((a, b) => a + b, 0);
    console.log(`PM-229 FUNCTIONS PROBE PASS: silentCatch=${total} files=${Object.keys(actual).length}`);
  }
}

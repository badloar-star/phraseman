// PM-229 — ратчет «не подавлять ошибки молча».
//
// зачем: PM-229 (A1) — в очередях, outbox, синхронизации и фоновых работах не
// должно быть `catch {}` и `.catch(() => {})` без причины в логе. Годами так
// умирали целые механизмы (прогрев картинок, почта) — и никто не видел.
// Проба считает немые обработчики в app/, components/, modules/, hooks/ и роняет
// прогон, если их больше, чем записано в BASELINE. Список может только
// сокращаться: устаревшая запись (стало меньше) тоже роняет пробу.
//
// Немой = `catch {}` / `catch (e) {}` с пустым телом (комментарии не считаются
// действием) ИЛИ `.catch(() => {})` / `.catch(() => null|undefined|[]|{}|false|0)`
// без единого вызова внутри.
//
// Запуск: npx tsx tests/pm229_silent_catch.probe.ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'modules', 'hooks'] as const;
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'graphify-out', '__mocks__']);

// Ключ — файл, значение — сколько немых обработчиков разрешено (долг).
// Только сокращать. Новые файлы сюда не добавлять — логируй причину.
// База на 04.10: 37 (было 42 → 41 → 37): statsCache, mistake_practice_answer_journal, flashcards_speaking_session пишут причину.
const BASELINE: Record<string, number> = {
  'app/account_switch_quarantine.ts': 3,
  'app/app_snapshot_bootstrap.ts': 5, // Q5: чтение Avatar DNA на старте удалено
  'app/auth_provider.ts': 25, // 04.10: 26 → 25 (запись в HEAD уже была устаревшей)
  'app/debug-logger.ts': 2, // PM-228 2026-10-01: 7 → 2 (остались .catch(() => undefined) в цепочке очереди — намеренный разрыв цепочки)
  'modules/phone-state/keyed_exclusive_transaction.ts': 1,
  'modules/account-session-v2/account_detach_latch.ts': 1, // E22 2026-10-01: намеренный разрыв цепочки очереди (tail = next.catch(...))
};

function listSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(abs);
    }
  };
  for (const dir of SCAN_DIRS) walk(path.join(root, dir));
  return out;
}

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

export function countSilent(source: string, fileName = 'x.ts'): number {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  let n = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isCatchClause(node) && node.block.statements.length === 0) n += 1;
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'catch' && node.arguments.length === 1
      && isSilentHandler(node.arguments[0]!)) n += 1;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return n;
}

if (require.main === module || process.argv[1]?.endsWith('pm229_silent_catch.probe.ts')) {
  const found: Record<string, number> = {};
  let total = 0;
  for (const abs of listSourceFiles()) {
    const n = countSilent(readFileSync(abs, 'utf8'), abs);
    if (n > 0) { found[path.relative(root, abs).replace(/\\/g, '/')] = n; total += n; }
  }
  if (process.argv.includes('--print')) {
    for (const [f, n] of Object.entries(found).sort()) console.log(`  '${f}': ${n},`);
    console.log(`TOTAL ${total}`);
  } else {
    const violations = Object.entries(found)
      .filter(([f, n]) => n > (BASELINE[f] ?? 0))
      .map(([f, n]) => `${f}: немых catch ${n}, разрешено ${BASELINE[f] ?? 0}`);
    const stale = Object.entries(BASELINE)
      .filter(([f, n]) => (found[f] ?? 0) < n)
      .map(([f, n]) => `${f}: осталось ${found[f] ?? 0} из ${n} — сократи BASELINE (ратчет)`);
    if (violations.length + stale.length > 0) {
      console.error('[PM-229] silent catch ratchet:');
      for (const l of [...violations, ...stale]) console.error(`  - ${l}`);
    }
    assert.equal(violations.length, 0, 'PM-229: новые немые catch — залогируй причину (DebugLogger / console.warn с префиксом)');
    assert.equal(stale.length, 0, 'PM-229: BASELINE устарел — сократи (ратчет только уменьшается)');
    console.log(`PM-229 PROBE PASS: silentCatch=${total} files=${Object.keys(found).length}`);
  }
}

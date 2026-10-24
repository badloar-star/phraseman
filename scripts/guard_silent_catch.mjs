#!/usr/bin/env node
/**
 * Сторож «никаких немых catch» — только для ДОБАВЛЕННЫХ строк staged-диффа.
 *
 * зачем (правило владельца 29.08 «сперва логи»; координатор 25.10 ночью): за ночь 24.10 в коммиты пролезли 4 немых catch
 * (e9fa41f24 ×3, a50cfbf18) — глушённая ошибка делает функцию мёртвой без следа (так месяцами молчал прогрев картинок).
 * Старый код не трогаем: смотрим только добавленные строки .ts/.tsx/.js/.jsx/.mjs/.cjs (без tests/ и generated).
 *
 * Немой catch: `catch {}`, `catch (e) {}`, `.catch(() => {})` / `=> undefined|null` и любой catch-блок, в теле которого нет
 * вызова логгера (DebugLogger, console.warn/error/log, logger, noteSwallowed/reportSwallowed/swallowError) и нет throw.
 *
 * Режим: ПРЕДУПРЕЖДЕНИЕ — печатает [SILENT-CATCH] файл:строка и выходит с кодом 0 (ночью 10 сессий коммитят — не стопорим).
 * Блокирующим станет флагом --strict (включить в pre-commit после релиза по слову владельца).
 *   node scripts/guard_silent_catch.mjs            — staged-дифф (pre-commit)
 *   node scripts/guard_silent_catch.mjs --strict   — то же, код 1 при находке
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG = '[SILENT-CATCH]';
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP = /(^|\/)(tests?|__tests__)\/|\.test\.|\.spec\.|\.probe\.|_gate\.ts$|generated|\.d\.ts$/;
const LOGGER = /DebugLogger|console\.(warn|error|log|info)|\blogger\b|\blog\(|noteSwallowed|reportSwallowed|swallowError|\bthrow\b|logAppError|recordError/;
const BODY_LOOKAHEAD = 12;

/** Найти немые catch в тексте unified-диффа. Возвращает [{ file, line, text }] только по добавленным строкам. */
export function findSilentCatchesInDiff(diffText) {
  const hits = [];
  const lines = String(diffText).split(/\r?\n/);
  let file = null;
  let newLine = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.startsWith('+++ ')) { file = raw.replace(/^\+\+\+ (b\/)?/, ''); continue; }
    if (raw.startsWith('--- ')) continue;
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(raw);
    if (hunk) { newLine = Number(hunk[1]); continue; }
    if (file === null) continue;
    if (raw.startsWith('-')) continue;
    const added = raw.startsWith('+');
    const text = raw.slice(1);
    const lineNo = newLine;
    newLine += 1;
    if (!added || !CODE.test(file) || SKIP.test(file)) continue;
    const t = text.trim();
    if (!/\bcatch\b/.test(t)) continue;
    if (LOGGER.test(t)) continue;
    // однострочные: catch {} / catch (e) {} / .catch(() => {}) / => undefined | null | void 0
    if (/\bcatch\s*(\([^)]*\))?\s*\{\s*\}/.test(t) || /\.catch\(\s*\(?\s*\w*\s*\)?\s*=>\s*(\{\s*\}|undefined|null|void 0)\s*\)/.test(t)) {
      hits.push({ file, line: lineNo, text: t });
      continue;
    }
    // однострочная стрелка с телом без логгера: .catch(() => { if (alive) setData(null); })
    if (/\.catch\(\s*\(?\s*\w*\s*\)?\s*=>\s*\{.*\}\s*\)/.test(t)) {
      hits.push({ file, line: lineNo, text: t });
      continue;
    }
    // блок: catch (...) { … }  или  .catch((e) => {  — смотрим тело до закрывающей скобки уровня
    if (/\bcatch\s*(\([^)]*\))?\s*\{\s*$/.test(t) || /\.catch\(\s*\(?\s*\w*\s*\)?\s*=>\s*\{\s*$/.test(t)) {
      let depth = 1;
      let logged = false;
      for (let j = i + 1; j < lines.length && j <= i + BODY_LOOKAHEAD; j += 1) {
        const next = lines[j];
        if (next.startsWith('-') || next.startsWith('@@') || next.startsWith('+++') || next.startsWith('diff ')) break;
        const body = next.slice(1);
        if (LOGGER.test(body)) { logged = true; break; }
        for (const ch of body) { if (ch === '{') depth += 1; else if (ch === '}') depth -= 1; }
        if (depth <= 0) break;
      }
      if (!logged) hits.push({ file, line: lineNo, text: t });
    }
  }
  return hits;
}

function main() {
  const strict = process.argv.includes('--strict');
  let diff = '';
  try {
    diff = execFileSync('git', ['diff', '--cached', '--unified=12', '--no-color', '--', '*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (error) {
    console.warn(`${LOG} git diff не прочитан — проверка пропущена: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(0);
  }
  const hits = findSilentCatchesInDiff(diff);
  if (hits.length === 0) {
    console.log(`${LOG} ok — в добавленных строках немых catch нет`);
    process.exit(0);
  }
  for (const hit of hits) console.warn(`${LOG} ${hit.file}:${hit.line} — catch без лога причины: «${hit.text.slice(0, 100)}»`);
  console.warn(`${LOG} ${hits.length} шт. — добавь лог с причиной (правило владельца «никаких немых catch»)${strict ? '' : '; сейчас только предупреждение, коммит не блокируется'}`);
  process.exit(strict ? 1 : 0);
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) main();

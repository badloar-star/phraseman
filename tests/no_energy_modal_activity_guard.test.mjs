// зачем (Макеты 2bac25805, dialogs-011; правило владельца 15.09 «тексты модалов по разделу»): вызов <NoEnergyModal> без `activity` молча брал «classic_lesson»,
// и в Диалогах окно говорило «Для урока нужно 1 ⚡». Сторож: у КАЖДОГО вызова в app/ и components/ есть проп `activity=`, а у вызова в Диалогах — именно "ai_dialog".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIRS = ['app', 'components'];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

/** Все вызовы `<NoEnergyModal …>`: от «<NoEnergyModal» до закрывающего «>» тега с учётом `{…}` и `=>` внутри пропсов. */
function callsOf(src) {
  const calls = [];
  let from = 0;
  for (;;) {
    const at = src.indexOf('<NoEnergyModal', from);
    if (at < 0) break;
    let depth = 0;
    let i = at + '<NoEnergyModal'.length;
    for (; i < src.length; i += 1) {
      const ch = src[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      else if (ch === '>' && depth === 0 && src[i - 1] !== '=') break;
    }
    calls.push({ tag: src.slice(at, i + 1), line: src.slice(0, at).split('\n').length });
    from = i + 1;
  }
  return calls;
}

const files = DIRS.flatMap((d) => walk(join(ROOT, d), []))
  .map((f) => ({ rel: relative(ROOT, f).split(sep).join('/'), src: readFileSync(f, 'utf8').replace(/\r\n/g, '\n') }))
  .filter((f) => f.rel !== 'components/NoEnergyModal.tsx');

test('у каждого вызова NoEnergyModal есть activity', () => {
  const missing = [];
  let total = 0;
  for (const f of files) {
    for (const c of callsOf(f.src)) {
      total += 1;
      if (!/\bactivity=/.test(c.tag)) missing.push(`${f.rel}:${c.line}`);
    }
  }
  assert.ok(total >= 20, `вызовов найдено ${total} — парсер сломался?`);
  assert.deepEqual(missing, [], `вызов без activity — окно упадёт на «урок»: ${missing.join(', ')}`);
});

test('в Диалогах (брифинг) окно называет разговор: variant="dialogs" ⇒ activity="ai_dialog"', () => {
  const briefing = files.find((f) => f.rel === 'app/dialogue_v2_briefing.tsx');
  assert.ok(briefing, 'экран брифинга не найден');
  const calls = callsOf(briefing.src);
  assert.equal(calls.length, 1);
  assert.match(calls[0].tag, /variant="dialogs"/);
  assert.match(calls[0].tag, /activity="ai_dialog"/);
});

/**
 * Полировка сидов A2/B1 (+ A1 JSON): правки смысла, дедуп translate_meaning по тексту вопроса,
 * общий дедуп по вопросу+набору вариантов. Потом build_arena_a2 / build_arena_b1.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[`'‘’]/g, "'")
    .replace(/[?.!,:;]/g, '')
    .trim();
}

function normQuestion(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[`'‘’]/g, "'")
    .trim();
}

function normKey(q) {
  const optKey = [...(q.options || [])].map((o) => norm(o)).sort().join('|');
  return `${norm(q.question)}||${optKey}`;
}

/** Оценка «лучшей» карточки translate_meaning при одном и том же вопросе */
function scoreTranslate(q) {
  let s = 0;
  const qq = normQuestion(q.question);
  const c = q.correct || '';
  // Заведомо плохий ключ
  if (qq.includes('once in a while') && /very rarely|очень редко/i.test(c)) s -= 500;
  if (qq.includes('every now and then') && /^иногда$/i.test(c.trim()) && !c.includes('·')) {
    // «время от времени» точнее; если есть другая карточка — она выиграет чуть ниже
    s -= 30;
  }
  // Предпочитаем двуязычные подписи
  if (c.includes('·')) s += 8;
  for (const o of q.options || []) {
    if (String(o).includes('·')) s += 2;
  }
  s += Math.min(15, String(q.rule || '').length / 25);
  return s;
}

function dedupeTranslateMeanings(rows) {
  const by = new Map();
  const order = [];
  for (const q of rows) {
    if (q.type !== 'translate_meaning') continue;
    const k = normQuestion(q.question);
    if (!by.has(k)) {
      by.set(k, q);
      order.push(k);
    } else {
      const cur = by.get(k);
      if (scoreTranslate(q) > scoreTranslate(cur)) by.set(k, q);
    }
  }
  const keepTm = new Set(by.values());
  const out = [];
  let dropped = 0;
  for (const q of rows) {
    if (q.type === 'translate_meaning') {
      if (keepTm.has(q)) out.push(q);
      else dropped++;
    } else out.push(q);
  }
  return { out, droppedTm: dropped };
}

function globalDedupe(rows) {
  const seen = new Set();
  const out = [];
  let d = 0;
  for (const q of rows) {
    const k = normKey(q);
    if (!k || seen.has(k)) {
      d++;
      continue;
    }
    seen.add(k);
    out.push(q);
  }
  return { out, dropped: d };
}

/** Точечные исправления смысла / формулировок */
function applyFixes(rows) {
  for (const q of rows) {
    if (q.type !== 'translate_meaning') continue;
    const qq = normQuestion(q.question);
    if (qq.includes('once in a while')) {
      if (/very rarely|очень редко/i.test(q.correct)) {
        q.options = [
          'Иногда · Іноді',
          'Всегда · Завжди',
          'Никогда · Ніколи',
          'Прямо сейчас · Прямо зараз',
        ];
        q.correct = 'Иногда · Іноді';
        q.rule =
          'Once in a while — иногда, время от времени · Іноді, час від часу';
      }
    }
  }
  return rows;
}

function processSeed(relPath, label) {
  const p = path.join(__dirname, relPath);
  let rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  const n0 = rows.length;
  rows = applyFixes(rows);
  const r1 = dedupeTranslateMeanings(rows);
  rows = r1.out;
  const r2 = globalDedupe(rows);
  rows = r2.out;
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  console.log(
    label,
    JSON.stringify({
      was: n0,
      now: rows.length,
      droppedTranslateDup: r1.droppedTm,
      droppedGlobalDup: r2.dropped,
    }),
  );
}

function processA1() {
  const p = path.join(root, 'assets', 'arena_questions_a1.json');
  let rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  const n0 = rows.length;
  // нормализуем объекты как сиды (у A1 те же поля)
  rows = rows.map((q) => ({
    type: q.type,
    task: q.task,
    question: q.question,
    options: q.options,
    correct: q.correct,
    rule: q.rule,
  }));
  rows = applyFixes(rows);
  const r1 = dedupeTranslateMeanings(rows);
  rows = r1.out;
  const r2 = globalDedupe(rows);
  rows = r2.out;
  const out = rows.map((q, i) => ({
    id: `a1_${String(i + 1).padStart(3, '0')}`,
    level: 'A1',
    type: q.type,
    task: q.task ?? '',
    question: q.question,
    options: q.options,
    correct: q.correct,
    rule: q.rule ?? '',
  }));
  fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(
    'A1',
    JSON.stringify({
      was: n0,
      now: out.length,
      droppedTranslateDup: r1.droppedTm,
      droppedGlobalDup: r2.dropped,
    }),
  );
}

processSeed('a2_seed.json', 'A2 seed');
processSeed('b1_seed.json', 'B1 seed');
processA1();

const r2 = spawnSync(process.execPath, [path.join(__dirname, 'build_arena_a2.mjs')], {
  cwd: root,
  stdio: 'inherit',
});
if (r2.status) process.exit(r2.status);
const r1 = spawnSync(process.execPath, [path.join(__dirname, 'build_arena_b1.mjs')], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(r1.status ?? 0);

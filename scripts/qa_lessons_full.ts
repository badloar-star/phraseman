/**
 * Полная QA-проверка уроков 1–32.
 * Запуск: npx tsx scripts/qa_lessons_full.ts [--group A|B|C|D|E|F|G|all] [--lesson N]
 *
 * Печатает отчёт по группам A–G с количеством ошибок/ворнингов и примерами.
 */

import { LESSON_DATA, ALL_LESSONS } from '../app/lesson_data_all';
import type { LessonPhrase, LessonWord } from '../app/lesson_data_types';

type Severity = 'error' | 'warning' | 'info';
interface Issue {
  group: string;       // 'A1', 'B2', ...
  severity: Severity;
  lessonId: number;
  phraseId?: string | number;
  message: string;
}

const args = process.argv.slice(2);
const groupArg = (args.find((a) => a.startsWith('--group=')) ?? '--group=all').split('=')[1].toUpperCase();
const lessonArg = args.find((a) => a.startsWith('--lesson='));
const onlyLesson = lessonArg ? Number(lessonArg.split('=')[1]) : null;

const issues: Issue[] = [];
const push = (i: Issue) => issues.push(i);

const wantGroup = (g: string) => groupArg === 'ALL' || groupArg === g[0];

/* ---------------- A. Структура и реестр ---------------- */

function checkA() {
  // A1: все 32 урока, есть titleRU/titleUK
  for (let id = 1; id <= 32; id++) {
    const meta = LESSON_DATA[id];
    if (!meta) {
      push({ group: 'A1', severity: 'error', lessonId: id, message: `Урок ${id} отсутствует в LESSON_DATA` });
      continue;
    }
    if (!meta.titleRU || !meta.titleRU.trim()) {
      push({ group: 'A1', severity: 'error', lessonId: id, message: `Пустой titleRU` });
    }
    if (!meta.titleUK || !meta.titleUK.trim()) {
      push({ group: 'A1', severity: 'error', lessonId: id, message: `Пустой titleUK` });
    }
  }

  // A2: id 1..32 без дыр (по ALL_LESSONS и LESSON_DATA)
  const ids = Object.keys(LESSON_DATA).map(Number).sort((a, b) => a - b);
  for (let i = 1; i <= 32; i++) {
    if (!ids.includes(i)) push({ group: 'A2', severity: 'error', lessonId: i, message: `id ${i} отсутствует в LESSON_DATA` });
  }
  const allIds = ALL_LESSONS.map((l) => l.id).sort((a, b) => a - b);
  for (let i = 1; i <= 32; i++) {
    if (!allIds.includes(i)) push({ group: 'A2', severity: 'error', lessonId: i, message: `id ${i} отсутствует в ALL_LESSONS` });
  }
  const dup = allIds.filter((x, i) => allIds.indexOf(x) !== i);
  if (dup.length) push({ group: 'A2', severity: 'error', lessonId: 0, message: `Дубли id в ALL_LESSONS: ${dup.join(',')}` });

  // A3 и A5: уникальность и pattern id внутри урока
  for (let id = 1; id <= 32; id++) {
    const phrases = LESSON_DATA[id]?.phrases ?? [];
    const seen = new Map<string, number>();
    for (const p of phrases) {
      const key = String(p.id);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, n] of seen) {
      if (n > 1) push({ group: 'A3', severity: 'error', lessonId: id, phraseId: key, message: `id "${key}" встречается ${n} раз внутри урока ${id}` });
    }
    // A5: имя id содержит "lessonN" / "lN" / "L<N>" / номер урока
    const idStr = String(id);
    for (const p of phrases) {
      const k = String(p.id).toLowerCase();
      const matchesLesson =
        k.includes(`lesson${idStr}_`) ||
        k.includes(`l${idStr}_`) ||
        k.includes(`l${idStr}p`) ||
        k.includes(`_l${idStr}_`) ||
        k.includes(`l${idStr}-`) ||
        new RegExp(`(^|[_-])${idStr}([_-]|$)`).test(k);
      if (!matchesLesson) {
        push({ group: 'A5', severity: 'warning', lessonId: id, phraseId: p.id, message: `id "${p.id}" не содержит номера урока ${id}` });
      }
    }
  }

  // A4: уникальность id фраз глобально
  const globalSeen = new Map<string, { lesson: number; count: number }[]>();
  for (let id = 1; id <= 32; id++) {
    const phrases = LESSON_DATA[id]?.phrases ?? [];
    for (const p of phrases) {
      const key = String(p.id);
      const arr = globalSeen.get(key) ?? [];
      const found = arr.find((x) => x.lesson === id);
      if (found) found.count++;
      else arr.push({ lesson: id, count: 1 });
      globalSeen.set(key, arr);
    }
  }
  for (const [key, arr] of globalSeen) {
    const total = arr.reduce((a, b) => a + b.count, 0);
    if (total > 1) {
      const lessons = arr.map((x) => `${x.lesson}×${x.count}`).join(', ');
      push({ group: 'A4', severity: 'error', lessonId: arr[0].lesson, phraseId: key, message: `id "${key}" встречается ${total} раз: ${lessons}` });
    }
  }

  // A6: english/russian/ukrainian/words[] непустые
  for (let id = 1; id <= 32; id++) {
    const phrases = LESSON_DATA[id]?.phrases ?? [];
    for (const p of phrases) {
      if (!p.english || !p.english.trim()) push({ group: 'A6', severity: 'error', lessonId: id, phraseId: p.id, message: `Пустой english` });
      if (!p.russian || !p.russian.trim()) push({ group: 'A6', severity: 'error', lessonId: id, phraseId: p.id, message: `Пустой russian` });
      if (!p.ukrainian || !p.ukrainian.trim()) push({ group: 'A6', severity: 'error', lessonId: id, phraseId: p.id, message: `Пустой ukrainian` });
      if (!p.words || p.words.length === 0) push({ group: 'A6', severity: 'error', lessonId: id, phraseId: p.id, message: `Пустой words[]` });
    }
  }

  // A7: распределение количества фраз
  const counts: Record<number, number> = {};
  for (let id = 1; id <= 32; id++) counts[id] = (LESSON_DATA[id]?.phrases ?? []).length;
  // печатается отдельно при выводе отчёта
  (globalThis as any).__lessonCounts = counts;
}

/* ---------------- B. Слова ↔ фраза ---------------- */

// Та же нормализация, что и в constants/contractions.ts (без раскрытия contractions —
// здесь нужна сравнимость токенов, а не семантика)
function normalizeForJoinCheck(s: string): string {
  return s.trim().replace(/[.!?,;]+$/, '').replace(/\s+/g, ' ').trim();
}

function checkB() {
  for (let id = 1; id <= 32; id++) {
    const phrases = LESSON_DATA[id]?.phrases ?? [];
    for (const p of phrases) {
      const words = p.words ?? [];
      const joined = words.map((w) => w.text).join(' ');
      // B1 (strict): join === english
      if (joined !== p.english) {
        // Если совпадает после удаления только конечной пунктуации — это не баг (валидатор
        // нормализует тоже), но всё равно несогласованность данных → warning, а не error.
        if (normalizeForJoinCheck(joined) === normalizeForJoinCheck(p.english)) {
          push({
            group: 'B1', severity: 'warning', lessonId: id, phraseId: p.id,
            message: `words.join(' ') отличается от english только конечной пунктуацией: words="${joined}" / english="${p.english}"`,
          });
        } else {
          push({
            group: 'B1', severity: 'error', lessonId: id, phraseId: p.id,
            message: `words.join(' ') !== english (даже без хвостовой пунктуации)\n         words: "${joined}"\n         engl.: "${p.english}"`,
          });
        }
      }
      // B2: text === correct
      for (const [i, w] of words.entries()) {
        if (w.text !== w.correct) {
          push({ group: 'B2', severity: 'error', lessonId: id, phraseId: p.id, message: `words[${i}].text !== correct: "${w.text}" vs "${w.correct}"` });
        }
        // B3: пустые
        if (!w.text) push({ group: 'B3', severity: 'error', lessonId: id, phraseId: p.id, message: `words[${i}].text пустой` });
        if (!w.correct) push({ group: 'B3', severity: 'error', lessonId: id, phraseId: p.id, message: `words[${i}].correct пустой` });
      }
    }
  }
}

/* ---------------- C. Дистракторы ---------------- */

function endPunct(s: string): string {
  const m = s.match(/[.!?,;:]+$/);
  return m ? m[0] : '';
}
function caseStyle(s: string): 'upper-first' | 'lower-first' | 'all-upper' | 'mixed' {
  const stripped = s.replace(/[^A-Za-zА-Яа-яЁёІіЇїЄєҐґ]/g, '');
  if (!stripped) return 'mixed';
  if (stripped === stripped.toUpperCase() && stripped.length > 1) return 'all-upper';
  const first = stripped[0];
  if (first === first.toUpperCase() && first !== first.toLowerCase()) return 'upper-first';
  return 'lower-first';
}

function checkC() {
  for (let id = 1; id <= 32; id++) {
    const phrases = LESSON_DATA[id]?.phrases ?? [];
    for (const p of phrases) {
      const phraseTexts = new Set((p.words ?? []).map((w) => w.text.toLowerCase()));
      for (const [i, w] of (p.words ?? []).entries()) {
        const d = w.distractors ?? [];
        // C1: ровно 5
        if (d.length !== 5) {
          push({ group: 'C1', severity: 'error', lessonId: id, phraseId: p.id, message: `words[${i}] "${w.text}": distractors.length=${d.length}, ожидалось 5` });
        }
        // C2: уникальны (case-insensitive)
        const lower = d.map((x) => x.toLowerCase());
        const seen = new Set<string>();
        for (const x of lower) {
          if (seen.has(x)) {
            push({ group: 'C2', severity: 'error', lessonId: id, phraseId: p.id, message: `words[${i}] "${w.text}": дубль дистрактора "${x}"` });
            break;
          }
          seen.add(x);
        }
        // C3: дистрактор != correct
        for (const x of d) {
          if (x.toLowerCase() === w.correct.toLowerCase()) {
            push({ group: 'C3', severity: 'error', lessonId: id, phraseId: p.id, message: `words[${i}] "${w.text}": дистрактор "${x}" равен correct` });
          }
        }
        // C4: дистрактор != другому слову во фразе
        for (const x of d) {
          if (phraseTexts.has(x.toLowerCase()) && x.toLowerCase() !== w.text.toLowerCase()) {
            push({ group: 'C4', severity: 'warning', lessonId: id, phraseId: p.id, message: `words[${i}] "${w.text}": дистрактор "${x}" совпадает с другим словом фразы` });
          }
        }
        // C5: длина (±2)
        for (const x of d) {
          const diff = Math.abs(x.length - w.correct.length);
          if (diff > 2) {
            push({ group: 'C5', severity: 'warning', lessonId: id, phraseId: p.id, message: `words[${i}] "${w.text}": длина дистрактора "${x}" отличается на ${diff} (>2)` });
          }
        }
        // C6: капитализация (только первая буква)
        const csCorrect = caseStyle(w.correct);
        for (const x of d) {
          if (caseStyle(x) !== csCorrect) {
            push({ group: 'C6', severity: 'warning', lessonId: id, phraseId: p.id, message: `words[${i}] "${w.text}": капитализация дистрактора "${x}" (${caseStyle(x)}) != "${w.correct}" (${csCorrect})` });
          }
        }
        // C7: пунктуация в конце
        const epCorrect = endPunct(w.correct);
        for (const x of d) {
          const ep = endPunct(x);
          if (ep !== epCorrect) {
            push({ group: 'C7', severity: 'warning', lessonId: id, phraseId: p.id, message: `words[${i}] "${w.text}": пунктуация дистрактора "${x}" ("${ep || '-'}") != correct "${w.correct}" ("${epCorrect || '-'}")` });
          }
        }
      }
    }
  }
}

/* ---------------- D. Переводы ---------------- */

function checkD() {
  for (let id = 1; id <= 32; id++) {
    const phrases = LESSON_DATA[id]?.phrases ?? [];
    for (const p of phrases) {
      // D1
      if (p.russian && p.russian.trim().toLowerCase() === p.english.trim().toLowerCase()) {
        push({ group: 'D1', severity: 'error', lessonId: id, phraseId: p.id, message: `russian == english: "${p.russian}"` });
      }
      // D2
      if (p.ukrainian && p.ukrainian.trim().toLowerCase() === p.english.trim().toLowerCase()) {
        push({ group: 'D2', severity: 'error', lessonId: id, phraseId: p.id, message: `ukrainian == english: "${p.ukrainian}"` });
      }
      // D3: ru == uk в длинной фразе
      if (p.russian && p.ukrainian && p.russian.trim() === p.ukrainian.trim()) {
        const len = p.russian.split(/\s+/).length;
        if (len >= 4) {
          push({ group: 'D3', severity: 'warning', lessonId: id, phraseId: p.id, message: `russian == ukrainian (${len} слов): "${p.russian}"` });
        }
      }
      // D4: alternatives
      if (p.alternatives) {
        const seen = new Set<string>();
        for (const a of p.alternatives) {
          if (!a || !a.trim()) {
            push({ group: 'D4', severity: 'error', lessonId: id, phraseId: p.id, message: `пустая альтернатива в alternatives` });
            continue;
          }
          const k = a.trim().toLowerCase();
          if (seen.has(k)) push({ group: 'D4', severity: 'warning', lessonId: id, phraseId: p.id, message: `дубль в alternatives: "${a}"` });
          seen.add(k);
        }
      }
    }
  }
}

/* ---------------- E. Типографика ---------------- */

function checkE() {
  const checkStr = (s: string, where: string, lessonId: number, phraseId: any) => {
    // E1: двойные пробелы
    if (/ {2,}/.test(s)) push({ group: 'E1', severity: 'warning', lessonId, phraseId, message: `${where}: двойной пробел в "${s}"` });
    // E1: висячий пробел
    if (/^\s|\s$/.test(s)) push({ group: 'E1', severity: 'warning', lessonId, phraseId, message: `${where}: ведущий/висячий пробел в "${s}"` });
    // E1: пробел перед знаком препинания
    if (/\s+[,.;:!?]/.test(s)) push({ group: 'E1', severity: 'warning', lessonId, phraseId, message: `${where}: пробел перед знаком в "${s}"` });
    // E2: en/em-dash смешано с дефисом — пометим присутствие
    if (/[\u2013\u2014]/.test(s)) push({ group: 'E2', severity: 'info', lessonId, phraseId, message: `${where}: en/em-dash в "${s}"` });
    // E3: ... vs …
    if (/\u2026/.test(s)) push({ group: 'E3', severity: 'info', lessonId, phraseId, message: `${where}: \u2026 (one-char) в "${s}"` });
    // E4: невидимые символы
    const invisible = /[\u00A0\u200B\u200C\u200D\uFEFF]/;
    if (invisible.test(s)) {
      const codes = [...s].filter((c) => invisible.test(c)).map((c) => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(',');
      push({ group: 'E4', severity: 'error', lessonId, phraseId, message: `${where}: невидимый символ (${codes}) в "${s}"` });
    }
  };

  const checkApostropheUk = (s: string, where: string, lessonId: number, phraseId: any) => {
    // E5: типографские/кириллические апострофы вместо ASCII '
    // U+2019 ’, U+02BC ʼ, U+2018 ‘, U+0301 (combining acute) — частые подделки
    if (/[\u2019\u02BC\u2018\u0060\u00B4]/.test(s)) {
      push({ group: 'E5', severity: 'error', lessonId, phraseId, message: `${where}: не-ASCII апостроф в "${s}"` });
    }
  };

  for (let id = 1; id <= 32; id++) {
    const phrases = LESSON_DATA[id]?.phrases ?? [];
    for (const p of phrases) {
      checkStr(p.english, 'english', id, p.id);
      checkStr(p.russian, 'russian', id, p.id);
      checkStr(p.ukrainian, 'ukrainian', id, p.id);
      checkApostropheUk(p.ukrainian, 'ukrainian', id, p.id);
      for (const [i, w] of (p.words ?? []).entries()) {
        checkStr(w.text, `words[${i}].text`, id, p.id);
        for (const [j, d] of (w.distractors ?? []).entries()) {
          checkStr(d, `words[${i}].distractors[${j}]`, id, p.id);
        }
      }
    }
  }
}

/* ---------------- F. Кодировка ---------------- */

function checkF() {
  for (let id = 1; id <= 32; id++) {
    const phrases = LESSON_DATA[id]?.phrases ?? [];
    for (const p of phrases) {
      const fields: [string, string][] = [
        ['english', p.english], ['russian', p.russian], ['ukrainian', p.ukrainian],
      ];
      for (const w of (p.words ?? [])) {
        fields.push([`word.text`, w.text]);
        for (const d of w.distractors ?? []) fields.push([`word.distr`, d]);
      }
      for (const [name, val] of fields) {
        if (val == null) continue;
        // F1: mojibake — последовательности типа Ð/Ñ/Ã/Â рядом с не-ASCII
        if (/[ÐÑÂÃ][\u0080-\u00FF]/.test(val)) {
          push({ group: 'F1', severity: 'error', lessonId: id, phraseId: p.id, message: `${name}: возможный mojibake в "${val}"` });
        }
        // F2: replacement char
        if (/\uFFFD/.test(val)) {
          push({ group: 'F2', severity: 'error', lessonId: id, phraseId: p.id, message: `${name}: U+FFFD в "${val}"` });
        }
        // F4: HTML-сущности
        if (/&(amp|lt|gt|quot|apos|#x?\d+);/.test(val)) {
          push({ group: 'F4', severity: 'warning', lessonId: id, phraseId: p.id, message: `${name}: HTML-сущность в "${val}"` });
        }
      }
    }
  }
  // F3: проверим UTF-8 на уровне исходных файлов отдельно (через fs)
}

/* ---------------- G. Капитализация/пунктуация фразы ---------------- */

function checkG() {
  for (let id = 1; id <= 32; id++) {
    const phrases = LESSON_DATA[id]?.phrases ?? [];
    for (const p of phrases) {
      const fields: [string, string][] = [
        ['english', p.english], ['russian', p.russian], ['ukrainian', p.ukrainian],
      ];
      for (const [name, val] of fields) {
        if (!val) continue;
        // G1: первая буква — заглавная
        const stripped = val.replace(/^[\s"'«„(]+/, '');
        const first = stripped[0];
        if (first && first.toLowerCase() === first.toUpperCase()) {
          // не буква (цифра, кавычка) — пропустим
        } else if (first && first !== first.toUpperCase()) {
          push({ group: 'G1', severity: 'warning', lessonId: id, phraseId: p.id, message: `${name}: первая буква не заглавная: "${val}"` });
        }
        // G3: ALL CAPS
        const lettersOnly = val.replace(/[^A-Za-zА-Яа-яЁёІіЇїЄєҐґ]/g, '');
        if (lettersOnly.length > 4 && lettersOnly === lettersOnly.toUpperCase()) {
          push({ group: 'G3', severity: 'warning', lessonId: id, phraseId: p.id, message: `${name}: ALL CAPS: "${val}"` });
        }
      }
      // G2: конечная пунктуация совпадает между en/ru/uk
      const epEn = endPunct(p.english.trim());
      const epRu = endPunct((p.russian ?? '').trim());
      const epUk = endPunct((p.ukrainian ?? '').trim());
      if (epEn !== epRu || epEn !== epUk) {
        push({ group: 'G2', severity: 'warning', lessonId: id, phraseId: p.id, message: `Конечная пунктуация различается: en="${epEn || '-'}", ru="${epRu || '-'}", uk="${epUk || '-'}" — "${p.english}"` });
      }
    }
  }
}

/* ---------------- Запуск + отчёт ---------------- */

if (wantGroup('A')) checkA();
if (wantGroup('B')) checkB();
if (wantGroup('C')) checkC();
if (wantGroup('D')) checkD();
if (wantGroup('E')) checkE();
if (wantGroup('F')) checkF();
if (wantGroup('G')) checkG();

const filtered = onlyLesson ? issues.filter((i) => i.lessonId === onlyLesson) : issues;

const byGroup: Record<string, Issue[]> = {};
for (const it of filtered) {
  (byGroup[it.group] ??= []).push(it);
}

const order = [
  'A1','A2','A3','A4','A5','A6','A7',
  'B1','B2','B3',
  'C1','C2','C3','C4','C5','C6','C7',
  'D1','D2','D3','D4',
  'E1','E2','E3','E4','E5',
  'F1','F2','F3','F4',
  'G1','G2','G3',
];

console.log('\n================ QA REPORT (lessons 1–32) ================');

if ((globalThis as any).__lessonCounts) {
  console.log('\n[A7] Phrases per lesson:');
  const c = (globalThis as any).__lessonCounts as Record<number, number>;
  for (let id = 1; id <= 32; id++) console.log(`  L${String(id).padStart(2, '0')}: ${c[id] ?? 0}`);
}

let totalErr = 0, totalWarn = 0;
for (const g of order) {
  const items = byGroup[g] ?? [];
  if (items.length === 0) {
    console.log(`\n[${g}] OK (0 issues)`);
    continue;
  }
  const err = items.filter((i) => i.severity === 'error').length;
  const warn = items.filter((i) => i.severity === 'warning').length;
  const info = items.filter((i) => i.severity === 'info').length;
  totalErr += err; totalWarn += warn;
  console.log(`\n[${g}] errors=${err}, warnings=${warn}, info=${info}`);
  // печатаем первые 10 примеров
  for (const it of items.slice(0, 10)) {
    const sev = it.severity === 'error' ? 'ERR ' : it.severity === 'warning' ? 'WARN' : 'INFO';
    console.log(`  ${sev} L${it.lessonId}${it.phraseId !== undefined ? ` p=${it.phraseId}` : ''}: ${it.message}`);
  }
  if (items.length > 10) console.log(`  ... ещё ${items.length - 10}`);
}

console.log(`\n================ TOTAL: errors=${totalErr}, warnings=${totalWarn} ================\n`);

// Также сохраним полный JSON-отчёт
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const out = resolve(process.cwd(), 'docs/reports/qa_lessons_full.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(filtered, null, 2), 'utf8');
console.log(`Full report written to: ${out}`);

// Аудит контента уроков 1-27 без TypeScript: парсим .ts файлы регулярками + ts2js compile.
// Цель — найти битые кодировки, отсутствующие поля, mismatched correct/text, мало distractors,
// несоответствие количества `words` числу слов в `english`, дубликаты id.
//
// Запуск: node scripts/audit_lessons_1_27.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Преобразуем TS в CommonJS, чтобы выполнить и получить экспортированные данные.
function loadTsModule(absPath) {
  const code = fs.readFileSync(absPath, 'utf8');
  const out = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: absPath,
  });
  const module = { exports: {} };
  const requireShim = (rel) => {
    if (rel === './lesson_data_types' || rel.endsWith('lesson_data_types')) return {};
    if (rel.startsWith('./')) {
      const next = path.resolve(path.dirname(absPath), rel + '.ts');
      if (fs.existsSync(next)) return loadTsModule(next);
    }
    return {};
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', 'require', out.outputText);
  fn(module, module.exports, requireShim);
  return module.exports;
}

const ALL = loadTsModule(path.join(ROOT, 'app', 'lesson_data_all.ts'));
const LESSON_DATA = ALL.LESSON_DATA;

// ── Эвристики для битой кодировки.
// Cyrillic нормально, latin тоже; ловим mojibake-маркеры, NBSP, REPLACEMENT CHAR.
const MOJIBAKE_RE = /[ÐÑÂÃ][-¿]/; // ðŸ, Ð°, и т.п. — типичный UTF-8→CP1251→UTF-8 поломатый.
const REPLACEMENT_CHAR = '�';
const NBSP = ' ';
const ZWSP = '​';
const SOFT_HYPHEN = '­';

const issues = [];
function add(kind, lessonId, ctx, msg) {
  issues.push({ kind, lesson: lessonId, ctx, msg });
}

function checkText(lessonId, where, s) {
  if (s == null) return;
  if (typeof s !== 'string') {
    add('TYPE', lessonId, where, `expected string, got ${typeof s}`);
    return;
  }
  if (s.length === 0) {
    add('EMPTY', lessonId, where, `пустая строка`);
    return;
  }
  if (s.includes(REPLACEMENT_CHAR)) add('ENCODING', lessonId, where, `\\uFFFD replacement char`);
  if (MOJIBAKE_RE.test(s)) add('ENCODING', lessonId, where, `mojibake: «${s.slice(0, 60)}»`);
  if (s.includes(ZWSP)) add('CHAR', lessonId, where, `zero-width space`);
  if (s.includes(SOFT_HYPHEN)) add('CHAR', lessonId, where, `soft hyphen`);
  if (s.includes(NBSP)) add('CHAR', lessonId, where, `non-breaking space (NBSP) — обычно не нужен в TTS`);
  if (/\s{2,}/.test(s)) add('SPACE', lessonId, where, `двойной пробел: «${s}»`);
  if (/^\s|\s$/.test(s)) add('SPACE', lessonId, where, `пробел в начале/конце: «${s}»`);
}

function audit() {
  const ids = Object.keys(LESSON_DATA).map(Number).filter((n) => n >= 1 && n <= 32).sort((a, b) => a - b);
  const summary = {};
  for (const id of ids) {
    const lesson = LESSON_DATA[id];
    if (!lesson) { add('MISSING', id, 'lesson', `LESSON_DATA[${id}] не найден`); continue; }
    const phrases = lesson.phrases || [];
    summary[id] = { phrases: phrases.length, intro: (lesson.introScreens || []).length };
    if (!Array.isArray(phrases) || phrases.length === 0) {
      add('MISSING', id, 'phrases', `пустой массив фраз`);
    }
    // titles + intro
    checkText(id, 'titleRU', lesson.titleRU);
    checkText(id, 'titleUK', lesson.titleUK);
    (lesson.introScreens || []).forEach((s, i) => {
      checkText(id, `introScreens[${i}].textRU`, s.textRU);
      checkText(id, `introScreens[${i}].textUK`, s.textUK);
    });

    const seenIds = new Map();
    phrases.forEach((p, i) => {
      const ctxBase = `phrases[${i}](id=${p?.id ?? '?'})`;
      if (p?.id == null) add('MISSING', id, ctxBase, `phrase.id отсутствует`);
      else if (seenIds.has(p.id)) add('DUPLICATE', id, ctxBase, `id дублируется (первый встречен на индексе ${seenIds.get(p.id)})`);
      else seenIds.set(p.id, i);

      checkText(id, `${ctxBase}.english`, p?.english);
      checkText(id, `${ctxBase}.russian`, p?.russian);
      checkText(id, `${ctxBase}.ukrainian`, p?.ukrainian);

      if (!Array.isArray(p?.words) || p.words.length === 0) {
        add('MISSING', id, ctxBase, `words пустой/отсутствует`);
        return;
      }
      // Сравниваем склеенные words с english (нормализуем пробелы и финальную пунктуацию).
      const normalize = (s) => String(s || '').trim().replace(/\s+/g, ' ');
      const normalizeForWordsCompare = (s) =>
        normalize(s)
          .replace(/[.,?!;:]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const joined = p.words.map((w) => String(w?.text || '').trim()).join(' ');
      if (normalizeForWordsCompare(joined) !== normalizeForWordsCompare(p.english)) {
        add('WORDS_MISMATCH', id, ctxBase, `english="${p.english}" ↔ words="${joined}"`);
      }
      p.words.forEach((w, j) => {
        const wctx = `${ctxBase}.words[${j}]`;
        if (!w || typeof w !== 'object') { add('TYPE', id, wctx, `not object`); return; }
        checkText(id, `${wctx}.text`, w.text);
        checkText(id, `${wctx}.correct`, w.correct);
        if (w.text !== w.correct) add('CORRECT_MISMATCH', id, wctx, `text="${w.text}" но correct="${w.correct}"`);
        if (!Array.isArray(w.distractors) || w.distractors.length < 5) {
          add('DISTRACTORS', id, wctx, `distractors=${Array.isArray(w.distractors) ? w.distractors.length : '?'} (ожидается 5+) для "${w.text}"`);
        } else {
          // дубликаты в distractors
          const seen = new Set();
          let dupes = 0;
          for (const d of w.distractors) {
            if (typeof d !== 'string') { add('TYPE', id, wctx, `distractor not string`); continue; }
            if (seen.has(d)) dupes += 1;
            seen.add(d);
            if (d === w.correct) add('DISTRACTORS', id, wctx, `distractor === correct ("${d}") для "${w.text}"`);
          }
          if (dupes > 0) add('DISTRACTORS', id, wctx, `дубликаты distractors (${dupes}) для "${w.text}"`);
        }
      });

      // Альтернативы — только проверка типов и кодировки
      if (p.alternatives) {
        if (!Array.isArray(p.alternatives)) add('TYPE', id, ctxBase, `alternatives must be array`);
        else p.alternatives.forEach((alt, k) => checkText(id, `${ctxBase}.alternatives[${k}]`, alt));
      }
    });
  }
  return { ids, summary };
}

const t0 = Date.now();
const { ids, summary } = audit();
const ms = Date.now() - t0;

// Группировка для отчёта
const byKind = {};
const byLesson = {};
for (const issue of issues) {
  byKind[issue.kind] = (byKind[issue.kind] || 0) + 1;
  byLesson[issue.lesson] = byLesson[issue.lesson] || [];
  byLesson[issue.lesson].push(issue);
}

const lines = [];
lines.push(`# Аудит уроков 1-27 (${new Date().toISOString()})`);
lines.push('');
lines.push(`Просканировано уроков: ${ids.length}, фраз всего: ${ids.reduce((a, b) => a + (summary[b]?.phrases || 0), 0)}, время: ${ms}ms`);
lines.push('');
lines.push('## Сводка по типам');
const kindTotal = Object.entries(byKind).sort((a, b) => b[1] - a[1]);
if (kindTotal.length === 0) lines.push('✅ Проблем не найдено.');
else for (const [k, n] of kindTotal) lines.push(`- **${k}**: ${n}`);
lines.push('');
lines.push('## Сводка по урокам');
for (const id of ids) {
  const s = summary[id];
  const probs = (byLesson[id] || []).length;
  const flag = probs === 0 ? '✅' : '⚠️';
  lines.push(`- ${flag} Урок ${id}: ${s?.phrases ?? 0} фраз, intro ${s?.intro ?? 0}, проблем: ${probs}`);
}
lines.push('');
lines.push('## Детали (первые 200 проблем)');
for (const issue of issues.slice(0, 200)) {
  lines.push(`- L${issue.lesson} \`${issue.kind}\` ${issue.ctx} — ${issue.msg}`);
}
if (issues.length > 200) lines.push(`\n…и ещё ${issues.length - 200} проблем (см. полный JSON ниже).`);

const reportMd = lines.join('\n');
const reportJson = JSON.stringify({ summary, byKind, issues }, null, 2);

const outDir = path.join(ROOT, 'docs', 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'lessons_audit_1_27.md'), reportMd, 'utf8');
fs.writeFileSync(path.join(outDir, 'lessons_audit_1_27.json'), reportJson, 'utf8');

console.log(reportMd);

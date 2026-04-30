// Подгоняет english к words[] для случаев когда english содержит запятые/пунктуацию,
// которой нет в words. Использует TS-загрузчик чтобы найти проблемные фразы,
// затем делает текстовый replace в исходниках для конкретного english поля.
//
// Запуск: node scripts/fix_words_english_sync.mjs --apply

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

function loadTsModule(absPath) {
  const code = fs.readFileSync(absPath, 'utf8');
  const out = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: absPath,
  });
  const mod = { exports: {} };
  const requireShim = (rel) => {
    if (rel.endsWith('lesson_data_types')) return {};
    if (rel.startsWith('./')) {
      const next = path.resolve(path.dirname(absPath), rel + '.ts');
      if (fs.existsSync(next)) return loadTsModule(next);
    }
    return {};
  };
  new Function('module', 'exports', 'require', out.outputText)(mod, mod.exports, requireShim);
  return mod.exports;
}

const ALL = loadTsModule(path.join(ROOT, 'app', 'lesson_data_all.ts'));
const LESSON_DATA = ALL.LESSON_DATA;

const FILE_BY_LESSON = (id) => {
  if (id <= 8) return 'app/lesson_data_1_8.ts';
  if (id <= 16) return 'app/lesson_data_9_16.ts';
  if (id <= 24) return 'app/lesson_data_17_24.ts';
  return 'app/lesson_data_25_32.ts';
};

function normalize(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function stripPunctEnd(s) { return s.replace(/[.?!]+$/, ''); }

const issues = [];
for (let id = 1; id <= 27; id += 1) {
  for (const ph of (LESSON_DATA[id]?.phrases || [])) {
    const joined = (ph.words || []).map((w) => String(w?.text || '').trim()).join(' ');
    if (stripPunctEnd(normalize(joined)) === stripPunctEnd(normalize(ph.english))) continue;
    issues.push({ lessonId: id, phraseId: ph.id, english: ph.english, joined });
  }
}

console.log(`Найдено рассинхронов: ${issues.length}`);

// Применяем через текстовый replace в исходных файлах
const fileEdits = new Map();
for (const it of issues) {
  const file = FILE_BY_LESSON(it.lessonId);
  // Стратегия 1: убрать запятые из english — попробуем
  const noComma = it.english.replace(/,/g, '');
  let newEnglish = null;
  if (stripPunctEnd(normalize(it.joined)) === stripPunctEnd(normalize(noComma))) {
    newEnglish = noComma;
  }
  // Стратегия 2: уже не подходит автофиксом — показываем для ручного разбора
  if (newEnglish === null) {
    console.log(`! L${it.lessonId} id=${it.phraseId} — нет автофикса`);
    console.log(`  english: ${it.english}`);
    console.log(`  joined:  ${it.joined}`);
    continue;
  }
  fileEdits.set(file, fileEdits.get(file) || []);
  fileEdits.get(file).push({ before: it.english, after: newEnglish, lessonId: it.lessonId, phraseId: it.phraseId });
}

let totalApplied = 0;
for (const [file, edits] of fileEdits) {
  const abs = path.join(ROOT, file);
  let txt = fs.readFileSync(abs, 'utf8');
  let applied = 0;
  for (const e of edits) {
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const beforeEsc = escapeRe(e.before);
    const re = new RegExp(`(english:\\s*['"\`])(${beforeEsc})(['"\`])`);
    if (re.test(txt)) {
      txt = txt.replace(re, `$1${e.after}$3`);
      applied += 1;
      console.log(`L${e.lessonId} id=${e.phraseId}: «${e.before}» → «${e.after}»`);
    } else {
      console.log(`! Не найден literal в ${file}: ${e.before}`);
    }
  }
  if (applied > 0 && APPLY) {
    fs.writeFileSync(abs, txt, 'utf8');
    console.log(`✓ ${file}: записано ${applied} правок`);
  }
  totalApplied += applied;
}

console.log(`\nИтого: ${totalApplied} правок ${APPLY ? 'записано' : '(dry-run)'}`);

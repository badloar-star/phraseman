// Автофикс L13: для всех english начинающихся с "Will ...?" — приводим RU/UA в форму вопроса.
// Стратегия: добавить "Разве" в начало RU и "Чи" в начало UA; точку заменить на ?.
// Это даёт игроку чёткий маркер "вопрос → надо начинать с Will".
//
// Запуск: node scripts/fix_l13_questions.mjs --apply

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
const lesson13 = ALL.LESSON_DATA[13];
if (!lesson13) {
  console.error('LESSON_DATA[13] not found');
  process.exit(1);
}

function escapeJsSingle(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const file = path.join(ROOT, 'app/lesson_data_9_16.ts');
let txt = fs.readFileSync(file, 'utf8');
let changes = 0;

for (const ph of lesson13.phrases) {
  const eng = String(ph.english || '').trim();
  if (!/^Will\s.+\?$/i.test(eng)) continue;
  const ru = String(ph.russian || '').trim();
  const uk = String(ph.ukrainian || '').trim();
  if (ru.endsWith('?') && /^(Разве|Чи)/i.test(ru)) continue; // уже фикс

  // Build new translations
  // Убираем точку в конце, ставим ?
  const ruBase = ru.replace(/[.!]$/, '').trim();
  const ukBase = uk.replace(/[.!]$/, '').trim();
  // Если уже начинается с заглавной — добавим "Разве" / "Чи" с пробелом
  const newRu = `Разве ${ruBase[0].toLowerCase()}${ruBase.slice(1)}?`;
  const newUk = `Чи ${ukBase[0].toLowerCase()}${ukBase.slice(1)}?`;

  // Replace in file: ищем уникальное вхождение через english + russian
  const engEsc = escapeRe(eng);
  const ruEsc = escapeRe(ru);
  const ukEsc = escapeRe(uk);

  const ruRe = new RegExp(`(english:\\s*['"]${engEsc}['"][^}]*?russian:\\s*['"])${ruEsc}(['"])`);
  const ukRe = new RegExp(`(english:\\s*['"]${engEsc}['"][^}]*?ukrainian:\\s*['"])${ukEsc}(['"])`);

  let didRu = false, didUk = false;
  if (ruRe.test(txt)) {
    txt = txt.replace(ruRe, `$1${escapeJsSingle(newRu)}$2`);
    didRu = true;
  }
  if (ukRe.test(txt)) {
    txt = txt.replace(ukRe, `$1${escapeJsSingle(newUk)}$2`);
    didUk = true;
  }
  if (didRu || didUk) {
    changes += 1;
    console.log(`L13 id=${ph.id}:`);
    console.log(`  EN: ${eng}`);
    if (didRu) console.log(`  RU: ${ru} → ${newRu}`);
    if (didUk) console.log(`  UA: ${uk} → ${newUk}`);
  }
}

if (APPLY && changes > 0) {
  fs.writeFileSync(file, txt, 'utf8');
  console.log(`\n✓ Записано ${changes} правок в ${file}`);
} else {
  console.log(`\n${APPLY ? 'Изменений нет' : 'Dry-run'} (${changes} правок)`);
}

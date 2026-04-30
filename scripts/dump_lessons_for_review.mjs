// Выгружает все фразы уроков 1-32 в .txt-файлы по группам уроков для удобства ручного аудита.
// Запуск: node scripts/dump_lessons_for_review.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

const outDir = path.join(ROOT, 'docs', 'reports', 'lesson_dumps');
fs.mkdirSync(outDir, { recursive: true });

const groups = [
  { name: '01-08', from: 1, to: 8 },
  { name: '09-16', from: 9, to: 16 },
  { name: '17-24', from: 17, to: 24 },
  { name: '25-32', from: 25, to: 32 },
];

for (const g of groups) {
  const lines = [];
  for (let id = g.from; id <= g.to; id += 1) {
    const lesson = LESSON_DATA[id];
    if (!lesson) continue;
    lines.push(`# ===== Урок ${id}: ${lesson.titleRU} / ${lesson.titleUK} =====`);
    lines.push('');
    for (const p of lesson.phrases || []) {
      lines.push(`L${id}/${p.id}`);
      lines.push(`  EN: ${p.english}`);
      lines.push(`  RU: ${p.russian}`);
      lines.push(`  UK: ${p.ukrainian}`);
      lines.push('');
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(outDir, `lessons_${g.name}.txt`), lines.join('\n'), 'utf8');
  console.log(`→ docs/reports/lesson_dumps/lessons_${g.name}.txt`);
}

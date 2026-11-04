// Генерирует app/classic_course_registry.gen.ts — статические ленивые require() данных классических курсов
// (Metro не умеет динамические пути). Запуск: node scripts/gen_classic_course_registry.mjs
// зачем (классические курсы 04.11): курсы EN/ES/FR/DE/IT вшиты в сборку (решение владельца), грузятся по одному уроку.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'es', 'fr', 'de', 'it'];
const lines = [];
lines.push('// АВТОГЕНЕРАЦИЯ: node scripts/gen_classic_course_registry.mjs — не править руками.');
lines.push('/* eslint-disable @typescript-eslint/no-require-imports -- ленивые статические require: Metro требует литеральные пути */');
lines.push("export type ClassicCourseLang = 'en' | 'es' | 'fr' | 'de' | 'it';");
lines.push('type Loader = () => unknown;');
lines.push('export const CLASSIC_LESSON_LOADERS: Record<ClassicCourseLang, Record<number, Loader>> = {');
for (const lang of LANGS) {
  lines.push(`  ${lang}: {`);
  for (let n = 1; n <= 32; n += 1) {
    const nn = String(n).padStart(2, '0');
    const rel = `modules/classic-courses/${lang}/lessons-${nn}.json`;
    if (!fs.existsSync(path.join(root, rel))) continue;
    lines.push(`    ${n}: () => require('../${rel}'),`);
  }
  lines.push('  },');
}
lines.push('};');
for (const [name, file] of [['INTRO', 'intro.json'], ['THEORY', 'theory.json'], ['GLOSSARY', 'glossary.json'], ['UI', 'ui.json']]) {
  lines.push(`export const CLASSIC_${name}_LOADERS: Partial<Record<ClassicCourseLang, Loader>> = {`);
  for (const lang of LANGS) {
    const rel = `modules/classic-courses/${lang}/${file}`;
    if (fs.existsSync(path.join(root, rel))) lines.push(`  ${lang}: () => require('../${rel}'),`);
  }
  lines.push('};');
}
fs.writeFileSync(path.join(root, 'app', 'classic_course_registry.gen.ts'), lines.join('\n') + '\n');
console.log('registry written');

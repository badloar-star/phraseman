// Рендер урока «как для ребёнка» в простой текст для независимого читателя: node scripts/classic_plain_render.mjs <lang> <lesson> [ru|uk|en]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = join(ROOT, 'docs', 'work', 'classic_theory_plain');
const [lang, lessonArg, loc = 'ru'] = process.argv.slice(2);
const n = Number(lessonArg); const pad = String(n).padStart(2, '0');
const o = JSON.parse(readFileSync(join(D, lang, `lesson_${pad}.json`), 'utf8'));
const inp = JSON.parse(readFileSync(join(D, 'input', `${lang}_lesson_${pad}.json`), 'utf8'));
const by = Object.fromEntries(inp.phrases.map((p) => [p.id, p]));
let md = `# ${o.title[loc]}\n\n`;
for (const c of o.chapters) {
  md += `## ${c.title[loc]}\n\n${c.text[loc]}\n\n`;
  for (const e of c.examples) { const p = by[e.phraseId]; md += `- ${p.target} — ${p[loc === 'en' ? 'ru' : loc]}${e.say?.[loc] ? ` (читается: ${e.say[loc]})` : ''}\n`; }
  md += '\n';
  for (const p of c.practice ?? []) {
    md += `**Задание${p.sample ? ' (образец)' : ''}:** ${p.command[loc]}\n`;
    md += p.options.map((id, i) => `${i + 1}) ${by[id].target}`).join('   ') + '\n';
    if (p.sample) md += `Верный ответ: ${by[p.answerId].target}\n`;
    md += '\n';
  }
}
writeFileSync(join(D, 'review', `${lang}_lesson_${pad}_${loc}.md`), md);
console.log(md.length);

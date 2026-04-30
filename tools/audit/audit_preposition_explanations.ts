import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLessonPrepositionPack } from '../../app/lesson_prepositions';
import { explainPrepositionChoice, PrepositionExplanationLevel } from '../../app/preposition_explanations';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');

type Row = {
  lesson: number;
  correct: string;
  sentence: string;
  level: PrepositionExplanationLevel | 'generic';
  ru: string;
};

const rows: Row[] = [];

for (let lesson = 1; lesson <= 32; lesson++) {
  const pack = getLessonPrepositionPack(lesson);
  if (!pack) continue;
  for (const item of pack.items) {
    const sentence = item.sentenceTemplate.replace('__', item.correct);
    const explanation = explainPrepositionChoice(item.correct, sentence);
    rows.push({
      lesson,
      correct: item.correct,
      sentence,
      level: explanation.level ?? 'generic',
      ru: explanation.ru,
    });
  }
}

const counts = rows.reduce<Record<string, number>>((acc, row) => {
  acc[row.level] = (acc[row.level] ?? 0) + 1;
  return acc;
}, {});

const byPrep = rows.reduce<Record<string, Record<string, number>>>((acc, row) => {
  acc[row.correct] ??= {};
  acc[row.correct][row.level] = (acc[row.correct][row.level] ?? 0) + 1;
  return acc;
}, {});

const lines: string[] = [];
const push = (line = '') => lines.push(line);

push('# Аудит объяснений предлогов');
push('');
push('Уровни:');
push('- `specific` — идиома или устойчивое сочетание.');
push('- `context` — объяснение построено по соседним словам и смыслу конструкции.');
push('- `generic` — общее правило для конкретного предлога.');
push('- `fallback` — совсем общий текст, его нужно постепенно устранять.');
push('');
push('## Сводка');
push('');
push(`- Всего заданий: **${rows.length}**`);
push(`- specific: **${counts.specific ?? 0}**`);
push(`- context: **${counts.context ?? 0}**`);
push(`- generic: **${counts.generic ?? 0}**`);
push(`- fallback: **${counts.fallback ?? 0}**`);
push('');

push('## По предлогам');
push('');
push('| Предлог | specific | context | generic | fallback | всего |');
push('|---------|----------|---------|---------|----------|-------|');
for (const prep of Object.keys(byPrep).sort()) {
  const c = byPrep[prep];
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  push(`| ${prep} | ${c.specific ?? 0} | ${c.context ?? 0} | ${c.generic ?? 0} | ${c.fallback ?? 0} | ${total} |`);
}
push('');

const fallbackRows = rows.filter(row => row.level === 'fallback');
push('## Fallback-задания');
push('');
if (!fallbackRows.length) {
  push('Fallback-заданий нет.');
} else {
  for (const row of fallbackRows) {
    push(`- L${row.lesson} ${row.correct}: ${row.sentence}`);
  }
}
push('');

push('## Примеры generic');
push('');
for (const row of rows.filter(r => r.level === 'generic').slice(0, 60)) {
  push(`- L${row.lesson} ${row.correct}: ${row.sentence} — ${row.ru}`);
}
push('');

const outPath = path.join(projectRoot, 'tools', 'audit', 'AUDIT_PREPOSITION_EXPLANATIONS.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`Wrote report -> ${path.relative(projectRoot, outPath)}`);
console.log(`specific=${counts.specific ?? 0} context=${counts.context ?? 0} generic=${counts.generic ?? 0} fallback=${counts.fallback ?? 0}`);

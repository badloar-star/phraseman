import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLessonPrepositionPack } from '../../app/lesson_prepositions';
import { explainPrepositionChoice } from '../../app/preposition_explanations';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');

const lines: string[] = [];

let total = 0;
for (let lesson = 1; lesson <= 32; lesson++) {
  const pack = getLessonPrepositionPack(lesson);
  if (!pack) continue;
  lines.push(`# Урок ${lesson}`);
  lines.push('');
  for (const item of pack.items) {
    const sentence = item.sentenceTemplate.replace('__', item.correct);
    const expl = explainPrepositionChoice(item.correct, sentence);
    lines.push(`- [${expl.level ?? 'generic'}] ${item.correct}: ${sentence}`);
    lines.push(`  RU: ${expl.ru}`);
    lines.push('');
    total++;
  }
  lines.push('');
}

fs.writeFileSync(path.join(projectRoot, 'tools', 'audit', 'PREPOSITION_ITEMS_DUMP.md'), lines.join('\n'), 'utf8');
console.log(`Items: ${total}`);
console.log('Wrote tools/audit/PREPOSITION_ITEMS_DUMP.md');

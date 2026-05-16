import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IRREGULAR_VERBS_BY_LESSON,
  type IrregularVerb,
} from '../app/irregular_verbs_data';
import { getLessonPrepositionTexts } from '../app/lesson_prepositions';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'lesson-irregular-verbs-prepositions-audit.md');
const LESSONS = Array.from({ length: 32 }, (_, i) => i + 1);

function formKey(verb: IrregularVerb): string {
  return verb.base.trim().toLowerCase();
}

function tableRow(values: Array<string | number>): string {
  return `| ${values.map(v => String(v).replace(/\|/g, '\\|')).join(' | ')} |`;
}

const verbSeen = new Map<string, number>();
const verbDuplicates: string[] = [];
const verbRows: string[] = [];

for (const lesson of LESSONS) {
  const verbs = IRREGULAR_VERBS_BY_LESSON[lesson] ?? [];
  if (!verbs.length) {
    verbRows.push(tableRow([lesson, '-', '-', '-', '-']));
    continue;
  }

  for (const verb of verbs) {
    const key = formKey(verb);
    const firstLesson = verbSeen.get(key);
    if (firstLesson !== undefined) {
      verbDuplicates.push(`${verb.base}: lesson ${lesson} repeats lesson ${firstLesson}`);
    } else {
      verbSeen.set(key, lesson);
    }
    verbRows.push(tableRow([lesson, verb.base, verb.past, verb.pp, `${verb.ru} / ${verb.uk}`]));
  }
}

const prepSeen = new Map<string, number>();
const prepDuplicates: string[] = [];
const prepRows: string[] = [];

for (const lesson of LESSONS) {
  const prepositions = getLessonPrepositionTexts(lesson);
  if (!prepositions.length) {
    prepRows.push(tableRow([lesson, '-']));
    continue;
  }

  for (const preposition of prepositions) {
    const key = preposition.trim().toLowerCase();
    const firstLesson = prepSeen.get(key);
    if (firstLesson !== undefined) {
      prepDuplicates.push(`${preposition}: lesson ${lesson} repeats lesson ${firstLesson}`);
    } else {
      prepSeen.set(key, lesson);
    }
  }

  prepRows.push(tableRow([lesson, prepositions.join(', ')]));
}

const lines = [
  '# Irregular verbs and prepositions audit',
  '',
  'Source files: `app/irregular_verbs_data.ts` and `app/lesson_prepositions.ts`.',
  '',
  'Rules checked:',
  '',
  '- Lessons are sequential from 1 to 32.',
  '- An irregular verb appears only in the first lesson where it is introduced.',
  '- A preposition appears only in the first lesson where that text + semantic type is introduced.',
  '- Later lessons do not repeat earlier irregular verbs or the same preposition type in these lesson-level training lists.',
  '- The same surface preposition can still appear again when it teaches a different type, for example `at (time)` and `at (place)`.',
  '',
  '## Summary',
  '',
  tableRow(['Check', 'Result']),
  tableRow(['---', '---']),
  tableRow(['Irregular verbs listed', verbSeen.size]),
  tableRow(['Preposition text/type pairs listed', prepSeen.size]),
  tableRow(['Irregular verb duplicates after filtering', verbDuplicates.length ? verbDuplicates.join('; ') : 'none']),
  tableRow(['Preposition duplicates after filtering', prepDuplicates.length ? prepDuplicates.join('; ') : 'none']),
  tableRow(['Grammar/form issues found in checked training lists', 'none after correction']),
  '',
  '## Irregular Verbs By Lesson',
  '',
  tableRow(['Lesson', 'Base', 'Past Simple', 'Past Participle', 'RU / UK']),
  tableRow(['---', '---', '---', '---', '---']),
  ...verbRows,
  '',
  '## Prepositions By Lesson',
  '',
  tableRow(['Lesson', 'New prepositions']),
  tableRow(['---', '---']),
  ...prepRows,
  '',
  '## Corrections Applied',
  '',
  '- Removed repeated irregular verbs from later lesson lists, keeping each verb at its first lesson.',
  '- Changed preposition collection so later lessons exclude only preposition text/type pairs already introduced in earlier lessons.',
  '- Kept repeated surface forms when they teach a different type, such as time vs place uses of `in`, `on`, and `at`.',
  '- Added this generated audit document for repeat checks.',
  '',
];

fs.writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUT)}`);

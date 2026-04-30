/**
 * Заменяет phrase.id с числа на строку lesson{N}_phrase_{n} для уроков 13–32
 * (глобальная уникальность для QA A4 и консистентность с lesson9_phrase_*).
 *
 * Запуск: npx tsx scripts/fix_lesson_numeric_phrase_ids.ts [--dry-run]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry-run');
const MIN_LESSON = 13;
const FILES = ['lesson_data_9_16.ts', 'lesson_data_17_24.ts', 'lesson_data_25_32.ts'];

const EXPORT_PHRASES = /^export const LESSON_(\d+)_PHRASES\b/;
const ANY_EXPORT = /^export const /;
const PHRASE_ID_NUM = /^(\s*)id:\s*(\d+)\s*,\s*$/;

function patch(text: string): { next: string; n: number } {
  let phraseLessonNum: number | null = null;
  let replacements = 0;
  const lines = text.split(/\r?\n/);
  const out = lines.map((line) => {
    const exPh = line.match(EXPORT_PHRASES);
    if (exPh) {
      phraseLessonNum = parseInt(exPh[1], 10);
      return line;
    }
    if (ANY_EXPORT.test(line)) {
      phraseLessonNum = null;
      return line;
    }

    const m = line.match(PHRASE_ID_NUM);
    if (
      phraseLessonNum !== null &&
      phraseLessonNum >= MIN_LESSON &&
      m
    ) {
      replacements++;
      const indent = m[1];
      const num = m[2];
      return `${indent}id: 'lesson${phraseLessonNum}_phrase_${num}',`;
    }
    return line;
  });

  return { next: out.join('\n'), n: replacements };
}

for (const fn of FILES) {
  const path = join(process.cwd(), 'app', fn);
  const raw = readFileSync(path, 'utf8');
  const nl = raw.endsWith('\n');
  const { next, n } = patch(raw);
  const finalText = nl ? (next.endsWith('\n') ? next : `${next}\n`) : next;
  if (n === 0) {
    console.log(`[skip] ${fn} (0 replacements)`);
    continue;
  }
  console.log(DRY ? `[dry-run would replace ${n}x]` : `[patched ${n}x]`, fn);
  if (!DRY) writeFileSync(path, finalText, 'utf8');
}

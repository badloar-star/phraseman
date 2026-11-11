import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COURSES = new Set(['en', 'es', 'fr', 'de', 'it']);
export const normalizeClassicVocabForm = (value) => String(value).toLowerCase().replace(/[.,!?;:¿¡«»"]/g, '').trim();
const file = join(ROOT, 'docs', 'work', 'classic_vocab', 'proper_name_exclusions.json');
if (!existsSync(file)) throw new Error(`classic_vocab_exclusions_missing:${file}`);
const firstSeen = (course, form) => {
  for (let lesson = 1; lesson <= 32; lesson++) {
    const phrases = JSON.parse(readFileSync(join(ROOT, 'modules', 'classic-courses', course, `lessons-${String(lesson).padStart(2, '0')}.json`), 'utf8')).phrases ?? [];
    if (phrases.some((phrase) => (phrase.tiles ?? []).some((tile) => normalizeClassicVocabForm(tile.correct) === form))) return lesson;
  }
  return null;
};
export function validateProperNameExclusions(input) {
  const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  const only = (value, keys) => plain(value) && Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
  if (!only(input, ['schema', 'records']) || input.schema !== 'phraseman.classic-vocab-proper-name-exclusions/1' || !Array.isArray(input.records)) throw new Error('classic_vocab_exclusions_invalid_schema');
  const keys = new Set();
  return input.records.map((record) => {
    if (!only(record, ['course', 'form', 'firstLesson']) || typeof record.course !== 'string' || typeof record.form !== 'string' || typeof record.firstLesson !== 'number') throw new Error('classic_vocab_exclusions_invalid_type');
    const course = record.course; const form = normalizeClassicVocabForm(record.form); const firstLesson = record.firstLesson; const key = `${course}:${form}:${firstLesson}`;
    if (!COURSES.has(course) || !form || form !== record.form || !Number.isInteger(firstLesson) || firstLesson < 1 || firstLesson > 32 || keys.has(key)) throw new Error(`classic_vocab_exclusions_invalid:${key}`);
    if (firstSeen(course, form) !== firstLesson) throw new Error(`classic_vocab_exclusions_source_mismatch:${key}`);
    keys.add(key); return Object.freeze({ course, form, firstLesson });
  });
}
export const properNameExclusions = Object.freeze(validateProperNameExclusions(JSON.parse(readFileSync(file, 'utf8'))));
const seen = new Set(properNameExclusions.map((r) => `${r.course}:${r.form}:${r.firstLesson}`));
export const isClassicVocabExcluded = (course, form, firstLesson) => seen.has(`${course}:${normalizeClassicVocabForm(form)}:${Number(firstLesson)}`);

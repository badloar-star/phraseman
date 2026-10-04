/**
 * §136 (04.10): .gen — единственный источник правды уроков 1–16. Learning V2 читает .gen (английские токены — wordsEn),
 * а генераторы, которые затирают .gen устаревшим _source, без явного флага не запускаются.
 */
import fs from 'fs';
import path from 'path';
import { buildLesson1LegacyV2SourcePayload } from '../modules/learning-v2/content/legacy_lesson_payload';
import { LESSON_1_PHRASES as GEN } from '../app/lesson_data_1_8_phrases_es.gen';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('Learning V2 lesson 1 payload takes phrase texts from .gen, not the stale _source', () => {
  expect(read('modules/learning-v2/content/legacy_lesson_payload.ts')).not.toContain('lesson_data_1_8_phrases_source');
  const payload = buildLesson1LegacyV2SourcePayload();
  const json = JSON.stringify(payload);
  const gen15 = GEN.find((phrase) => phrase.id === 'lesson1_phrase_15');
  expect(gen15?.russian).toBe('Ты опаздываешь');
  // Текст фразы — из .gen, не из устаревшего _source («Вы опаздываете»).
  expect(json).toContain('Ты опаздываешь');
  expect(json).not.toContain('Вы опаздываете');
  // Английский курс: словарь из wordsEn, а не испанские токены words из .gen.
  const surfaces = payload.vocabulary.map((item) => (item as { surface: string }).surface);
  expect(surfaces).toEqual(expect.arrayContaining(['I', 'am', 'here']));
  expect(surfaces).not.toContain('Estoy');
});

test('lesson .gen generators refuse to run without the explicit overwrite flag', () => {
  for (const tool of ['tools/prompt006_es_phrase_words.ts', 'tools/prompt007_es_phrase_words.ts']) {
    const src = read(tool);
    expect(src).toContain("process.env.PHRASEMAN_ALLOW_GEN_OVERWRITE !== '1'");
    expect(src.indexOf("PHRASEMAN_ALLOW_GEN_OVERWRITE")).toBeLessThan(src.lastIndexOf('main();'));
  }
});

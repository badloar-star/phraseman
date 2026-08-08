import fs from 'node:fs';
import path from 'node:path';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

describe('Gavan day 8 consistency', () => {
  it('keeps authored, catalog, fallback, and trainer content on kitchen tableware', () => {
    const catalog = read('app/personal_plan_catalog.ts');
    const fallback = read('app/personal_plan_phrase_lessons.ts');
    const catalogStart = catalog.indexOf('const gavanDay8Generated: PlanDay = {');
    const catalogEnd = catalog.indexOf('const gavanDay9Generated: PlanDay = {', catalogStart);
    const fallbackStart = fallback.indexOf('gavan_d008_content_unit: [');
    const fallbackEnd = fallback.indexOf('gavan_d009_content_unit: [', fallbackStart);

    expect(catalog.slice(catalogStart, catalogEnd)).toContain("title: 'Посуда на кухне'");
    expect(catalog.slice(catalogStart, catalogEnd)).not.toContain('submit form online');
    expect(fallback.slice(fallbackStart, fallbackEnd)).toContain("english: 'I have a cup and a plate.'");
    expect(fallback.slice(fallbackStart, fallbackEnd)).not.toContain('submit this form');

    const lesson = getPersonalPlanPhraseLesson('gavan_d008_content_unit');
    expect(lesson?.phrases.map((phrase) => phrase.english)).toEqual([
      'I have a cup and a plate.',
      'Do you have a clean spoon?',
      'She has a knife here.',
      'Where is my spoon?',
      'I want a clean plate, please.',
      'What do you have on the table?',
    ]);
  });
});

import { LESSON_DATA } from '../app/lesson_data_all';
import fs from 'fs';
import path from 'path';

describe('lesson 24 phrase 47 translation clarity', () => {
  it('keeps “before” visible without adding a separate “already” cue', () => {
    const phrase = LESSON_DATA[24].phrases.find((row) => row.id === 'lesson24_phrase_47');
    const intro = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_intro_screens_en_17_32.ts'), 'utf8');

    expect(phrase).toMatchObject({
      english: 'She has been here before',
      russian: 'Она бывала здесь раньше',
    });
    expect(intro).toContain("ru: 'Она бывала здесь раньше'");
    expect(intro).not.toContain("ru: 'Она уже была здесь раньше'");
  });
});

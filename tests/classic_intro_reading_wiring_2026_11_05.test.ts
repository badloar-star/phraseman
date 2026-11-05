// «Читается» во вступлении (решение владельца 05.11): данные Теории (6fa0470af) block.sayByLocale = { ru: { "<id>": "…" }, uk: {…} } доезжают до example.reading,
// экран рисует строку только для RU/UK и только при наличии записи (без пустого места).
import fs from 'node:fs';
import path from 'node:path';
import { getClassicIntroScreens } from '../app/classic_course_phrases';

const read = (p: string): string => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');

describe('вступление английского курса: reading у примеров', () => {
  it('у примеров урока есть reading ru/uk из sayByLocale, строки не пустые', () => {
    const screens = getClassicIntroScreens(2, 'en');
    expect(screens).not.toBeNull();
    const examples = (screens ?? []).flatMap((s) => s.examples ?? []);
    expect(examples.length).toBeGreaterThan(0);
    for (const ex of examples) {
      const r = (ex as { reading?: { ru?: string; uk?: string } }).reading;
      expect(r?.ru && r.ru.length > 2).toBeTruthy();
      expect(r?.uk && r.uk.length > 2).toBeTruthy();
    }
  });
  it('без записи в sayByLocale поля reading нет (не рисуем пустую строку)', () => {
    const src = read('app/classic_course_phrases.ts');
    expect(src).toContain('...(reading.ru || reading.uk ? { reading } : {})');
    expect(src).toContain('block.sayByLocale');
  });
  it('экран: строка «Читается» только при splitLatin (RU/UK) и наличии записи', () => {
    const screen = read('app/lesson_intro_screens.tsx');
    expect(screen).toContain("splitLatin ? (ex as LessonIntroExample).reading?.[lang === 'uk' ? 'uk' : 'ru'] : undefined");
    expect(screen).toContain('readingRaw');
  });
});

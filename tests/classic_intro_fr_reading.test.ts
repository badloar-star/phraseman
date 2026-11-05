/**
 * Вступления французского курса: у каждого примера есть «Читается» для ru и uk (sayByLocale).
 * зачем (владелец 05.11, «Читается — в эту сборку для всех курсов»; формат как у en, 6fa0470af): экран вступления берёт чтение из блока
 * по id примера (exampleIds «de:02:01»), не открывая теорию. Чтения копирует сборщик scripts/classic_course_pack.mjs из примеров теории
 * и из docs/work/classic_intro_plain/say_extra_<lang>.json. «Без смеси алфавитов»: в ru только русские буквы, в uk только украинские, латиницы нет.
 */
import * as fs from 'fs';
import * as path from 'path';

type Block = { exampleIds?: string[]; sayByLocale?: Record<'ru' | 'uk', Record<string, string>> };
const load = (lang: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'modules', 'classic-courses', lang, 'intro.json'), 'utf8')) as Record<string, Block[]>;

const FOREIGN: Record<'ru' | 'uk', RegExp> = { ru: /[A-Za-zІіЇїЄєҐґ]/, uk: /[A-Za-zЫыЭэЪъЁё]/ };

describe.each(['fr'] as const)('вступления %s: «Читается» у каждого примера', (lang) => {
  const intro = load(lang);
  const blocks = Object.entries(intro).flatMap(([lesson, bs]) => bs.map((b, i) => ({ lesson, i, b })));

  it('все 32 урока по 3 блока', () => {
    expect(Object.keys(intro)).toHaveLength(32);
    for (const bs of Object.values(intro)) expect(bs).toHaveLength(3);
  });

  it.each(['ru', 'uk'] as const)('каждый пример имеет чтение (%s) без смеси алфавитов', (loc) => {
    const bad: string[] = [];
    let total = 0;
    for (const { lesson, i, b } of blocks) {
      for (const id of b.exampleIds ?? []) {
        total += 1;
        const s = b.sayByLocale?.[loc]?.[id];
        if (typeof s !== 'string' || !s.trim()) bad.push(`${lesson}.${i + 1} ${id}: нет чтения`);
        else if (FOREIGN[loc].test(s)) bad.push(`${lesson}.${i + 1} ${id}: чужие буквы в «${s}»`);
      }
    }
    expect(total).toBeGreaterThan(100);
    expect(bad.slice(0, 10)).toEqual([]);
  });
});

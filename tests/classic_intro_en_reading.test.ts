/**
 * Вступления английского курса: у каждого примера есть «Читается» для ru и uk (sayByLocale).
 * зачем (владелец 05.11, «изучаемый язык одним цветом + строка «Читается» под каждым примером вступления»,
 * docs/work/release/mockups/target_lang_one_color_PLAN.md (б)): экран вступления берёт чтение из блока, а не из теории (en theory.json ~2 МБ).
 * Чтения копирует сборщик scripts/classic_course_pack.mjs из примеров теории и из docs/work/classic_intro_plain/say_extra_en.json.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses', 'en');
const intro = JSON.parse(fs.readFileSync(path.join(ROOT, 'intro.json'), 'utf8')) as Record<string, Array<{ examplesById?: string[]; sayByLocale?: Record<'ru' | 'uk', Record<string, string>> }>>;

describe('вступления en: «Читается» у каждого примера (ru, uk)', () => {
  const blocks = Object.entries(intro).flatMap(([lesson, bs]) => bs.map((b, i) => ({ lesson, i, b })));

  it('все 32 урока по 3 блока', () => {
    expect(Object.keys(intro)).toHaveLength(32);
    for (const bs of Object.values(intro)) expect(bs).toHaveLength(3);
  });

  it.each(['ru', 'uk'] as const)('каждый пример каждого блока имеет чтение (%s), без латиницы', (loc) => {
    const bad: string[] = [];
    let total = 0;
    for (const { lesson, i, b } of blocks) {
      for (const id of b.examplesById ?? []) {
        total += 1;
        const s = b.sayByLocale?.[loc]?.[id];
        if (typeof s !== 'string' || !s.trim()) bad.push(`${lesson}.${i + 1} ${id}: нет чтения`);
        else if (/[A-Za-z]/.test(s)) bad.push(`${lesson}.${i + 1} ${id}: латиница в чтении «${s}»`);
      }
    }
    expect(total).toBeGreaterThan(200);
    expect(bad.slice(0, 10)).toEqual([]);
  });
});

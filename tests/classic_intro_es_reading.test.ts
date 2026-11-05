/**
 * Вступления испанского курса: у каждого примера есть «Читается» для ru и uk (sayByLocale), кириллицей с ударениями, без смеси алфавитов.
 * зачем (владелец 06.11, «Читается» для es в сборку 150; образец — en, коммит 6fa0470af, tests/classic_intro_en_reading.test.ts): экран вступления берёт чтение
 * из блока (app/classic_course_phrases.ts), а не из теории. Чтения кладёт scripts/classic_intro_say_apply.mjs es (источник: примеры теории es + docs/work/classic_intro_plain/say_extra_es.json).
 * Дополнительно: ударение ровно одно в каждом слове из двух и более слогов; ru без украинских букв, uk без «ы/э/ъ»; запись intro.json в manifest.json (bytes, sha256) совпадает с файлом.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '..', 'modules', 'classic-courses');
const readText = (p: string): string => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const introText = readText(path.join(DIR, 'es', 'intro.json'));
const intro = JSON.parse(introText) as Record<string, Array<{ examplesById?: string[]; sayByLocale?: Record<'ru' | 'uk', Record<string, string>> }>>;
const blocks = Object.entries(intro).flatMap(([lesson, bs]) => bs.map((b, i) => ({ lesson, i, b })));
const ACUTE = '́';
const VOWELS = /[аеёиіїоуыэюяє]/gi;

describe('вступления es: «Читается» у каждого примера (ru, uk)', () => {
  it('все 32 урока, у каждого блока с примерами есть sayByLocale', () => {
    expect(Object.keys(intro)).toHaveLength(32);
    const noSay = blocks.filter(({ b }) => (b.examplesById ?? []).length && !b.sayByLocale).map(({ lesson, i }) => `${lesson}.${i + 1}`);
    expect(noSay).toEqual([]);
  });

  it.each(['ru', 'uk'] as const)('каждый пример каждого блока имеет чтение (%s), кириллицей, без латиницы', (loc) => {
    const bad: string[] = [];
    let total = 0;
    for (const { lesson, i, b } of blocks) {
      for (const id of b.examplesById ?? []) {
        total += 1;
        const s = b.sayByLocale?.[loc]?.[id];
        if (typeof s !== 'string' || !s.trim()) bad.push(`${lesson}.${i + 1} ${id}: нет чтения`);
        else if (/[A-Za-z]/.test(s)) bad.push(`${lesson}.${i + 1} ${id}: латиница в чтении «${s}»`);
        else if (loc === 'ru' && /[іїєґ]/i.test(s)) bad.push(`${lesson}.${i + 1} ${id}: украинские буквы в ru «${s}»`);
        else if (loc === 'uk' && /[ыэъё]/i.test(s)) bad.push(`${lesson}.${i + 1} ${id}: русские буквы в uk «${s}»`);
      }
    }
    expect(total).toBeGreaterThan(100);
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it.each(['ru', 'uk'] as const)('ударение: в слове из двух и более слогов ровно один знак, ни в каком слове не больше одного (%s)', (loc) => {
    const bad: string[] = [];
    for (const { lesson, b } of blocks) {
      for (const [id, s] of Object.entries(b.sayByLocale?.[loc] ?? {})) {
        for (const word of s.split(/\s+/).filter(Boolean)) {
          // зачем: «уи/уэ/уе» (fui, fue) — один слог (дифтонг), ударение не ставится, как у односложных слов теории
          const syllables = (word.replace(/у[иіэе]/g, 'у').match(VOWELS) ?? []).length;
          const marks = word.split(ACUTE).length - 1;
          if (marks > 1 || (syllables >= 2 && marks !== 1)) bad.push(`${lesson} ${id}: «${word}» — знаков ударения ${marks}`);
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('запись intro.json в manifest.json совпадает с файлом (bytes, sha256)', () => {
    const manifest = JSON.parse(readText(path.join(DIR, 'manifest.json'))) as { languages: Record<string, { files: Record<string, { bytes: number; sha256: string }> }> };
    const entry = manifest.languages.es.files['intro.json'];
    expect(entry.bytes).toBe(Buffer.byteLength(introText));
    expect(entry.sha256).toBe(crypto.createHash('sha256').update(introText).digest('hex'));
  });
});

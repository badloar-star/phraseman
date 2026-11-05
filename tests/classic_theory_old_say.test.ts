/**
 * «Читается» в теории старого формата (es: studio2, fr/de/it: chapters): чтения лежат в modules/classic-courses/<lang>/say.json, приложение выводит их под фразой.
 * зачем (владелец 06.11, «Читается» в теории всех курсов): в старом формате примеры — ссылки на фразы курса, а не данные с полем say; сборщик
 * scripts/classic_theory_say_build.mjs кладёт чтения по полному id фразы. es закрыт полностью (правила транслитератора); fr/de/it — файл есть, наполняют их сессии (счётчик ниже).
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'modules', 'classic-courses');
const readText = (p: string): string => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const ACUTE = '́';
const VOWELS = /[аеёиіїоуыэюяє]/gi;

type SayFile = { schema?: string; lang?: string; ru: Record<string, string>; uk: Record<string, string> };
const sayOf = (lang: string): SayFile => JSON.parse(readText(path.join(DIR, lang, 'say.json'))) as SayFile;

/** id фраз, которые показывает теория старого формата. */
function oldFormatIds(lang: string): string[] {
  const raw = JSON.parse(readText(path.join(DIR, lang, 'theory.json'))) as { data?: Record<string, any> } & Record<string, any>;
  const theory = (raw.data ?? raw) as Record<string, any>;
  const ids = new Set<string>();
  for (const d of Object.values(theory)) {
    if (!d || d.plain === true) continue;
    if (d.localized) {
      const loc = d.localized.ru ?? d.localized.en ?? Object.values(d.localized)[0];
      for (const ch of loc?.chapters ?? []) for (const id of ch.samples ?? []) ids.add(String(id));
    } else {
      for (const ch of d.chapters ?? []) for (const id of [...(ch.exampleIds ?? []), ...(ch.examples ?? []).map((e: any) => e?.phraseId)]) if (id) ids.add(String(id));
    }
  }
  return [...ids];
}

describe('теория es (старый формат): «Читается» ru и uk у каждой фразы', () => {
  const say = sayOf('es');
  const ids = oldFormatIds('es');

  it('у каждой фразы старых уроков есть чтение ru и uk, без латиницы и смеси алфавитов', () => {
    expect(ids.length).toBeGreaterThan(200);
    const bad: string[] = [];
    for (const id of ids) {
      const ru = say.ru[id];
      const uk = say.uk[id];
      if (!ru || !uk) { bad.push(`${id}: нет чтения`); continue; }
      if (/[A-Za-z]/.test(ru + uk)) bad.push(`${id}: латиница`);
      if (/[іїєґ]/i.test(ru)) bad.push(`${id}: украинские буквы в ru «${ru}»`);
      if (/[ыэъё]/i.test(uk)) bad.push(`${id}: русские буквы в uk «${uk}»`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it.each(['ru', 'uk'] as const)('ударение (%s): в слове из двух и более слогов ровно один знак, нигде не больше одного', (loc) => {
    const bad: string[] = [];
    for (const [id, text] of Object.entries(say[loc])) {
      for (const word of text.split(/\s+/).filter(Boolean)) {
        const syllables = (word.replace(/у[иіэе]/g, 'у').match(VOWELS) ?? []).length;
        const marks = word.split(ACUTE).length - 1;
        if (marks > 1 || (syllables >= 2 && marks !== 1)) bad.push(`${id}: «${word}» — знаков ${marks}`);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
});

describe('say.json есть у всех четырёх курсов и совпадает с manifest.json', () => {
  const manifest = JSON.parse(readText(path.join(DIR, 'manifest.json'))) as { languages: Record<string, { files: Record<string, { bytes: number; sha256: string }> }> };
  it.each(['es', 'fr', 'de', 'it'])('%s', (lang) => {
    const file = sayOf(lang);
    expect(file.schema).toBe('phraseman.classic.say/1');
    expect(file.lang).toBe(lang);
    const text = readText(path.join(DIR, lang, 'say.json'));
    const entry = manifest.languages[lang].files['say.json'];
    expect(entry.bytes).toBe(Buffer.byteLength(text));
    expect(entry.sha256).toBe(crypto.createHash('sha256').update(text).digest('hex'));
  });
});

describe('приложение выводит «Читается» под фразой теории старого формата', () => {
  const theorySrc = readText(path.join(ROOT, 'app', 'classic_theory.ts'));
  const viewSrc = readText(path.join(ROOT, 'app', 'classic_theory_view.ts'));
  it('classic_theory.ts отдаёт reading из say.json (только ru/uk), view подписывает «Читается»/«Читається»', () => {
    expect(theorySrc).toContain("require('../modules/classic-courses/es/say.json')");
    expect(theorySrc).toContain("if (locale !== 'ru' && locale !== 'uk') return undefined;");
    expect(theorySrc).toContain('...(reading ? { reading } : {})');
    expect(viewSrc).toContain("locale === 'uk' ? 'Читається' : 'Читается'");
    expect(viewSrc).toContain('reading: `${readingLabel}: ${e.reading}`');
  });
});

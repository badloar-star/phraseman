/**
 * «Читается» в теории старого формата немецкого и итальянского: у каждой фразы-примера есть чтение ru и uk в say.json.
 * зачем (владелец 06.11, «Читается» в теории всех курсов): старая теория хранит у глав только exampleIds; приложение (app/classic_theory.ts)
 * берёт чтение из modules/classic-courses/<lang>/say.json по полному id фразы. Источник чтений — docs/work/classic_intro_plain/say_theory_<lang>.json,
 * сборка — scripts/classic_theory_say_build.mjs <lang>. «Без смеси алфавитов»: в ru только русские буквы, в uk только украинские, латиницы нет.
 */
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '..', 'modules', 'classic-courses');
const FOREIGN: Record<'ru' | 'uk', RegExp> = { ru: /[A-Za-zІіЇїЄєҐґ]/, uk: /[A-Za-zЫыЭэЪъЁё]/ };
type Chapter = { exampleIds?: string[]; examples?: Array<{ phraseId?: string }> };
type Lesson = { plain?: boolean; chapters?: Chapter[] };

describe.each(['de', 'it'] as const)('теория старого формата %s: «Читается» у каждой фразы-примера', (lang) => {
  const theoryRaw = JSON.parse(fs.readFileSync(path.join(DIR, lang, 'theory.json'), 'utf8')) as { data?: Record<string, Lesson> };
  const theory = theoryRaw.data ?? (theoryRaw as unknown as Record<string, Lesson>);
  const say = JSON.parse(fs.readFileSync(path.join(DIR, lang, 'say.json'), 'utf8')) as Record<'ru' | 'uk', Record<string, string>>;
  const ids = new Set<string>();
  for (const lesson of Object.values(theory)) {
    if (!lesson || lesson.plain === true) continue;
    for (const ch of lesson.chapters ?? []) for (const id of [...(ch.exampleIds ?? []), ...(ch.examples ?? []).map((e) => e.phraseId ?? '')]) if (id) ids.add(id);
  }

  it('в старой теории есть примеры', () => {
    expect(ids.size).toBeGreaterThan(150);
  });

  it.each(['ru', 'uk'] as const)('каждая фраза-пример имеет чтение (%s) без смеси алфавитов', (loc) => {
    const bad: string[] = [];
    for (const id of ids) {
      const s = say[loc]?.[id];
      if (typeof s !== 'string' || !s.trim()) bad.push(`${id}: нет чтения`);
      else if (FOREIGN[loc].test(s)) bad.push(`${id}: чужие буквы в «${s}»`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
});

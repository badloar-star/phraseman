/**
 * «Читается» во вступлениях переживает пересборку курса.
 * зачем (владелец 06.11, блокер сборки 150): чтения es были стёрты чужой полной пересборкой, потому что сборщик знал только en/fr. Теперь правило одно на все языки
 * (scripts/classic_intro_say_lib.cjs), сборщик (scripts/classic_course_pack.mjs) вызывает его для ЛЮБОГО языка. Сторож: (1) в сборщике нет ограничения по языку вокруг вызова;
 * (2) для каждого курса «снять sayByLocale и применить правило к теории + say_extra_<lang>.json» даёт чтение каждому примеру каждого блока — то есть пересборка не может уменьшить
 * число блоков с sayByLocale (ru и uk).
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const LANGS = ['en', 'es', 'fr', 'de', 'it'] as const;

type Block = { examplesById?: string[]; exampleIds?: string[]; sayByLocale?: Record<'ru' | 'uk', Record<string, string>> };
type Lib = { applyIntroSay: (a: { intro: Record<string, Block[]>; theory: unknown; extra: unknown }) => { blocks: number; examples: number; missing: string[] } };

// eslint-disable-next-line @typescript-eslint/no-require-imports -- общий модуль сборщика (CommonJS): его читают и сборщик (ESM), и этот тест
const load = async (): Promise<Lib> => require(path.join(ROOT, 'scripts', 'classic_intro_say_lib.cjs')) as Lib;
const readJson = (p: string): any => JSON.parse(fs.readFileSync(p, 'utf8'));
const withSay = (intro: Record<string, Block[]>): number =>
  Object.values(intro).flat().filter((b) => b.sayByLocale && Object.keys(b.sayByLocale.ru ?? {}).length && Object.keys(b.sayByLocale.uk ?? {}).length).length;

describe('сборщик курсов кладёт «Читается» для любого языка', () => {
  const pack = fs.readFileSync(path.join(ROOT, 'scripts', 'classic_course_pack.mjs'), 'utf8').replace(/\r\n/g, '\n');

  it('сборщик вызывает общее правило без привязки к языку', () => {
    expect(pack).toContain("import sayLib from './classic_intro_say_lib.cjs';");
    const at = pack.indexOf('applyIntroSay({ intro, theory, extra })');
    expect(at).toBeGreaterThan(0);
    // зачем: перед вызовом не должно быть условия вида `if (lang === 'en' || …)` — оно и стёрло чтения es/de/it
    const before = pack.slice(Math.max(0, at - 700), at);
    expect(before).not.toMatch(/if \(\s*(\[[^\]]*\]\.includes\(lang\)|lang\s*===)/);
  });

  it.each(LANGS)('курс %s: после «пересборки» у каждого примера каждого блока есть чтение ru и uk, блоков с чтением не меньше, чем в файле', async (lang) => {
    const { applyIntroSay } = await load();
    const dir = path.join(ROOT, 'modules', 'classic-courses', lang);
    const intro = readJson(path.join(dir, 'intro.json')) as Record<string, Block[]>;
    const theoryRaw = readJson(path.join(dir, 'theory.json'));
    const extraFile = path.join(ROOT, 'docs', 'work', 'classic_intro_plain', `say_extra_${lang}.json`);
    const extra = fs.existsSync(extraFile) ? readJson(extraFile) : {};
    const before = withSay(intro);
    for (const list of Object.values(intro)) for (const b of list) delete b.sayByLocale; // «свежая сборка»: вступления без чтений
    const res = applyIntroSay({ intro, theory: theoryRaw.data ?? theoryRaw, extra });
    expect(res.missing.slice(0, 10)).toEqual([]);
    expect(withSay(intro)).toBeGreaterThanOrEqual(before);
    expect(res.blocks).toBeGreaterThan(90);
  });
});

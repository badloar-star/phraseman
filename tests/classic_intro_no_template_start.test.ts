/**
 * Сторож интро классических курсов: ни в одном экране intro любого урока и любого языка нет шаблонных начал
 * «Представь ситуацию» / «Imagine…» (ПРАВИЛО ВЛАДЕЛЬЦА 05.11, передал координатор; список начал согласуется с Теорией).
 *
 * зачем: интро каждого урока открывалось одним и тем же штампом «Представь ситуацию» (и его аналогами на uk/en/es/…), что выглядело
 * машинным шаблоном. Сторож проверяет ВСЕ строки текста экранов (заголовки title*, тексты text*, строки внутри linesRU/parts и т. п.)
 * в modules/classic-courses/<lang>/intro.json для en/es/fr/de/it: ни одна строка не начинается с запрещённого оборота и не равна ему.
 * Чтобы расширить список — добавить шаблон в FORBIDDEN_STARTS (с согласия Теории).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const LANGS = ['en', 'es', 'fr', 'de', 'it'] as const;

/** Запрещённые начала (после обрезки пробелов и ведущих кавычек/тире, без учёта регистра). */
export const FORBIDDEN_STARTS: readonly RegExp[] = [
  /^представь(те)?(\s|[,:.!—-]|$)/i,
  /^уяви(ть)?(\s|[,:.!—-]|$)/i,
  /^imagine(\s|[,:.!—-]|$)/i,
  /^picture\s+(the|this|a)\s+(situation|scene)/i,
  /^imagina(d)?\s+(la\s+)?(situaci[oó]n|escena)/i,
  /^imagin(e|ez)\s+(la\s+)?(situation|sc[eè]ne)/i,
  /^stell(e)?\s+dir\s+(die\s+)?(situation|szene)?\s*vor/i,
  /^stellen\s+sie\s+sich\s+vor/i,
  /^immagina(te)?(\s|[,:.!—-]|$)/i,
  /^picture\s+this/i, // согласовано с координатором 05.11
  /^h[aã]y\s+t[uư][ơo]ng\s+t[uư][ơo]ng/i, // vi: «Hãy tưởng tượng…»
  /^bayangkan(\s|[,:.!—-]|$)/i, // id
  /^hayal\s+et/i, // tr
  /^wyobra[zź]\s+sobie/i, // pl
];

function strings(value: unknown, trail: string, out: Array<{ at: string; text: string }>): void {
  if (typeof value === 'string') { out.push({ at: trail, text: value }); return; }
  if (Array.isArray(value)) { value.forEach((item, i) => strings(item, `${trail}[${i}]`, out)); return; }
  if (value && typeof value === 'object') for (const [key, inner] of Object.entries(value)) strings(inner, `${trail}.${key}`, out);
}

describe('интро классических курсов без шаблонных начал «Представь ситуацию» / «Imagine…»', () => {
  it.each(LANGS)('%s: ни одна строка текста экранов intro не начинается с запрещённого оборота', (lang) => {
    const intro = JSON.parse(fs.readFileSync(path.join(ROOT, lang, 'intro.json'), 'utf8')) as Record<string, unknown>;
    const all: Array<{ at: string; text: string }> = [];
    strings(intro, lang, all);
    expect(all.length).toBeGreaterThan(300); // сторож не пуст: в интро сотни строк
    const bad = all
      .filter(({ text }) => FORBIDDEN_STARTS.some((re) => re.test(text.trim().replace(/^[«"“'\-—\s]+/, ''))))
      .map(({ at, text }) => `${at}: «${text.slice(0, 60)}»`);
    expect(bad.slice(0, 12)).toEqual([]);
    expect(bad.length).toBe(0);
  });

  it('сторож ловит шаблон (самопроверка шаблонов)', () => {
    const samples = ['Представь ситуацию', 'Уяви ситуацію', 'Imagine the scene', 'Picture the situation', 'Imagina la situación', 'Imaginez la scène', 'Stell dir vor', 'Immagina la scena'];
    for (const sample of samples) expect(FORBIDDEN_STARTS.some((re) => re.test(sample))).toBe(true);
    for (const ok of ['Друг уже надел куртку.', 'The shop is open.', 'Ты видишь человека в очереди.']) expect(FORBIDDEN_STARTS.some((re) => re.test(ok))).toBe(false);
  });
});

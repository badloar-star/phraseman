/**
 * Данные классических курсов не подсовывают английский источник другим языкам интерфейса (Ревизор, 05.11.2026).
 *
 * зачем (владелец 05.11 06:07–06:10, TestFlight 149: «теория показывает английский»; P0 координатора, пункт (б)):
 * экранный слой (classic_no_stubs_contract, Learning V2) не показывает английский источник не-английскому КУРСУ; этот сторож смотрит в ДАННЫЕ:
 * для каждого курса fr/es/de/it и каждого языка интерфейса теория (textByLocale), слова (meaning), интро (titleByLocale/textByLocale)
 * обязаны быть на языке интерфейса — ru/uk кириллицей, остальные не копией английского текста. Английский язык интерфейса (en) допустим.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const COURSES = ['es', 'fr', 'de', 'it'] as const;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CYR = /[Ѐ-ӿ]/g;
const LAT = /[A-Za-z]/g;

type Bag = Record<string, string | string[]>;
/** Значение локали бывает строкой или списком абзацев (интро). */
const asText = (v: unknown): string => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(' ') : typeof v === 'string' ? v : '').trim();
const json = (rel: string): any => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

/** Все пары (путь, словарь «локаль → текст») внутри документа. */
function bags(value: unknown, trail: string, out: Array<{ at: string; bag: Bag }>): void {
  if (Array.isArray(value)) { value.forEach((v, i) => bags(v, `${trail}[${i}]`, out)); return; }
  if (!value || typeof value !== 'object') return;
  const rec = value as Record<string, unknown>;
  for (const [key, inner] of Object.entries(rec)) {
    if ((key === 'textByLocale' || key === 'titleByLocale' || key === 'meaning') && inner && typeof inner === 'object' && !Array.isArray(inner)) out.push({ at: `${trail}.${key}`, bag: inner as Bag });
    else bags(inner, `${trail}.${key}`, out);
  }
}

function violations(file: string, course: string): string[] {
  const found: Array<{ at: string; bag: Bag }> = [];
  bags(json(`${course}/${file}`), `${course}/${file}`, found);
  const bad: string[] = [];
  for (const { at, bag } of found) {
    const en = asText(bag.en);
    for (const locale of LOCALES) {
      const text = asText(bag[locale]);
      if (!text) { bad.push(`${at}[${locale}]: пусто`); continue; }
      if (locale === 'ru' || locale === 'uk') {
        const prose = text.replace(/«[^»]*»|`[^`]*`|“[^”]*”|"[^"]*"|‹[^›]*›/g, ' '); // примеры на целевом языке в кавычках не считаем
        const cyr = (prose.match(CYR) ?? []).length; const lat = (prose.match(LAT) ?? []).length;
        // код/примеры на целевом языке в `…` допустимы, но кириллицы не меньше трети латиницы (заголовки вида «Просьба: je voudrais» допустимы)
        if (text.length > 25 && cyr * 3 < lat) bad.push(`${at}[${locale}]: нет русского/украинского «${text.slice(0, 50)}»`);
        else if (text.length <= 25 && cyr === 0 && lat > 0 && /^[A-Za-z' -]+$/.test(text) && text.toLowerCase() === en.toLowerCase()) bad.push(`${at}[${locale}]: как английский «${text}»`);
      } else if (en.length > 25 && text === en) bad.push(`${at}[${locale}]: копия английского «${en.slice(0, 50)}»`);
    }
  }
  return bad;
}

// зачем (решение Fable 3f8388694 через координатора, 05.11): английская копия теории/словаря в es/pt-BR/vi/id/tr/pl — известный долг 2.1.1
// (владелец: «потом», не блокер 150; перевод ~1700 текстов — docs/work/release/NEXT_UPDATES_BACKLOG_2026-11-05.md §1).
// Долг ЗАМОРОЖЕН потолком на 05.11: текущее число разрешено, любая НОВАЯ копия — красный. Перевели — потолок опускать (только вниз).
// Пустые значения и ru/uk без кириллицы — по-прежнему строго 0: это не долг, а поломка.
const KNOWN_DEBT_2_1_1_COPY_CEILING: Readonly<Record<string, number>> = {
  'es/theory.json': 258, 'es/glossary.json': 10, 'es/intro.json': 0,
  'fr/theory.json': 318, 'fr/glossary.json': 50, 'fr/intro.json': 0,
  'de/theory.json': 516, 'de/glossary.json': 5, 'de/intro.json': 0,
  'it/theory.json': 571, 'it/glossary.json': 40, 'it/intro.json': 0,
};
// Заголовки «Формы: …» / «Фразы: …» — русская подпись + примеры на изучаемом языке; это не английский источник, а ложное срабатывание правила трети.
const ALLOWED_RU_UK_HEADINGS = new Set([
  'de/intro.json.19[1].titleByLocale[ru]', 'de/intro.json.19[1].titleByLocale[uk]',
  'it/intro.json.28[1].titleByLocale[ru]', 'it/intro.json.28[1].titleByLocale[uk]',
]);
const isCopyDebt = (v: string): boolean => /\]: копия английского «/.test(v);
const violationKey = (v: string): string => v.slice(0, v.indexOf(': '));

describe('данные классики: язык интерфейса получает свой текст, а не английский источник', () => {
  for (const file of ['theory.json', 'glossary.json', 'intro.json']) {
    it.each(COURSES)(`%s / ${file}`, (course) => {
      const all = violations(file, course).filter((v) => !ALLOWED_RU_UK_HEADINGS.has(violationKey(v)));
      // строго: пустые и ru/uk без своего языка
      const strict = all.filter((v) => !isCopyDebt(v));
      expect(strict.slice(0, 12)).toEqual([]);
      // долг 2.1.1: английских копий не больше потолка 05.11
      const copies = all.filter(isCopyDebt).length;
      const ceiling = KNOWN_DEBT_2_1_1_COPY_CEILING[`${course}/${file}`] ?? 0;
      if (copies > ceiling) console.warn(`[CLASSIC-EN-DEBT] ${course}/${file}: копий ${copies} > потолка ${ceiling} — добавилась новая английская копия`); // guard-ok: причина падения
      expect(copies).toBeLessThanOrEqual(ceiling);
    });
  }
});

/**
 * В тексте локали нет привязки к другим языкам (Ревизор, 05.11.2026; P0 владельца через координатора).
 *
 * зачем: пользователь с английским/испанским/… интерфейсом не должен читать «Russian letters only give the sound approximately» и т.п. Во ВСЕХ локалях, КРОМЕ
 * ru и uk, в данных классики (theory/intro/glossary/lessons/ui всех курсов) запрещены упоминания русского языка и кириллицы на 9 языках. Красный, пока корпус не чист.
 * Список находок: node scripts/classic_cross_language_scan.cjs.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { scan, BAD } = require('../scripts/classic_cross_language_scan.cjs') as {
  scan: () => Array<{ file: string; at: string; loc: string; hit: string; text: string }>;
  BAD: RegExp;
};

describe('локали кроме ru/uk без привязки к русскому языку и кириллице', () => {
  it('самопроверка шаблона', () => {
    for (const s of ['Russian letters only give the sound approximately', 'lettres russes', 'russische Buchstaben', 'letras rusas', 'lettere russe', 'Cyrillic', 'chữ Nga'])
      expect(BAD.test(s)).toBe(true);
    for (const s of ['Je suis ici', 'Sounds like: ikh bin heer', 'Hello, Russia is big']) expect(BAD.test(s)).toBe(false);
  });

  it('в данных классики нарушений нет', () => {
    const found = scan();
    const byFile = found.reduce<Record<string, number>>((acc, x) => { const k = `${x.file}[${x.loc}]`; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
    expect(Object.keys(byFile).length).toBe(0);
    expect(found.slice(0, 5)).toEqual([]);
  });
});

// зачем (Макеты 05.11, дефект «AFFIRMATI / VE»): заголовок колонки таблицы форм в теории не должен резать слово посреди — ни капсом с разрядкой,
// ни слишком длинным словом для колонки на узком экране 360 px. Без adjustsFontSizeToFit (запрет владельца): обычный регистр, 12/11 пт, короткие слова.
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'hint.tsx'), 'utf8');

describe('theory table headers do not break words', () => {
  it('TableHeader: no uppercase letter-spaced caps, no font shrinking', () => {
    const start = src.indexOf('function TableHeader(');
    const end = src.indexOf('function TableRow(', start);
    const header = src.slice(start, end);
    expect(header).not.toContain("textTransform: 'uppercase'");
    expect(header).not.toContain('adjustsFontSizeToFit');
    expect(header).toContain('letterSpacing: 0');
    expect(header).toContain('cols.length >= 4 ? 11 : 12');
  });

  it('every header word fits its column on a 360 px screen (estimate: Latin 6.6 px, Cyrillic 7.2 px per letter at 12 pt, 11 pt for 4+ columns)', () => {
    const tables = [...src.matchAll(/headers=\{\[([\s\S]*?)\]\}\n/g)];
    expect(tables.length).toBeGreaterThan(40);
    const overflows: string[] = [];
    tables.forEach((table, index) => {
      const calls = [...table[1]!.matchAll(/L\(lang,([^)]*)\)/g)].map((c) => [...c[1]!.matchAll(/"([^"]+)"/g)].map((q) => q[1]!));
      const cols = calls.length || 1;
      const scale = cols >= 4 ? 11 / 12 : 1;
      const width = (360 - 32) / cols - 8;
      for (const call of calls) {
        for (const text of call) {
          for (const word of text.split(/\s+/)) {
            const perLetter = /[А-Яа-яІіЇїЄє]/.test(word) ? 7.2 : 6.6;
            if (word.length * perLetter * scale > width) overflows.push(`таблица ${index + 1} (${cols} кол.): ${word}`);
          }
        }
      }
    });
    expect(overflows).toEqual([]);
  });
});

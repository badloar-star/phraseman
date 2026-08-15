import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Каждая строка Арены существует на всех восьми языках.
 *
 * `arenaText` разбирает массив по позициям: восьмая — польский. Массив из семи
 * элементов даёт `undefined`, `triLang` возвращает его как есть, и на экране
 * появляется пустое место. Ни типы, ни сборка этого не ловят: массив строк
 * остаётся массивом строк какой угодно длины.
 *
 * Заметить пропажу можно только на устройстве с этим языком — то есть у
 * игрока, а не у нас.
 */
const LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

const FILES: Readonly<Record<string, number>> = {
  // Файл → сколько ключей в нём должно быть НЕ МЕНЬШЕ. Число нужно, чтобы
  // сломавшийся разбор не притворился зелёной проверкой пустого списка.
  'modules/arena/copy.ts': 150,
  'modules/arena/expansion_copy.ts': 100,
  'modules/arena/expansion_store_copy.ts': 10,
};

type Entry = Readonly<{ key: string; values: readonly string[] }>;

function entries(rel: string): readonly Entry[] {
  const source = read(rel);
  const out: Entry[] = [];
  const re = /^ {2}([A-Za-z0-9_]+):\s*\[([\s\S]*?)\],\s*$/gm;
  let match = re.exec(source);
  while (match) {
    const values = (match[2] as string).match(/'(?:[^'\\]|\\.)*'/g) ?? [];
    out.push({ key: match[1] as string, values: values.map((v) => v.slice(1, -1)) });
    match = re.exec(source);
  }
  return out;
}

describe('Arena copy completeness', () => {
  for (const [rel, minimum] of Object.entries(FILES)) {
    test(`${rel}: разбор нашёл строки`, () => {
      expect(entries(rel).length).toBeGreaterThanOrEqual(minimum);
    });

    test(`${rel}: у каждой строки восемь языков`, () => {
      const broken = entries(rel)
        .filter((entry) => entry.values.length !== LANGS.length)
        .map((entry) => `${entry.key}: ${entry.values.length}`);
      expect(broken).toEqual([]);
    });

    test(`${rel}: ни один язык не пустой`, () => {
      const blank: string[] = [];
      for (const entry of entries(rel)) {
        entry.values.forEach((value, index) => {
          if (!value.trim()) blank.push(`${entry.key} → ${LANGS[index]}`);
        });
      }
      expect(blank).toEqual([]);
    });
  }

  test('разбор по позициям всё ещё рассчитан на восемь языков', () => {
    // Девятый язык добавляется осознанно: он меняет и порядок разбора, и все
    // массивы разом. Пусть это будет решением, а не случайностью.
    expect(read('modules/arena/copy.ts')).toContain('const [ru, uk, es, ptBR, vi, id, tr, pl] = C[key]');
  });
});

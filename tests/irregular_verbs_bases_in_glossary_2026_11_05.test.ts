// Governance-ID: TG-3A0F7C1D2B44
import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 05.11, регрессия 58c71e4cb): база `catch` стояла в LESSON_IRREGULAR_BASES без строки в IRREGULAR_VERB_GLOSSARY,
// модуль бросал ошибку при загрузке и ронял импорт lesson_menu. Тесты того коммита прошли, потому что строка глоссария лежала в
// чужих НЕзакоммиченных правках рабочего дерева (проверка шла по грязному дереву, а закоммитилась часть хунков). Сторож читает
// закоммиченный исходник и проверяет каждую базу; модуль больше не бросает на уровне загрузки, а пишет [IRREGULAR-VERBS] missing_row.

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'irregular_verbs_data.ts'), 'utf8');

function block(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`block not found: ${startMarker}`);
  return source.slice(start, end);
}

const glossaryBlock = block('const IRREGULAR_VERB_GLOSSARY', 'const LESSON_IRREGULAR_BASES');
const basesBlock = block('const LESSON_IRREGULAR_BASES', 'function verbsForLesson');

const glossaryKeys = new Set([...glossaryBlock.matchAll(/^\s{2}([A-Za-z]+):\s*\{/gm)].map((m) => m[1]));
const basesByLesson: Array<{ lesson: number; bases: string[] }> = [...basesBlock.matchAll(/^\s+(\d+):\s*\[([^\]]*)\]/gm)].map((m) => ({
  lesson: Number(m[1]),
  bases: [...m[2].matchAll(/'([A-Za-z]+)'/g)].map((b) => b[1]),
}));

describe('неправильные глаголы: базы и глоссарий', () => {
  test('сторож нашёл данные (иначе проверка пуста)', () => {
    expect(glossaryKeys.size).toBeGreaterThan(40);
    expect(basesByLesson.length).toBeGreaterThanOrEqual(30);
  });

  test('каждая база из LESSON_IRREGULAR_BASES есть в глоссарии', () => {
    const missing = basesByLesson.flatMap(({ lesson, bases }) => bases.filter((b) => !glossaryKeys.has(b)).map((b) => `l${lesson}:${b}`));
    expect(missing).toEqual([]);
  });

  test('модуль импортируется без исключения и даёт глаголы для каждого урока с базами', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    let loaded: typeof import('../app/irregular_verbs_data');
    expect(() => {
      jest.isolateModules(() => {
        loaded = require('../app/irregular_verbs_data');
      });
    }).not.toThrow();
    for (const { lesson, bases } of basesByLesson) {
      expect(loaded!.IRREGULAR_VERBS_BY_LESSON[lesson]).toHaveLength(bases.length);
    }
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('[IRREGULAR-VERBS]'))).toHaveLength(0);
    warn.mockRestore();
  });

  test('отсутствие строки глоссария не роняет загрузку: лог и пропуск, а не throw', () => {
    expect(source).toContain("[IRREGULAR-VERBS] missing_row");
    expect(source).not.toMatch(/throw new Error\(`Missing irregular verb glossary row/);
  });
});

// Сторож (контроль качества слоя правок ru/uk курсов, 05.11): читает docs/work/classic_translation_fixes_2026_11_04.json
// и проверяет то, что Переводчик может сломать одним коммитом: формат ключа `<lang>:<LL>.<PP>`, дубли, пустые строки,
// ru и uk, совпавшие дословно. Файл слоя только читается — правит его исключительно Переводчик.
// зачем: дубль ключа JSON молча перезаписывает первую запись, пустая строка уйдёт в курс; сторож ловит это до коммита.
import fs from 'fs';
import path from 'path';

const LAYER = path.join(__dirname, '..', 'docs', 'work', 'classic_translation_fixes_2026_11_04.json');
const KEY_RE = /^[a-z]{2}(-[A-Za-z]{2,4})?:\d{2}\.\d{2}$/;
// зачем: известное состояние на 05.11 (ratchet). Новые пропуски ru/uk ломают сборку; уменьшать можно, увеличивать — нет.
// зачем: одинаковое ru и uk допустимо только там, где слово совпадает в обоих языках (проверено: en:23.49 «Сумки перенесли вниз.»).
const RU_EQ_UK_ALLOWED = new Set(['en:23.49']);

type Entry = { ru?: string; uk?: string; reason?: string };

function loadRaw(): string {
  return fs.readFileSync(LAYER, 'utf8');
}

function entriesOf(raw: string): Array<[string, Entry]> {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return Object.entries(parsed)
    .filter(([k]) => k !== '_note')
    .map(([k, v]) => [k, (v ?? {}) as Entry]);
}

describe('слой правок ru/uk курсов — контроль качества', () => {
  const raw = loadRaw();
  const entries = entriesOf(raw);

  it('каждый ключ в формате <lang>:<LL>.<PP>', () => {
    const bad = entries.map(([k]) => k).filter((k) => !KEY_RE.test(k));
    expect(bad).toEqual([]);
  });

  it('нет дублей ключей в исходном тексте JSON', () => {
    const keys = [...raw.matchAll(/^\s*\["([^"]+)",/gm)].map((m) => m[1]);
    const count: Record<string, number> = {};
    for (const k of keys) count[k] = (count[k] ?? 0) + 1;
    const dups = Object.entries(count).filter(([, c]) => c > 1).map(([k]) => k);
    expect(dups).toEqual([]);
  });

  it('нет пустых строк в ru и uk', () => {
    const empty: string[] = [];
    for (const [k, v] of entries) {
      for (const lang of ['ru', 'uk'] as const) {
        if (typeof v[lang] === 'string' && v[lang]!.trim() === '') empty.push(`${k}.${lang}`);
      }
    }
    expect(empty).toEqual([]);
  });

  it('ru и uk не совпадают дословно (кроме разрешённых)', () => {
    const same = entries
      .filter(([k, v]) => typeof v.ru === 'string' && typeof v.uk === 'string' && v.ru.trim() === v.uk.trim() && !RU_EQ_UK_ALLOWED.has(k))
      .map(([k]) => k);
    expect(same).toEqual([]);
  });
});

import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

// зачем: D83 (владелец, 2026-09-30) — клиентская Арена удалена целиком, а
// серверная снята ещё в D78. Прежний сторож сверял «что зовёт клиент ↔ что
// вывезено из точки входа». Теперь сверять нечего: сторож стал ратчетом
// «клиент НЕ зовёт ни одной функции Арены и не слушает её коллекции». Если
// кто-то вернёт вызов, игрок получит `not-found` (функции на сервере нет) —
// ровно тот немой отказ, ради которого сторож и существовал.

const ROOT = path.resolve(__dirname, '..');
const CLIENT_DIRS = ['app', 'components', 'hooks', 'modules', 'constants', 'lib', 'shared'];

function clientSources(): ReadonlyArray<{ file: string; code: string }> {
  const out: Array<{ file: string; code: string }> = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(full);
      } else if (/\.(tsx?|mts|js)$/.test(entry.name)) {
        const code = normalizeEol(fs.readFileSync(full, 'utf8'))
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
        out.push({ file: path.relative(ROOT, full).replace(/\\/g, '/'), code });
      }
    }
  };
  for (const dir of CLIENT_DIRS) walk(path.join(ROOT, dir));
  return out;
}

describe('D83: клиентской Арены нет', () => {
  const sources = clientSources();

  test('разбор клиента не пустой', () => {
    // Сломанный обход дал бы пустой список и вечный зелёный сторож.
    expect(sources.length).toBeGreaterThan(500);
  });

  test('клиент не зовёт ни одной callable-функции Арены', () => {
    const offenders = sources
      .filter(({ code }) => /callArena\s*(?:<|\()|['"`](?:arenaV2|arenaV3|arenaExpansion)[A-Z][A-Za-z0-9]*['"`]/.test(code))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test('клиент не слушает и не пишет коллекции Арены', () => {
    const offenders = sources
      .filter(({ code }) => /['"`]arena_v2_(?:queue|matches|match_live|profiles|members|invites)['"`]/.test(code))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test('клиента Арены нет на диске', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/arena_client.ts'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'modules/arena/live_channel.ts'))).toBe(false);
  });
});

// зачем (владелец 01.10, D148/D78; Q109): старые спины и подарки удаляются БЕЗ компенсации —
// перевод в монеты не выключен флагом, а УДАЛЁН вместе с кодом. Сторож: механики нет вовсе —
// ни модулей, ни флага, ни запуска миграции. Сработал — нужен НОВЫЙ ответ владельца, а не правка теста.
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const LIVE_DIRS = ['app', 'components', 'hooks', 'modules', 'constants'];
const CODE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (CODE_RE.test(entry.name)) out.push(full);
  }
}

describe('перевод подарков в монеты удалён (владелец 01.10, D148)', () => {
  it('модулей app/gifts_to_coins_* больше нет', () => {
    const leftovers = fs.readdirSync(path.join(ROOT, 'app')).filter((name) => name.startsWith('gifts_to_coins_'));
    expect(leftovers).toEqual([]);
  });

  it('флага gifts_to_coins_enabled в клиенте нет вовсе', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app', 'remote_flags.ts'), 'utf8');
    expect(src).not.toMatch(/gifts_to_coins_enabled/);
  });

  it('живой код не импортирует и не запускает миграцию', () => {
    const files: string[] = [];
    for (const dir of LIVE_DIRS) {
      const abs = path.join(ROOT, dir);
      if (fs.existsSync(abs)) walk(abs, files);
    }
    const offenders = files
      .filter((file) => /(?:from\s+|import\(\s*|require\(\s*)['"][^'"]*gifts_to_coins_|startGiftsToCoinsMigrationScheduler/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file).replace(/\\/g, '/'));
    expect(offenders).toEqual([]);
  });
});

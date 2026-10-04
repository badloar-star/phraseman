// ════════════════════════════════════════════════════════════════════════════
// Сторож: спин за урок / сессию курса / словарь / глаголы НЕ выдаётся НИКОГДА.
//
// История: решение владельца 2026-09-17 «спин это привилегия» → PM-047 (2026-09-24): механика спина
// отменена целиком (D09, R046/R047). Раньше этот файл проверял, что функции выдачи в
// app/local_level_spins.ts безусловно возвращают false. В снимке 2.0 (efe19ae9d) модуль удалён
// целиком — гарантия стала сильнее, и сторож переписан (04.10): модуля нет, и ни один исходник
// приложения не зовёт выдачу спина.
//
// Сработал — проверить, не вернулась ли механика спина, а не чинить тест под старое поведение.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SOURCE_DIRS = ['app', 'components', 'hooks', 'modules'];
const SPIN_GRANT = /grantLocal(?:Lesson|CourseSession|Study)\w*Spin|grantLocalLevelSpins/;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('lesson spin privilege retired (PM-047, D09)', () => {
  it('модуль локальной выдачи спинов удалён', () => {
    expect(fs.existsSync(path.join(ROOT, 'app', 'local_level_spins.ts'))).toBe(false);
  });

  it('ни один исходник приложения не выдаёт спин за урок/сессию/словарь/глаголы', () => {
    const offenders = SOURCE_DIRS
      .flatMap((dir) => walk(path.join(ROOT, dir)))
      .filter((file) => SPIN_GRANT.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file).split(path.sep).join('/'));
    expect(offenders).toEqual([]);
  });
});

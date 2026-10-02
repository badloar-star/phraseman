/**
 * Сторож D49: «Дневной путь» (окно «бонус дня», подарки 50-дневной серии)
 * удалён целиком (владелец 2026-10-01: «я говорил удалить фичу и весь код» —
 * окно открылось на старте на iPhone). Замена — блок «Сегодня» без окон.
 *
 * Сработал — НЕ возвращай фичу и не ослабляй проверку: убери вернувшийся код.
 * Наследия нет: модуль чтения журнала подарков (компенсация Q12) удалён вместе
 * с миграцией «Подарки → монеты» (D148, Q109); остались только имена ключей в
 * app/retired_account_local_keys.ts — их стирают при смене аккаунта. Монеты «Сегодня» идут через dailyjourney_ — это имя источника
 * кошелька, а не модуль «Дневного пути».
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const LIVE_DIRS = ['app', 'components', 'hooks', 'modules', 'constants', 'scripts'];
const CODE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
// Путь импорта, ведущий в удалённый модуль «Дневного пути».
const RETIRED_IMPORT_RE = /(?:from\s+|import\(\s*|require\(\s*)['"][^'"]*(?:daily_journey|DailyJourney|dailyJourney)[^'"]*['"]/;

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (CODE_RE.test(entry.name)) out.push(full);
  }
}

describe('D49: «Дневной путь» удалён и не монтируется на старте', () => {
  it('корневой layout не монтирует хост окна бонуса/награды «Дневного пути»', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    expect(layout).not.toMatch(/<DailyJourney\w*/);
    expect(layout).not.toMatch(/import[^;]*(daily_journey|DailyJourney)/);
  });

  it('в живом коде нет импортов модулей «Дневного пути»', () => {
    const files: string[] = [];
    for (const dir of LIVE_DIRS) {
      const abs = path.join(ROOT, dir);
      if (fs.existsSync(abs)) walk(abs, files);
    }
    const offenders = files
      .filter((file) => RETIRED_IMPORT_RE.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file).replace(/\\/g, '/'));
    expect(offenders).toEqual([]);
  });

  it('файлы фичи удалены', () => {
    for (const rel of [
      'app/daily_journey_gift_inbox.ts',
      'app/daily_journey_production_host.ts',
      'app/daily_journey_gift_activation.ts',
      'components/daily_journey/DailyJourneyProductionModalHost.tsx',
      'components/daily_journey/DailyJourneyRevealScene.tsx',
      'components/dev/DailyJourneyRewardPreviewModal.tsx',
      'constants/daily_journey_gift_storage_keys.ts',
    ]) {
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(false);
    }
  });

  it('модуль наследия для Q12 удалён (D148, Q109)', () => {
    expect(fs.existsSync(path.join(ROOT, 'app', 'gifts_to_coins_legacy_daily_path_v1.ts'))).toBe(false);
  });

  it('оверлей-ключей «Дневного пути» больше нет', () => {
    const arbiter = fs.readFileSync(path.join(ROOT, 'components', 'overlay_arbiter_core.ts'), 'utf8');
    expect(arbiter).not.toMatch(/'dailyJourney/);
  });
});

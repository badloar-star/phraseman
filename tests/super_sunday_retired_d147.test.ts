// зачем (D147, владелец 01.10): «Супер-воскресенье» снято. Сторож: новые воскресенья
// без удвоения; старые воскресные квитанции (до снятия) дают ту же сумму, что и тогда;
// сервер переходно принимает ×2 от старых сборок, чтобы человек не остался без монет.
import * as fs from 'fs';
import * as path from 'path';
import {
  SUPER_SUNDAY_RETIRED_AT_MS,
  applySuperSundayRuneMultiplier,
  isSuperSundayActive,
  legacySuperSundayAmount,
} from '../modules/economy/super_sunday_runes';

const SUNDAY_BEFORE = Date.parse('2026-09-27T12:00:00.000Z');
const SUNDAY_AFTER = Date.parse('2026-10-04T12:00:00.000Z');

describe('D147: «Супер-воскресенье» снято', () => {
  it('метка снятия — 01.10.2026 UTC', () => {
    expect(new Date(SUPER_SUNDAY_RETIRED_AT_MS).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });
  it('воскресенье после снятия — без удвоения', () => {
    expect(isSuperSundayActive(SUNDAY_AFTER)).toBe(false);
    expect(applySuperSundayRuneMultiplier(17, SUNDAY_AFTER)).toBe(17);
  });
  it('старая воскресная квитанция повторяется той же суммой (сверка кошелька не расходится)', () => {
    expect(applySuperSundayRuneMultiplier(17, SUNDAY_BEFORE)).toBe(34);
  });
  it('legacy-сумма старой сборки — для переходного приёма на сервере', () => {
    expect(legacySuperSundayAmount(17, SUNDAY_AFTER)).toBe(34);
    expect(legacySuperSundayAmount(17, Date.parse('2026-10-05T12:00:00.000Z'))).toBe(17);
  });
  it('сервер принимает ×2 от старой сборки с логом, а не отклоняет выдачу', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'level_spin_star_grant.ts'), 'utf8');
    expect(src).toContain('legacySuperSundayAmount');
    expect(src).toContain('[SUPER-SUNDAY-RETIRED]');
  });
  it('на экранах нет баннеров и строк «Супер-воскресенья»', () => {
    const consumers = ['app', 'components'].flatMap((dir) => {
      const out: string[] = [];
      const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
        if (e.name === 'node_modules' || e.name.startsWith('.')) return;
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.tsx$/.test(e.name) && /superSundayEndsAtUtcMs|Супер-воскрес|Super Sunday(?! retired)/i.test(fs.readFileSync(full, 'utf8'))) out.push(full);
      });
      walk(path.join(__dirname, '..', dir));
      return out;
    });
    expect(consumers).toEqual([]);
  });
});

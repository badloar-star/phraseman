/**
 * ЗАМОК ВЛАДЕЛЬЦА 28.10 (чат Codex 13:05, «давай делаем», «согласен»; записано координатором): энергия — запас 5, +1 за 30 минут
 * (от нуля до полного — 150 минут); месячного лимита тренировок нет. Прежнее «+1 за 10 минут» (D06/D07, BIBLE, PM-083) этим словом
 * заменено — старые комментарии в app/energy_contract.ts и app/energy_system.ts про 10 минут не считать правилом.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// зачем (координатор 28.10): значения энергии и лимита лежат в незакоммиченных правках Codex — на HEAD сторож был бы красным и мешал
// чужим прогонам. Выключен до коммита Codex; включает Codex в том же коммите (docs/work/handover/codex-review-2026-10-28.md, п. 2).
const CODEX_ENERGY_COMMITTED = false;
const describeLock = CODEX_ENERGY_COMMITTED ? describe : describe.skip;

describeLock('ЗАМОК 28.10: энергия 5 / +1 за 30 минут, без месячного лимита тренировок', () => {
  it('запас энергии — 5, восстановление — одна единица за 30 минут', () => {
    const src = read('app/energy_contract.ts');
    expect(src).toContain('export const ENERGY_BASE_CAPACITY = 5 as const;');
    expect(src).toContain('export const ENERGY_PASSIVE_UNIT_MS = 30 * 60 * 1000;');
  });

  it('месячного лимита тренировок нет: лимит 0 означает «без лимита», а не «ноль тренировок»', () => {
    const src = read('app/monthly_training_sessions.ts');
    expect(src).toMatch(/export const MONTHLY_TRAINING_SESSION_LIMIT(: number)? = 0;/);
    expect(src).toContain("if (MONTHLY_TRAINING_SESSION_LIMIT === 0) return result('allowed', 0, undefined, 'unlimited');");
  });

  it('замок записан в журнале замков владельца', () => {
    expect(read('docs/work/OWNER_LOCKS.md')).toContain('tests/owner_locks_energy_30min_no_month_cap_2026_10_28.test.ts');
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { getDailySetsArenaPolicyErrors } from '../app/daily_tasks';

describe('DAILY_SETS arena policy', () => {
  it('has exactly one arena-type task per calendar day slot for free and premium', () => {
    const errs = getDailySetsArenaPolicyErrors();
    expect(errs).toEqual([]);
  });

  it('does not expose draft rank-tier wording in arena daily task copy', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_tasks.ts'), 'utf8');
    const rankTask = source.match(/id:'arup1'[\s\S]*?descUK:'[^']*'/)?.[0] ?? '';

    expect(rankTask).toContain('новую ступень ранга');
    expect(rankTask).not.toContain('тира');
    expect(rankTask).not.toContain('уровня или лиги');
  });
});

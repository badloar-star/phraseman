import { readFileSync } from 'fs';
import path from 'path';

describe('personal plan cloud sync contract', () => {
  const source = readFileSync(path.join(process.cwd(), 'app', 'cloud_sync.ts'), 'utf8');

  it('syncs active plan state and scoped completed tasks through the main cloud progress payload', () => {
    expect(source).toContain("import { PERSONAL_PLAN_STATE_KEY } from './personal_plan_state';");
    expect(source).toContain("import { COMPLETED_PLAN_TASKS_KEY } from './personal_plan_progress';");
    expect(source).toContain('PERSONAL_PLAN_STATE_KEY,');
    expect(source).toContain('COMPLETED_PLAN_TASKS_KEY,');
  });

  it('clears pending plan activation on account wipe without restoring it as cloud progress', () => {
    expect(source).toContain("import { PERSONAL_PLAN_PENDING_ACTIVATION_KEY } from './personal_plan_activation';");
    expect(source).toContain('PERSONAL_PLAN_PENDING_ACTIVATION_KEY,');
    expect(source).not.toContain('...PERSONAL_PLAN_PENDING_ACTIVATION_KEY');

    const syncKeysStart = source.indexOf('export const SYNC_KEYS = [');
    const accountKeysStart = source.indexOf('export function accountLocalDataKeysForToday');
    const syncKeysBody = source.slice(syncKeysStart, accountKeysStart);

    expect(syncKeysBody).not.toContain('PERSONAL_PLAN_PENDING_ACTIVATION_KEY');
  });
});

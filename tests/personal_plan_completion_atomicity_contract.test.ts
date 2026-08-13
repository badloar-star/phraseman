import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs
  .readFileSync(path.join(ROOT, 'app/personal_plan_progress.ts'), 'utf8')
  .replace(/\r\n/g, '\n');

describe('personal plan completion persistence', () => {
  it('serializes read-modify-write and verifies the persisted completion before returning', () => {
    expect(source).toContain("import { withStorageLock } from './storage_mutex';");
    expect(source).toContain('const created = await withStorageLock(async () => {');
    expect(source).toContain('await AsyncStorage.setItem(COMPLETED_PLAN_TASKS_KEY, JSON.stringify(next));');
    expect(source).toContain('const verified = await readCompletedPlanTasksStrict();');
    expect(source).toContain("throw new Error('personal_plan_completion_not_persisted')");
  });

  it('keeps strict and tolerant reads separate', () => {
    expect(source).toContain('export async function readCompletedPlanTasksStrict()');
    expect(source).toContain('export async function readCompletedPlanTasks()');
    expect(source).toContain('return await readCompletedPlanTasksStrict();');
  });
});

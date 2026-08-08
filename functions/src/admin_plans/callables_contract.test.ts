import fs from 'node:fs';
import path from 'node:path';

const directory = __dirname;

describe('Admin Plans callable seam', () => {
  test('exports bounded create/get/list callables with App Check and no agent or AI delegation', () => {
    const callables = fs.readFileSync(path.join(directory, 'callables.ts'), 'utf8');
    const moduleIndex = fs.readFileSync(path.join(directory, 'index.ts'), 'utf8');
    const rootIndex = fs.readFileSync(path.join(directory, '..', 'index.ts'), 'utf8');

    expect(callables).toContain('export const adminCreatePlan = onCall(OPTIONS');
    expect(callables).toContain('export const adminGetPlan = onCall(OPTIONS');
    expect(callables).toContain('export const adminListPlans = onCall(OPTIONS');
    expect(callables).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(moduleIndex).toContain('adminCreatePlan, adminGetPlan, adminListPlans');
    expect(rootIndex).toContain("from './admin_plans'");
    expect(callables).not.toMatch(/agent_office|agent_manager|openai|defineSecret/i);
  });

  test('keeps storage server-only and queryable without a composite index', () => {
    const repository = fs.readFileSync(path.join(directory, 'firestore_repository.ts'), 'utf8');

    expect(repository).toContain("this.firestore.collection('admin_plans')");
    expect(repository).toContain(".orderBy('createdAtMs', 'desc').limit(input.limit)");
    expect(repository).not.toContain('admin_plan_events');
  });
});

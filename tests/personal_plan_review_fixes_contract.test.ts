import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string): string => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('personal plan restored cross-contract seams', () => {
  it('uses the current verified remote loader flag and canonical analytics events', () => {
    const readiness = read('app/plan_content_remote_readiness.ts');
    const analytics = read('app/analytics.ts');
    expect(readiness).toContain('VERIFIED_COURSE_PACK_REMOTE_ENABLED');
    expect(readiness).not.toContain('PLAN_CONTENT_REMOTE_ENABLED');
    expect(analytics).toContain("| 'plan_content_source'");
    expect(analytics).toContain("| 'plan_content_fallback'");
  });

  it('syncs durable active-plan state while keeping pending/runtime markers account-local', () => {
    const cloud = read('app/cloud_sync.ts');
    const syncSection = cloud.slice(cloud.indexOf('export const SYNC_KEYS'), cloud.indexOf('export function getRuntimeSyncKeys'));
    const localSection = cloud.slice(cloud.indexOf('const RETIRED_ROUTE_ACCOUNT_LOCAL_FIXED_KEYS'), cloud.indexOf('const ACCOUNT_LOCAL_KEY_PREFIXES'));
    for (const key of [
      'personal_plan_state_v1',
      'personal_plan_completed_tasks_v1',
      'personal_plan_task_progress_v1',
      'personal_plan_xp_ledger_v1',
    ]) {
      expect(syncSection).toContain(`'${key}'`);
      expect(localSection).not.toContain(`'${key}'`);
    }
    expect(localSection).toContain("'personal_plan_pending_activation_v1'");
    expect(cloud).toContain("'personal_plan_day_runtime_v1:'");
  });

  it('keeps the restored DEV affordance backed by a DEV-only registered route', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'app/personal_plan_dev.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'app/personal_plan_runtime_dev.tsx'))).toBe(true);
    const layout = read('app/_layout.tsx');
    expect(layout).toMatch(/ENABLE_DEV_TOOLS[\s\S]{0,120}<Stack\.Screen name="personal_plan_dev"/);
    expect(layout).toMatch(/ENABLE_DEV_TOOLS[\s\S]{0,240}<Stack\.Screen name="personal_plan_runtime_dev"/);
  });

  it('routes plan paywall success through the activation-aware post-premium decision', () => {
    const purchase = read('app/paywall_purchase.ts');
    expect(purchase).toContain('activatedPersonalPlan');
    expect(purchase).toContain('personalPlanPostPremiumRoute');
    expect(purchase).toContain("router.replace(personalPlanRoute as any)");
  });
});

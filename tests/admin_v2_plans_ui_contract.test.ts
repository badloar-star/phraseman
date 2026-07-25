import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 plans UI', () => {
  test('exposes the owner-only Plans callable bridge', () => {
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminCreatePlan')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetPlan')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListPlans')");
    expect(firebase).toContain('createPlan: async (input) => unwrap(await createPlanCallable(input))');
    expect(firebase).toContain('getPlan: async (input) => unwrap(await getPlanCallable(input))');
    expect(firebase).toContain('listPlans: async (input) => unwrap(await listPlansCallable(input))');
  });

  test('registers Plans as a canonical native content route', () => {
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    const router = read('admin/v2/scripts/admin-router.js');
    const core = read('admin/v2/scripts/admin-core.js');
    expect(capabilities).toContain("{ id: 'plans', route: 'content', nativeRoute: 'plans'");
    expect(router).toContain("'plans'");
    expect(core).toContain("{ id: 'plans', route: 'plans', label: 'Планы' }");
    expect(core).toContain("plans: 'content'");
  });

  test('keeps plan creation structured and renders only server-derived plan text', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    expect(core).toContain("function renderPlans()");
    expect(core).toContain("if (state.adminRole !== 'owner')");
    expect(core).toContain('id="plan-kind"');
    expect(core).toContain('id="plan-priority"');
    expect(core).toContain('id="plan-effect"');
    expect(core).toContain('id="plan-source-hash"');
    expect(core).toContain('data-plan-action-code');
    expect(core).toContain("source: { kind: 'director_digest', ref: `director_digest:sha256:${sourceHash}` }");
    expect(core).toContain("data-action=\"create-plan\"");
    expect(core).toContain("data-action=\"load-plans\"");
    expect(core).toContain("data-action=\"select-plan\"");
    expect(core).toContain("data-action=\"open-plan-form\"");
    expect(core).toContain('plans-layout');
    expect(core).toContain('plan-row');
    // зачем: скрытое меню «⋯» заменено видимыми кнопками по требованию владельца (однокликовость)
    expect(core).not.toContain('quiet-menu');
    expect(core).toContain('plan.title');
    expect(core).toContain('plan.summary');
    expect(core).toContain('selected.steps');
    expect(core).not.toContain('id="plan-title"');
    expect(core).not.toContain('id="plan-summary"');
    expect(core).not.toContain('id="plan-steps"');
  });
});

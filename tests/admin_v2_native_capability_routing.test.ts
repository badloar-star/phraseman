import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

function loadRegistry(): { id: string; route: string; migrationStatus: string; nativeRoute: string }[] {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-capabilities.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => process.stdout.write(JSON.stringify(m.ADMIN_CAPABILITY_REGISTRY)))`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout);
}

function resolveCapabilityHash(hash: string): { resolved: boolean; route: string; capabilityId: string } {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-capabilities.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => process.stdout.write(JSON.stringify(m.resolveCapabilityHash(${JSON.stringify(hash)}))))`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout);
}

function capabilityHubHash(id: string): string {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-capabilities.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => process.stdout.write(JSON.stringify(m.capabilityHubHash(m.capabilityById(${JSON.stringify(id)})))))`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout);
}

describe('Admin v2 native capability routing', () => {
  test('marks all fifty-nine proven native capabilities as guarded', () => {
    const registry = loadRegistry();
    const native = registry.filter((capability) => capability.nativeRoute);
    expect(registry).toHaveLength(59);
    expect(native).toHaveLength(59);
    expect(native.map(({ id, nativeRoute }) => [id, nativeRoute])).toEqual(expect.arrayContaining([
      ['analytics', 'analytics'],
      ['alerts', 'alerts'],
      ['premium', 'money'],
      ['vip', 'money'],
      ['plus-radar', 'money'],
      ['app-messages', 'campaigns'],
      ['asset-studio', 'asset-studio'],
      ['audit', 'diagnostics'],
      ['beta-testers', 'users'],
      ['compass', 'compass'],
      ['control-panel', 'control-panel'],
      ['daily-digest', 'daily-briefing'],
      ['emails', 'emails'],
      ['explain-cache', 'explain-cache'],
      ['gmail-support', 'support'],
      ['ideas', 'voice-research'],
      ['ideas-decided', 'voice-research'],
      ['openai-budget', 'diagnostics'],
      ['ops-log', 'diagnostics'],
      ['overview', 'overview'],
      ['paywall-ab', 'application'],
      ['promo-codes', 'money'],
      ['push-notify', 'campaigns'],
      ['remote-config', 'application'],
      ['reports', 'report-center'],
      ['review-promo', 'review-promo'],
      ['surveys', 'voice-research'],
      ['onboarding-sources', 'voice-research'],
      ['cancel-surveys', 'voice-research'],
      ['users', 'users'],
      ['website-inbox', 'support'],
      ['user-reports', 'safety-moderation'],
      ['safety-flags', 'safety-moderation'],
      ['age-consent', 'safety-moderation'],
      ['compliance-radar', 'safety-moderation'],
      ['ban-list', 'safety-moderation'],
      ['app-health', 'diagnostics'],
      ['archive', 'diagnostics'],
      ['changelog-0608', 'diagnostics'],
      ['ugc-purchases', 'money-operations'],
      ['refunds', 'money-operations'],
      ['referrals', 'money-operations'],
      ['telegram-payments', 'money-operations'],
      ['website-payments', 'money-operations'],
      ['community-packs', 'content-operations'],
      ['card-packs', 'content-operations'],
      ['daily-phrases', 'content-operations'],
      ['french-quizzes', 'content-operations'],
      ['explain-reports', 'content-operations'],
      ['full-content-control', 'content-operations'],
      ['mod-queue', 'community-operations'],
      ['help-board', 'community-operations'],
      ['helpers-board', 'community-operations'],
      ['clubs', 'community-operations'],
      ['league-chat', 'community-operations'],
      ['arena-ranks', 'community-operations'],
      ['arena-live', 'community-operations'],
      ['arena-bets', 'community-operations'],
      ['arena-rooms', 'community-operations'],
    ]));
    expect(native.every((capability) => capability.migrationStatus === 'guarded')).toBe(true);
    expect(registry.filter((capability) => !capability.nativeRoute)).toEqual([]);
  });

  test('routes every capability directly without a live iframe fallback', () => {
    const router = read('admin/v2/scripts/admin-router.js');
    const core = read('admin/v2/scripts/admin-core.js');
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    expect(router).toContain('resolveCapabilityHash(globalThis.location.hash)');
    expect(router).toContain("'control-panel': 'control-panel'");
    expect(router).toMatch(/SUB_ROUTES[^\n]+['\"]campaigns['\"]/);
    expect(capabilities).toContain('directCapability.nativeRoute');
    expect(capabilities).toContain('requestedCapability?.nativeRoute');
    expect(core).not.toContain('!capability.nativeRoute');
    expect(core).not.toContain('renderCapabilityWorkspace');
    expect(core).not.toContain('legacy-module-frame');

    const registry = loadRegistry();
    expect(registry.find((capability) => capability.id === 'control-panel')).toMatchObject({ migrationStatus: 'guarded', nativeRoute: 'control-panel' });
    expect(registry.find((capability) => capability.id === 'paywall-ab')).toMatchObject({ migrationStatus: 'guarded', nativeRoute: 'application' });
  });

  test('decodes an encoded native capability hash into its consolidated route', () => {
    expect(resolveCapabilityHash('#application%3Apaywall-ab')).toEqual({ resolved: true, route: 'application', capabilityId: '' });
    expect(resolveCapabilityHash('#application:paywall-ab')).toEqual({ resolved: true, route: 'application', capabilityId: '' });
  });

  test('routes every legacy safety entry point into the unified center', () => {
    for (const id of ['user-reports', 'safety-flags', 'age-consent', 'compliance-radar', 'ban-list']) {
      expect(resolveCapabilityHash(`#${id}`)).toEqual({ resolved: true, route: 'safety-moderation', capabilityId: id });
    }
    const router = read('admin/v2/scripts/admin-router.js');
    expect(router).toContain("'safety-moderation': 'safety-moderation'");
    expect(router).toMatch(/SUB_ROUTES[^\n]+['\"]safety-moderation['\"]/);
  });

  test('routes every legacy diagnostics entry point into the unified diagnostics workspace', () => {
    for (const id of ['app-health', 'archive', 'changelog-0608']) {
      expect(resolveCapabilityHash(`#${id}`)).toEqual({ resolved: true, route: 'diagnostics', capabilityId: id });
    }
  });

  test('keeps diagnostics hub cards on their exact native views without changing other capability routes', () => {
    expect(capabilityHubHash('app-health')).toBe('app-health');
    expect(capabilityHubHash('archive')).toBe('archive');
    expect(capabilityHubHash('changelog-0608')).toBe('changelog-0608');
    expect(capabilityHubHash('audit')).toBe('diagnostics');
    expect(capabilityHubHash('ops-log')).toBe('diagnostics');
    expect(capabilityHubHash('paywall-ab')).toBe('application');
    expect(capabilityHubHash('mod-queue')).toBe('community-operations');

    const core = read('admin/v2/scripts/admin-core.js');
    expect(core).toContain('capabilityHubHash(capability)');
  });

  test('keeps a top-level route native when a legacy capability has the same id', () => {
    expect(resolveCapabilityHash('#overview')).toEqual({ resolved: false, route: 'overview', capabilityId: '' });
    expect(resolveCapabilityHash('#control-panel')).toEqual({ resolved: false, route: 'control-panel', capabilityId: '' });
    expect(resolveCapabilityHash('#overview:overview')).toEqual({ resolved: true, route: 'overview', capabilityId: '' });
  });

  test('renders a native Control Panel hub for the old pult groups', () => {
    const router = read('admin/v2/scripts/admin-router.js');
    const core = read('admin/v2/scripts/admin-core.js');
    expect(router).toContain("'control-panel': 'control-panel'");
    expect(core).toContain('function renderControlPanel');
    expect(core).toContain('29 старых кнопок');
    expect(core).toContain('Manual update modal');
    expect(core).toContain('Remote Config и живые флаги');
    expect(core).toContain('Plus-доступ и уроки');
    expect(core).toContain('Недельные бонусы');
    expect(core).toContain('ИИ и бюджеты');
    expect(core).toContain('Кампании и коммуникации');
    expect(core).toContain('Старый модуль отдельно');
    expect(core).toContain('Его действия могут менять рабочие данные');
    expect(core).not.toContain('Архивная сверка старой функции');
  });
});

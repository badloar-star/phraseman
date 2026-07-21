import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

function loadRegistry(): { id: string; route: string; nativeRoute: string }[] {
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

describe('Admin v2 native capability routing', () => {
  test('keeps only native Admin V2 capabilities in the registry', () => {
    const registry = loadRegistry();
    expect(registry.map(({ id, nativeRoute }) => [id, nativeRoute]).sort()).toEqual([
      ['analytics', 'analytics'],
      ['app-messages', 'campaigns'],
      ['asset-studio', 'asset-studio'],
      ['coin-center', 'coin-center'],
      ['daily-digest', 'daily-briefing'],
      ['gmail-support', 'support'],
      ['openai-budget', 'diagnostics'],
      ['paywall-ab', 'application'],
      ['plans', 'plans'],
      ['promo-codes', 'money'],
      ['remote-config', 'application'],
      ['reports', 'report-center'],
      ['users', 'users'],
    ]);
    expect(registry.every((capability) => capability.nativeRoute)).toBe(true);
  });

  test('routes supported hashes locally and has no fallback URL path', () => {
    const router = read('admin/v2/scripts/admin-router.js');
    const core = read('admin/v2/scripts/admin-core.js');
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    expect(router).toContain('resolveCapabilityHash(globalThis.location.hash)');
    expect(core).not.toContain('<iframe');
    expect(capabilities).not.toMatch(/legacyTab|legacyPage|capabilityUrl|\/legacy\.html/);
    expect(resolveCapabilityHash('#application:remote-config')).toEqual({ resolved: true, route: 'application', capabilityId: '' });
    expect(resolveCapabilityHash('#paywall-ab')).toEqual({ resolved: true, route: 'application', capabilityId: '' });
    expect(resolveCapabilityHash('#application:paywall-ab')).toEqual({ resolved: true, route: 'application', capabilityId: '' });
  });

  test('resolves every canonical V2 navigation hash to its own local screen', () => {
    const canonicalHashes = [
      'overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics',
      'support', 'analytics', 'daily-briefing', 'report-center', 'asset-studio', 'campaigns',
      'control-panel', 'admin-settings', 'agent-office', 'agent-manager', 'plans', 'coin-center',
    ];

    for (const route of canonicalHashes) {
      expect(resolveCapabilityHash(`#${route}`)).toEqual({ resolved: false, route, capabilityId: '' });
    }
  });

  test('fails closed to overview for unknown, excluded, and encoded hashes', () => {
    for (const hash of [
      '#unknown-route',
      '#arena-ranks', '#arena-live', '#arena-bets', '#arena-rooms', '#community:arena-live',
      '#arena-question-pool', '#content:arena-question-pool', '#content:arena-generator', '#content:arena-shadow',
      '#french-quizzes', '#content:daily-phrases', '#content:compass', '#mod-queue', '#community:mod-queue',
      '#audit', '#audit-log', '#ops-log', '#archive', '#changelog-0608',
    ]) {
      expect(resolveCapabilityHash(hash)).toEqual({ resolved: true, route: 'overview', capabilityId: '' });
    }
  });

  test('keeps native analytics bookmarks inside the local analytics route', () => {
    for (const hash of ['#product', '#/product', '#subscriptions', '#/subscriptions', '#monthly', '#/monthly']) {
      expect(resolveCapabilityHash(hash)).toEqual({ resolved: true, route: 'analytics', capabilityId: '' });
    }
  });
});

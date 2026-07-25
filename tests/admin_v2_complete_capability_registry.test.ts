import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 capability registry', () => {
  test('declares only the locally implemented capabilities', () => {
    const registry = read('admin/v2/scripts/admin-capabilities.js');
    expect([...registry.matchAll(/id: '([^']+)'/g)].map((match) => match[1]).sort()).toEqual([
      'analytics', 'app-messages', 'asset-studio', 'coin-center', 'daily-digest', 'english-test', 'gmail-support',
      'openai-budget', 'paywall-ab', 'plans', 'promo-codes', 'remote-config', 'reports', 'users',
    ]);
  });

  test('has no non-native route metadata or direct external navigation helper', () => {
    const registry = read('admin/v2/scripts/admin-capabilities.js');
    expect(registry).not.toMatch(/legacyTab|legacyPage|capabilityUrl|\/legacy\.html/);
    expect(registry).toContain('return { resolved: true, route: \'overview\', capabilityId: \'\' };');
  });
});

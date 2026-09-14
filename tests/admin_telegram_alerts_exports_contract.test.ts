import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../functions/src/index.ts'), 'utf8');

describe('Telegram owner alert deployment exports', () => {
  test.each([
    'admin_alert_dispatcher',
    'admin_alert_sources_people',
    'admin_alert_sources_ratings',
    'admin_alert_sources_revenue',
    'admin_alert_sources_reports',
    'admin_alert_sources_ops',
    'admin_alert_digests',
  ])('exports %s functions from the primary codebase', (moduleName) => {
    expect(source).toContain(`from "./${moduleName}"`);
  });
});

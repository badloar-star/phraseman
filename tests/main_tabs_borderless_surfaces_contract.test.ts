import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const LEDGER = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'docs', 'reports', 'borderless_surface_inventory.json'), 'utf8'),
) as {
  entries: Array<{
    id: string;
    category: string;
    status: string;
    scanState: string;
    reason: string;
  }>;
};

const SETTINGS_TARGET_IDS = [
  'surface:app-tabs-settings:l:11',
  'surface:app-tabs-settings:l:12',
  'surface:app-tabs-settings:l:4',
  'surface:app-tabs-settings:l:6',
  'surface:app-tabs-settings:l:7',
  'surface:app-tabs-settings:l:8',
  'surface:app-tabs-settings:l:9',
  'surface:app-tabs-settings:settings-language-row:1',
] as const;

function expectMigrated(ids: readonly string[]): void {
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    const row = LEDGER.entries.find((entry) => entry.id === id);
    expect(row).toBeDefined();
    expect(row?.category).toBe('MIGRATE');
    expect(row?.status).toBe('migrated');
    expect(row?.scanState).toBe('missing');
    expect(row?.reason).toBeTruthy();
  }
}

describe('main tabs borderless production surfaces', () => {
  it('migrates the reviewed Settings containers', () => {
    expectMigrated(SETTINGS_TARGET_IDS);
  });
});

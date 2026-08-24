import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'config', 'phone-state-legacy-inventory.v1.json');
const guardPath = path.join(projectRoot, 'scripts', 'guard_phone_state_legacy_inventory.mjs');

type InventoryRow = Readonly<{
  key?: string;
  prefix?: string;
  domain: string;
  scope: string;
  reducer: string;
  importSource: readonly string[];
  legacyMirror: boolean;
  sensitivity: string;
}>;

test('every portable cloud key and account-scoped storage key is classified', () => {
  const result = spawnSync(process.execPath, [guardPath, '--check'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
  expect(result.stdout).toContain('unknownKeys=0 unknownPrefixes=0 duplicateOwners=0');
});

test('every inventory row declares import, merge, mirror and sensitivity policy', () => {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) as {
    schemaVersion: string;
    rows: InventoryRow[];
    prefixRules: InventoryRow[];
  };
  expect(inventory.schemaVersion).toBe('phone-state-legacy-inventory.v1');
  expect([...inventory.rows, ...inventory.prefixRules].length).toBeGreaterThan(0);
  for (const row of [...inventory.rows, ...inventory.prefixRules]) {
    expect(row).toEqual(expect.objectContaining({
      domain: expect.any(String),
      scope: expect.stringMatching(/^(portable|device_only|external)$/),
      reducer: expect.stringMatching(/^(sum_unique|max|union|date_union|field_register|or_set|composite_economy|none)$/),
      importSource: expect.any(Array),
      legacyMirror: expect.any(Boolean),
      sensitivity: expect.stringMatching(/^(low|personal|sensitive)$/),
    }));
  }
});

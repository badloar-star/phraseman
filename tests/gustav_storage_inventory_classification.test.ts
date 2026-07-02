import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const RUN = 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
const INVENTORY_PATH = path.join(ROOT, RUN, 'inputs', 'storage_key_inventory.json');
// Invoke tsx via the current Node binary and the resolved local tsx CLI so the
// spawn works on Windows (bare `npx` is `npx.cmd` and fails with ENOENT under
// spawnSync without a shell).
const TSX_CLI = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

type StorageRecord = {
  key?: string;
  keyPattern?: string;
  keyExpression?: string;
  sourcePath: string;
  scope: string;
  targetNamespaceRequired: boolean;
};

describe('Gustav storage inventory classification', () => {
  it('keeps reviewed global noise out of French target storage risks', () => {
    const result = spawnSync(process.execPath, [TSX_CLI, 'scripts/gustav_storage_inventory.ts', '--run', RUN], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')) as {
      status: string;
      summary: {
        blockers: number;
        highRisks: number;
        targetNamespaceRequired: number;
        unknownScopeRecords: number;
      };
      records: StorageRecord[];
      unknowns: string[];
    };

    expect(inventory.status).toBe('PASS');
    expect(inventory.summary.blockers).toBe(0);
    expect(inventory.summary.highRisks).toBe(0);
    expect(inventory.summary.unknownScopeRecords).toBe(0);
    expect(inventory.summary.targetNamespaceRequired).toBe(0);

    const recordsBySignal = new Map(
      inventory.records.map((record) => [
        `${record.key ?? record.keyPattern ?? record.keyExpression}@${record.sourcePath}`,
        record,
      ]),
    );
    expect(recordsBySignal.get('study_target_v1@app/study_target.ts')?.scope).toBe('global');
    expect(recordsBySignal.get('unclaimed_level_gifts@app/level_gift_inventory.ts')?.scope).toBe('global');
    expect(recordsBySignal.get('xp_formula_v2_migrated@app/xp_manager.ts')?.scope).toBe('global');

    const unknownText = inventory.unknowns.join('\n');
    expect(unknownText).not.toContain('true at ');
    expect(unknownText).not.toContain('false at ');
    expect(unknownText).not.toContain('passed at ');
    expect(unknownText).not.toContain('cellIndex at ');
    expect(unknownText).not.toContain('pct at ');

    expect(inventory.records.find((record) => record.key === 'daily_phrase_v3')?.scope).toBe('legacy_english');
    expect(inventory.records.find((record) => record.key === 'trainer_free_session_v1')?.scope).toBe('legacy_english');
    expect(inventory.records.find((record) => (
      record.key === 'active_recall_items' &&
      record.sourcePath === 'app/cloud_sync.ts'
    ))).toMatchObject({
      scope: 'legacy_english',
      targetNamespaceRequired: false,
    });
    expect(inventory.records.find((record) => (
      record.key === 'lingman_certificate_v1' &&
      record.sourcePath === 'app/exam_certificate.ts'
    ))).toMatchObject({
      scope: 'legacy_english',
      targetNamespaceRequired: false,
    });
  });
});

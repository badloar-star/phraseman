import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const board = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/admin/ADMIN_V2_MIGRATION_COVERAGE.json'), 'utf8')) as {
  source: { buttons: number; functions: number; links: number };
  routes: string[];
  buttonCoverage: { coverageId: string; buttonKey: string; status: string; target: { route: string } }[];
  functionCoverage: { coverageId: string; status: string; target: { route: string } }[];
  capabilityCoverage: { capabilityId: string; status: string; nativeRoute: string | null }[];
  summary: {
    capabilities: { total: number; guarded: number; fallback: number };
  };
};
const migrationPage = fs.readFileSync(path.join(process.cwd(), 'admin/v2/migration.html'), 'utf8');
const APPROVED_LEGACY_AUDIT_BASELINE = Object.freeze({
  buttons: 441,
  functions: 952,
  links: 357,
});

describe('Admin v2 migration coverage', () => {
  it('ratchets the approved saved audit counts without reading the retired admin', () => {
    expect(board.source).toMatchObject(APPROVED_LEGACY_AUDIT_BASELINE);
    expect(board.source.buttons).toBe(board.buttonCoverage.length);
    expect(board.source.functions).toBe(board.functionCoverage.length);
    expect(new Set(board.buttonCoverage.map((row) => row.coverageId)).size).toBe(board.buttonCoverage.length);
    expect(new Set(board.functionCoverage.map((row) => row.coverageId)).size).toBe(board.functionCoverage.length);
    expect(board.buttonCoverage.every((row) => board.routes.includes(row.target.route))).toBe(true);
    expect(board.functionCoverage.every((row) => board.routes.includes(row.target.route))).toBe(true);
    expect(board.source.links).toBe(APPROVED_LEGACY_AUDIT_BASELINE.links);
  });

  it('reports capability migration truth without overstating action-level completion', () => {
    expect(board.source.buttons).toBeGreaterThan(400);
    expect(board.source.functions).toBeGreaterThan(900);
    expect(board.capabilityCoverage).toHaveLength(61);
    expect(board.summary.capabilities.total).toBe(board.capabilityCoverage.length);
    expect(board.summary.capabilities.fallback).toBeGreaterThan(0);
    expect(board.buttonCoverage.every((row) => row.status === 'inventory' || row.status === 'fallback')).toBe(true);
    expect(board.functionCoverage.every((row) => row.status === 'inventory' || row.status === 'fallback')).toBe(true);
  });

  it('runs the deterministic saved-board and native-registry check without retired audit inputs', () => {
    const result = spawnSync(process.execPath, ['scripts/admin-v2-build-migration-board.mjs', '--check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"state": "verified"');
    expect(result.stdout).toContain('"buttons": 441');
    expect(result.stdout).toContain('"functions": 952');
    expect(result.stdout).toContain('"links": 357');
  });

  it('makes --check fail when an approved saved invariant drifts', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-v2-migration-check-'));
    const driftedBoardPath = path.join(tempDir, 'coverage.json');

    try {
      fs.writeFileSync(driftedBoardPath, JSON.stringify({
        ...board,
        source: { ...board.source, buttons: board.source.buttons - 1 },
      }));
      const result = spawnSync(process.execPath, ['scripts/admin-v2-build-migration-board.mjs', '--check'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, ADMIN_V2_MIGRATION_BOARD_PATH: driftedBoardPath },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('source.buttons must equal 441');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renders live inventory counts instead of stale hardcoded totals', () => {
    expect(migrationPage).not.toMatch(/441 кнопка|936 функций/);
    expect(migrationPage).toContain('state.board.source.buttons');
    expect(migrationPage).toContain('state.board.source.functions');
    expect(migrationPage).toContain('capabilityCoverage');
  });

  it('keeps migration terminology human-readable without exposing retired-admin handoffs', () => {
    expect(migrationPage).not.toContain('Legacy fallback:');
    expect(migrationPage).not.toContain('permission-checked callable');
    expect(migrationPage).not.toContain('action-level parity');
    expect(migrationPage).not.toContain('/legacy.html');
    expect(migrationPage).not.toContain('Старый интерфейс');
    expect(migrationPage).not.toContain('Старая версия');
    expect(migrationPage).not.toContain('старой админки');
    expect(migrationPage).toContain('statusLabels');
    expect(migrationPage).toContain('routeLabels');
    expect(migrationPage).toContain('Требует переноса');
    expect(migrationPage).toContain('Нативный защищённый экран');
  });

  it('links only native V2 capability routes and leaves historical rows read-only', () => {
    expect(migrationPage).toContain('row.nativeRoute');
    expect(migrationPage).not.toContain('row.route)}:${encodeURIComponent(row.capabilityId)');
    expect(migrationPage).not.toContain('target="_blank"');
    expect(migrationPage).toContain('Только в реестре');
  });
});

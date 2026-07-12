import fs from 'node:fs';
import path from 'node:path';

const board = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/admin/ADMIN_V2_MIGRATION_COVERAGE.json'), 'utf8')) as {
  source: { buttons: number; functions: number; legacyFiles: string[] };
  routes: string[];
  buttonCoverage: { coverageId: string; buttonKey: string; status: string; target: { route: string } }[];
  functionCoverage: { coverageId: string; status: string; target: { route: string } }[];
  capabilityCoverage: { capabilityId: string; status: string; nativeRoute: string | null }[];
  summary: {
    capabilities: { total: number; guarded: number; fallback: number };
  };
};
const legacy = fs.readFileSync(path.join(process.cwd(), 'admin/index.html'), 'utf8');
const migrationPage = fs.readFileSync(path.join(process.cwd(), 'admin/v2/migration.html'), 'utf8');
const hostedBoard = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'admin/v2/data/ADMIN_V2_MIGRATION_COVERAGE.json'), 'utf8'));
const builder = fs.readFileSync(path.join(process.cwd(), 'scripts/admin-v2-build-migration-board.mjs'), 'utf8');

describe('Admin v2 migration coverage', () => {
  it('covers every currently inventoried legacy button and function', () => {
    expect(board.source.buttons).toBe(board.buttonCoverage.length);
    expect(board.source.functions).toBe(board.functionCoverage.length);
    expect(new Set(board.buttonCoverage.map((row) => row.coverageId)).size).toBe(board.buttonCoverage.length);
    expect(new Set(board.functionCoverage.map((row) => row.coverageId)).size).toBe(board.functionCoverage.length);
    expect(board.buttonCoverage.every((row) => board.routes.includes(row.target.route))).toBe(true);
    expect(board.functionCoverage.every((row) => board.routes.includes(row.target.route))).toBe(true);
    const inventoriedButtons = board.source.legacyFiles.reduce((total, file) => {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      return total + (source.match(/<button\b[\s\S]*?<\/button>/gi) ?? []).length;
    }, 0);
    expect(inventoriedButtons).toBe(board.source.buttons);
  });

  it('reports capability migration truth without overstating action-level completion', () => {
    expect(board.source).toMatchObject({
      buttons: 471,
      functions: 1010,
      legacyFiles: [
        'admin/index.html',
        'admin/testers.html',
        'admin/beta_testers.html',
        'admin/full.html',
        'admin/site.html',
      ],
    });
    expect(board.capabilityCoverage).toHaveLength(59);
    expect(board.summary.capabilities).toEqual({ total: 59, inventory: 0, guarded: 17, fallback: 42, ported: 0, blocked: 0 });
    expect(board.buttonCoverage.every((row) => row.status === 'inventory' || row.status === 'fallback')).toBe(true);
    expect(board.functionCoverage.every((row) => row.status === 'inventory' || row.status === 'fallback')).toBe(true);
  });

  it('builds links by stable button key and checks generated-board drift read-only', () => {
    expect(builder).toContain('linksByButtonKey');
    expect(builder).not.toContain('links[index]');
    expect(builder).toContain("process.argv.includes('--check')");
    expect(hostedBoard).toEqual(board);
    expect(migrationPage).toContain("fetch('./data/ADMIN_V2_MIGRATION_COVERAGE.json'");
  });

  it('renders live inventory counts instead of stale hardcoded totals', () => {
    expect(migrationPage).not.toMatch(/441 кнопка|936 функций/);
    expect(migrationPage).toContain('state.board.source.buttons');
    expect(migrationPage).toContain('state.board.source.functions');
    expect(migrationPage).toContain('capabilityCoverage');
    expect(migrationPage).not.toMatch(/\b58 рабочих областей\b/);
  });

  it('keeps migration terminology human-readable while preserving technical status values', () => {
    expect(migrationPage).not.toContain('Legacy fallback:');
    expect(migrationPage).not.toContain('permission-checked callable');
    expect(migrationPage).not.toContain('action-level parity');
    expect(migrationPage).toContain('statusLabels');
    expect(migrationPage).toContain('routeLabels');
    expect(migrationPage).toContain('Старый интерфейс');
    expect(migrationPage).toContain('Нативный защищённый экран');
  });

  it('preserves the capability hash separator in fallback links', () => {
    expect(migrationPage).not.toContain('encodeURIComponent(hash)');
    expect(migrationPage).toContain("encodeURIComponent(row.route)}:${encodeURIComponent(row.capabilityId)");
  });
});

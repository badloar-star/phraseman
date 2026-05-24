import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const RUN = 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
const REPORT_PATH = path.join(ROOT, RUN, 'audits', 'run_validator_report.json');

describe('Gustav validator P1A stale pre-apply checks', () => {
  it('does not block on old P1A file-absence assertions after the core slice exists', () => {
    const result = spawnSync('npx', ['tsx', 'scripts/gustav_validate_run.ts', '--run', RUN], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')) as {
      status: string;
      summary: { blockers: number; warnings: number };
      findings: Array<{ code: string }>;
    };
    expect(report.status).toBe('PASS');
    expect(report.summary.blockers).toBe(0);
    expect(report.summary.warnings).toBe(0);
    expect(report.findings.filter((finding) => (
      finding.code.includes('production_file_exists') ||
      finding.code.includes('target_exists') ||
      finding.code.includes('p1a_file_exists') ||
      finding.code.includes('forbidden_file_exists')
    ))).toEqual([]);
  });
});

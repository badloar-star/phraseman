import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

import {
  PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION,
  validatePlanContentParityReport,
  type PlanContentParityReport,
} from '../app/plan_content_pack_parity';

const ROOT = path.join(__dirname, '..');
const OUTPUT_RELATIVE = '.codex-tmp/plan-content/tests/plan-content-parity-dry-run-report.test.json';
const OUTPUT_PATH = path.join(ROOT, OUTPUT_RELATIVE);
const GENERATED_AT = '2026-06-26T00:00:00.000Z';

function runCommand(args: string[]) {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', [
      '/d',
      '/s',
      '/c',
      ['npx', 'tsx', 'scripts/plan_content_dry_run_parity_report.ts', ...args].join(' '),
    ], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  }

  return spawnSync('npx', ['tsx', 'scripts/plan_content_dry_run_parity_report.ts', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

describe('plan content dry-run parity report command', () => {
  it('writes a validated report only under the ignored plan-content temp directory', () => {
    if (fs.existsSync(OUTPUT_PATH)) {
      fs.unlinkSync(OUTPUT_PATH);
    }

    const result = runCommand([
      '--out',
      OUTPUT_RELATIVE,
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content dry-run parity report: PASS');
    expect(result.stdout).toContain(`Report: ${OUTPUT_RELATIVE.replace(/\//g, path.sep)}`);
    expect(fs.existsSync(OUTPUT_PATH)).toBe(true);

    const report = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')) as PlanContentParityReport;
    expect(validatePlanContentParityReport(report)).toEqual({ ok: true, errors: [] });
    expect(report.schemaVersion).toBe(PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION);
    expect(report.generatedAt).toBe(GENERATED_AT);
    expect(report.verdict).toBe('hold');
    expect(report.comparedPlanDayCount).toBeGreaterThan(0);
    expect(report.addedShadowOnlyRows).toEqual([]);
    expect(report.missingRows).toEqual([]);
    expect(report.hashMismatches).toEqual([]);
    expect(report.adapterOutputMismatches).toEqual([]);
    expect(report.fallbackDecisionMismatches).toEqual([]);
  });

  it('rejects output paths outside the ignored plan-content temp directory', () => {
    const forbiddenRelative = 'docs/specs/__plan_content_dry_run_should_not_write.json';
    const forbiddenPath = path.join(ROOT, forbiddenRelative);

    expect(fs.existsSync(forbiddenPath)).toBe(false);

    const result = runCommand([
      '--out',
      forbiddenRelative,
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Dry-run report output must stay under .codex-tmp');
    expect(fs.existsSync(forbiddenPath)).toBe(false);
  });

  it('keeps the command disconnected from Firebase, loader runtime, source writes and startup', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_dry_run_parity_report.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|storage\(\)|upload|download|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_dry_run_parity_report|PlanContentDryRunReport/i);
    }
  });
});

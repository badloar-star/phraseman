import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

import {
  PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION,
  validatePlanContentParityReport,
  type PlanContentParityReport,
} from '../app/plan_content_pack_parity';
import type { PlanContentPackIndex } from '../app/plan_content_pack_index';

const ROOT = path.join(__dirname, '..');
const CLEAN_PACK_RELATIVE = '.codex-tmp/plan-content/tests/shadow-pack-parity/clean-pack';
const CORRUPT_PACK_RELATIVE = '.codex-tmp/plan-content/tests/shadow-pack-parity/corrupt-pack';
const CLEAN_REPORT_RELATIVE = '.codex-tmp/plan-content/tests/shadow-pack-parity/clean-report.json';
const CORRUPT_REPORT_RELATIVE = '.codex-tmp/plan-content/tests/shadow-pack-parity/corrupt-report.json';
const GENERATED_AT = '2026-06-26T00:00:00.000Z';

type ShadowArtifact = {
  content: {
    phrases: Array<{ english: string }>;
  };
};

function runTsx(script: string, args: string[]) {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', [
      '/d',
      '/s',
      '/c',
      ['npx', 'tsx', script, ...args].join(' '),
    ], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  }

  return spawnSync('npx', ['tsx', script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function exportPack(packRelative: string): void {
  fs.rmSync(path.join(ROOT, packRelative), { recursive: true, force: true });
  const result = runTsx('scripts/plan_content_shadow_pack_export.ts', [
    '--out-dir',
    packRelative,
    '--content-version',
    'local.shadow.parity.test',
    '--generated-at',
    GENERATED_AT,
  ]);
  expect(result.status).toBe(0);
}

describe('plan content shadow pack parity compare command', () => {
  it('compares real shadow artifacts against bundled registry and adapter output', () => {
    exportPack(CLEAN_PACK_RELATIVE);
    fs.rmSync(path.join(ROOT, CLEAN_REPORT_RELATIVE), { force: true });

    const result = runTsx('scripts/plan_content_shadow_pack_parity_compare.ts', [
      '--pack-dir',
      CLEAN_PACK_RELATIVE,
      '--out',
      CLEAN_REPORT_RELATIVE,
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content shadow pack parity compare: PASS');
    expect(result.stdout).toContain(`Report: ${CLEAN_REPORT_RELATIVE.replace(/\//g, path.sep)}`);

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, CLEAN_REPORT_RELATIVE), 'utf8')) as PlanContentParityReport;
    expect(validatePlanContentParityReport(report)).toEqual({ ok: true, errors: [] });
    expect(report.schemaVersion).toBe(PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION);
    expect(report.generatedAt).toBe(GENERATED_AT);
    expect(report.verdict).toBe('shadow_parity_passed');
    expect(report.comparedPlanDayCount).toBeGreaterThan(0);
    expect(report.addedShadowOnlyRows).toEqual([]);
    expect(report.missingRows).toEqual([]);
    expect(report.hashMismatches).toEqual([]);
    expect(report.adapterOutputMismatches).toEqual([]);
    expect(report.fallbackDecisionMismatches).toEqual([]);
    expect(report.reviewerSummary.reviewStatusCounts.shadow).toBe(report.comparedPlanDayCount);
    expect(report.reviewerSummary.localeGateStatusCounts.hold).toBe(report.comparedPlanDayCount);
  });

  it('writes a hold report and exits non-zero when a shadow row differs', () => {
    exportPack(CORRUPT_PACK_RELATIVE);
    fs.rmSync(path.join(ROOT, CORRUPT_REPORT_RELATIVE), { force: true });

    const index = JSON.parse(
      fs.readFileSync(path.join(ROOT, CORRUPT_PACK_RELATIVE, 'index.json'), 'utf8'),
    ) as PlanContentPackIndex;
    const firstEntry = index.entries[0];
    const artifactPath = path.join(ROOT, CORRUPT_PACK_RELATIVE, firstEntry.path);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as ShadowArtifact;
    artifact.content.phrases[0].english = `${artifact.content.phrases[0].english} now`;
    fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

    const result = runTsx('scripts/plan_content_shadow_pack_parity_compare.ts', [
      '--pack-dir',
      CORRUPT_PACK_RELATIVE,
      '--out',
      CORRUPT_REPORT_RELATIVE,
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Shadow pack parity failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, CORRUPT_REPORT_RELATIVE), 'utf8')) as PlanContentParityReport;
    expect(validatePlanContentParityReport(report).ok).toBe(true);
    expect(report.verdict).toBe('hold');
    expect(report.hashMismatches.length).toBeGreaterThan(0);
    expect(report.adapterOutputMismatches.length).toBeGreaterThan(0);
  });

  it('rejects pack input and report output outside the ignored plan-content temp directory', () => {
    const badInput = runTsx('scripts/plan_content_shadow_pack_parity_compare.ts', [
      '--pack-dir',
      'docs/specs',
      '--out',
      CLEAN_REPORT_RELATIVE,
      '--generated-at',
      GENERATED_AT,
    ]);
    expect(badInput.status).not.toBe(0);
    expect(badInput.stderr).toContain('Shadow pack input must stay under .codex-tmp');

    const badOutput = runTsx('scripts/plan_content_shadow_pack_parity_compare.ts', [
      '--pack-dir',
      CLEAN_PACK_RELATIVE,
      '--out',
      'docs/specs/__plan_content_parity_should_not_write.json',
      '--generated-at',
      GENERATED_AT,
    ]);
    expect(badOutput.status).not.toBe(0);
    expect(badOutput.stderr).toContain('Parity report output must stay under .codex-tmp');
  });

  it('keeps the comparator disconnected from Firebase, loader runtime and startup', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_shadow_pack_parity_compare.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|storage\(\)|upload|download|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_shadow_pack_parity_compare|PlanContentShadowPackParity/i);
    }
  });
});

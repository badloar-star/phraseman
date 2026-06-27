import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/release-verify';
const PACK_RELATIVE = `${RUN_ROOT_RELATIVE}/pack`;
const PARITY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/parity-report.json`;
const READINESS_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/readiness-report.json`;
const GENERATED_AT = '2026-06-26T00:00:00.000Z';
const CONTENT_VERSION = 'local.release.verify.test';

type ReadinessReport = {
  schemaVersion: string;
  status: 'PASS' | 'HOLD';
  packId: string;
  activationApproved: boolean;
  runtimeConnected: boolean;
  serverStaged: boolean;
  rowCount: number;
  parityVerdict: string;
  blockers: string[];
  checks: Record<string, boolean>;
};

type ActivationGuard = {
  activationApproved: boolean;
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

function prepareWrappedPack(): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });

  expect(runTsx('scripts/plan_content_shadow_pack_export.ts', [
    '--out-dir',
    PACK_RELATIVE,
    '--content-version',
    CONTENT_VERSION,
    '--generated-at',
    GENERATED_AT,
  ]).status).toBe(0);

  expect(runTsx('scripts/plan_content_shadow_pack_parity_compare.ts', [
    '--pack-dir',
    PACK_RELATIVE,
    '--out',
    PARITY_REPORT_RELATIVE,
    '--generated-at',
    GENERATED_AT,
  ]).status).toBe(0);

  expect(runTsx('scripts/plan_content_course_pack_manifest_wrap.ts', [
    '--pack-dir',
    PACK_RELATIVE,
    '--parity-report',
    PARITY_REPORT_RELATIVE,
    '--out-dir',
    PACK_RELATIVE,
    '--created-at',
    GENERATED_AT,
  ]).status).toBe(0);
}

function verify(args: string[] = []) {
  return runTsx('scripts/plan_content_release_bundle_verify.ts', [
    '--pack-dir',
    PACK_RELATIVE,
    '--manifest',
    `${PACK_RELATIVE}/manifest.json`,
    '--guard',
    `${PACK_RELATIVE}/activation-guard.json`,
    '--parity-report',
    PARITY_REPORT_RELATIVE,
    '--out',
    READINESS_REPORT_RELATIVE,
    '--generated-at',
    GENERATED_AT,
    ...args,
  ]);
}

describe('plan content local release bundle verifier command', () => {
  it('verifies manifest, guard, index, rows and parity report as a non-activating local bundle', () => {
    prepareWrappedPack();

    const result = verify();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content local release bundle verify: PASS');
    expect(result.stdout).toContain('Activation approved: false');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, READINESS_REPORT_RELATIVE), 'utf8')) as ReadinessReport;
    expect(report).toMatchObject({
      schemaVersion: 'plan-content-local-release-readiness-v1',
      status: 'PASS',
      packId: `en.ru.plan_content.${CONTENT_VERSION}`,
      activationApproved: false,
      runtimeConnected: false,
      serverStaged: false,
      parityVerdict: 'shadow_parity_passed',
      blockers: [],
    });
    expect(report.rowCount).toBeGreaterThan(0);
    expect(Object.values(report.checks).every(Boolean)).toBe(true);
  });

  it('writes a HOLD report and exits non-zero when the activation guard is unsafe', () => {
    prepareWrappedPack();

    const guardPath = path.join(ROOT, PACK_RELATIVE, 'activation-guard.json');
    const guard = JSON.parse(fs.readFileSync(guardPath, 'utf8')) as ActivationGuard;
    fs.writeFileSync(guardPath, `${JSON.stringify({ ...guard, activationApproved: true }, null, 2)}\n`, 'utf8');

    const result = verify();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Release bundle verification failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, READINESS_REPORT_RELATIVE), 'utf8')) as ReadinessReport;
    expect(report.status).toBe('HOLD');
    expect(report.activationApproved).toBe(false);
    expect(report.checks.guardNonActivating).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'guard: activationApproved must be false',
    ]));
  });

  it('rejects readiness output outside the ignored plan-content temp directory', () => {
    prepareWrappedPack();

    const result = runTsx('scripts/plan_content_release_bundle_verify.ts', [
      '--pack-dir',
      PACK_RELATIVE,
      '--manifest',
      `${PACK_RELATIVE}/manifest.json`,
      '--guard',
      `${PACK_RELATIVE}/activation-guard.json`,
      '--parity-report',
      PARITY_REPORT_RELATIVE,
      '--out',
      'docs/specs/__plan_content_release_should_not_write.json',
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Readiness report output must stay under .codex-tmp');
  });

  it('keeps the verifier disconnected from Firebase, loader runtime and startup', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_release_bundle_verify.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|storage\(\)|upload|download|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_release_bundle_verify|PlanContentReleaseBundle/i);
    }
  });
});

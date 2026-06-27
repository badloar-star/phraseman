import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

import {
  COURSE_PACK_SCHEMA_VERSION,
  validateCoursePackManifest,
  type CoursePackManifest,
} from '../app/course_pack_manifest';
import { validatePlanContentParityReport, type PlanContentParityReport } from '../app/plan_content_pack_parity';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/manifest-wrap';
const PACK_RELATIVE = `${RUN_ROOT_RELATIVE}/pack`;
const PARITY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/parity-report.json`;
const GENERATED_AT = '2026-06-26T00:00:00.000Z';
const CONTENT_VERSION = 'local.manifest.test';

type LocalActivationGuard = {
  schemaVersion: string;
  packId: string;
  manifestPath: string;
  packDir: string;
  entryIndex: string;
  parityReportPath: string;
  activationApproved: boolean;
  remoteLoadingEnabled: boolean;
  runtimeConnected: boolean;
  serverStaged: boolean;
  parityVerdict: string;
  requiredBeforeActivation: string[];
  generatedAt: string;
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

function prepareCleanPack(): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });

  const exportResult = runTsx('scripts/plan_content_shadow_pack_export.ts', [
    '--out-dir',
    PACK_RELATIVE,
    '--content-version',
    CONTENT_VERSION,
    '--generated-at',
    GENERATED_AT,
  ]);
  expect(exportResult.status).toBe(0);

  const compareResult = runTsx('scripts/plan_content_shadow_pack_parity_compare.ts', [
    '--pack-dir',
    PACK_RELATIVE,
    '--out',
    PARITY_REPORT_RELATIVE,
    '--generated-at',
    GENERATED_AT,
  ]);
  expect(compareResult.status).toBe(0);
}

describe('plan content course-pack manifest wrapper command', () => {
  it('wraps a clean local shadow pack in a valid manifest and non-activating guard', () => {
    prepareCleanPack();

    const result = runTsx('scripts/plan_content_course_pack_manifest_wrap.ts', [
      '--pack-dir',
      PACK_RELATIVE,
      '--parity-report',
      PARITY_REPORT_RELATIVE,
      '--out-dir',
      PACK_RELATIVE,
      '--created-at',
      GENERATED_AT,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content course-pack manifest wrap: PASS');
    expect(result.stdout).toContain('Activation approved: false');

    const manifestPath = path.join(ROOT, PACK_RELATIVE, 'manifest.json');
    const guardPath = path.join(ROOT, PACK_RELATIVE, 'activation-guard.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(guardPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CoursePackManifest;
    expect(validateCoursePackManifest(manifest)).toEqual({ ok: true, errors: [] });
    expect(manifest.packId).toBe(`en.ru.plan_content.${CONTENT_VERSION}`);
    expect(manifest.studyTarget).toBe('en');
    expect(manifest.sourceLocale).toBe('ru');
    expect(manifest.surface).toBe('plan_content');
    expect(manifest.schemaVersion).toBe(COURSE_PACK_SCHEMA_VERSION);
    expect(manifest.contentVersion).toBe(CONTENT_VERSION);
    expect(manifest.entryIndex).toBe('index.json');
    expect(manifest.byteSize).toBeGreaterThan(0);
    expect(manifest.sha256).toMatch(/^[a-f0-9]{64}$/);

    const guard = JSON.parse(fs.readFileSync(guardPath, 'utf8')) as LocalActivationGuard;
    expect(guard).toMatchObject({
      schemaVersion: 'plan-content-local-activation-guard-v1',
      packId: manifest.packId,
      manifestPath: 'manifest.json',
      packDir: '.',
      entryIndex: 'index.json',
      parityReportPath: '../parity-report.json',
      activationApproved: false,
      remoteLoadingEnabled: false,
      runtimeConnected: false,
      serverStaged: false,
      parityVerdict: 'shadow_parity_passed',
      generatedAt: GENERATED_AT,
    });
    expect(guard.requiredBeforeActivation).toEqual(expect.arrayContaining([
      'explicit_product_owner_activation_approval',
      'runtime_loader_cache_offline_rollback_gates',
      'storage_cloud_target_scope_gates',
      'server_staging_review',
    ]));
  });

  it('rejects hold parity reports before writing manifest artifacts', () => {
    prepareCleanPack();

    const parityPath = path.join(ROOT, PARITY_REPORT_RELATIVE);
    const report = JSON.parse(fs.readFileSync(parityPath, 'utf8')) as PlanContentParityReport;
    const holdReportPathRelative = `${RUN_ROOT_RELATIVE}/hold-report.json`;
    const holdReportPath = path.join(ROOT, holdReportPathRelative);
    fs.writeFileSync(holdReportPath, `${JSON.stringify({ ...report, verdict: 'hold' }, null, 2)}\n`, 'utf8');
    expect(validatePlanContentParityReport(JSON.parse(fs.readFileSync(holdReportPath, 'utf8'))).ok).toBe(true);

    const outRelative = `${RUN_ROOT_RELATIVE}/rejected-wrap`;
    const result = runTsx('scripts/plan_content_course_pack_manifest_wrap.ts', [
      '--pack-dir',
      PACK_RELATIVE,
      '--parity-report',
      holdReportPathRelative,
      '--out-dir',
      outRelative,
      '--created-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Parity report must be shadow_parity_passed');
    expect(fs.existsSync(path.join(ROOT, outRelative, 'manifest.json'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, outRelative, 'activation-guard.json'))).toBe(false);
  });

  it('rejects manifest output outside the ignored plan-content temp directory', () => {
    prepareCleanPack();

    const result = runTsx('scripts/plan_content_course_pack_manifest_wrap.ts', [
      '--pack-dir',
      PACK_RELATIVE,
      '--parity-report',
      PARITY_REPORT_RELATIVE,
      '--out-dir',
      'docs/specs/__plan_content_manifest_should_not_write',
      '--created-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Manifest output must stay under .codex-tmp');
  });

  it('keeps the wrapper disconnected from Firebase, loader runtime and startup', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_course_pack_manifest_wrap.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|storage\(\)|upload|download|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_course_pack_manifest_wrap|PlanContentCoursePackManifest/i);
    }
  });
});

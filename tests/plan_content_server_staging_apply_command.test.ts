import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/staging-apply';
const PACK_RELATIVE = `${RUN_ROOT_RELATIVE}/pack`;
const PARITY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/parity-report.json`;
const READINESS_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/readiness-report.json`;
const DESCRIPTOR_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-descriptor.json`;
const REVIEW_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-approval-review.json`;
const WRITER_PLAN_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-writer-plan.json`;
const APPROVAL_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-apply-approval.json`;
const PREFLIGHT_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-apply-preflight.json`;
const APPLY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-apply-report.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const CONTENT_VERSION = 'local.staging.apply.test';
const REQUIRED_APPROVAL_TEXT = 'I approve staging/shadow server writes for plan_content only with activationApproved=false';

type StagingWriterPlan = {
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  objects: Array<{
    role: string;
    localPath: string;
  }>;
};

type ApplyReport = {
  schemaVersion: string;
  status: string;
  mode: string;
  packId: string;
  bucket: string | null;
  applyRequested: boolean;
  applyEnvConfirmed: boolean;
  activationApproved: boolean;
  runtimeManifestRegistered: boolean;
  remoteLoadingEnabled: boolean;
  bundledContentRemoved: boolean;
  storageMigrationRan: boolean;
  productionActivationApproved: boolean;
  serverWritePermitted: boolean;
  actualServerWrites: boolean;
  operations: Array<{
    operation: string;
    role: string;
    localPath: string;
    stagingPath: string;
    sha256: string;
    byteSize: number;
  }>;
  blockers: string[];
};

function runTsx(script: string, args: string[], env: Record<string, string | undefined> = {}) {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', [
      '/d',
      '/s',
      '/c',
      ['npx', 'tsx', script, ...args].join(' '),
    ], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
  }

  return spawnSync('npx', ['tsx', script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function preparePreflight(): StagingWriterPlan {
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

  expect(runTsx('scripts/plan_content_release_bundle_verify.ts', [
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
  ]).status).toBe(0);

  expect(runTsx('scripts/plan_content_server_staging_descriptor.ts', [
    '--pack-dir',
    PACK_RELATIVE,
    '--manifest',
    `${PACK_RELATIVE}/manifest.json`,
    '--guard',
    `${PACK_RELATIVE}/activation-guard.json`,
    '--parity-report',
    PARITY_REPORT_RELATIVE,
    '--readiness-report',
    READINESS_REPORT_RELATIVE,
    '--out',
    DESCRIPTOR_RELATIVE,
    '--generated-at',
    GENERATED_AT,
  ]).status).toBe(0);

  expect(runTsx('scripts/plan_content_server_staging_approval_review.ts', [
    '--descriptor',
    DESCRIPTOR_RELATIVE,
    '--out',
    REVIEW_RELATIVE,
    '--generated-at',
    GENERATED_AT,
  ]).status).toBe(0);

  expect(runTsx('scripts/plan_content_server_staging_writer.ts', [
    '--descriptor',
    DESCRIPTOR_RELATIVE,
    '--approval-review',
    REVIEW_RELATIVE,
    '--out',
    WRITER_PLAN_RELATIVE,
    '--generated-at',
    GENERATED_AT,
  ]).status).toBe(0);

  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, WRITER_PLAN_RELATIVE), 'utf8')) as StagingWriterPlan;
  writeApproval(plan);

  expect(runTsx('scripts/plan_content_server_staging_apply_preflight.ts', [
    '--writer-plan',
    WRITER_PLAN_RELATIVE,
    '--approval',
    APPROVAL_RELATIVE,
    '--out',
    PREFLIGHT_RELATIVE,
    '--generated-at',
    GENERATED_AT,
  ]).status).toBe(0);

  return plan;
}

function writeApproval(plan: StagingWriterPlan, overrides: Record<string, unknown> = {}): void {
  fs.writeFileSync(path.join(ROOT, APPROVAL_RELATIVE), `\uFEFF${JSON.stringify({
    schemaVersion: 'plan-content-real-server-staging-approval-v1',
    approvalScope: 'plan_content_server_staging_apply',
    approvalText: REQUIRED_APPROVAL_TEXT,
    packId: plan.packId,
    studyTarget: plan.studyTarget,
    sourceLocale: plan.sourceLocale,
    surface: plan.surface,
    contentVersion: plan.contentVersion,
    environment: 'staging_shadow',
    activationApproved: false,
    runtimeManifestRegistrationApproved: false,
    remoteLoadingEnabled: false,
    bundledContentRemovalApproved: false,
    storageMigrationApproved: false,
    productionActivationApproved: false,
    approvedAt: GENERATED_AT,
    approvedBy: 'codex-test',
    ...overrides,
  }, null, 2)}\n`, 'utf8');
}

function runApply(args: string[] = [], env: Record<string, string | undefined> = {}) {
  return runTsx('scripts/plan_content_server_staging_apply.ts', [
    '--preflight',
    PREFLIGHT_RELATIVE,
    '--writer-plan',
    WRITER_PLAN_RELATIVE,
    '--approval',
    APPROVAL_RELATIVE,
    '--out',
    APPLY_REPORT_RELATIVE,
    '--generated-at',
    GENERATED_AT,
    ...args,
  ], env);
}

describe('plan content server-staging apply command', () => {
  it('writes a dry-run apply report without server writes', () => {
    preparePreflight();

    const result = runApply();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content server-staging apply: DRY_RUN_READY');
    expect(result.stdout).toContain('Actual server writes: false');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, APPLY_REPORT_RELATIVE), 'utf8')) as ApplyReport;
    expect(report).toMatchObject({
      schemaVersion: 'plan-content-server-staging-apply-report-v1',
      status: 'DRY_RUN_READY',
      mode: 'dry_run',
      packId: `en.ru.plan_content.${CONTENT_VERSION}`,
      bucket: null,
      applyRequested: false,
      applyEnvConfirmed: false,
      activationApproved: false,
      runtimeManifestRegistered: false,
      remoteLoadingEnabled: false,
      bundledContentRemoved: false,
      storageMigrationRan: false,
      productionActivationApproved: false,
      serverWritePermitted: false,
      actualServerWrites: false,
      blockers: [],
    });
    expect(report.operations.length).toBeGreaterThan(500);
    expect(report.operations.every((operation) => operation.operation === 'would_upload_object')).toBe(true);
  });

  it('blocks apply mode before network credentials are available', () => {
    preparePreflight();

    const result = runApply(['--apply'], {
      PHRASEMAN_PLAN_CONTENT_STAGING_APPLY: '',
      PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET: '',
      PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN: '',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Server-staging apply failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, APPLY_REPORT_RELATIVE), 'utf8')) as ApplyReport;
    expect(report.status).toBe('APPLY_BLOCKED');
    expect(report.mode).toBe('apply');
    expect(report.applyRequested).toBe(true);
    expect(report.serverWritePermitted).toBe(false);
    expect(report.actualServerWrites).toBe(false);
    expect(report.operations.every((operation) => operation.operation === 'would_upload_object')).toBe(true);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'PHRASEMAN_PLAN_CONTENT_STAGING_APPLY must equal staging_shadow_only',
      'PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET is required for apply mode',
      'PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN is required for apply mode',
    ]));
  });

  it('fails closed when local objects change after preflight', () => {
    const plan = preparePreflight();
    const firstDayRow = plan.objects.find((object) => object.role === 'day_row');
    expect(firstDayRow).toBeTruthy();
    fs.appendFileSync(path.join(ROOT, firstDayRow!.localPath), '\n', 'utf8');

    const result = runApply();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Server-staging apply failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, APPLY_REPORT_RELATIVE), 'utf8')) as ApplyReport;
    expect(report.status).toBe('APPLY_BLOCKED');
    expect(report.actualServerWrites).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      `local object hash mismatch: ${firstDayRow!.localPath}`,
      `local object byteSize mismatch: ${firstDayRow!.localPath}`,
    ]));
  });

  it('rejects apply output outside the ignored plan-content temp directory', () => {
    preparePreflight();

    const result = runTsx('scripts/plan_content_server_staging_apply.ts', [
      '--preflight',
      PREFLIGHT_RELATIVE,
      '--writer-plan',
      WRITER_PLAN_RELATIVE,
      '--approval',
      APPROVAL_RELATIVE,
      '--out',
      'docs/specs/__plan_content_apply_should_not_write.json',
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Apply report output must stay under .codex-tmp');
  });

  it('keeps apply tooling disconnected from startup and runtime activation', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_server_staging_apply.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/course_pack_loader|cloud_sync|AsyncStorage|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_server_staging_apply|PlanContentServerStagingApply/i);
    }
  });
});

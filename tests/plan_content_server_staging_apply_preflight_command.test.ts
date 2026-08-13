import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/staging-apply-preflight';
const PACK_RELATIVE = `${RUN_ROOT_RELATIVE}/pack`;
const PARITY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/parity-report.json`;
const READINESS_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/readiness-report.json`;
const DESCRIPTOR_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-descriptor.json`;
const REVIEW_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-approval-review.json`;
const WRITER_PLAN_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-writer-plan.json`;
const APPROVAL_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-apply-approval.json`;
const PREFLIGHT_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-apply-preflight.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const CONTENT_VERSION = 'local.staging.apply.preflight.test';
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

type ApplyPreflightReport = {
  schemaVersion: string;
  status: string;
  mode: string;
  packId: string;
  realApplyApprovalAccepted: boolean;
  applyImplementationAllowed: boolean;
  serverWritePermitted: boolean;
  actualServerWrites: boolean;
  activationApproved: boolean;
  runtimeManifestRegistered: boolean;
  networkCalls: boolean;
  localOnly: boolean;
  objects: Array<{
    operation: string;
    role: string;
    localPath: string;
    stagingPath: string;
  }>;
  requiredBeforeRealApply: string[];
  blockers: string[];
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

function prepareWriterPlan(): StagingWriterPlan {
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

  return JSON.parse(fs.readFileSync(path.join(ROOT, WRITER_PLAN_RELATIVE), 'utf8')) as StagingWriterPlan;
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

function runPreflight(args: string[] = []) {
  return runTsx('scripts/plan_content_server_staging_apply_preflight.ts', [
    '--writer-plan',
    WRITER_PLAN_RELATIVE,
    '--approval',
    APPROVAL_RELATIVE,
    '--out',
    PREFLIGHT_RELATIVE,
    '--generated-at',
    GENERATED_AT,
    ...args,
  ]);
}

describe('plan content server-staging apply preflight command', () => {
  it('writes HOLD when the real apply approval file is missing', () => {
    prepareWriterPlan();

    const result = runPreflight();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Server-staging apply preflight failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, PREFLIGHT_RELATIVE), 'utf8')) as ApplyPreflightReport;
    expect(report).toMatchObject({
      schemaVersion: 'plan-content-server-staging-apply-preflight-v1',
      status: 'HOLD',
      mode: 'preflight_only',
      realApplyApprovalAccepted: false,
      applyImplementationAllowed: false,
      serverWritePermitted: false,
      actualServerWrites: false,
      activationApproved: false,
      runtimeManifestRegistered: false,
      networkCalls: false,
      localOnly: true,
    });
    expect(report.blockers).toEqual(expect.arrayContaining([
      'real server-staging approval file is required',
    ]));
  });

  it('accepts a staging-shadow approval as preflight-only evidence without server writes', () => {
    const plan = prepareWriterPlan();
    writeApproval(plan);

    const result = runPreflight();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content server-staging apply preflight: APPLY_PREFLIGHT_READY');
    expect(result.stdout).toContain('Actual server writes: false');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, PREFLIGHT_RELATIVE), 'utf8')) as ApplyPreflightReport;
    expect(report).toMatchObject({
      schemaVersion: 'plan-content-server-staging-apply-preflight-v1',
      status: 'APPLY_PREFLIGHT_READY',
      mode: 'preflight_only',
      packId: `en.ru.plan_content.${CONTENT_VERSION}`,
      realApplyApprovalAccepted: true,
      applyImplementationAllowed: true,
      serverWritePermitted: false,
      actualServerWrites: false,
      activationApproved: false,
      runtimeManifestRegistered: false,
      networkCalls: false,
      localOnly: true,
      blockers: [],
    });
    expect(report.objects.length).toBeGreaterThan(500);
    expect(report.objects.every((object) => object.operation === 'preflight_verify_object')).toBe(true);
    expect(report.requiredBeforeRealApply).toEqual(expect.arrayContaining([
      'separate apply-capable command must be implemented and reviewed',
      'production activation requires a later explicit approval',
    ]));
  });

  it('rejects unsafe approval flags and production-like environments', () => {
    const plan = prepareWriterPlan();
    writeApproval(plan, {
      environment: 'production',
      activationApproved: true,
      productionActivationApproved: true,
      remoteLoadingEnabled: true,
      bundledContentRemovalApproved: true,
    });

    const result = runPreflight();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Server-staging apply preflight failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, PREFLIGHT_RELATIVE), 'utf8')) as ApplyPreflightReport;
    expect(report.status).toBe('HOLD');
    expect(report.actualServerWrites).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'approval environment must be staging_shadow',
      'approval activationApproved must be false',
      'approval remoteLoadingEnabled must be false',
      'approval bundledContentRemovalApproved must be false',
      'approval productionActivationApproved must be false',
    ]));
  });

  it('fails closed when a local object changes after the writer plan is generated', () => {
    const plan = prepareWriterPlan();
    writeApproval(plan);
    const firstDayRow = plan.objects.find((object) => object.role === 'day_row');
    expect(firstDayRow).toBeTruthy();
    fs.appendFileSync(path.join(ROOT, firstDayRow!.localPath), '\n', 'utf8');

    const result = runPreflight();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Server-staging apply preflight failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, PREFLIGHT_RELATIVE), 'utf8')) as ApplyPreflightReport;
    expect(report.status).toBe('HOLD');
    expect(report.actualServerWrites).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      `local object hash mismatch: ${firstDayRow!.localPath}`,
      `local object byteSize mismatch: ${firstDayRow!.localPath}`,
    ]));
  });

  it('rejects preflight output outside the ignored plan-content temp directory', () => {
    const plan = prepareWriterPlan();
    writeApproval(plan);

    const result = runTsx('scripts/plan_content_server_staging_apply_preflight.ts', [
      '--writer-plan',
      WRITER_PLAN_RELATIVE,
      '--approval',
      APPROVAL_RELATIVE,
      '--out',
      'docs/specs/__plan_content_apply_preflight_should_not_write.json',
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Apply preflight output must stay under .codex-tmp');
  });

  it('keeps the preflight disconnected from Firebase, loader runtime and startup', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_server_staging_apply_preflight.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|storage\(\)|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader|firebase-admin/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_server_staging_apply_preflight|PlanContentServerStagingApplyPreflight/i);
    }
  });
});

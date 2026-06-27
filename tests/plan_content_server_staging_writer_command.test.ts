import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/staging-writer';
const PACK_RELATIVE = `${RUN_ROOT_RELATIVE}/pack`;
const PARITY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/parity-report.json`;
const READINESS_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/readiness-report.json`;
const DESCRIPTOR_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-descriptor.json`;
const REVIEW_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-approval-review.json`;
const WRITER_PLAN_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-writer-plan.json`;
const GENERATED_AT = '2026-06-26T00:00:00.000Z';
const CONTENT_VERSION = 'local.staging.writer.test';

type StagingWriterPlan = {
  schemaVersion: string;
  status: string;
  mode: string;
  packId: string;
  activationApproved: boolean;
  approvedForServerWrite: boolean;
  serverWritePermitted: boolean;
  applyRequested: boolean;
  actualServerWrites: boolean;
  runtimeManifestRegistered: boolean;
  networkCalls: boolean;
  localOnly: boolean;
  objects: Array<{
    operation: string;
    role: string;
    localPath: string;
    stagingPath: string;
    sha256: string;
    byteSize: number;
  }>;
  requiredBeforeApply: string[];
  blockers: string[];
};

type StagingDescriptor = {
  objects: Array<{
    role: string;
    localPath: string;
    stagingPath: string;
  }>;
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

function prepareApprovalReview(): void {
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
}

function writePlan(args: string[] = []) {
  return runTsx('scripts/plan_content_server_staging_writer.ts', [
    '--descriptor',
    DESCRIPTOR_RELATIVE,
    '--approval-review',
    REVIEW_RELATIVE,
    '--out',
    WRITER_PLAN_RELATIVE,
    '--generated-at',
    GENERATED_AT,
    ...args,
  ]);
}

describe('plan content server-staging writer dry-run command', () => {
  it('writes a dry-run would-write plan without server writes or activation', () => {
    prepareApprovalReview();

    const result = writePlan();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content server-staging writer: DRY_RUN_READY');
    expect(result.stdout).toContain('Actual server writes: false');

    const plan = JSON.parse(fs.readFileSync(path.join(ROOT, WRITER_PLAN_RELATIVE), 'utf8')) as StagingWriterPlan;
    expect(plan).toMatchObject({
      schemaVersion: 'plan-content-server-staging-writer-plan-v1',
      status: 'DRY_RUN_READY',
      mode: 'dry_run',
      packId: `en.ru.plan_content.${CONTENT_VERSION}`,
      activationApproved: false,
      approvedForServerWrite: false,
      serverWritePermitted: false,
      applyRequested: false,
      actualServerWrites: false,
      runtimeManifestRegistered: false,
      networkCalls: false,
      localOnly: true,
      blockers: [],
    });
    expect(plan.objects.length).toBeGreaterThan(500);
    expect(plan.objects.some((object) => object.role === 'manifest')).toBe(true);
    expect(plan.objects.some((object) => object.role === 'day_row')).toBe(true);
    expect(plan.requiredBeforeApply).toEqual(expect.arrayContaining([
      'explicit user approval for real server-side staging writes',
      'separate apply-capable writer implementation',
    ]));
    for (const object of plan.objects) {
      expect(object.operation).toBe('would_write_object');
      expect(object.localPath.startsWith('.codex-tmp/plan-content/')).toBe(true);
      expect(object.stagingPath).toMatch(/^course-packs\/plan_content\/en\/ru\//);
      expect(object.stagingPath).not.toMatch(/\.\.|\\/);
      expect(object.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(object.byteSize).toBeGreaterThan(0);
    }
  });

  it('rejects apply mode and persists a HOLD plan', () => {
    prepareApprovalReview();

    const result = writePlan(['--apply']);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Server-staging writer dry-run failed');

    const plan = JSON.parse(fs.readFileSync(path.join(ROOT, WRITER_PLAN_RELATIVE), 'utf8')) as StagingWriterPlan;
    expect(plan.status).toBe('HOLD');
    expect(plan.applyRequested).toBe(true);
    expect(plan.actualServerWrites).toBe(false);
    expect(plan.serverWritePermitted).toBe(false);
    expect(plan.blockers).toEqual(expect.arrayContaining([
      'apply mode is disabled in Phase 3U-A dry-run writer',
    ]));
  });

  it('fails closed when a local object changes after descriptor generation', () => {
    prepareApprovalReview();

    const descriptor = JSON.parse(fs.readFileSync(path.join(ROOT, DESCRIPTOR_RELATIVE), 'utf8')) as StagingDescriptor;
    const firstDayRow = descriptor.objects.find((object) => object.role === 'day_row');
    expect(firstDayRow).toBeTruthy();
    fs.appendFileSync(path.join(ROOT, firstDayRow!.localPath), '\n', 'utf8');

    const result = writePlan();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Server-staging writer dry-run failed');

    const plan = JSON.parse(fs.readFileSync(path.join(ROOT, WRITER_PLAN_RELATIVE), 'utf8')) as StagingWriterPlan;
    expect(plan.status).toBe('HOLD');
    expect(plan.actualServerWrites).toBe(false);
    expect(plan.blockers).toEqual(expect.arrayContaining([
      `local object hash mismatch: ${firstDayRow!.localPath}`,
      `local object byteSize mismatch: ${firstDayRow!.localPath}`,
    ]));
  });

  it('rejects writer output outside the ignored plan-content temp directory', () => {
    prepareApprovalReview();

    const result = runTsx('scripts/plan_content_server_staging_writer.ts', [
      '--descriptor',
      DESCRIPTOR_RELATIVE,
      '--approval-review',
      REVIEW_RELATIVE,
      '--out',
      'docs/specs/__plan_content_staging_writer_should_not_write.json',
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Staging writer output must stay under .codex-tmp');
  });

  it('keeps the dry-run writer disconnected from Firebase, loader runtime and startup', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_server_staging_writer.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|storage\(\)|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader|firebase-admin/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_server_staging_writer|PlanContentServerStagingWriter/i);
    }
  });
});

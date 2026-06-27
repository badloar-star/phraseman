import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/staging-approval-review';
const PACK_RELATIVE = `${RUN_ROOT_RELATIVE}/pack`;
const PARITY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/parity-report.json`;
const READINESS_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/readiness-report.json`;
const DESCRIPTOR_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-descriptor.json`;
const REVIEW_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-approval-review.json`;
const GENERATED_AT = '2026-06-26T00:00:00.000Z';
const CONTENT_VERSION = 'local.staging.approval.review.test';

type ApprovalReview = {
  schemaVersion: string;
  status: string;
  packId: string;
  descriptorStatus: string;
  activationApproved: boolean;
  approvedForServerWrite: boolean;
  serverWritePermitted: boolean;
  stagingWriterAllowed: boolean;
  runtimeManifestRegistered: boolean;
  networkCalls: boolean;
  localOnly: boolean;
  requiredApproval: string[];
  blockers: string[];
};

type StagingDescriptor = {
  status: string;
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

function prepareDescriptor(): void {
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
}

function writeReview(args: string[] = []) {
  return runTsx('scripts/plan_content_server_staging_approval_review.ts', [
    '--descriptor',
    DESCRIPTOR_RELATIVE,
    '--out',
    REVIEW_RELATIVE,
    '--generated-at',
    GENERATED_AT,
    ...args,
  ]);
}

describe('plan content server-staging approval review command', () => {
  it('writes an awaiting-approval review and never grants server-write permission', () => {
    prepareDescriptor();

    const result = writeReview();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content server-staging approval review: AWAITING_EXPLICIT_APPROVAL');
    expect(result.stdout).toContain('Approved for server write: false');

    const review = JSON.parse(fs.readFileSync(path.join(ROOT, REVIEW_RELATIVE), 'utf8')) as ApprovalReview;
    expect(review).toMatchObject({
      schemaVersion: 'plan-content-server-staging-approval-review-v1',
      status: 'AWAITING_EXPLICIT_APPROVAL',
      packId: `en.ru.plan_content.${CONTENT_VERSION}`,
      descriptorStatus: 'READY_FOR_STAGING_REVIEW',
      activationApproved: false,
      approvedForServerWrite: false,
      serverWritePermitted: false,
      stagingWriterAllowed: false,
      runtimeManifestRegistered: false,
      networkCalls: false,
      localOnly: true,
      blockers: [],
    });
    expect(review.requiredApproval).toEqual(expect.arrayContaining([
      'explicit user approval for server-side staging writes',
      'server copies must remain staging/shadow with activationApproved=false',
    ]));
  });

  it('writes HOLD and exits non-zero when descriptor evidence is not ready', () => {
    prepareDescriptor();

    const descriptorPath = path.join(ROOT, DESCRIPTOR_RELATIVE);
    const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8')) as StagingDescriptor;
    fs.writeFileSync(descriptorPath, `${JSON.stringify({
      ...descriptor,
      status: 'HOLD',
      blockers: ['manual test blocker'],
    }, null, 2)}\n`, 'utf8');

    const result = writeReview();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Server-staging approval review failed');

    const review = JSON.parse(fs.readFileSync(path.join(ROOT, REVIEW_RELATIVE), 'utf8')) as ApprovalReview;
    expect(review.status).toBe('HOLD');
    expect(review.approvedForServerWrite).toBe(false);
    expect(review.serverWritePermitted).toBe(false);
    expect(review.blockers).toEqual(expect.arrayContaining([
      'descriptor status must be READY_FOR_STAGING_REVIEW, got HOLD',
      'descriptor blockers must be empty',
    ]));
  });

  it('rejects review output outside the ignored plan-content temp directory', () => {
    prepareDescriptor();

    const result = runTsx('scripts/plan_content_server_staging_approval_review.ts', [
      '--descriptor',
      DESCRIPTOR_RELATIVE,
      '--out',
      'docs/specs/__plan_content_staging_approval_should_not_write.json',
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Approval review output must stay under .codex-tmp');
  });

  it('keeps the approval review disconnected from Firebase, loader runtime and startup', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_server_staging_approval_review.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|storage\(\)|upload|download|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_server_staging_approval_review|PlanContentServerStagingApproval/i);
    }
  });
});

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/staging-descriptor';
const PACK_RELATIVE = `${RUN_ROOT_RELATIVE}/pack`;
const PARITY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/parity-report.json`;
const READINESS_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/readiness-report.json`;
const DESCRIPTOR_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-descriptor.json`;
const GENERATED_AT = '2026-06-26T00:00:00.000Z';
const CONTENT_VERSION = 'local.staging.descriptor.test';

type ReadinessReport = {
  status: string;
};

type StagingDescriptor = {
  schemaVersion: string;
  status: string;
  packId: string;
  activationApproved: boolean;
  runtimeManifestRegistered: boolean;
  networkCalls: boolean;
  localOnly: boolean;
  objects: Array<{
    role: string;
    localPath: string;
    stagingPath: string;
    sha256: string;
    byteSize: number;
  }>;
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

function prepareVerifiedBundle(): void {
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
}

function writeDescriptor(args: string[] = []) {
  return runTsx('scripts/plan_content_server_staging_descriptor.ts', [
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
    ...args,
  ]);
}

describe('plan content server-staging dry-run descriptor command', () => {
  it('writes a local descriptor for verified artifacts without activating runtime', () => {
    prepareVerifiedBundle();

    const result = writeDescriptor();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content server-staging descriptor: PASS');
    expect(result.stdout).toContain('Activation approved: false');

    const descriptor = JSON.parse(fs.readFileSync(path.join(ROOT, DESCRIPTOR_RELATIVE), 'utf8')) as StagingDescriptor;
    expect(descriptor).toMatchObject({
      schemaVersion: 'plan-content-server-staging-descriptor-v1',
      status: 'READY_FOR_STAGING_REVIEW',
      packId: `en.ru.plan_content.${CONTENT_VERSION}`,
      activationApproved: false,
      runtimeManifestRegistered: false,
      networkCalls: false,
      localOnly: true,
      blockers: [],
    });
    expect(descriptor.objects.length).toBeGreaterThan(500);
    expect(descriptor.objects.some((object) => object.role === 'manifest')).toBe(true);
    expect(descriptor.objects.some((object) => object.role === 'day_row')).toBe(true);
    for (const object of descriptor.objects) {
      expect(object.localPath.startsWith('.codex-tmp/plan-content/')).toBe(true);
      expect(object.stagingPath).toMatch(/^course-packs\/plan_content\/en\/ru\//);
      expect(object.stagingPath).not.toMatch(/\.\.|\\/);
      expect(object.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(object.byteSize).toBeGreaterThan(0);
    }
  });

  it('writes HOLD and exits non-zero when readiness evidence is not PASS', () => {
    prepareVerifiedBundle();

    const readinessPath = path.join(ROOT, READINESS_REPORT_RELATIVE);
    const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8')) as ReadinessReport;
    fs.writeFileSync(readinessPath, `${JSON.stringify({ ...readiness, status: 'HOLD' }, null, 2)}\n`, 'utf8');

    const result = writeDescriptor();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Server-staging descriptor failed');

    const descriptor = JSON.parse(fs.readFileSync(path.join(ROOT, DESCRIPTOR_RELATIVE), 'utf8')) as StagingDescriptor;
    expect(descriptor.status).toBe('HOLD');
    expect(descriptor.activationApproved).toBe(false);
    expect(descriptor.blockers).toEqual(expect.arrayContaining([
      'readiness status must be PASS, got HOLD',
    ]));
  });

  it('rejects descriptor output outside the ignored plan-content temp directory', () => {
    prepareVerifiedBundle();

    const result = runTsx('scripts/plan_content_server_staging_descriptor.ts', [
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
      'docs/specs/__plan_content_staging_descriptor_should_not_write.json',
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Staging descriptor output must stay under .codex-tmp');
  });

  it('keeps the descriptor tool disconnected from Firebase, loader runtime and startup', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_server_staging_descriptor.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|storage\(\)|upload|download|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_server_staging_descriptor|PlanContentServerStaging/i);
    }
  });
});

import fs from 'fs';
import path from 'path';

import { verifyPlanContentServerStagingRemote } from '../scripts/plan_content_server_staging_remote_verify';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/staging-remote-verify';
const APPLY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-apply-report.json`;
const VERIFY_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-remote-verify.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const PACK_ID = 'en.ru.plan_content.staging.shadow.remote.verify.test';
const CONTENT_VERSION = 'staging.shadow.remote.verify.test';
const PREFIX = `course-packs/plan_content/en/ru/${CONTENT_VERSION}/`;

type FetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type RemoteVerifyReport = {
  status: string;
  expectedObjectCount: number;
  foundObjectCount: number;
  hashCheckedCount: number;
  activationApproved: boolean;
  runtimeManifestRegistered: boolean;
  remoteLoadingEnabled: boolean;
  bundledContentRemoved: boolean;
  storageMigrationRan: boolean;
  productionActivationApproved: boolean;
  blockers: string[];
};

const ORIGINAL_ENV = { ...process.env };

function bufferResponse(buffer: Buffer): FetchResponse {
  return {
    ok: true,
    status: 200,
    text: async () => buffer.toString('utf8'),
    json: async () => JSON.parse(buffer.toString('utf8')),
    arrayBuffer: async () => Uint8Array.from(buffer).buffer as ArrayBuffer,
  };
}

function jsonResponse(value: unknown): FetchResponse {
  return bufferResponse(Buffer.from(JSON.stringify(value), 'utf8'));
}

function writeApplyReport(files: Record<string, Buffer>): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });

  const operations = Object.entries(files).map(([stagingPath, content]) => ({
    operation: 'uploaded_object',
    role: stagingPath.endsWith('manifest.json') ? 'manifest' : 'day_row',
    localPath: `${RUN_ROOT_RELATIVE}/local/${path.basename(stagingPath)}`,
    stagingPath,
    sha256: require('crypto').createHash('sha256').update(content).digest('hex'),
    byteSize: content.byteLength,
  }));

  fs.writeFileSync(path.join(ROOT, APPLY_REPORT_RELATIVE), `${JSON.stringify({
    schemaVersion: 'plan-content-server-staging-apply-report-v1',
    status: 'APPLY_COMPLETE',
    mode: 'apply',
    generatedAt: GENERATED_AT,
    packId: PACK_ID,
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    contentVersion: CONTENT_VERSION,
    bucket: BUCKET,
    applyRequested: true,
    applyEnvConfirmed: true,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    storageMigrationRan: false,
    productionActivationApproved: false,
    serverWritePermitted: true,
    actualServerWrites: true,
    operations,
    blockers: [],
  }, null, 2)}\n`, 'utf8');
}

function makeFetch(files: Record<string, Buffer>) {
  return async (input: string | URL): Promise<FetchResponse> => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/o') && url.searchParams.get('prefix') === PREFIX) {
      return jsonResponse({
        items: Object.entries(files).map(([name, content]) => ({
          name,
          size: String(content.byteLength),
        })),
      });
    }
    const encodedName = url.pathname.split('/o/')[1];
    const name = decodeURIComponent(encodedName ?? '');
    const content = files[name];
    if (!content) {
      return {
        ok: false,
        status: 404,
        text: async () => 'missing',
        json: async () => ({}),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    }
    return bufferResponse(content);
  };
}

describe('plan content server-staging remote verifier', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('verifies remote staging objects against the apply report', async () => {
    const files = {
      [`${PREFIX}manifest.json`]: Buffer.from('{"manifest":true}\n', 'utf8'),
      [`${PREFIX}index.json`]: Buffer.from('{"index":true}\n', 'utf8'),
      [`${PREFIX}plans/voyazh/day-001.json`]: Buffer.from('{"day":1}\n', 'utf8'),
    };
    writeApplyReport(files);
    process.env.PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET = BUCKET;
    process.env.PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN = 'fake-token';

    const result = await verifyPlanContentServerStagingRemote(ROOT, {
      applyReportPath: APPLY_REPORT_RELATIVE,
      outputPath: VERIFY_REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    }, makeFetch(files));

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-server-staging-remote-verify-v1',
      status: 'PASS',
      packId: PACK_ID,
      expectedObjectCount: 3,
      foundObjectCount: 3,
      hashCheckedCount: 3,
      activationApproved: false,
      runtimeManifestRegistered: false,
      remoteLoadingEnabled: false,
      bundledContentRemoved: false,
      storageMigrationRan: false,
      productionActivationApproved: false,
      blockers: [],
    });
  });

  it('writes HOLD when the remote verification access token is absent', async () => {
    const files = {
      [`${PREFIX}manifest.json`]: Buffer.from('{"manifest":true}\n', 'utf8'),
    };
    writeApplyReport(files);
    delete process.env.PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET;
    delete process.env.PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN;

    await expect(verifyPlanContentServerStagingRemote(ROOT, {
      applyReportPath: APPLY_REPORT_RELATIVE,
      outputPath: VERIFY_REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    }, makeFetch(files))).rejects.toThrow('Server-staging remote verify failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, VERIFY_REPORT_RELATIVE), 'utf8')) as RemoteVerifyReport;
    expect(report.status).toBe('HOLD');
    expect(report.activationApproved).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN is required for remote verify',
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', async () => {
    const files = {
      [`${PREFIX}manifest.json`]: Buffer.from('{"manifest":true}\n', 'utf8'),
    };
    writeApplyReport(files);
    process.env.PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET = BUCKET;
    process.env.PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN = 'fake-token';

    await expect(verifyPlanContentServerStagingRemote(ROOT, {
      applyReportPath: APPLY_REPORT_RELATIVE,
      outputPath: 'docs/specs/__plan_content_remote_verify_should_not_write.json',
      generatedAt: GENERATED_AT,
    }, makeFetch(files))).rejects.toThrow('Remote verify output must stay under .codex-tmp');
  });

  it('keeps remote verification disconnected from startup and runtime activation', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_server_staging_remote_verify.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/course_pack_loader|cloud_sync|AsyncStorage|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_server_staging_remote_verify|PlanContentServerStagingRemoteVerify/i);
    }
  });
});

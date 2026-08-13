import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  PLAN_CONTENT_DAY_SCHEMA_VERSION,
  PLAN_CONTENT_INDEX_SCHEMA_VERSION,
  type PlanContentPackIndex,
} from '../app/plan_content_pack_index';
import { listAuthoredPlanContentDays } from '../app/plan_content_registry';
import type { PlanContentDay } from '../app/plan_content_schema';
import { comparePlanContentServerShadowDualRead } from '../scripts/plan_content_server_shadow_dual_read_compare';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/server-shadow-dual-read';
const REMOTE_VERIFY_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-remote-verify.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/server-shadow-dual-read-report.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const PACK_ID = 'en.ru.plan_content.staging.shadow.dual.read.test';
const CONTENT_VERSION = 'staging.shadow.dual.read.test';
const PREFIX = `course-packs/plan_content/en/ru/${CONTENT_VERSION}/`;

type FetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type ServerShadowDualReadReport = {
  status: string;
  remoteExpectedObjectCount: number;
  remoteFoundObjectCount: number;
  remoteHashCheckedCount: number;
  remoteIndexEntryCount: number;
  serverShadowRowsRead: number;
  activationApproved: boolean;
  runtimeManifestRegistered: boolean;
  remoteLoadingEnabled: boolean;
  bundledContentRemoved: boolean;
  storageMigrationRan: boolean;
  productionActivationApproved: boolean;
  parityReport: {
    comparedPlanDayCount: number;
    verdict: string;
    hashMismatches: unknown[];
    adapterOutputMismatches: unknown[];
  };
  artifactMismatches: unknown[];
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

function makeFetch(files: Record<string, Buffer>) {
  return async (input: string | URL): Promise<FetchResponse> => {
    const url = new URL(String(input));
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

function writeRemoteVerifyReport(objectCount: number): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REMOTE_VERIFY_RELATIVE), `${JSON.stringify({
    schemaVersion: 'plan-content-server-staging-remote-verify-v1',
    status: 'PASS',
    generatedAt: GENERATED_AT,
    packId: PACK_ID,
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    contentVersion: CONTENT_VERSION,
    bucket: BUCKET,
    prefix: PREFIX,
    applyReportPath: `${RUN_ROOT_RELATIVE}/server-staging-apply-report.json`,
    expectedObjectCount: objectCount,
    foundObjectCount: objectCount,
    hashCheckedCount: objectCount,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    storageMigrationRan: false,
    productionActivationApproved: false,
    missingObjects: [],
    sizeMismatches: [],
    hashMismatches: [],
    blockers: [],
  }, null, 2)}\n`, 'utf8');
}

function buildRemoteFiles(): { files: Record<string, Buffer>; rowCount: number } {
  const days = [...listAuthoredPlanContentDays()].sort(compareDays);
  const sourceGraphHash = hashJson(days.map((day) => ({
    planId: day.planId,
    dayIndex: day.dayIndex,
    contentHash: hashPlanContentDay(day),
  })));
  const files: Record<string, Buffer> = {};
  const entries: PlanContentPackIndex['entries'] = [];

  for (const day of days) {
    const contentHash = hashPlanContentDay(day);
    const relativePath = `plans/${day.planId}/day-${String(day.dayIndex).padStart(3, '0')}.json`;
    const artifact = {
      schemaVersion: PLAN_CONTENT_DAY_SCHEMA_VERSION,
      studyTarget: 'en',
      sourceLocale: 'ru',
      contentVersion: CONTENT_VERSION,
      contentHash,
      reviewStatus: 'shadow',
      localeGateStatus: 'hold',
      generatedBy: 'plan_content_server_shadow_dual_read_compare_test',
      generatedAt: GENERATED_AT,
      sourceGraphHash,
      pedagogyContractVersion: 'bundled-compatibility-v1',
      adapterContractVersion: 'plan-content-runtime-adapter-v1',
      content: day,
    };
    files[`${PREFIX}${relativePath}`] = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    entries.push({
      planId: day.planId,
      dayIndex: day.dayIndex,
      path: relativePath,
      contentHash,
      sourceLocale: 'ru',
      studyTarget: 'en',
      reviewStatus: 'shadow',
      localeGateStatus: 'hold',
      schemaVersion: PLAN_CONTENT_DAY_SCHEMA_VERSION,
    });
  }

  const index: PlanContentPackIndex = {
    schemaVersion: PLAN_CONTENT_INDEX_SCHEMA_VERSION,
    studyTarget: 'en',
    sourceLocale: 'ru',
    contentVersion: CONTENT_VERSION,
    entries,
  };
  files[`${PREFIX}index.json`] = Buffer.from(`${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return { files, rowCount: days.length };
}

describe('plan content server-shadow dual-read comparator', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('compares server shadow rows against bundled compatibility', async () => {
    const { files, rowCount } = buildRemoteFiles();
    writeRemoteVerifyReport(Object.keys(files).length);
    process.env.PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET = BUCKET;
    process.env.PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN = 'fake-token';

    const result = await comparePlanContentServerShadowDualRead(ROOT, {
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    }, makeFetch(files));

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-server-shadow-dual-read-report-v1',
      status: 'PASS',
      packId: PACK_ID,
      remoteExpectedObjectCount: rowCount + 1,
      remoteFoundObjectCount: rowCount + 1,
      remoteHashCheckedCount: rowCount + 1,
      remoteIndexEntryCount: rowCount,
      serverShadowRowsRead: rowCount,
      activationApproved: false,
      runtimeManifestRegistered: false,
      remoteLoadingEnabled: false,
      bundledContentRemoved: false,
      storageMigrationRan: false,
      productionActivationApproved: false,
      artifactMismatches: [],
      blockers: [],
    });
    expect(result.report.parityReport).toMatchObject({
      comparedPlanDayCount: rowCount,
      verdict: 'shadow_parity_passed',
      hashMismatches: [],
      adapterOutputMismatches: [],
    });
  });

  it('writes HOLD when the access token is absent', async () => {
    const { files } = buildRemoteFiles();
    writeRemoteVerifyReport(Object.keys(files).length);
    delete process.env.PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET;
    delete process.env.PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN;

    await expect(comparePlanContentServerShadowDualRead(ROOT, {
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    }, makeFetch(files))).rejects.toThrow('Server-shadow dual-read compare failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as ServerShadowDualReadReport;
    expect(report.status).toBe('HOLD');
    expect(report.activationApproved).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN is required for server-shadow dual-read compare',
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', async () => {
    const { files } = buildRemoteFiles();
    writeRemoteVerifyReport(Object.keys(files).length);
    process.env.PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET = BUCKET;
    process.env.PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN = 'fake-token';

    await expect(comparePlanContentServerShadowDualRead(ROOT, {
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      outputPath: 'docs/specs/__plan_content_server_shadow_should_not_write.json',
      generatedAt: GENERATED_AT,
    }, makeFetch(files))).rejects.toThrow('Server-shadow dual-read output must stay under .codex-tmp');
  });

  it('keeps server-shadow comparison disconnected from startup and runtime activation', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_server_shadow_dual_read_compare.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/course_pack_loader|cloud_sync|AsyncStorage|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_server_shadow_dual_read_compare|PlanContentServerShadowDualRead/i);
    }
  });
});

function compareDays(left: PlanContentDay, right: PlanContentDay): number {
  return left.planId.localeCompare(right.planId) || left.dayIndex - right.dayIndex;
}

function hashPlanContentDay(day: PlanContentDay): string {
  return hashJson(day);
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeJson(entryValue)]),
    );
  }
  return value;
}

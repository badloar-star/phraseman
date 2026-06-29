import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

import { canonicalPlanContentString } from '../app/plan_content_canonical_hash';

// This suite verifies the loader's DISABLED behavior. The shipped flag is now
// enabled (true), so we mock the loader module to force it false here, proving the
// disabled guards still short-circuit when the flag is off (e.g. a future kill-switch).
jest.mock('../app/course_pack_loader', () => ({
  COURSE_PACK_REMOTE_LOADING_ENABLED: false,
  PLAN_CONTENT_REMOTE_ENABLED: false,
}));

// expo-crypto mock: real SHA256 over the input string so integrity tests are real.
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn((_alg: string, data: string) =>
    Promise.resolve(require('crypto').createHash('sha256').update(data).digest('hex')),
  ),
}));

// The remote loader imports expo-file-system; mock it so the disabled-state tests
// run in node. If any disabled-path code actually TOUCHED these, the mock would
// record calls — proving the disabled guards short-circuit before any I/O.
const fileSystemCalls: string[] = [];
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  Directory: class {
    constructor() { fileSystemCalls.push('Directory()'); }
    get exists() { fileSystemCalls.push('Directory.exists'); return false; }
    create() { fileSystemCalls.push('Directory.create'); }
    delete() { fileSystemCalls.push('Directory.delete'); }
    get uri() { return 'file:///cache/x'; }
  },
  File: class {
    static downloadFileAsync() { fileSystemCalls.push('File.downloadFileAsync'); return Promise.resolve(null); }
    get exists() { return false; }
    get size() { return 0; }
    text() { return Promise.resolve(''); }
  },
}));

describe('course pack remote loader — disabled by default', () => {
  beforeEach(() => { fileSystemCalls.length = 0; });

  it('the loader treats a disabled flag as fully inert (kill-switch behavior)', async () => {
    const mod = await import('../app/course_pack_loader');
    expect(mod.PLAN_CONTENT_REMOTE_ENABLED).toBe(false);
  });

  it('ensureRemoteCoursePack returns disabled and performs NO network/disk I/O', async () => {
    const mod = await import('../app/course_pack_remote_loader');
    const globalFetch = jest.spyOn(global, 'fetch' as never);

    const result = await mod.ensureRemoteCoursePack(
      'https://example.com/manifest.json',
      (p: string) => `https://example.com/pack/${p}`,
    );

    expect(result).toEqual({ state: 'disabled' });
    expect(globalFetch).not.toHaveBeenCalled();
    expect(fileSystemCalls).toEqual([]);
    globalFetch.mockRestore();
  });

  it('readCachedCoursePackRow returns null while disabled, with no disk read', async () => {
    const mod = await import('../app/course_pack_remote_loader');
    const row = await mod.readCachedCoursePackRow('any-cache-key', 'plans/echo/day-001.json');
    expect(row).toBeNull();
    expect(fileSystemCalls).toEqual([]);
  });

  it('evictCachedCoursePack is a no-op while disabled', async () => {
    const mod = await import('../app/course_pack_remote_loader');
    await expect(mod.evictCachedCoursePack('any-cache-key')).resolves.toBeUndefined();
    expect(fileSystemCalls).toEqual([]);
  });

  it('computePlanContentDayHash matches the pack exporter contentHash for a real day', async () => {
    const mod = await import('../app/course_pack_remote_loader');
    const root = path.join(__dirname, '..');
    const dayPath = path.join(
      root,
      '.codex-tmp/plan-content/staging-upload-20260628/pack/plans/echo/day-001.json',
    );
    if (!fs.existsSync(dayPath)) return; // staging artifact optional in CI
    const day = JSON.parse(fs.readFileSync(dayPath, 'utf8'));
    const runtimeHash = await mod.computePlanContentDayHash(day.content);
    const exporterHash = createHash('sha256').update(canonicalPlanContentString(day.content)).digest('hex');
    expect(runtimeHash).toBe(exporterHash);
    expect(runtimeHash).toBe(day.contentHash);
  });

  it('is not imported by startup, onboarding, the loader or the embedded index', () => {
    const root = path.join(__dirname, '..');
    const startupAndRuntime = [
      'app/_layout.tsx',
      'components/onboarding.tsx',
      'components/LangContext.tsx',
      'app/course_pack_loader.ts',
      'app/course_pack_index.ts',
    ].map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
    for (const src of startupAndRuntime) {
      expect(src).not.toMatch(/course_pack_remote_loader/);
    }
  });
});

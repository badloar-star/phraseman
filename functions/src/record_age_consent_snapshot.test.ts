import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { HttpsError } from 'firebase-functions/v2/https';

type Input = {
  schemaVersion: 1;
  intentId: string;
  ageBracket: 'adult' | 'unknown';
  analyticsConsent: 'granted' | 'denied' | 'unset';
  legalAccepted: boolean;
  appVersion: string;
  build: string;
  platform: 'ios' | 'android' | 'web';
};

type Row = Record<string, unknown>;
type Repository = {
  runTransaction<T>(
    stableUid: string,
    work: (current: Row | null) => Promise<{ result: T; patch: Row | null }>,
  ): Promise<T>;
};

type ModuleShape = {
  parseAgeConsentSnapshot(value: unknown): Input;
  applyAgeConsentSnapshot(
    repository: Repository,
    stableUid: string,
    value: unknown,
    nowMs?: number,
  ): Promise<{ ok: true; duplicate: boolean }>;
  handleRecordAgeConsentSnapshot(
    dependencies: {
      repository: Repository;
      resolveStableUid(authUid: string): Promise<string>;
      nowMs(): number;
    },
    request: { authUid: string; data: unknown },
  ): Promise<{ ok: true; duplicate: boolean }>;
};

function loadModule(): Partial<ModuleShape> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./record_age_consent_snapshot') as ModuleShape;
  } catch (error) {
    if (existsSync(path.join(__dirname, 'record_age_consent_snapshot.ts'))) throw error;
    return {};
  }
}

class MemoryRepository implements Repository {
  readonly rows = new Map<string, Row>();
  writes = 0;

  async runTransaction<T>(
    stableUid: string,
    work: (current: Row | null) => Promise<{ result: T; patch: Row | null }>,
  ): Promise<T> {
    const current = this.rows.get(stableUid) ?? null;
    const outcome = await work(current ? { ...current } : null);
    if (outcome.patch) {
      this.writes += 1;
      this.rows.set(stableUid, { ...(current ?? {}), ...outcome.patch });
    }
    return outcome.result;
  }
}

const VALID: Input = {
  schemaVersion: 1,
  intentId: '3d372222-1419-47d0-8fe8-c2c77fe22742',
  ageBracket: 'adult',
  analyticsConsent: 'granted',
  legalAccepted: true,
  appVersion: '2.4.1',
  build: '20401',
  platform: 'ios',
};

describe('recordAgeConsentSnapshot input boundary', () => {
  it('accepts only the exact versioned categorical cohort payload', () => {
    const { parseAgeConsentSnapshot } = loadModule();
    expect(typeof parseAgeConsentSnapshot).toBe('function');
    if (!parseAgeConsentSnapshot) return;

    expect(parseAgeConsentSnapshot(VALID)).toEqual(VALID);
    for (const forbidden of ['uid', 'stableId', 'authUid', 'userId', 'birthYear', 'deviceId']) {
      expect(() => parseAgeConsentSnapshot({ ...VALID, [forbidden]: 'forbidden' }))
        .toThrow(HttpsError);
    }
  });

  it('rejects unsupported schema, enum values, ids, and cohort string lengths', () => {
    const { parseAgeConsentSnapshot } = loadModule();
    expect(typeof parseAgeConsentSnapshot).toBe('function');
    if (!parseAgeConsentSnapshot) return;

    for (const invalid of [
      { ...VALID, schemaVersion: 2 },
      { ...VALID, ageBracket: 'teen' },
      { ...VALID, analyticsConsent: 'yes' },
      { ...VALID, legalAccepted: 'true' },
      { ...VALID, platform: 'iphone' },
      { ...VALID, intentId: 'guessable' },
      { ...VALID, appVersion: '' },
      { ...VALID, build: 'x'.repeat(65) },
    ]) {
      expect(() => parseAgeConsentSnapshot(invalid)).toThrow(HttpsError);
    }
  });
});

describe('recordAgeConsentSnapshot transaction semantics', () => {
  it('preserves first timestamps and first cohort while updating current fields', async () => {
    const { applyAgeConsentSnapshot } = loadModule();
    expect(typeof applyAgeConsentSnapshot).toBe('function');
    if (!applyAgeConsentSnapshot) return;

    const repository = new MemoryRepository();
    await applyAgeConsentSnapshot(repository, 'stable-1', VALID, 1_000);
    await applyAgeConsentSnapshot(repository, 'stable-1', {
      ...VALID,
      intentId: 'ff043af7-75ec-44d8-b6c4-a8ee16f9350f',
      analyticsConsent: 'denied',
      legalAccepted: false,
      appVersion: '2.5.0',
      build: '20500',
      platform: 'android',
    }, 2_000);

    expect(repository.rows.get('stable-1')).toMatchObject({
      createdAt: 1_000,
      consentGrantedAt: 1_000,
      legalAcceptedAt: 1_000,
      firstAppVersion: '2.4.1',
      firstBuild: '20401',
      firstPlatform: 'ios',
      appVersion: '2.5.0',
      build: '20500',
      platform: 'android',
      ageBracket: 'adult',
      analyticsConsent: 'denied',
      legalAccepted: false,
      consentRevokedAt: 2_000,
      updatedAt: 2_000,
    });
    expect(repository.rows.get('stable-1')).not.toHaveProperty('birthYear');
  });

  it('treats an exact intent replay as a no-op and stores only its hash', async () => {
    const { applyAgeConsentSnapshot } = loadModule();
    expect(typeof applyAgeConsentSnapshot).toBe('function');
    if (!applyAgeConsentSnapshot) return;

    const repository = new MemoryRepository();
    const first = await applyAgeConsentSnapshot(repository, 'stable-1', VALID, 1_000);
    const before = { ...repository.rows.get('stable-1') };
    const replay = await applyAgeConsentSnapshot(repository, 'stable-1', VALID, 9_000);

    expect(first).toEqual({ ok: true, duplicate: false });
    expect(replay).toEqual({ ok: true, duplicate: true });
    expect(repository.writes).toBe(1);
    expect(repository.rows.get('stable-1')).toEqual(before);
    expect(repository.rows.get('stable-1')?.lastIntentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(repository.rows.get('stable-1'))).not.toContain(VALID.intentId);
  });

  it('uses a server timestamp for each distinct denial while preserving the first grant', async () => {
    const { applyAgeConsentSnapshot } = loadModule();
    expect(typeof applyAgeConsentSnapshot).toBe('function');
    if (!applyAgeConsentSnapshot) return;

    const repository = new MemoryRepository();
    await applyAgeConsentSnapshot(repository, 'stable-1', VALID, 1_000);
    await applyAgeConsentSnapshot(repository, 'stable-1', {
      ...VALID,
      intentId: '5c209819-6747-47c8-aeb5-61fdde452220',
      analyticsConsent: 'denied',
    }, 2_000);
    await applyAgeConsentSnapshot(repository, 'stable-1', {
      ...VALID,
      intentId: '69766fc0-85d4-41f2-90a1-c20f4c716a68',
      analyticsConsent: 'denied',
    }, 3_000);

    expect(repository.rows.get('stable-1')).toMatchObject({
      consentGrantedAt: 1_000,
      consentRevokedAt: 3_000,
      updatedAt: 3_000,
    });
  });
});

describe('recordAgeConsentSnapshot callable identity boundary', () => {
  it('requires auth and resolves the storage identity only from auth', async () => {
    const { handleRecordAgeConsentSnapshot } = loadModule();
    expect(typeof handleRecordAgeConsentSnapshot).toBe('function');
    if (!handleRecordAgeConsentSnapshot) return;

    const repository = new MemoryRepository();
    const resolveStableUid = jest.fn(async (authUid: string) => `stable-for-${authUid}`);
    const dependencies = { repository, resolveStableUid, nowMs: () => 1_000 };

    await expect(handleRecordAgeConsentSnapshot(dependencies, { authUid: '', data: VALID }))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    await handleRecordAgeConsentSnapshot(dependencies, { authUid: 'auth-1', data: VALID });

    expect(resolveStableUid).toHaveBeenCalledWith('auth-1');
    expect(repository.rows.has('stable-for-auth-1')).toBe(true);
    expect(repository.rows.has('auth-1')).toBe(false);
  });

  it('uses strict App Check and canonical resolver options and is exported from index', () => {
    const sourcePath = path.join(__dirname, 'record_age_consent_snapshot.ts');
    expect(existsSync(sourcePath)).toBe(true);
    if (!existsSync(sourcePath)) return;
    const source = readFileSync(sourcePath, 'utf8');
    const index = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(source).toMatch(/recordAgeConsentSnapshot\s*=\s*onCall\(\{[\s\S]*?region:\s*['"]us-central1['"][\s\S]*?enforceAppCheck:\s*true/);
    expect(source).toContain('resolveStableUidForAuth(db, authUid, undefined, {');
    expect(source).toContain('requireKnownIdentity: true');
    expect(source).toContain('repairLinks: false');
    expect(index).toContain("export { recordAgeConsentSnapshot } from './record_age_consent_snapshot';");
  });
});

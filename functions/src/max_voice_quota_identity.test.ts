type DocData = Record<string, any>;

let identityClosure = ['stable-1', 'auth-new'];
const mockIdentityClosure = jest.fn(async (
  _db?: unknown,
  _stableUid?: string,
  _authUid?: string,
  _transaction?: unknown,
) => [...identityClosure]);
jest.mock('./account_delete', () => ({
  resolveAccountDeleteIdentityClosure: (...args: unknown[]) => mockIdentityClosure(...(args as [])),
}));

import {
  VOICE_QUOTA_COLLECTION,
  confirmVoiceTrialMinted,
  ensureCanonicalVoiceQuota,
  legacyVoiceQuotaDocId,
  releaseVoiceReservation,
  reserveVoiceSeconds,
  settleVoiceSession,
  voiceQuotaDocId,
} from './max_voice_quota';

const NOW = 1_800_000_000_000;
const AUTH = 'auth-new';
const STABLE = 'stable-1';
const ALIAS = 'stable-2';
const SECOND_ALIAS = 'stable-3';
const DAY_RESET = NOW + 3_600_000;
const MONTH_RESET = NOW + 86_400_000;

function makeDb(initial: Record<string, DocData>, beforeTransaction?: (docs: Map<string, DocData>) => void) {
  const docs = new Map(Object.entries(initial));
  const stats = { queryReads: 0, transactionRuns: 0 };
  const refFor = (path: string) => ({
    path,
    id: path.split('/').pop(),
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
  });
  const collection = (name: string) => ({
    doc: (id: string) => refFor(`${name}/${id}`),
    where: (_field: string, _op: string, value: string) => ({
      limit: () => ({
        get: async () => {
          stats.queryReads += 1;
          return {
            docs: [...docs.entries()]
              .filter(([path, data]) => path.startsWith(`${name}/`) && data.stableUid === value)
              .map(([path, data]) => ({ ...refFor(path), ref: refFor(path), data: () => data })),
          };
        },
      }),
    }),
  });
  const db = {
    collection,
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      stats.transactionRuns += 1;
      beforeTransaction?.(docs);
      const writes: Array<() => void> = [];
      const tx = {
        get: (ref: any) => ref.get(),
        set: (ref: any, data: DocData, options?: { merge?: boolean }) => writes.push(() => {
          docs.set(ref.path, options?.merge ? { ...(docs.get(ref.path) ?? {}), ...data } : data);
        }),
      };
      const result = await fn(tx);
      writes.forEach((write) => write());
      return result;
    },
  };
  return { db: db as any, docs, stats };
}

function quotaPath(stableUid: string): string {
  return `${VOICE_QUOTA_COLLECTION}/${voiceQuotaDocId(stableUid)}`;
}

function currentWindow(data: DocData = {}): DocData {
  return {
    resetAtMs: DAY_RESET,
    monthResetAtMs: MONTH_RESET,
    dailyUsedSec: 0,
    monthlyUsedSec: 0,
    activeSessionId: null,
    reservedSec: 0,
    ...data,
  };
}

beforeEach(() => {
  identityClosure = [STABLE, AUTH];
  mockIdentityClosure.mockClear();
});

it('remerges two v2 accounts plus legacy quota and preserves lifetime-trial provenance', async () => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const trialUsedAtMs = NOW - 10_000;
  const legacyId = legacyVoiceQuotaDocId('auth-old', ALIAS);
  const { db, docs } = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      updatedAtMs: NOW - 100,
      monthlyUsedSec: 100,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      authUid: 'auth-old',
      stableUid: ALIAS,
      updatedAtMs: NOW - 200,
      monthlyUsedSec: 200,
      trialUsedAtMs,
      trialReservationSessionId: 'trial-from-alias',
      trialProviderMintedAtMs: NOW - 9_000,
    }),
    [`${VOICE_QUOTA_COLLECTION}/${legacyId}`]: currentWindow({
      authUid: 'auth-old',
      stableUid: ALIAS,
      updatedAtMs: NOW - 300,
      monthlyUsedSec: 50,
    }),
  });

  const merged = await ensureCanonicalVoiceQuota(db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });

  expect(merged).toMatchObject({
    quotaIdentityVersion: 2,
    stableUid: STABLE,
    monthlyUsedSec: 350,
    trialUsedAtMs,
    trialReservationSessionId: 'trial-from-alias',
    trialProviderMintedAtMs: NOW - 9_000,
  });
  expect(merged.quotaIdentityClosureProof).toMatch(/^v1:3:[a-f0-9]{64}$/);
  expect(docs.get(quotaPath(STABLE))).toMatchObject(merged);

  await expect(reserveVoiceSeconds(db, {
    authUid: AUTH,
    stableUid: STABLE,
    sessionId: 'second-trial',
    formatCapSec: 180,
    graceTailSec: 20,
    dailyVoiceSecMax: 7_200,
    monthlyVoiceSecMax: 7_200,
    consumeLifetimeTrial: true,
    quotaIdentityClosureProof: String(merged.quotaIdentityClosureProof),
    nowMs: NOW,
  })).rejects.toMatchObject({ code: 'permission-denied', message: 'voice_max_required' });
});

it('keeps confirmed trial provenance fail-closed when another merged trial was unminted', async () => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const oldUnconfirmedAtMs = Date.UTC(2026, 10, 20);
  const confirmedAtMs = NOW - 10_000;
  const confirmedMintedAtMs = NOW - 9_000;
  const { db, docs } = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      trialUsedAtMs: oldUnconfirmedAtMs,
      trialReservationSessionId: 'earlier-unminted',
      trialProviderMintedAtMs: 0,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      monthlyUsedSec: 200,
      trialUsedAtMs: confirmedAtMs,
      trialReservationSessionId: 'later-confirmed',
      trialProviderMintedAtMs: confirmedMintedAtMs,
    }),
  });

  const merged = await ensureCanonicalVoiceQuota(db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });

  expect(merged).toMatchObject({
    trialUsedAtMs: confirmedAtMs,
    lifetimeTrialUsedAtMs: oldUnconfirmedAtMs,
    trialReservationSessionId: 'later-confirmed',
    trialProviderMintedAtMs: confirmedMintedAtMs,
  });

  const maxReserve = await reserveVoiceSeconds(db, {
    authUid: AUTH,
    stableUid: STABLE,
    sessionId: 'max-after-confirmed-trial',
    formatCapSec: 7_200,
    graceTailSec: 0,
    dailyVoiceSecMax: 20_000,
    monthlyVoiceSecMax: 7_200,
    maxMonthlyAllowance: true,
    maxInitialTrialOffsetSec: 200,
    quotaIdentityClosureProof: String(merged.quotaIdentityClosureProof),
    nowMs: NOW,
  });

  expect(maxReserve.reservedSec).toBe(7_200);
  expect(docs.get(quotaPath(STABLE))).toMatchObject({
    lifetimeTrialUsedAtMs: oldUnconfirmedAtMs,
    maxAllowanceUsageBaselineSec: 200,
  });
  await expect(reserveVoiceSeconds(db, {
    authUid: AUTH,
    stableUid: STABLE,
    sessionId: 'trial-reuse',
    formatCapSec: 180,
    graceTailSec: 20,
    dailyVoiceSecMax: 20_000,
    monthlyVoiceSecMax: 20_000,
    consumeLifetimeTrial: true,
    quotaIdentityClosureProof: String(merged.quotaIdentityClosureProof),
    nowMs: NOW + 1,
  })).rejects.toMatchObject({ code: 'permission-denied', message: 'voice_max_required' });
});

it('blocks reserve when an identity merge publishes after ensure and validates closure in the reserve transaction', async () => {
  const state = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
    }),
  });
  const ensured = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW,
  });

  identityClosure = [STABLE, AUTH, ALIAS];
  state.docs.set(quotaPath(ALIAS), currentWindow({
    quotaIdentityVersion: 2,
    stableUid: ALIAS,
    trialUsedAtMs: NOW - 1_000,
    trialReservationSessionId: 'published-merge-trial',
    trialProviderMintedAtMs: NOW - 900,
  }));

  await expect(reserveVoiceSeconds(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    sessionId: 'must-not-reserve-with-stale-proof',
    formatCapSec: 180,
    graceTailSec: 20,
    dailyVoiceSecMax: 7_200,
    monthlyVoiceSecMax: 7_200,
    consumeLifetimeTrial: true,
    quotaIdentityClosureProof: String(ensured.quotaIdentityClosureProof),
    nowMs: NOW + 1,
  })).rejects.toMatchObject({
    code: 'failed-precondition',
    message: 'voice_quota_identity_changed',
  });

  expect(mockIdentityClosure.mock.calls.at(-1)?.[3]).toBeTruthy();
  expect(state.docs.get(quotaPath(STABLE))?.activeSessionId).toBeNull();
  expect(state.docs.get(quotaPath(STABLE))?.dailyUsedSec).toBe(0);
});

it('blocks a lifetime trial when a late legacy writer adds trial evidence after the canonical proof', async () => {
  const canonicalPath = quotaPath(STABLE);
  const legacyPath = `${VOICE_QUOTA_COLLECTION}/${legacyVoiceQuotaDocId(AUTH, STABLE)}`;
  const state = makeDb({
    [canonicalPath]: currentWindow({
      quotaIdentityVersion: 2,
      authUid: AUTH,
      stableUid: STABLE,
    }),
    [legacyPath]: currentWindow({
      authUid: AUTH,
      stableUid: STABLE,
    }),
  });
  const ensured = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW,
  });
  expect(state.docs.get(legacyPath)).toMatchObject({
    quotaIdentityMigratedTo: voiceQuotaDocId(STABLE),
  });

  // An old server revision races after migration. Its merge write preserves the
  // tombstone but publishes authoritative evidence that this account used MAX.
  state.docs.set(legacyPath, {
    ...state.docs.get(legacyPath),
    lifetimeTrialUsedAtMs: NOW + 1,
    trialUsedAtMs: NOW + 1,
    trialReservationSessionId: 'late-legacy-trial',
    trialProviderMintedAtMs: NOW + 2,
  });

  await expect(reserveVoiceSeconds(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    sessionId: 'must-not-reserve-after-late-legacy-trial',
    formatCapSec: 180,
    graceTailSec: 20,
    dailyVoiceSecMax: 7_200,
    monthlyVoiceSecMax: 7_200,
    consumeLifetimeTrial: true,
    quotaIdentityClosureProof: String(ensured.quotaIdentityClosureProof),
    nowMs: NOW + 3,
  })).rejects.toMatchObject({
    code: 'permission-denied',
    message: 'voice_max_required',
  });
  expect(state.docs.get(canonicalPath)).toMatchObject({
    activeSessionId: null,
    reservedSec: 0,
    dailyUsedSec: 0,
    monthlyUsedSec: 0,
  });
});

it('sums current-month MAX usage and baselines when two v2 accounts become linked', async () => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const { db } = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      monthlyUsedSec: 1_000,
      maxAllowanceMonthResetAtMs: MONTH_RESET,
      maxAllowanceUsageBaselineSec: 200,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      monthlyUsedSec: 700,
      maxAllowanceMonthResetAtMs: MONTH_RESET,
      maxAllowanceUsageBaselineSec: 100,
    }),
  });

  const merged = await ensureCanonicalVoiceQuota(db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });

  expect(merged).toMatchObject({
    monthlyUsedSec: 1_700,
    maxAllowanceMonthResetAtMs: MONTH_RESET,
    maxAllowanceUsageBaselineSec: 300,
  });
  expect(Number(merged.monthlyUsedSec) - Number(merged.maxAllowanceUsageBaselineSec)).toBe(1_400);
});

it('preserves an initialized zero MAX baseline while folding current-month consumption', async () => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const { db } = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      monthlyUsedSec: 500,
      maxAllowanceMonthResetAtMs: MONTH_RESET,
      maxAllowanceUsageBaselineSec: 0,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      monthlyUsedSec: 600,
      maxAllowanceMonthResetAtMs: MONTH_RESET,
      maxAllowanceUsageBaselineSec: 0,
    }),
  });

  const merged = await ensureCanonicalVoiceQuota(db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });

  expect(merged).toMatchObject({
    monthlyUsedSec: 1_100,
    maxAllowanceMonthResetAtMs: MONTH_RESET,
    maxAllowanceUsageBaselineSec: 0,
  });
});

it.each([
  ['initialized MAX canonical + confirmed trial alias', false],
  ['confirmed trial canonical + initialized MAX alias', true],
])('preserves the full MAX allowance after merging %s', async (_label, trialIsCanonical) => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const initializedMax = currentWindow({
    quotaIdentityVersion: 2,
    stableUid: trialIsCanonical ? ALIAS : STABLE,
    monthlyUsedSec: 0,
    maxAllowanceMonthResetAtMs: MONTH_RESET,
    maxAllowanceUsageBaselineSec: 0,
  });
  const confirmedTrial = currentWindow({
    quotaIdentityVersion: 2,
    stableUid: trialIsCanonical ? STABLE : ALIAS,
    monthlyUsedSec: 200,
    trialUsedAtMs: NOW - 1_000,
    trialReservationSessionId: 'confirmed-trial-alias',
    trialProviderMintedAtMs: NOW - 900,
  });
  const { db } = makeDb({
    [quotaPath(STABLE)]: trialIsCanonical ? confirmedTrial : initializedMax,
    [quotaPath(ALIAS)]: trialIsCanonical ? initializedMax : confirmedTrial,
  });

  const merged = await ensureCanonicalVoiceQuota(db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });
  expect(merged).toMatchObject({
    monthlyUsedSec: 200,
    maxAllowanceMonthResetAtMs: MONTH_RESET,
    maxAllowanceUsageBaselineSec: 200,
  });

  const maxReserve = await reserveVoiceSeconds(db, {
    authUid: AUTH,
    stableUid: STABLE,
    sessionId: 'max-after-mixed-merge',
    formatCapSec: 7_200,
    graceTailSec: 0,
    dailyVoiceSecMax: 20_000,
    monthlyVoiceSecMax: 7_200,
    maxMonthlyAllowance: true,
    maxInitialTrialOffsetSec: 200,
    quotaIdentityClosureProof: String(merged.quotaIdentityClosureProof),
    nowMs: NOW + 1,
  });
  expect(maxReserve.reservedSec).toBe(7_200);
});

it('does not count a confirmed trial twice when the canonical quota is merged again', async () => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const state = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      maxAllowanceMonthResetAtMs: MONTH_RESET,
      maxAllowanceUsageBaselineSec: 0,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      monthlyUsedSec: 200,
      trialUsedAtMs: NOW - 1_000,
      trialReservationSessionId: 'confirmed-trial-before-remerge',
      trialProviderMintedAtMs: NOW - 900,
    }),
  });

  const first = await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });
  state.docs.set(quotaPath(SECOND_ALIAS), currentWindow({
    quotaIdentityVersion: 2,
    stableUid: SECOND_ALIAS,
  }));
  identityClosure = [STABLE, AUTH, ALIAS, SECOND_ALIAS];
  const repeated = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW + 1,
  });

  expect(first.maxAllowanceUsageBaselineSec).toBe(200);
  expect(repeated).toMatchObject({
    monthlyUsedSec: 200,
    maxAllowanceUsageBaselineSec: 200,
  });
});

it.each([
  ['a prior-month confirmed trial', {
    trialUsedAtMs: Date.UTC(
      new Date(NOW).getUTCFullYear(),
      new Date(NOW).getUTCMonth(),
      1,
    ) - 1,
    trialReservationSessionId: 'prior-month-trial',
    trialProviderMintedAtMs: NOW - 900,
  }],
  ['current-month usage without confirmed trial provenance', {}],
])('does not forgive %s while merging into an initialized MAX quota', async (_label, trialFields) => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const { db } = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      maxAllowanceMonthResetAtMs: MONTH_RESET,
      maxAllowanceUsageBaselineSec: 0,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      monthlyUsedSec: 200,
      ...trialFields,
    }),
  });

  const merged = await ensureCanonicalVoiceQuota(db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });

  expect(merged).toMatchObject({
    monthlyUsedSec: 200,
    maxAllowanceMonthResetAtMs: MONTH_RESET,
    maxAllowanceUsageBaselineSec: 0,
  });
});

it('bounds a verified trial offset at the hard trial plus technical-grace reserve', async () => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const { db } = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      maxAllowanceMonthResetAtMs: MONTH_RESET,
      maxAllowanceUsageBaselineSec: 0,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      monthlyUsedSec: 2_000,
      trialUsedAtMs: NOW - 1_000,
      trialReservationSessionId: 'hostile-confirmed-trial-row',
      trialProviderMintedAtMs: NOW - 900,
    }),
  });

  const merged = await ensureCanonicalVoiceQuota(db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });

  expect(merged.maxAllowanceUsageBaselineSec).toBe(300);
  expect(Number(merged.monthlyUsedSec) - Number(merged.maxAllowanceUsageBaselineSec)).toBe(1_700);
});

it('uses the fast path only when the stored v2 proof matches the current closure', async () => {
  const seeded = makeDb({
    [quotaPath(STABLE)]: currentWindow({ quotaIdentityVersion: 2, stableUid: STABLE, monthlyUsedSec: 321 }),
  });
  const first = await ensureCanonicalVoiceQuota(seeded.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });
  expect(first.quotaIdentityClosureProof).toMatch(/^v1:2:[a-f0-9]{64}$/);
  const queryReadsAfterMigration = seeded.stats.queryReads;
  const transactionsAfterMigration = seeded.stats.transactionRuns;

  const second = await ensureCanonicalVoiceQuota(seeded.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW + 1 });

  expect(second).toEqual(first);
  expect(mockIdentityClosure).toHaveBeenCalledTimes(2);
  expect(seeded.stats.queryReads).toBe(queryReadsAfterMigration);
  expect(seeded.stats.transactionRuns).toBe(transactionsAfterMigration);
});

it('remerges when the resolved closure changes after the original v2 proof', async () => {
  const state = makeDb({
    [quotaPath(STABLE)]: currentWindow({ quotaIdentityVersion: 2, stableUid: STABLE, monthlyUsedSec: 300 }),
  });
  const beforeLink = await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });
  state.docs.set(quotaPath(ALIAS), currentWindow({
    quotaIdentityVersion: 2,
    stableUid: ALIAS,
    monthlyUsedSec: 400,
  }));
  identityClosure = [ALIAS, AUTH, STABLE];

  const afterLink = await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW + 1 });

  expect(afterLink.monthlyUsedSec).toBe(700);
  expect(afterLink.quotaIdentityClosureProof).not.toBe(beforeLink.quotaIdentityClosureProof);
  expect(state.stats.transactionRuns).toBe(2);
});

it('does not accept a delimiter-colliding closure as the same proof', async () => {
  identityClosure = ['a', 'b|c', STABLE];
  const state = makeDb({
    [quotaPath(STABLE)]: currentWindow({ quotaIdentityVersion: 2, stableUid: STABLE, monthlyUsedSec: 300 }),
  });
  const beforeLink = await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });
  state.docs.set(quotaPath('c'), currentWindow({
    quotaIdentityVersion: 2,
    stableUid: 'c',
    monthlyUsedSec: 400,
  }));
  identityClosure = ['a|b', 'c', STABLE];

  const afterLink = await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW + 1 });

  expect(afterLink.monthlyUsedSec).toBe(700);
  expect(afterLink.quotaIdentityClosureProof).not.toBe(beforeLink.quotaIdentityClosureProof);
});

it('rechecks migrated tombstones inside the transaction before summing them', async () => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const canonicalPath = quotaPath(STABLE);
  const aliasPath = quotaPath(ALIAS);
  const state = makeDb({
    [canonicalPath]: currentWindow({ quotaIdentityVersion: 2, stableUid: STABLE, monthlyUsedSec: 300 }),
    [aliasPath]: currentWindow({ quotaIdentityVersion: 2, stableUid: ALIAS, monthlyUsedSec: 400 }),
  }, (docs) => {
    docs.set(canonicalPath, currentWindow({ quotaIdentityVersion: 2, stableUid: STABLE, monthlyUsedSec: 700 }));
    docs.set(aliasPath, currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      monthlyUsedSec: 400,
      quotaIdentityMigratedTo: voiceQuotaDocId(STABLE),
    }));
  });

  const merged = await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });

  expect(merged.monthlyUsedSec).toBe(700);
});

it('does not recount old aliases when a later closure change is merged and repeated', async () => {
  identityClosure = [STABLE, AUTH, ALIAS];
  const state = makeDb({
    [quotaPath(STABLE)]: currentWindow({ quotaIdentityVersion: 2, stableUid: STABLE, monthlyUsedSec: 300 }),
    [quotaPath(ALIAS)]: currentWindow({ quotaIdentityVersion: 2, stableUid: ALIAS, monthlyUsedSec: 400 }),
  });

  const first = await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW });
  state.docs.set(quotaPath(SECOND_ALIAS), currentWindow({
    quotaIdentityVersion: 2,
    stableUid: SECOND_ALIAS,
    monthlyUsedSec: 500,
  }));
  identityClosure = [SECOND_ALIAS, ALIAS, AUTH, STABLE];
  const second = await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW + 1 });
  const repeated = await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW + 2 });

  expect(first.monthlyUsedSec).toBe(700);
  expect(second.monthlyUsedSec).toBe(1_200);
  expect(repeated).toEqual(second);
  expect(state.docs.get(quotaPath(STABLE))?.monthlyUsedSec).toBe(1_200);
  expect(state.stats.transactionRuns).toBe(2);
});

it('atomically rejects distinct live MAX and trial reservations without tombstoning either owner', async () => {
  const maxSessionId = 'max-live-before-link';
  const trialSessionId = 'trial-live-before-link';
  identityClosure = [STABLE, ALIAS, AUTH];
  const state = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      updatedAtMs: NOW - 10,
      dailyUsedSec: 7_200,
      monthlyUsedSec: 7_200,
      activeSessionId: maxSessionId,
      reservedSec: 7_200,
      maxAllowanceMonthResetAtMs: MONTH_RESET,
      maxAllowanceUsageBaselineSec: 0,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      updatedAtMs: NOW - 20,
      dailyUsedSec: 320,
      monthlyUsedSec: 320,
      activeSessionId: trialSessionId,
      reservedSec: 320,
      lifetimeTrialUsedAtMs: NOW - 20,
      trialUsedAtMs: NOW - 20,
      trialReservationSessionId: trialSessionId,
      trialProviderMintedAtMs: 0,
    }),
  });
  const before = new Map([...state.docs].map(([path, data]) => [path, structuredClone(data)]));

  await expect(ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW,
  })).rejects.toMatchObject({
    code: 'failed-precondition',
    message: 'voice_quota_identity_sessions_conflict',
  });

  expect(state.docs).toEqual(before);
  expect(state.docs.get(quotaPath(STABLE))).toMatchObject({
    activeSessionId: maxSessionId,
    reservedSec: 7_200,
  });
  expect(state.docs.get(quotaPath(ALIAS))).toMatchObject({
    activeSessionId: trialSessionId,
    reservedSec: 320,
  });
  expect(state.docs.get(quotaPath(ALIAS))).not.toHaveProperty('quotaIdentityMigratedTo');
});

it('allows exact trial confirmation after conflict, then merges once that reservation settles', async () => {
  const maxSessionId = 'max-live-while-trial-confirms';
  const trialSessionId = 'trial-confirms-before-merge';
  identityClosure = [STABLE, ALIAS, AUTH];
  const state = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      updatedAtMs: NOW - 10,
      dailyUsedSec: 7_200,
      monthlyUsedSec: 7_200,
      activeSessionId: maxSessionId,
      reservedSec: 7_200,
      maxAllowanceMonthResetAtMs: MONTH_RESET,
      maxAllowanceUsageBaselineSec: 0,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      updatedAtMs: NOW - 20,
      dailyUsedSec: 320,
      monthlyUsedSec: 320,
      activeSessionId: trialSessionId,
      reservedSec: 320,
      lifetimeTrialUsedAtMs: NOW - 20,
      trialUsedAtMs: NOW - 20,
      trialReservationSessionId: trialSessionId,
      trialProviderMintedAtMs: 0,
    }),
  });

  await expect(ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW,
  })).rejects.toMatchObject({ message: 'voice_quota_identity_sessions_conflict' });
  await confirmVoiceTrialMinted(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    nowMs: NOW + 1,
  });
  await settleVoiceSession(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    actualSec: 200,
    nowMs: NOW + 2,
  });

  const merged = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW + 3,
  });
  expect(merged).toMatchObject({
    activeSessionId: maxSessionId,
    reservedSec: 7_200,
    dailyUsedSec: 7_400,
    monthlyUsedSec: 7_400,
    lifetimeTrialUsedAtMs: NOW - 20,
    trialUsedAtMs: NOW - 20,
    trialReservationSessionId: trialSessionId,
    trialProviderMintedAtMs: NOW + 1,
  });
  expect(state.docs.get(quotaPath(ALIAS))).toMatchObject({
    quotaIdentityMigratedTo: voiceQuotaDocId(STABLE),
    activeSessionId: null,
    reservedSec: 0,
  });
});

it('allows exact provider-failure release after conflict, then merges the remaining live reservation', async () => {
  const maxSessionId = 'max-live-while-trial-releases';
  const trialSessionId = 'trial-release-before-merge';
  identityClosure = [STABLE, ALIAS, AUTH];
  const state = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      dailyUsedSec: 7_200,
      monthlyUsedSec: 7_200,
      activeSessionId: maxSessionId,
      reservedSec: 7_200,
      lifetimeTrialUsedAtMs: NOW - 1_000,
      trialUsedAtMs: NOW - 1_000,
      trialReservationSessionId: 'max-owner-prior-confirmed-trial',
      trialProviderMintedAtMs: NOW - 900,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      dailyUsedSec: 320,
      monthlyUsedSec: 320,
      activeSessionId: trialSessionId,
      reservedSec: 320,
      lifetimeTrialUsedAtMs: NOW - 20,
      trialUsedAtMs: NOW - 20,
      trialReservationSessionId: trialSessionId,
      trialProviderMintedAtMs: 0,
    }),
  });

  await expect(ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW,
  })).rejects.toMatchObject({ message: 'voice_quota_identity_sessions_conflict' });
  await expect(releaseVoiceReservation(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    restoreLifetimeTrial: true,
    reason: 'provider_failed',
    nowMs: NOW + 1,
  })).resolves.toEqual({ chargedSec: 0, refundedSec: 320, alreadySettled: false });
  expect(state.docs.get(quotaPath(ALIAS))).toMatchObject({
    activeSessionId: null,
    reservedSec: 0,
    dailyUsedSec: 0,
    monthlyUsedSec: 0,
    lifetimeTrialUsedAtMs: null,
    trialUsedAtMs: null,
    trialReservationSessionId: null,
    trialProviderMintedAtMs: 0,
  });

  const merged = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW + 2,
  });
  expect(merged).toMatchObject({
    activeSessionId: maxSessionId,
    reservedSec: 7_200,
    dailyUsedSec: 7_200,
    monthlyUsedSec: 7_200,
    lifetimeTrialUsedAtMs: NOW - 1_000,
    trialUsedAtMs: NOW - 1_000,
    trialReservationSessionId: 'max-owner-prior-confirmed-trial',
    trialProviderMintedAtMs: NOW - 900,
  });
});

it('merges duplicate copies of the same live reservation without a false conflict', async () => {
  const sessionId = 'same-reservation-copied-during-link';
  identityClosure = [STABLE, ALIAS, AUTH];
  const state = makeDb({
    [quotaPath(STABLE)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: STABLE,
      updatedAtMs: NOW - 10,
      dailyUsedSec: 320,
      monthlyUsedSec: 320,
      activeSessionId: sessionId,
      reservedSec: 320,
    }),
    [quotaPath(ALIAS)]: currentWindow({
      quotaIdentityVersion: 2,
      stableUid: ALIAS,
      updatedAtMs: NOW - 20,
      activeSessionId: sessionId,
      reservedSec: 320,
    }),
  });

  await expect(ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW,
  })).resolves.toMatchObject({
    activeSessionId: sessionId,
    reservedSec: 320,
  });
  expect(state.docs.get(quotaPath(ALIAS))).toMatchObject({
    quotaIdentityMigratedTo: voiceQuotaDocId(STABLE),
    activeSessionId: null,
    reservedSec: 0,
  });
});

it('confirms a provider-minted trial on the canonical quota after its reserved identity is merged', async () => {
  const trialSessionId = 'trial-merged-after-provider-success';
  identityClosure = [ALIAS, AUTH];
  const state = makeDb({});
  const loserIdentity = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    nowMs: NOW,
  });
  await reserveVoiceSeconds(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    formatCapSec: 320,
    graceTailSec: 0,
    dailyVoiceSecMax: 20_000,
    monthlyVoiceSecMax: 20_000,
    consumeLifetimeTrial: true,
    quotaIdentityClosureProof: String(loserIdentity.quotaIdentityClosureProof),
    nowMs: NOW,
  });

  // Provider returned a secret. Before its confirmation write, account linking
  // moves the live reservation to the winner and tombstones the original doc.
  identityClosure = [STABLE, ALIAS, AUTH];
  const merged = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW + 1,
  });
  expect(state.docs.get(quotaPath(ALIAS))).toMatchObject({
    quotaIdentityMigratedTo: voiceQuotaDocId(STABLE),
    activeSessionId: null,
    reservedSec: 0,
  });
  expect(state.docs.get(quotaPath(STABLE))).toMatchObject({
    activeSessionId: trialSessionId,
    trialReservationSessionId: trialSessionId,
    trialProviderMintedAtMs: 0,
  });

  await confirmVoiceTrialMinted(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    nowMs: NOW + 2,
  });
  expect(state.docs.get(quotaPath(STABLE))?.trialProviderMintedAtMs).toBe(NOW + 2);

  await settleVoiceSession(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    sessionId: trialSessionId,
    actualSec: 320,
    nowMs: NOW + 3,
  });
  await expect(reserveVoiceSeconds(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    sessionId: 'second-lifetime-trial',
    formatCapSec: 320,
    graceTailSec: 0,
    dailyVoiceSecMax: 20_000,
    monthlyVoiceSecMax: 20_000,
    consumeLifetimeTrial: true,
    quotaIdentityClosureProof: String(merged.quotaIdentityClosureProof),
    nowMs: NOW + 4,
  })).rejects.toMatchObject({ code: 'permission-denied', message: 'voice_max_required' });

  const maxReserve = await reserveVoiceSeconds(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    sessionId: 'max-after-merged-trial',
    formatCapSec: 7_200,
    graceTailSec: 0,
    dailyVoiceSecMax: 20_000,
    monthlyVoiceSecMax: 7_200,
    maxMonthlyAllowance: true,
    maxInitialTrialOffsetSec: 320,
    quotaIdentityClosureProof: String(merged.quotaIdentityClosureProof),
    nowMs: NOW + 5,
  });
  expect(maxReserve.reservedSec).toBe(7_200);
  expect(state.docs.get(quotaPath(STABLE))?.maxAllowanceUsageBaselineSec).toBe(320);
});

it('revalidates the published identity closure transactionally before the tombstone is written', async () => {
  const trialSessionId = 'trial-confirmed-during-merge-publication';
  identityClosure = [ALIAS, AUTH];
  const state = makeDb({});
  const loserIdentity = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    nowMs: NOW,
  });
  await reserveVoiceSeconds(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    formatCapSec: 320,
    graceTailSec: 0,
    dailyVoiceSecMax: 20_000,
    monthlyVoiceSecMax: 20_000,
    consumeLifetimeTrial: true,
    quotaIdentityClosureProof: String(loserIdentity.quotaIdentityClosureProof),
    nowMs: NOW,
  });

  // The merge link is visible, but quota migration has not committed yet.
  identityClosure = [STABLE, ALIAS, AUTH];
  mockIdentityClosure.mockClear();
  await confirmVoiceTrialMinted(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    nowMs: NOW + 1,
  });
  expect(mockIdentityClosure.mock.calls.at(-1)?.[3]).toBeTruthy();

  await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: STABLE,
    nowMs: NOW + 2,
  });
  expect(state.docs.get(quotaPath(STABLE))).toMatchObject({
    activeSessionId: trialSessionId,
    trialReservationSessionId: trialSessionId,
    trialProviderMintedAtMs: NOW + 1,
  });
  expect(state.docs.get(quotaPath(ALIAS))).toMatchObject({
    quotaIdentityMigratedTo: voiceQuotaDocId(STABLE),
    activeSessionId: null,
    reservedSec: 0,
  });
});

it('keeps a merged reservation intact for an unrelated session and releases the exact unminted trial', async () => {
  const trialSessionId = 'trial-provider-failed-after-merge';
  identityClosure = [ALIAS, AUTH];
  const state = makeDb({});
  const loserIdentity = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    nowMs: NOW,
  });
  await reserveVoiceSeconds(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    formatCapSec: 320,
    graceTailSec: 0,
    dailyVoiceSecMax: 20_000,
    monthlyVoiceSecMax: 20_000,
    consumeLifetimeTrial: true,
    quotaIdentityClosureProof: String(loserIdentity.quotaIdentityClosureProof),
    nowMs: NOW,
  });
  identityClosure = [STABLE, ALIAS, AUTH];
  await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW + 1 });

  await expect(confirmVoiceTrialMinted(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: 'unrelated-session',
    nowMs: NOW + 2,
  })).rejects.toMatchObject({
    code: 'failed-precondition',
    message: 'voice_trial_reservation_missing',
  });
  const wrongRelease = await releaseVoiceReservation(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: 'unrelated-session',
    restoreLifetimeTrial: true,
    nowMs: NOW + 3,
  });
  expect(wrongRelease).toEqual({ chargedSec: 0, refundedSec: 0, alreadySettled: true });
  expect(state.docs.get(quotaPath(STABLE))).toMatchObject({
    activeSessionId: trialSessionId,
    lifetimeTrialUsedAtMs: NOW,
    trialReservationSessionId: trialSessionId,
  });

  const exactRelease = await releaseVoiceReservation(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    restoreLifetimeTrial: true,
    reason: 'provider_failed',
    nowMs: NOW + 4,
  });
  expect(exactRelease).toEqual({ chargedSec: 0, refundedSec: 320, alreadySettled: false });
  expect(state.docs.get(quotaPath(STABLE))).toMatchObject({
    activeSessionId: null,
    reservedSec: 0,
    dailyUsedSec: 0,
    monthlyUsedSec: 0,
    lifetimeTrialUsedAtMs: null,
    trialUsedAtMs: null,
    trialReservationSessionId: null,
    trialProviderMintedAtMs: 0,
  });
});

it('never restores a provider-confirmed trial when releasing it through the pre-merge identity', async () => {
  const trialSessionId = 'trial-confirmed-before-release';
  identityClosure = [ALIAS, AUTH];
  const state = makeDb({});
  const loserIdentity = await ensureCanonicalVoiceQuota(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    nowMs: NOW,
  });
  await reserveVoiceSeconds(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    formatCapSec: 320,
    graceTailSec: 0,
    dailyVoiceSecMax: 20_000,
    monthlyVoiceSecMax: 20_000,
    consumeLifetimeTrial: true,
    quotaIdentityClosureProof: String(loserIdentity.quotaIdentityClosureProof),
    nowMs: NOW,
  });
  identityClosure = [STABLE, ALIAS, AUTH];
  await ensureCanonicalVoiceQuota(state.db, { authUid: AUTH, stableUid: STABLE, nowMs: NOW + 1 });
  await confirmVoiceTrialMinted(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    nowMs: NOW + 2,
  });

  const released = await releaseVoiceReservation(state.db, {
    authUid: AUTH,
    stableUid: ALIAS,
    sessionId: trialSessionId,
    restoreLifetimeTrial: true,
    reason: 'late_provider_failure_signal',
    nowMs: NOW + 3,
  });

  expect(released).toEqual({ chargedSec: 0, refundedSec: 320, alreadySettled: false });
  expect(state.docs.get(quotaPath(STABLE))).toMatchObject({
    lifetimeTrialUsedAtMs: NOW,
    trialUsedAtMs: NOW,
    trialReservationSessionId: trialSessionId,
    trialProviderMintedAtMs: NOW + 2,
  });
});

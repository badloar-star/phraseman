import {
  MIN_VOICE_RESERVE_SEC,
  VOICE_CONFIRMED_GAP_WINDOW_SEC,
  VOICE_RESERVE_EXPIRY_GRACE_SEC,
  VOICE_DEAD_SESSION_SILENCE_MS,
  VOICE_UNACTIVATED_RESERVE_GRACE_MS,
  confirmVoiceTrialMinted,
  legacyVoiceQuotaDocId,
  releaseVoiceReservation,
  reserveVoiceSeconds,
  settleVoiceSession,
  settleVoiceSessionWithXp,
  transferReserve,
  voiceQuotaIdentityClosureProof,
  voiceQuotaDocId,
} from './max_voice_quota';

jest.mock('./account_delete', () => ({
  resolveAccountDeleteIdentityClosure: async (
    _db: unknown,
    _stableUid: string,
    _authUid: string,
    _transaction?: unknown,
  ) => ['stable-1', 'auth-1'],
}));

type DocData = Record<string, any>;

const NOW = 1_800_000_000_000; // 2027-01-15T08:53:20Z
const AUTH = 'auth-1';
const STABLE = 'stable-1';

const LIMITS = {
  authUid: AUTH,
  stableUid: STABLE,
  formatCapSec: 300,
  graceTailSec: 20,
  dailyVoiceSecMax: 900,
  monthlyVoiceSecMax: 14_400,
  quotaIdentityClosureProof: voiceQuotaIdentityClosureProof([STABLE, AUTH]),
};

// Мини-стаб Firestore: один док, транзакция коммитит записи только при успехе
// коллбэка — брошенный HttpsError не должен оставлять частичных записей.
function makeDb(initial?: DocData) {
  const state: { data?: DocData; id?: string; collection?: string } = { data: initial };
  let transactionTail = Promise.resolve();
  const docs = new Map<string, DocData>();
  const initialPath = `voice_call_quotas/${voiceQuotaDocId(STABLE)}`;
  if (initial) docs.set(initialPath, initial);

  const makeRef = (collectionName: string, id: string) => {
    const path = `${collectionName}/${id}`;
    const ref = {
      id,
      path,
      get: async () => ({
        exists: docs.has(path),
        ref,
        data: () => docs.get(path),
      }),
      set: async (d: DocData, o?: { merge?: boolean }) => {
        const next = o?.merge ? { ...(docs.get(path) ?? {}), ...d } : { ...d };
        docs.set(path, next);
        state.collection = collectionName;
        state.id = id;
        state.data = next;
      },
    };
    return ref;
  };
  const db = {
    collection: (name: string) => {
      state.collection = name;
      return {
        doc: (id: string) => makeRef(name, id),
        where: (field: string, operator: string, value: unknown) => {
          if (operator !== '==') throw new Error(`Unsupported test query operator: ${operator}`);
          const query = (maxDocs = Number.POSITIVE_INFINITY) => ({
            limit: (limit: number) => query(limit),
            get: async () => ({
              docs: [...docs.entries()]
                .filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
                .slice(0, maxDocs)
                .map(([path, data]) => {
                  const ref = makeRef(name, path.slice(name.length + 1));
                  return { exists: true, ref, data: () => data };
                }),
            }),
          });
          return query();
        },
      };
    },
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      const previous = transactionTail;
      let unlock = () => {};
      transactionTail = new Promise<void>((resolve) => { unlock = resolve; });
      await previous;
      const writes: Array<[any, DocData, any]> = [];
      const tx = {
        get: async (r: any) => r.get(),
        set: (r: any, d: DocData, o?: any) => { writes.push([r, d, o]); },
      };
      try {
        const result = await fn(tx);
        for (const [r, d, o] of writes) await r.set(d, o);
        return result;
      } finally {
        unlock();
      }
    },
  };
  return { db: db as any, state, docs };
}

function liveDoc(overrides: DocData = {}): DocData {
  return {
    authUid: AUTH,
    stableUid: STABLE,
    resetAtMs: NOW + 3_600_000,
    monthResetAtMs: NOW + 86_400_000,
    dailyUsedSec: 320,
    monthlyUsedSec: 320,
    activeSessionId: 's1',
    sessionStartedAtMs: NOW - 100_000,
    reservedSec: 320,
    expiresAtMs: NOW + 300_000,
    lastHeartbeatMs: NOW - 10_000,
    reconnectChain: { rootId: 's1', count: 0, gapSecTotal: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('doc id', () => {
  it('uses one canonical quota document per stable account across auth aliases', () => {
    const id = voiceQuotaDocId(STABLE);
    expect(id).toMatch(/^vq_[0-9a-f]{48}$/);
    expect(voiceQuotaDocId(STABLE)).toBe(id);
    expect(legacyVoiceQuotaDocId(AUTH, STABLE)).not.toBe(legacyVoiceQuotaDocId('other', STABLE));
  });
});

describe('reserveVoiceSeconds', () => {
  it('reserves paid wallet seconds atomically without the legacy daily or monthly commercial cap', async () => {
    const { db, state, docs } = makeDb({
      resetAtMs: NOW + 3_600_000,
      monthResetAtMs: NOW + 86_400_000,
      dailyUsedSec: 900,
      monthlyUsedSec: 14_400,
    });
    docs.set(`voice_minute_wallets/${STABLE}`, {
      schemaVersion: 1,
      ownerStableId: STABLE,
      grantedSeconds: 7_200,
      refundedSeconds: 0,
      chargedSeconds: 0,
      reservedSeconds: 0,
      availableSeconds: 7_200,
      eventCount: 1,
    });

    const result = await reserveVoiceSeconds(db, {
      ...LIMITS,
      sessionId: 'paid-1',
      accessType: 'paid_minutes',
      nowMs: NOW,
    });

    expect(result).toEqual({
      reservedSec: 320,
      dayRemainingSec: 6_880,
      monthRemainingSec: 6_880,
      staleRefundedSec: 0,
    });
    expect(state.data).toMatchObject({
      activeSessionId: 'paid-1',
      accessType: 'paid_minutes',
      paidReservationRootSessionId: 'paid-1',
      paidReservationTotalSec: 320,
      paidConsumedSec: 0,
      dailyUsedSec: 900,
      monthlyUsedSec: 14_400,
    });
    expect(docs.get(`voice_minute_wallets/${STABLE}`)).toMatchObject({
      reservedSeconds: 320,
      activeReservationSessionId: 'paid-1',
      availableSeconds: 6_880,
    });
  });

  it('allows only one concurrent paid reserve to spend a wallet balance', async () => {
    const { db, docs } = makeDb();
    docs.set(`voice_minute_wallets/${STABLE}`, {
      schemaVersion: 1, ownerStableId: STABLE,
      grantedSeconds: 320, refundedSeconds: 0, chargedSeconds: 0,
      reservedSeconds: 0, availableSeconds: 320, eventCount: 1,
    });

    const results = await Promise.allSettled([
      reserveVoiceSeconds(db, { ...LIMITS, sessionId: 'paid-a', accessType: 'paid_minutes', nowMs: NOW }),
      reserveVoiceSeconds(db, { ...LIMITS, sessionId: 'paid-b', accessType: 'paid_minutes', nowMs: NOW }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(docs.get(`voice_minute_wallets/${STABLE}`)).toMatchObject({
      reservedSeconds: 320,
      availableSeconds: 0,
    });
  });

  // зачем (аудит 2026-08-30, «платящий заперт до ~20 минут»): kill app на
  // пре-экране оставлял платную резервацию, и до этого фикса ЛЮБАЯ живая
  // платная запись отбивала новый минт безусловно — до прохода watchdog-крона.
  // Мёртвая платная сессия обязана вытесняться теми же окнами, что и
  // календарная (45с без активации / 75с тишины), с атомарным закрытием
  // кошелька в той же транзакции.
  it('supersedes a dead never-activated PAID premint and frees its wallet reservation atomically', async () => {
    const { db, state, docs } = makeDb(liveDoc({
      activeSessionId: 'paid-dead',
      accessType: 'paid_minutes',
      sessionStartedAtMs: NOW - 50_000,
      activatedAtMs: 0,
      lastHeartbeatMs: NOW - 50_000, // «свежий» штамп создания, но алло не было
      expiresAtMs: NOW + 300_000,
      reservedSec: 320,
      paidReservationRootSessionId: 'paid-dead',
      paidReservationTotalSec: 320,
      paidConsumedSec: 0,
      dailyUsedSec: 0,
      monthlyUsedSec: 0,
    }));
    docs.set(`voice_minute_wallets/${STABLE}`, {
      schemaVersion: 1, ownerStableId: STABLE,
      grantedSeconds: 7_200, refundedSeconds: 0, chargedSeconds: 0,
      reservedSeconds: 320, availableSeconds: 6_880,
      activeReservationSessionId: 'paid-dead', reservationRootSessionId: 'paid-dead',
      eventCount: 1,
    });

    const result = await reserveVoiceSeconds(db, {
      ...LIMITS, sessionId: 'paid-2', accessType: 'paid_minutes', nowMs: NOW,
    });

    expect(result.reservedSec).toBe(320);
    expect(result.staleRefundedSec).toBe(320); // «алло» не было — весь резерв назад
    expect(state.data).toMatchObject({
      activeSessionId: 'paid-2',
      accessType: 'paid_minutes',
      paidReservationRootSessionId: 'paid-2',
      paidConsumedSec: 0,
    });
    expect(docs.get(`voice_minute_wallets/${STABLE}`)).toMatchObject({
      chargedSeconds: 0, // прожито 0с — деньги не тронуты
      reservedSeconds: 320,
      activeReservationSessionId: 'paid-2',
      availableSeconds: 6_880,
    });
    // Звонка не было — charge-событие не пишется.
    expect([...docs.keys()].filter((path) => path.startsWith('voice_minute_events/'))).toHaveLength(0);
  });

  it('supersedes a silently-dead PAID call charging only its heartbeat seconds (event written)', async () => {
    const { db, state, docs } = makeDb(liveDoc({
      activeSessionId: 'paid-dead',
      accessType: 'paid_minutes',
      sessionStartedAtMs: NOW - 300_000,
      activatedAtMs: NOW - 200_000,
      lastHeartbeatMs: NOW - 100_000, // прожито 100с от активации, тишина 100с > 75с
      expiresAtMs: NOW - 1_000,
      reservedSec: 320,
      paidReservationRootSessionId: 'paid-dead',
      paidReservationTotalSec: 320,
      paidConsumedSec: 0,
      dailyUsedSec: 0,
      monthlyUsedSec: 0,
    }));
    docs.set(`voice_minute_wallets/${STABLE}`, {
      schemaVersion: 1, ownerStableId: STABLE,
      grantedSeconds: 7_200, refundedSeconds: 0, chargedSeconds: 0,
      reservedSeconds: 320, availableSeconds: 6_880,
      activeReservationSessionId: 'paid-dead', reservationRootSessionId: 'paid-dead',
      eventCount: 1,
    });

    const result = await reserveVoiceSeconds(db, {
      ...LIMITS, sessionId: 'paid-2', accessType: 'paid_minutes', nowMs: NOW,
    });

    expect(result.reservedSec).toBe(320);
    expect(result.staleRefundedSec).toBe(220); // 320 − 100 прожитых
    expect(docs.get(`voice_minute_wallets/${STABLE}`)).toMatchObject({
      chargedSeconds: 100,
      reservedSeconds: 320,
      activeReservationSessionId: 'paid-2',
      availableSeconds: 7_200 - 100 - 320,
    });
    const chargeEvents = [...docs.entries()]
      .filter(([path]) => path.startsWith('voice_minute_events/'))
      .map(([, data]) => data);
    expect(chargeEvents).toHaveLength(1);
    expect(chargeEvents[0]).toMatchObject({ kind: 'call_charge', seconds: 100, sessionId: 'paid-dead' });
    expect(state.data).toMatchObject({ activeSessionId: 'paid-2' });
  });

  it('still rejects while a PAID call heartbeats within the live window (no parallel paid calls)', async () => {
    const { db, docs } = makeDb(liveDoc({
      activeSessionId: 'paid-live',
      accessType: 'paid_minutes',
      activatedAtMs: NOW - 100_000,
      lastHeartbeatMs: NOW - 10_000,
      expiresAtMs: NOW + 300_000,
      reservedSec: 320,
      paidReservationTotalSec: 320,
    }));
    docs.set(`voice_minute_wallets/${STABLE}`, {
      schemaVersion: 1, ownerStableId: STABLE,
      grantedSeconds: 7_200, refundedSeconds: 0, chargedSeconds: 0,
      reservedSeconds: 320, availableSeconds: 6_880,
      activeReservationSessionId: 'paid-live', reservationRootSessionId: 'paid-live',
      eventCount: 1,
    });

    await expect(reserveVoiceSeconds(db, {
      ...LIMITS, sessionId: 'paid-2', accessType: 'paid_minutes', nowMs: NOW,
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'voice_session_active' });
    expect(docs.get(`voice_minute_wallets/${STABLE}`)).toMatchObject({
      activeReservationSessionId: 'paid-live',
      reservedSeconds: 320,
    });
  });

  it('reserves min(cap+tail, day, month) and charges it to both windows', async () => {
    const { db, state } = makeDb();

    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's1', nowMs: NOW });

    expect(result).toEqual({ reservedSec: 320, dayRemainingSec: 580, monthRemainingSec: 14_080, staleRefundedSec: 0 });
    expect(state.collection).toBe('voice_call_quotas');
    expect(state.id).toBe(voiceQuotaDocId(STABLE));
    expect(state.data).toMatchObject({
      activeSessionId: 's1',
      reservedSec: 320,
      dailyUsedSec: 320,
      monthlyUsedSec: 320,
      sessionStartedAtMs: NOW,
      lastHeartbeatMs: NOW,
      expiresAtMs: NOW + (320 + VOICE_RESERVE_EXPIRY_GRACE_SEC) * 1000,
      reconnectChain: { rootId: 's1', count: 0, gapSecTotal: 0 },
    });
    // Окна выставлены на следующие UTC-границы.
    expect(state.data!.resetAtMs).toBeGreaterThan(NOW);
    expect(state.data!.monthResetAtMs).toBeGreaterThan(NOW);
  });

  it('gives a same-month trial upgrader a fresh full MAX allowance atomically', async () => {
    const { db, state } = makeDb({
      resetAtMs: NOW + 3_600_000,
      monthResetAtMs: NOW + 86_400_000,
      dailyUsedSec: 180,
      monthlyUsedSec: 180,
      trialUsedAtMs: NOW - 1_000,
      trialReservationSessionId: 'trial-verified',
      trialProviderMintedAtMs: NOW - 900,
    });
    const result = await reserveVoiceSeconds(db, {
      ...LIMITS,
      dailyVoiceSecMax: 7_200,
      monthlyVoiceSecMax: 7_200,
      sessionId: 'max-1',
      maxMonthlyAllowance: true,
      maxInitialTrialOffsetSec: 200,
      nowMs: NOW,
    });

    expect(result).toMatchObject({ reservedSec: 320, monthRemainingSec: 6_880 });
    expect(state.data).toMatchObject({
      monthlyUsedSec: 500,
      maxAllowanceUsageBaselineSec: 180,
      maxAllowanceMonthResetAtMs: NOW + 86_400_000,
    });
  });

  it('preserves MAX usage on repeated mint and downgrade/re-upgrade in the same month', async () => {
    const monthResetAtMs = NOW + 86_400_000;
    const { db, state } = makeDb({
      resetAtMs: NOW + 3_600_000,
      monthResetAtMs,
      dailyUsedSec: 500,
      monthlyUsedSec: 500,
      maxAllowanceUsageBaselineSec: 180,
      maxAllowanceMonthResetAtMs: monthResetAtMs,
      activeSessionId: null,
      reservedSec: 0,
    });
    const result = await reserveVoiceSeconds(db, {
      ...LIMITS,
      dailyVoiceSecMax: 7_200,
      monthlyVoiceSecMax: 7_200,
      sessionId: 'max-reentry',
      maxMonthlyAllowance: true,
      nowMs: NOW,
    });

    expect(result.monthRemainingSec).toBe(6_560);
    expect(state.data).toMatchObject({
      monthlyUsedSec: 820,
      maxAllowanceUsageBaselineSec: 180,
      maxAllowanceMonthResetAtMs: monthResetAtMs,
    });
  });

  it('does not reset pre-deployment MAX usage when no current-month trial exists', async () => {
    const { db, state } = makeDb({
      resetAtMs: NOW + 3_600_000,
      monthResetAtMs: NOW + 86_400_000,
      dailyUsedSec: 500,
      monthlyUsedSec: 500,
      activeSessionId: null,
      reservedSec: 0,
    });
    const result = await reserveVoiceSeconds(db, {
      ...LIMITS,
      dailyVoiceSecMax: 7_200,
      monthlyVoiceSecMax: 7_200,
      sessionId: 'max-migration',
      maxMonthlyAllowance: true,
      maxInitialTrialOffsetSec: 200,
      nowMs: NOW,
    });

    expect(result.monthRemainingSec).toBe(6_380);
    expect(state.data?.maxAllowanceUsageBaselineSec).toBe(0);
  });

  it('does not offset current MAX usage using a prior-month trial marker', async () => {
    const { db, state } = makeDb({
      resetAtMs: NOW + 3_600_000,
      monthResetAtMs: NOW + 86_400_000,
      dailyUsedSec: 500,
      monthlyUsedSec: 500,
      trialUsedAtMs: NOW - 40 * 86_400_000,
      activeSessionId: null,
      reservedSec: 0,
    });
    const result = await reserveVoiceSeconds(db, {
      ...LIMITS,
      dailyVoiceSecMax: 7_200,
      monthlyVoiceSecMax: 7_200,
      sessionId: 'max-old-trial',
      maxMonthlyAllowance: true,
      maxInitialTrialOffsetSec: 200,
      nowMs: NOW,
    });

    expect(result.monthRemainingSec).toBe(6_380);
    expect(state.data?.maxAllowanceUsageBaselineSec).toBe(0);
  });

  it('caps the first current-month trial offset at the passed trial reserve', async () => {
    const { db, state } = makeDb({
      resetAtMs: NOW + 3_600_000,
      monthResetAtMs: NOW + 86_400_000,
      dailyUsedSec: 500,
      monthlyUsedSec: 500,
      trialUsedAtMs: NOW - 1_000,
      trialReservationSessionId: 'trial-verified',
      trialProviderMintedAtMs: NOW - 900,
      activeSessionId: null,
      reservedSec: 0,
    });
    const result = await reserveVoiceSeconds(db, {
      ...LIMITS,
      dailyVoiceSecMax: 7_200,
      monthlyVoiceSecMax: 7_200,
      sessionId: 'max-capped-trial',
      maxMonthlyAllowance: true,
      maxInitialTrialOffsetSec: 200,
      nowMs: NOW,
    });

    expect(result.monthRemainingSec).toBe(6_580);
    expect(state.data?.maxAllowanceUsageBaselineSec).toBe(200);
  });

  it('starts a fresh MAX allowance and baseline at UTC month rollover', async () => {
    const { db, state } = makeDb({
      resetAtMs: NOW + 3_600_000,
      monthResetAtMs: NOW - 1,
      dailyUsedSec: 0,
      monthlyUsedSec: 7_200,
      maxAllowanceUsageBaselineSec: 180,
      maxAllowanceMonthResetAtMs: NOW - 1,
      activeSessionId: null,
      reservedSec: 0,
    });
    const result = await reserveVoiceSeconds(db, {
      ...LIMITS,
      dailyVoiceSecMax: 7_200,
      monthlyVoiceSecMax: 7_200,
      sessionId: 'max-new-month',
      maxMonthlyAllowance: true,
      nowMs: NOW,
    });

    const nextMonth = Date.UTC(new Date(NOW).getUTCFullYear(), new Date(NOW).getUTCMonth() + 1, 1);
    expect(result.monthRemainingSec).toBe(6_880);
    expect(state.data).toMatchObject({
      monthlyUsedSec: 320,
      maxAllowanceUsageBaselineSec: 0,
      maxAllowanceMonthResetAtMs: nextMonth,
    });
  });

  it('caps a stored MAX baseline at the shared monthly counter', async () => {
    const monthResetAtMs = NOW + 86_400_000;
    const { db, state } = makeDb({
      resetAtMs: NOW + 3_600_000,
      monthResetAtMs,
      dailyUsedSec: 500,
      monthlyUsedSec: 500,
      maxAllowanceUsageBaselineSec: 9_999,
      maxAllowanceMonthResetAtMs: monthResetAtMs,
      activeSessionId: null,
      reservedSec: 0,
    });
    const result = await reserveVoiceSeconds(db, {
      ...LIMITS,
      dailyVoiceSecMax: 7_200,
      monthlyVoiceSecMax: 7_200,
      sessionId: 'max-capped-baseline',
      maxMonthlyAllowance: true,
      nowMs: NOW,
    });

    expect(result.monthRemainingSec).toBe(6_880);
    expect(state.data?.maxAllowanceUsageBaselineSec).toBe(500);
  });

  it('atomically consumes a lifetime trial in the same transaction as its initial reserve', async () => {
    const { db, state } = makeDb();

    await reserveVoiceSeconds(db, {
      ...LIMITS,
      sessionId: 'trial-1',
      consumeLifetimeTrial: true,
      nowMs: NOW,
    });

    expect(state.data).toMatchObject({
      trialUsedAtMs: NOW,
      trialReservationSessionId: 'trial-1',
      trialProviderMintedAtMs: 0,
    });
  });

  it('rejects another lifetime trial even when the prior reservation is no longer active', async () => {
    // зачем (2026-08-30): расход обязан быть ДОКАЗАННЫМ — закрытая сессия
    // оставляет явную пару + подтверждение провайдера. Голый trialUsedAtMs без
    // sessionId больше не жжёт (это миграционное загрязнение, self-heal).
    const { db } = makeDb({
      trialUsedAtMs: NOW - 1,
      trialReservationSessionId: 'trial-settled',
      trialProviderMintedAtMs: NOW - 1,
      activeSessionId: null,
      reservedSec: 0,
    });

    await expect(reserveVoiceSeconds(db, {
      ...LIMITS,
      authUid: 'new-auth-alias',
      sessionId: 'trial-2',
      consumeLifetimeTrial: true,
      nowMs: NOW,
    })).rejects.toMatchObject({ code: 'permission-denied', message: 'voice_max_required' });
  });

  it('allows only one of two concurrent auth aliases to reserve the lifetime trial', async () => {
    const { db } = makeDb();
    const attempt = (authUid: string, sessionId: string) => reserveVoiceSeconds(db, {
      ...LIMITS,
      authUid,
      sessionId,
      consumeLifetimeTrial: true,
      nowMs: NOW,
    });

    const results = await Promise.allSettled([
      attempt('auth-alias-a', 'trial-a'),
      attempt('auth-alias-b', 'trial-b'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: 'permission-denied', message: 'voice_max_required' });
  });

  it('restores the trial after provider failure only before provider mint is confirmed', async () => {
    const { db, state } = makeDb();
    await reserveVoiceSeconds(db, {
      ...LIMITS,
      sessionId: 'trial-1',
      consumeLifetimeTrial: true,
      nowMs: NOW,
    });

    await releaseVoiceReservation(db, {
      authUid: AUTH,
      stableUid: STABLE,
      sessionId: 'trial-1',
      reason: 'mint_failed',
      restoreLifetimeTrial: true,
      nowMs: NOW + 1,
    });

    expect(state.data).toMatchObject({
      trialUsedAtMs: null,
      trialReservationSessionId: null,
      trialProviderMintedAtMs: 0,
    });
  });

  it('fails closed unless the caller proves that provider mint failed', async () => {
    const { db, state } = makeDb();
    await reserveVoiceSeconds(db, {
      ...LIMITS,
      sessionId: 'trial-1',
      consumeLifetimeTrial: true,
      nowMs: NOW,
    });
    await releaseVoiceReservation(db, {
      authUid: AUTH,
      stableUid: STABLE,
      sessionId: 'trial-1',
      reason: 'confirmation_write_failed',
      nowMs: NOW + 1,
    });

    expect(state.data!.trialUsedAtMs).toBe(NOW);
    expect(state.data!.trialReservationSessionId).toBe('trial-1');
  });

  it('never restores a confirmed trial when its reservation is released', async () => {
    const { db, state } = makeDb();
    await reserveVoiceSeconds(db, {
      ...LIMITS,
      sessionId: 'trial-1',
      consumeLifetimeTrial: true,
      nowMs: NOW,
    });
    await confirmVoiceTrialMinted(db, {
      authUid: AUTH,
      stableUid: STABLE,
      sessionId: 'trial-1',
      nowMs: NOW + 1,
    });

    await releaseVoiceReservation(db, {
      authUid: AUTH,
      stableUid: STABLE,
      sessionId: 'trial-1',
      reason: 'abandoned_after_mint',
      nowMs: NOW + 2,
    });

    expect(state.data!.trialUsedAtMs).toBe(NOW);
    expect(state.data!.trialProviderMintedAtMs).toBe(NOW + 1);
  });

  it('is capped by the remaining day quota, not just the format cap', async () => {
    const { db } = makeDb(liveDoc({
      activeSessionId: null, reservedSec: 0, dailyUsedSec: 800, monthlyUsedSec: 800,
    }));

    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW });

    expect(result.reservedSec).toBe(100); // 900 − 800 < 320
    expect(result.dayRemainingSec).toBe(0);
  });

  it('returns the daily reason when less than 60s remain today (no token minted)', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: null, reservedSec: 0, dailyUsedSec: 850, monthlyUsedSec: 850,
    }));
    const before = JSON.stringify(state.data);

    await expect(reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW }))
      .rejects.toMatchObject({
        code: 'resource-exhausted',
        message: 'voice_daily_quota_exhausted',
        details: 'voice_quota_exhausted',
      });
    expect(JSON.stringify(state.data)).toBe(before); // транзакция ничего не записала
    expect(MIN_VOICE_RESERVE_SEC).toBe(60);
  });

  it('returns the monthly reason when the package is exhausted, even if the day is also exhausted', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: null,
      reservedSec: 0,
      dailyUsedSec: 850,
      monthlyUsedSec: 14_350,
    }));
    const before = JSON.stringify(state.data);

    await expect(reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW }))
      .rejects.toMatchObject({
        code: 'resource-exhausted',
        message: 'voice_monthly_quota_exhausted',
        details: 'voice_quota_exhausted',
      });
    expect(JSON.stringify(state.data)).toBe(before);
  });

  it('rejects with failed-precondition while another live session holds the reserve', async () => {
    // activatedAtMs обязателен: ЖИВОЙ звонок — это тот, где прозвучало «алло»
    // (первый heartbeat). Неактивированный резерв с 2026-08-24 вытесняется
    // коротким окном — см. тесты про never-activated ниже.
    const { db, state } = makeDb(liveDoc({ activatedAtMs: NOW - 100_000 }));
    const before = JSON.stringify(state.data);

    await expect(reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'voice_session_active' });
    expect(JSON.stringify(state.data)).toBe(before);
  });

  // зачем: pre-mint на пре-экране (мгновенное соединение) — брошенный или убитый
  // звонок не должен блокировать следующий на 7 минут: тишина в heartbeat
  // дольше окна = мёртвая сессия, свежий минт её вытесняет.
  it('supersedes an active session that has been silent longer than the dead-session window', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: 'abandoned-premint',
      sessionStartedAtMs: NOW - 90_000,
      activatedAtMs: 0,
      lastHeartbeatMs: NOW - 90_000, // ни одного heartbeat: pre-mint без звонка
      expiresAtMs: NOW + 300_000, // резерв формально ещё жив
    }));

    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW });

    expect(result.reservedSec).toBe(320);
    expect(result.staleRefundedSec).toBe(320); // прожито 0с — весь резерв назад
    expect(state.data).toMatchObject({ activeSessionId: 's2', dailyUsedSec: 320 });
    expect(VOICE_DEAD_SESSION_SILENCE_MS).toBe(75_000);
  });

  it('still rejects while the other session heartbeats within the window (no parallel calls)', async () => {
    const { db } = makeDb(liveDoc({
      activatedAtMs: NOW - 100_000,
      lastHeartbeatMs: NOW - 70_000,
      expiresAtMs: NOW + 300_000,
    }));
    await expect(reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'voice_session_active' });
  });

  // зачем (аудит 2026-08-24, жалоба владельца «связь не установилась»):
  // резерв пишет lastHeartbeatMs = now ПРИ СОЗДАНИИ, ещё до звонка. Убийство
  // приложения на пре-экране оставляло заготовку, которая выглядела живой и
  // держала voice_session_active все 12 минут (в логах три отказа подряд).
  // Неактивированный резерв (activatedAtMs = 0) обязан вытесняться коротким
  // окном, даже когда его «heartbeat» формально свежий.
  it('supersedes a never-activated reserve whose heartbeat is fresh but older than the start grace', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: 'killed-on-prestart',
      sessionStartedAtMs: NOW - 50_000,
      activatedAtMs: 0,
      // Свежее окна мёртвой сессии (75с) — до фикса этого хватало для отказа.
      lastHeartbeatMs: NOW - 50_000,
      expiresAtMs: NOW + 300_000,
    }));

    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW });

    expect(result.reservedSec).toBe(320);
    expect(result.staleRefundedSec).toBe(320); // звонка не было — весь резерв назад
    expect(state.data).toMatchObject({ activeSessionId: 's2' });
    expect(VOICE_UNACTIVATED_RESERVE_GRACE_MS).toBe(45_000);
  });

  // зачем (владелец 2026-08-30, «пробник был, но показывает 0 минут»):
  // kill app на пре-экране сжигал единственный lifetime-пробник — маркер
  // ставится при резерве, а вытеснение возвращало только секунды. Мёртвая
  // TRIAL-заготовка (0 прожитых секунд) обязана вернуть и маркер, атомарно.
  it('supersedes a dead never-activated TRIAL premint and RESTORES the lifetime marker for a fresh trial', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: 'trial-dead',
      accessType: 'trial',
      sessionStartedAtMs: NOW - 50_000,
      activatedAtMs: 0,
      lastHeartbeatMs: NOW - 50_000,
      expiresAtMs: NOW + 300_000,
      reservedSec: 200,
      dailyUsedSec: 200,
      monthlyUsedSec: 200,
      trialUsedAtMs: NOW - 50_000,
      lifetimeTrialUsedAtMs: NOW - 50_000,
      trialReservationSessionId: 'trial-dead',
      trialProviderMintedAtMs: NOW - 49_000,
    }));

    const result = await reserveVoiceSeconds(db, {
      ...LIMITS,
      sessionId: 'trial-2',
      consumeLifetimeTrial: true,
      accessType: 'trial',
      nowMs: NOW,
    });

    expect(result.reservedSec).toBe(320);
    expect(result.staleRefundedSec).toBe(200); // 0 прожитых — весь резерв назад
    // Свежий trial-резерв переписал маркеры НОВОЙ сессией — право не потеряно
    // и не задвоено: новая пара доказуема, старая исчезла.
    expect(state.data).toMatchObject({
      activeSessionId: 'trial-2',
      trialReservationSessionId: 'trial-2',
      trialUsedAtMs: NOW,
      trialProviderMintedAtMs: 0,
    });
  });

  it('admin reserve over a dead TRIAL premint clears the provisional marker (trial stays owed)', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: 'trial-dead',
      accessType: 'trial',
      sessionStartedAtMs: NOW - 50_000,
      activatedAtMs: 0,
      lastHeartbeatMs: NOW - 50_000,
      expiresAtMs: NOW + 300_000,
      reservedSec: 200,
      dailyUsedSec: 200,
      monthlyUsedSec: 200,
      trialUsedAtMs: NOW - 50_000,
      lifetimeTrialUsedAtMs: NOW - 50_000,
      trialReservationSessionId: 'trial-dead',
      trialProviderMintedAtMs: NOW - 49_000,
    }));

    await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 'admin-1', nowMs: NOW });

    expect(state.data).toMatchObject({
      activeSessionId: 'admin-1',
      trialUsedAtMs: null,
      lifetimeTrialUsedAtMs: null,
      trialReservationSessionId: null,
      trialProviderMintedAtMs: 0,
    });
  });

  // Обратная сторона того же фикса: пока заготовка МОЛОЖЕ стартового окна,
  // она защищена — иначе два быстрых тапа «Позвонить» отобрали бы резерв
  // у уже летящего offer/SDP.
  it('protects a never-activated reserve that is still inside the start grace', async () => {
    const { db } = makeDb(liveDoc({
      activeSessionId: 'premint-in-flight',
      sessionStartedAtMs: NOW - 10_000,
      activatedAtMs: 0,
      lastHeartbeatMs: NOW - 10_000,
      expiresAtMs: NOW + 300_000,
    }));

    await expect(reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'voice_session_active' });
  });

  it('a fresh reserve wipes the previous usage accumulator and activation clock', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: null, reservedSec: 0,
      usageTotals: { audioInputTokens: 700, audioOutputTokens: 700, cachedTokens: 1, textTokens: 2 },
      lastHeartbeatElapsedSec: 89,
      activatedAtMs: NOW - 500_000,
    }));
    await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW });
    expect(state.data).toMatchObject({
      activatedAtMs: 0,
      lastHeartbeatElapsedSec: 0,
      usageTotals: { audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0, textTokens: 0 },
    });
  });

  it('counts a silently-dead session by its ACTIVATION clock, not the mint clock', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: 'dead',
      expiresAtMs: NOW - 1000,
      sessionStartedAtMs: NOW - 700_000, // минт
      activatedAtMs: NOW - 600_000, // «алло» через 100с раздумий на пре-экране
      lastHeartbeatMs: NOW - 500_000, // прожито 100с от активации (а не 200 от минта)
    }));
    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW });
    expect(result.staleRefundedSec).toBe(220); // 320 − 100
    expect(state.data!.dailyUsedSec).toBe(320 - 220 + 320);
  });

  it('closes an expired silent session by last heartbeat and refunds its tail', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: 'dead',
      expiresAtMs: NOW - 1000,
      sessionStartedAtMs: NOW - 600_000,
      lastHeartbeatMs: NOW - 500_000, // прожито 100с из 320 зарезервированных
    }));

    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW });

    // Возврат 220с мёртвой сессии, затем свежий резерв 320с: 320−220+320 = 420.
    expect(result.reservedSec).toBe(320);
    // Хвост мёртвой сессии отдаётся наружу — mint сторнирует его в бюджете дня.
    expect(result.staleRefundedSec).toBe(220);
    expect(state.data).toMatchObject({ activeSessionId: 's2', dailyUsedSec: 420, monthlyUsedSec: 420 });
  });

  it('resets the monthly window by monthResetAtMs (UTC month rollover)', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: null,
      reservedSec: 0,
      dailyUsedSec: 0,
      resetAtMs: NOW + 3_600_000,
      monthlyUsedSec: 14_400, // месяц выбран полностью…
      monthResetAtMs: NOW - 1, // …но окно уже истекло
    }));

    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW });

    expect(result.reservedSec).toBe(320);
    expect(state.data).toMatchObject({ monthlyUsedSec: 320 });
    const expected = Date.UTC(new Date(NOW).getUTCFullYear(), new Date(NOW).getUTCMonth() + 1, 1);
    expect(state.data!.monthResetAtMs).toBe(expected);
  });

  it('resets the daily window at the UTC day boundary', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: null,
      reservedSec: 0,
      dailyUsedSec: 900, // день выбран…
      resetAtMs: NOW - 1, // …но уже наступил новый
    }));

    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW });

    expect(result.reservedSec).toBe(320);
    expect(state.data).toMatchObject({ dailyUsedSec: 320 });
  });
});

describe('settleVoiceSession', () => {
  it('settles a paid reserve once, appends one charge, and releases the unused seconds', async () => {
    const { db, docs } = makeDb(liveDoc({
      activeSessionId: 'paid-1',
      accessType: 'paid_minutes',
      paidReservationRootSessionId: 'paid-1',
      paidReservationTotalSec: 320,
      paidConsumedSec: 0,
    }));
    docs.set(`voice_minute_wallets/${STABLE}`, {
      schemaVersion: 1, ownerStableId: STABLE,
      grantedSeconds: 7_200, refundedSeconds: 0, chargedSeconds: 0,
      reservedSeconds: 320, availableSeconds: 6_880, eventCount: 1,
      activeReservationSessionId: 'paid-1', reservationRootSessionId: 'paid-1',
    });

    const first = await settleVoiceSession(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 'paid-1', actualSec: 200,
      endReason: 'completed', nowMs: NOW,
    });
    const retry = await settleVoiceSession(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 'paid-1', actualSec: 200,
      endReason: 'completed', nowMs: NOW + 1_000,
    });

    expect(first).toEqual({ chargedSec: 200, refundedSec: 120, alreadySettled: false });
    expect(retry).toEqual({ chargedSec: 0, refundedSec: 0, alreadySettled: true });
    expect(docs.get(`voice_minute_wallets/${STABLE}`)).toMatchObject({
      chargedSeconds: 200,
      reservedSeconds: 0,
      availableSeconds: 7_000,
      activeReservationSessionId: null,
    });
    const charges = [...docs.entries()].filter(([path]) => path.startsWith('voice_minute_events/vm_call_charge_'));
    expect(charges).toHaveLength(1);
    expect(charges[0][1]).toMatchObject({ kind: 'call_charge', sessionId: 'paid-1', seconds: 200 });
  });

  it('charges min(actual, reserve) and refunds the unused tail', async () => {
    const { db, state } = makeDb(liveDoc());

    const result = await settleVoiceSession(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1', actualSec: 200, endReason: 'completed', nowMs: NOW,
    });

    expect(result).toEqual({ chargedSec: 200, refundedSec: 120, alreadySettled: false });
    expect(state.data).toMatchObject({
      activeSessionId: null,
      reservedSec: 0,
      dailyUsedSec: 200,
      monthlyUsedSec: 200,
      lastSettledSessionId: 's1',
      lastSettledAtMs: NOW,
      lastEndReason: 'completed',
    });
  });

  it('never charges more than the reserve even if the client claims more', async () => {
    const { db } = makeDb(liveDoc());

    const result = await settleVoiceSession(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1', actualSec: 99_999, nowMs: NOW,
    });

    expect(result).toEqual({ chargedSec: 320, refundedSec: 0, alreadySettled: false });
  });

  it('is idempotent: a foreign/closed sessionId is a no-op', async () => {
    const { db, state } = makeDb(liveDoc());
    const before = JSON.stringify(state.data);

    const result = await settleVoiceSession(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 'someone-else', actualSec: 300, nowMs: NOW,
    });

    expect(result).toEqual({ chargedSec: 0, refundedSec: 0, alreadySettled: true });
    expect(JSON.stringify(state.data)).toBe(before);
  });

  it('clamps the refund at zero across a day rollover (no free negative usage)', async () => {
    const { db, state } = makeDb(liveDoc({ resetAtMs: NOW - 1 })); // день перещёлкнулся до сеттлмента

    await settleVoiceSession(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1', actualSec: 100, nowMs: NOW,
    });

    expect(state.data!.dailyUsedSec).toBe(0); // не −220
  });
});

describe('releaseVoiceReservation', () => {
  it('releases an unused paid reserve without appending a charge', async () => {
    const { db, docs } = makeDb(liveDoc({
      activeSessionId: 'paid-cancel',
      accessType: 'paid_minutes',
      paidReservationRootSessionId: 'paid-cancel',
      paidReservationTotalSec: 320,
      paidConsumedSec: 0,
    }));
    docs.set(`voice_minute_wallets/${STABLE}`, {
      schemaVersion: 1, ownerStableId: STABLE,
      grantedSeconds: 1_800, refundedSeconds: 0, chargedSeconds: 0,
      reservedSeconds: 320, availableSeconds: 1_480, eventCount: 1,
      activeReservationSessionId: 'paid-cancel', reservationRootSessionId: 'paid-cancel',
    });

    const result = await releaseVoiceReservation(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 'paid-cancel',
      reason: 'briefing_abandoned', nowMs: NOW,
    });

    expect(result).toEqual({ chargedSec: 0, refundedSec: 320, alreadySettled: false });
    expect(docs.get(`voice_minute_wallets/${STABLE}`)).toMatchObject({
      chargedSeconds: 0, reservedSeconds: 0, availableSeconds: 1_800,
    });
    expect([...docs.keys()].some((path) => path.startsWith('voice_minute_events/vm_call_charge_'))).toBe(false);
  });

  it('refunds the full reserve on pre-connect cancel and records the reason', async () => {
    const { db, state } = makeDb(liveDoc());

    const result = await releaseVoiceReservation(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1', reason: 'briefing_abandoned', nowMs: NOW,
    });

    expect(result).toEqual({ chargedSec: 0, refundedSec: 320, alreadySettled: false });
    expect(state.data).toMatchObject({
      activeSessionId: null,
      reservedSec: 0,
      dailyUsedSec: 0,
      monthlyUsedSec: 0,
      lastReleaseReason: 'briefing_abandoned',
    });
  });

  it('is a no-op for a mismatched session', async () => {
    const { db, state } = makeDb(liveDoc());
    const before = JSON.stringify(state.data);

    const result = await releaseVoiceReservation(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 'other', nowMs: NOW,
    });

    expect(result.alreadySettled).toBe(true);
    expect(JSON.stringify(state.data)).toBe(before);
  });
});

describe('transferReserve', () => {
  const TRANSFER = {
    authUid: AUTH,
    stableUid: STABLE,
    prevSessionId: 's1',
    newSessionId: 's2',
    freeGapCapSec: 60,
    nowMs: NOW,
  };

  it('moves the remainder using the pessimistic elapsed (max of heartbeat and wall clock)', async () => {
    // Стена: 100с; heartbeat-отчёт клиента: 80с → верим стене. Gap 10с бесплатен.
    const { db, state } = makeDb(liveDoc());

    const result = await transferReserve(db, { ...TRANSFER, heartbeatElapsedSec: 80 });

    // consumed = max(80, 100) − freeGap 10 = 90 → остаток 230.
    expect(result).toEqual({ reservedSec: 230, chainCount: 1, rootSessionId: 's1' });
    expect(state.data).toMatchObject({
      activeSessionId: 's2',
      reservedSec: 230,
      sessionStartedAtMs: NOW,
      lastHeartbeatMs: NOW,
      // День/месяц не трогаем: списанное остаётся списанным, хвост вернёт settle.
      dailyUsedSec: 320,
      monthlyUsedSec: 320,
      reconnectChain: { rootId: 's1', count: 1, gapSecTotal: 10 },
    });
  });

  it('moves a paid reservation to the reconnect session and settles the whole call once', async () => {
    const { db, docs } = makeDb(liveDoc({
      accessType: 'paid_minutes',
      paidReservationRootSessionId: 's1',
      paidReservationTotalSec: 320,
      paidConsumedSec: 0,
    }));
    docs.set(`voice_minute_wallets/${STABLE}`, {
      schemaVersion: 1, ownerStableId: STABLE,
      grantedSeconds: 1_800, refundedSeconds: 0, chargedSeconds: 0,
      reservedSeconds: 320, availableSeconds: 1_480, eventCount: 1,
      activeReservationSessionId: 's1', reservationRootSessionId: 's1',
    });

    const transfer = await transferReserve(db, { ...TRANSFER, heartbeatElapsedSec: 80 });
    expect(transfer.reservedSec).toBe(230);
    expect(docs.get(`voice_minute_wallets/${STABLE}`)).toMatchObject({
      reservedSeconds: 320,
      activeReservationSessionId: 's2',
      reservationRootSessionId: 's1',
    });

    const settled = await settleVoiceSession(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's2', actualSec: 100, nowMs: NOW + 100_000,
    });
    expect(settled).toEqual({ chargedSec: 190, refundedSec: 130, alreadySettled: false });
    expect(docs.get(`voice_minute_wallets/${STABLE}`)).toMatchObject({
      chargedSeconds: 190, reservedSeconds: 0, availableSeconds: 1_610,
    });
    const charges = [...docs.values()].filter((event) => event.kind === 'call_charge');
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({ sessionId: 's1', seconds: 190 });
  });

  it('caps the free gap across the whole chain at 60s total', async () => {
    const { db, state } = makeDb(liveDoc({
      lastHeartbeatMs: NOW - 30_000, // gap 30с
      reconnectChain: { rootId: 'root', count: 1, gapSecTotal: 55 }, // бесплатных осталось 5с
    }));

    const result = await transferReserve(db, { ...TRANSFER, heartbeatElapsedSec: 0 });

    // Подтверждённое окно 12с, но остаток чейна лишь 5с → consumed = 100 − 5 = 95.
    expect(result.reservedSec).toBe(225);
    expect(state.data!.reconnectChain).toEqual({ rootId: 'root', count: 2, gapSecTotal: 60 });
  });

  it('EXPLOIT closed: 60s of talking with heartbeats silenced is charged in FULL', async () => {
    // Клиент говорит 60с и просто не шлёт heartbeat, затем реконнектится:
    // раньше gapSec=60 становился freeGap и consumed=0 — первая минута бесплатно.
    const { db, state } = makeDb(liveDoc({
      sessionStartedAtMs: NOW - 60_000,
      lastHeartbeatMs: NOW - 60_000, // ни одного heartbeat после старта
    }));

    const result = await transferReserve(db, { ...TRANSFER, heartbeatElapsedSec: 0 });

    // wallElapsed 60с ≥ 2×heartbeatSec(30) без единого heartbeat = замалчивание,
    // не обрыв: gap не бесплатен, consumed == 60, остаток 320−60.
    expect(result.reservedSec).toBe(260);
    expect(state.data!.reconnectChain.gapSecTotal).toBe(0);
  });

  it('caps the free gap at the confirmed-drop window even with heartbeats present', async () => {
    // Heartbeat был, но потом 45с тишины в heartbeat-канале. Реальный обрыв
    // ре-минтится за секунды: бесплатно только окно 3×grace = 12с.
    const { db, state } = makeDb(liveDoc({ lastHeartbeatMs: NOW - 45_000 }));

    const result = await transferReserve(db, { ...TRANSFER, heartbeatElapsedSec: 0 });

    expect(VOICE_CONFIRMED_GAP_WINDOW_SEC).toBe(12);
    // consumed = 100 − 12 = 88 → остаток 232; в чейн ушло только 12с.
    expect(result.reservedSec).toBe(232);
    expect(state.data!.reconnectChain.gapSecTotal).toBe(12);
  });

  it('a genuine drop before the first heartbeat still gets the small free window', async () => {
    // Обрыв на 50-й секунде до первого heartbeat (интервал 30с мог не успеть
    // дважды): wallElapsed < 2×heartbeatSec — не замалчивание, окно 12с бесплатно.
    const { db } = makeDb(liveDoc({
      sessionStartedAtMs: NOW - 50_000,
      lastHeartbeatMs: NOW - 50_000,
    }));

    const result = await transferReserve(db, { ...TRANSFER, heartbeatElapsedSec: 0 });

    // consumed = 50 − 12 = 38 → остаток 282.
    expect(result.reservedSec).toBe(282);
  });

  it('measures wall elapsed from the ACTIVATION clock and stamps the new session as activated', async () => {
    const { db, state } = makeDb(liveDoc({
      sessionStartedAtMs: NOW - 200_000, // минт 200с назад…
      activatedAtMs: NOW - 100_000, // …но звонок ожил 100с назад (pre-mint + раздумья)
      lastHeartbeatMs: NOW - 5_000,
    }));
    const result = await transferReserve(db, {
      authUid: AUTH, stableUid: STABLE, prevSessionId: 's1', newSessionId: 's2',
      heartbeatElapsedSec: 95, nowMs: NOW,
    });
    // elapsed = max(95, 100) = 100, подтверждённый gap 5с бесплатен → 320 − 95 = 225.
    expect(result.reservedSec).toBe(225);
    expect(state.data).toMatchObject({ activeSessionId: 's2', activatedAtMs: NOW, sessionStartedAtMs: NOW });
  });

  it('rejects a transfer from a session that is not the active one', async () => {
    const { db, state } = makeDb(liveDoc());
    const before = JSON.stringify(state.data);

    await expect(transferReserve(db, { ...TRANSFER, prevSessionId: 'stale', heartbeatElapsedSec: 0 }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'voice_session_mismatch' });
    expect(JSON.stringify(state.data)).toBe(before);
  });

  it('rejects when the remainder falls below 60s (reconnect is pointless)', async () => {
    const { db } = makeDb(liveDoc({
      reservedSec: 120,
      sessionStartedAtMs: NOW - 90_000, // прожито 90с из 120
      lastHeartbeatMs: NOW, // gap 0
    }));

    await expect(transferReserve(db, { ...TRANSFER, heartbeatElapsedSec: 0 }))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'voice_quota_exhausted' });
  });

  it('enforces the chain cap when maxChainCount is provided', async () => {
    const { db } = makeDb(liveDoc({
      reconnectChain: { rootId: 'root', count: 3, gapSecTotal: 0 },
    }));

    await expect(transferReserve(db, { ...TRANSFER, heartbeatElapsedSec: 0, maxChainCount: 3 }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'voice_reconnect_chain_exhausted' });
  });
});

describe('settleVoiceSessionWithXp (P1-13: settle + XP + снимок одной транзакцией)', () => {
  const DAY = '2027-01-15';

  it('списывает секунды и начисляет XP за один проход, отдавая снимок ДО записи', async () => {
    const { db, state } = makeDb(liveDoc({ usageTotals: { audioInputTokens: 4321 } }));

    const result = await settleVoiceSessionWithXp(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1',
      actualSec: 0,
      // Секунды считаются из снимка — как это делает maxVoiceSessionEnd.
      resolveActualSec: (data) => Math.floor(Number(data.reservedSec) / 2),
      xpDayKey: DAY, xpDailyCap: 100,
      computeXp: (chargedSec) => chargedSec,
      nowMs: NOW,
    });

    expect(result.alreadySettled).toBe(false);
    expect(result.chargedSec).toBe(160);
    expect(result.refundedSec).toBe(160);
    expect(result.xpAwarded).toBe(100); // 160 обрезано дневным кэпом
    // Снимок — состояние ДО записи: вызывающему нужны usageTotals и reconnectChain.
    expect(result.snapshot.usageTotals).toEqual({ audioInputTokens: 4321 });
    expect(result.snapshot.activeSessionId).toBe('s1');
    // Резерв закрыт, возврат вернулся в дневной/месячный счётчик.
    expect(state.data!.activeSessionId).toBeNull();
    expect(state.data!.reservedSec).toBe(0);
    expect(state.data!.dailyUsedSec).toBe(160);
    expect(state.data!.lastSettledSessionId).toBe('s1');
    expect(state.data!.lastSettledAtMs).toBe(NOW);
    expect(state.data!.xpAwardedToday).toBe(100);
    expect(state.data!.xpDayKey).toBe(DAY);
  });

  // зачем (инцидент владельца 2026-08-29): пробник помечается использованным в
  // момент РЕЗЕРВА — иначе двумя параллельными минтами можно выпросить два
  // бесплатных звонка. Но у владельца звонок сорвался: провайдер не отдал
  // аудио, транскрипт пустой, chargedSec=0, секунды вернулись — а
  // trialUsedAtMs остался, и человек навсегда потерял пробник, ни секунды не
  // поговорив. Settle обязан вернуть и сам пробник, если разговора не было.
  // Проверено мутацией 2026-08-29: если снять условие возврата в
  // settleVoiceSessionWithXp, этот кейс краснеет — сторож рабочий, а не
  // тавтологический.
  it('возвращает пробник, когда сорвавшийся trial-звонок не потратил ни секунды', async () => {
    const { db, state } = makeDb(liveDoc({
      accessType: 'trial',
      trialUsedAtMs: NOW - 90_000,
      lifetimeTrialUsedAtMs: NOW - 90_000,
      trialReservationSessionId: 's1',
    }));

    const result = await settleVoiceSessionWithXp(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1',
      actualSec: 0,
      xpDayKey: DAY, xpDailyCap: 100,
      computeXp: () => 0,
      endReason: 'dropped',
      nowMs: NOW,
    });

    expect(result.chargedSec).toBe(0);
    expect(state.data!.trialUsedAtMs).toBeNull();
    expect(state.data!.lifetimeTrialUsedAtMs).toBeNull();
    expect(state.data!.trialReservationSessionId).toBeNull();
  });

  it('НЕ возвращает пробник, если разговор реально состоялся', async () => {
    const { db, state } = makeDb(liveDoc({
      accessType: 'trial',
      trialUsedAtMs: NOW - 90_000,
      lifetimeTrialUsedAtMs: NOW - 90_000,
      trialReservationSessionId: 's1',
    }));

    await settleVoiceSessionWithXp(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1',
      actualSec: 45,
      xpDayKey: DAY, xpDailyCap: 100,
      computeXp: () => 0,
      endReason: 'completed',
      nowMs: NOW,
    });

    expect(state.data!.trialUsedAtMs).toBe(NOW - 90_000);
    expect(state.data!.lifetimeTrialUsedAtMs).toBe(NOW - 90_000);
  });

  it('дневной кэп считается от НАКОПЛЕННОГО за день, а не от одной сессии', async () => {
    const { db, state } = makeDb(liveDoc({ xpDayKey: DAY, xpAwardedToday: 90 }));

    const result = await settleVoiceSessionWithXp(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1',
      actualSec: 60,
      xpDayKey: DAY, xpDailyCap: 100,
      computeXp: () => 50,
      nowMs: NOW,
    });

    expect(result.xpAwarded).toBe(10); // остаток кэпа, не 50
    expect(state.data!.xpAwardedToday).toBe(100);
  });

  it('новый день обнуляет накопленный XP', async () => {
    const { db } = makeDb(liveDoc({ xpDayKey: '2027-01-14', xpAwardedToday: 100 }));

    const result = await settleVoiceSessionWithXp(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1',
      actualSec: 60,
      xpDayKey: DAY, xpDailyCap: 100,
      computeXp: () => 40,
      nowMs: NOW,
    });

    expect(result.xpAwarded).toBe(40);
  });

  it('двойной end не списывает и НЕ начисляет XP второй раз', async () => {
    const { db, state } = makeDb(liveDoc({ activeSessionId: null, reservedSec: 0, xpAwardedToday: 70, xpDayKey: DAY }));

    const computeXp = jest.fn(() => 50);
    const result = await settleVoiceSessionWithXp(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1',
      actualSec: 60,
      xpDayKey: DAY, xpDailyCap: 100,
      computeXp,
      nowMs: NOW,
    });

    expect(result.alreadySettled).toBe(true);
    expect(result.xpAwarded).toBe(0);
    expect(computeXp).not.toHaveBeenCalled();
    expect(state.data!.xpAwardedToday).toBe(70); // не тронут
    // Снимок отдаётся и здесь: вызывающему он нужен для drift-лога.
    expect(result.snapshot.activeSessionId).toBeNull();
  });

  it('чужая сессия (гонка с watchdog) не списывает чужой резерв', async () => {
    const { db, state } = makeDb(liveDoc({ activeSessionId: 'other' }));

    const result = await settleVoiceSessionWithXp(db, {
      authUid: AUTH, stableUid: STABLE, sessionId: 's1',
      actualSec: 60,
      xpDayKey: DAY, xpDailyCap: 100,
      computeXp: () => 50,
      nowMs: NOW,
    });

    expect(result.alreadySettled).toBe(true);
    expect(state.data!.activeSessionId).toBe('other'); // чужой резерв цел
  });
});

// зачем (владелец 2026-08-30): watchdog закрывает брошенную заготовку с
// allowMintedTrialRestore — «алло» не было, пробник возвращается, даже если
// провайдер-токен уже выпускался. Строгий путь провала минта (без флага)
// по-прежнему возвращает только неподтверждённый провайдером резерв.
describe('releaseVoiceReservation: возврат lifetime-пробника', () => {
  const burnedPremint = () => liveDoc({
    activeSessionId: 'trial-dead',
    accessType: 'trial',
    activatedAtMs: 0,
    reservedSec: 200,
    dailyUsedSec: 200,
    monthlyUsedSec: 200,
    trialUsedAtMs: NOW - 50_000,
    lifetimeTrialUsedAtMs: NOW - 50_000,
    trialReservationSessionId: 'trial-dead',
    trialProviderMintedAtMs: NOW - 49_000,
  });

  it('watchdog-путь (allowMintedTrialRestore) возвращает маркер заготовки с выпущенным токеном', async () => {
    const { db, state } = makeDb(burnedPremint());

    const result = await releaseVoiceReservation(db, {
      authUid: AUTH,
      stableUid: STABLE,
      sessionId: 'trial-dead',
      reason: 'briefing_abandoned',
      restoreLifetimeTrial: true,
      allowMintedTrialRestore: true,
      nowMs: NOW,
    });

    expect(result.refundedSec).toBe(200);
    expect(state.data).toMatchObject({
      activeSessionId: null,
      trialUsedAtMs: null,
      lifetimeTrialUsedAtMs: null,
      trialReservationSessionId: null,
      trialProviderMintedAtMs: 0,
    });
  });

  it('строгий путь провала минта БЕЗ флага не трогает подтверждённый провайдером маркер', async () => {
    const { db, state } = makeDb(burnedPremint());

    await releaseVoiceReservation(db, {
      authUid: AUTH,
      stableUid: STABLE,
      sessionId: 'trial-dead',
      reason: 'mint_failed',
      restoreLifetimeTrial: true,
      nowMs: NOW,
    });

    expect(state.data).toMatchObject({
      trialUsedAtMs: NOW - 50_000,
      trialProviderMintedAtMs: NOW - 49_000,
    });
  });
});

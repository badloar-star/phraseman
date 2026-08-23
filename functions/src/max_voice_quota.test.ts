import {
  MIN_VOICE_RESERVE_SEC,
  VOICE_CONFIRMED_GAP_WINDOW_SEC,
  VOICE_RESERVE_EXPIRY_GRACE_SEC,
  VOICE_DEAD_SESSION_SILENCE_MS,
  releaseVoiceReservation,
  reserveVoiceSeconds,
  settleVoiceSession,
  transferReserve,
  voiceQuotaDocId,
} from './max_voice_quota';

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
};

// Мини-стаб Firestore: один док, транзакция коммитит записи только при успехе
// коллбэка — брошенный HttpsError не должен оставлять частичных записей.
function makeDb(initial?: DocData) {
  const state: { data?: DocData; id?: string; collection?: string } = { data: initial };
  const ref = {
    get: async () => ({ exists: !!state.data, data: () => state.data }),
    set: async (d: DocData, o?: { merge?: boolean }) => {
      state.data = o?.merge ? { ...(state.data ?? {}), ...d } : { ...d };
    },
  };
  const db = {
    collection: (name: string) => {
      state.collection = name;
      return { doc: (id: string) => { state.id = id; return ref; } };
    },
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      const writes: Array<[DocData, any]> = [];
      const tx = {
        get: async (r: any) => r.get(),
        set: (r: any, d: DocData, o?: any) => { writes.push([d, o]); },
      };
      const result = await fn(tx);
      for (const [d, o] of writes) await ref.set(d, o);
      return result;
    },
  };
  return { db: db as any, state };
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
  it("follows the docId('vq', …) pattern from premium_dialog", () => {
    const id = voiceQuotaDocId(AUTH, STABLE);
    expect(id).toMatch(/^vq_[0-9a-f]{48}$/);
    expect(voiceQuotaDocId(AUTH, STABLE)).toBe(id); // детерминированность
    expect(voiceQuotaDocId('other', STABLE)).not.toBe(id);
  });
});

describe('reserveVoiceSeconds', () => {
  it('reserves min(cap+tail, day, month) and charges it to both windows', async () => {
    const { db, state } = makeDb();

    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's1', nowMs: NOW });

    expect(result).toEqual({ reservedSec: 320, dayRemainingSec: 580, monthRemainingSec: 14_080, staleRefundedSec: 0 });
    expect(state.collection).toBe('voice_call_quotas');
    expect(state.id).toBe(voiceQuotaDocId(AUTH, STABLE));
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

  it('is capped by the remaining day quota, not just the format cap', async () => {
    const { db } = makeDb(liveDoc({
      activeSessionId: null, reservedSec: 0, dailyUsedSec: 800, monthlyUsedSec: 800,
    }));

    const result = await reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW });

    expect(result.reservedSec).toBe(100); // 900 − 800 < 320
    expect(result.dayRemainingSec).toBe(0);
  });

  it('rejects with resource-exhausted when less than 60s remain (no token minted)', async () => {
    const { db, state } = makeDb(liveDoc({
      activeSessionId: null, reservedSec: 0, dailyUsedSec: 850, monthlyUsedSec: 850,
    }));
    const before = JSON.stringify(state.data);

    await expect(reserveVoiceSeconds(db, { ...LIMITS, sessionId: 's2', nowMs: NOW }))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'voice_quota_exhausted' });
    expect(JSON.stringify(state.data)).toBe(before); // транзакция ничего не записала
    expect(MIN_VOICE_RESERVE_SEC).toBe(60);
  });

  it('rejects with failed-precondition while another live session holds the reserve', async () => {
    const { db, state } = makeDb(liveDoc());
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
    const { db } = makeDb(liveDoc({ lastHeartbeatMs: NOW - 70_000, expiresAtMs: NOW + 300_000 }));
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


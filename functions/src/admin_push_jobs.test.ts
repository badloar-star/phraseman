import {
  buildAdminPushMessage,
  chunkArray,
  isAdminPushJobDue,
  isPremiumActive,
  isValidExpoPushToken,
  matchesAdminPushScheduledAudience,
  normalizeAdminPushJob,
  parseAdminPushUser,
  selectAdminPushUsers,
  sendExpoPushMessages,
  readAdminPushAttemptedUids,
  recordAdminPushAttempt,
  type AdminPushUser,
} from './admin_push_jobs';

const NOW = 1_750_000_000_000;
const TOKEN = 'ExponentPushToken[abc123]';

function user(overrides: Partial<AdminPushUser> = {}): AdminPushUser {
  return {
    uid: 'u1',
    token: TOKEN,
    language: 'ru',
    premiumActive: false,
    streak: 0,
    lastActiveAtMs: NOW - 2 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

describe('admin push jobs', () => {
  it('accepts Expo token formats only', () => {
    expect(isValidExpoPushToken('ExponentPushToken[x]')).toBe(true);
    expect(isValidExpoPushToken('ExpoPushToken[x]')).toBe(true);
    expect(isValidExpoPushToken('bad')).toBe(false);
    expect(isValidExpoPushToken('ExpoPushToken[]')).toBe(false);
  });

  it('normalizes a segment job from the admin document shape', () => {
    const job = normalizeAdminPushJob('job1', {
      mode: 'segment',
      notification: { title: 'Android notice', body: 'Speaking is temporarily unavailable.' },
      action: 'open_lessons',
      segment: { language: 'ru', premium: false, streakMin: 3 },
    });

    expect(job).toMatchObject({
      id: 'job1',
      mode: 'segment',
      action: 'open_lessons',
      notification: { title: 'Android notice' },
      segment: { language: 'ru', premium: false, streakMin: 3 },
    });
  });

  it('keeps a future scheduled job out of immediate delivery', () => {
    const job = normalizeAdminPushJob('job1', {
      mode: 'scheduled',
      notification: { title: 'Later', body: 'Body' },
      scheduledAt: new Date(NOW + 60_000).toISOString(),
      audience: 'all',
    });

    expect(isAdminPushJobDue(job, NOW)).toBe(false);
    expect(isAdminPushJobDue(job, NOW + 60_001)).toBe(true);
  });

  it('parses user fields used by the admin audience preview', () => {
    const parsed = parseAdminPushUser('u1', {
      expoPushToken: TOKEN,
      lang: 'uk',
      progress: { streak_count: '8', premium_plan: 'yearly', premium_expiry: String(NOW + 10_000) },
      last_active_at: NOW - 8 * 24 * 60 * 60 * 1000,
    }, NOW);

    expect(parsed).toMatchObject({
      uid: 'u1',
      token: TOKEN,
      language: 'uk',
      streak: 8,
      premiumActive: true,
    });
  });

  it('matches segment filters for language, Plus, and streak', () => {
    const job = normalizeAdminPushJob('job1', {
      mode: 'segment',
      notification: { title: 'T', body: 'B' },
      segment: { language: 'ru', premium: true, streakMin: 5 },
    });
    const users = [
      user({ uid: 'hit', premiumActive: true, streak: 6 }),
      user({ uid: 'free', premiumActive: false, streak: 6 }),
      user({ uid: 'streak-low', premiumActive: true, streak: 2 }),
      user({ uid: 'bad-token', premiumActive: true, streak: 9, token: 'bad' }),
    ];

    expect(selectAdminPushUsers(job, users, NOW).map((u) => u.uid)).toEqual(['hit']);
  });

  it('matches reactivation and scheduled audiences', () => {
    const reactivate = normalizeAdminPushJob('job1', {
      mode: 'reactivate',
      notification: { title: 'T', body: 'B' },
      reactivation: { daysMin: 7, daysMax: 30 },
    });
    const scheduled = normalizeAdminPushJob('job2', {
      mode: 'scheduled',
      notification: { title: 'T', body: 'B' },
      scheduledAt: new Date(NOW - 1).toISOString(),
      audience: 'inactive7',
    });
    const users = [
      user({ uid: 'old', lastActiveAtMs: NOW - 8 * 24 * 60 * 60 * 1000 }),
      user({ uid: 'recent', lastActiveAtMs: NOW - 2 * 24 * 60 * 60 * 1000 }),
    ];

    expect(selectAdminPushUsers(reactivate, users, NOW).map((u) => u.uid)).toEqual(['old']);
    expect(selectAdminPushUsers(scheduled, users, NOW).map((u) => u.uid)).toEqual(['old']);
    expect(matchesAdminPushScheduledAudience(user({ premiumActive: true }), 'premium', NOW)).toBe(true);
    expect(matchesAdminPushScheduledAudience(user({ premiumActive: true }), 'free', NOW)).toBe(false);
  });

  it('builds an Expo message with job metadata and action', () => {
    const job = normalizeAdminPushJob('job1', {
      mode: 'uid',
      uid: 'u1',
      notification: { title: 'Hi', body: 'Body' },
      action: 'open_lessons',
    });
    const message = buildAdminPushMessage(job, user());

    expect(message).toEqual({
      to: TOKEN,
      title: 'Hi',
      body: 'Body',
      sound: 'default',
      data: { type: 'admin_push', jobId: 'job1', mode: 'uid', action: 'open_lessons' },
    });
  });

  it('tracks accepted, failed, and expired Expo tickets', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { status: 'ok', id: 'ticket1' },
          { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
        ],
      }),
      text: async () => '',
    })) as unknown as typeof fetch;

    const summary = await sendExpoPushMessages(
      [
        { to: TOKEN, title: 'A', body: 'B', sound: 'default', data: { type: 'admin_push' } },
        { to: 'ExpoPushToken[expired]', title: 'A', body: 'B', sound: 'default', data: { type: 'admin_push' } },
      ],
      ['u1', 'u2'],
      fetchMock,
    );

    expect(summary.sentCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.ticketCount).toBe(1);
    expect(summary.expiredTokenUids).toEqual(['u2']);
  });

  it('keeps chunking at Expo batch size', () => {
    expect(chunkArray(Array.from({ length: 201 }, (_, i) => i), 100).map((c) => c.length)).toEqual([100, 100, 1]);
  });

  it('matches admin Plus logic for expired and active plans', () => {
    expect(isPremiumActive({ progress: { premium_plan: 'yearly', premium_expiry: String(NOW + 1) } }, NOW)).toBe(true);
    expect(isPremiumActive({ progress: { premium_plan: 'yearly', premium_expiry: String(NOW - 1) } }, NOW)).toBe(false);
  });

  // зачем (F08 «Два push»): прогон умер посередине → повторный не должен слать уже получившим.
  describe('журнал «кому уже отправляли» (досылка после обрыва)', () => {
    const msg = (to: string) => ({ to, title: 'A', body: 'B', sound: 'default' as const, data: { type: 'admin_push' } });
    const okFetch = () => jest.fn(async (_url: string, init: { body: string }) => ({
      ok: true,
      json: async () => ({ data: (JSON.parse(init.body) as unknown[]).map((_, i) => ({ status: 'ok', id: `t${i}` })) }),
      text: async () => '',
    }));
    function fakeJobRef() {
      const chunks: Array<Record<string, unknown>> = [];
      return {
        chunks,
        collection: () => ({
          doc: () => ({ set: async (data: Record<string, unknown>) => { chunks.push(data); } }),
          limit: () => ({ get: async () => ({ docs: chunks.map((c) => ({ get: (f: string) => c[f] })) }) }),
        }),
      };
    }

    it('получатели пачки записываются ДО сетевой отправки', async () => {
      const order: string[] = [];
      const fetchMock = jest.fn(async () => {
        order.push('fetch');
        return { ok: true, json: async () => ({ data: [{ status: 'ok', id: 't' }] }), text: async () => '' };
      });
      await sendExpoPushMessages([msg(TOKEN)], ['u1'], fetchMock as unknown as typeof fetch, async (uids) => {
        order.push(`record:${uids.join(',')}`);
      });
      expect(order).toEqual(['record:u1', 'fetch']);
    });

    it('запись в журнал не удалась — пачка не уходит', async () => {
      const fetchMock = okFetch();
      const summary = await sendExpoPushMessages([msg(TOKEN)], ['u1'], fetchMock as unknown as typeof fetch, async () => {
        throw new Error('journal_unavailable');
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(summary).toMatchObject({ sentCount: 0, failedCount: 1, failedChunks: 1 });
      expect(summary.errors).toContain('journal_unavailable');
    });

    it('повторный прогон после обрыва шлёт только тем, кому ещё не отправляли', async () => {
      const ref = fakeJobRef();
      const uids = Array.from({ length: 150 }, (_, i) => `u${i}`);
      const sentTo: string[] = [];
      // Прогон 1: первая пачка (100) уходит, на второй процесс «умирает» — журнал не пишется, сеть не зовётся.
      let chunkNo = 0;
      const dyingFetch = jest.fn(async (_url: string, init: { body: string }) => {
        for (const m of JSON.parse(init.body) as Array<{ to: string }>) sentTo.push(m.to);
        return { ok: true, json: async () => ({ data: [] }), text: async () => '' };
      });
      await sendExpoPushMessages(uids.map(msg), uids, dyingFetch as unknown as typeof fetch, async (chunkUids) => {
        chunkNo += 1;
        if (chunkNo === 2) throw new Error('process_died');
        await recordAdminPushAttempt(ref as never, chunkUids, NOW);
      });
      expect(sentTo).toHaveLength(100);

      // Прогон 2 (задачу взяли заново): читаем журнал, отсекаем уже получивших.
      const attempted = await readAdminPushAttemptedUids(ref as never);
      expect(attempted.size).toBe(100);
      const remaining = uids.filter((uid) => !attempted.has(uid));
      const fetch2 = jest.fn(async (_url: string, init: { body: string }) => {
        for (const m of JSON.parse(init.body) as Array<{ to: string }>) sentTo.push(m.to);
        return { ok: true, json: async () => ({ data: [] }), text: async () => '' };
      });
      await sendExpoPushMessages(remaining.map(msg), remaining, fetch2 as unknown as typeof fetch,
        (chunkUids) => recordAdminPushAttempt(ref as never, chunkUids, NOW));

      expect(sentTo).toHaveLength(150);
      expect(new Set(sentTo).size).toBe(150); // никто не получил дважды
      expect((await readAdminPushAttemptedUids(ref as never)).size).toBe(150);
    });
  });
});

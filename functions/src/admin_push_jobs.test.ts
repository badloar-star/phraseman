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
});

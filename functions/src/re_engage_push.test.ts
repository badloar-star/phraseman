/**
 * Тесты чистой логики re-engage push.
 * Покрываем отбор кандидатов, классификацию причин, анти-спам cooldown,
 * валидацию токена, локализацию текста и разбивку на чанки.
 * I/O (Firestore scan + Expo fetch) здесь не тестируется — только чистые функции.
 */
import {
  classifyReEngageUser,
  selectReEngageCandidates,
  buildExpoPushMessage,
  chunkMessages,
  isValidExpoPushToken,
  parseReEngageUser,
  INACTIVE_MIN_DAYS,
  INACTIVE_MAX_DAYS,
  STREAK_AT_RISK_MIN,
  REENGAGE_COOLDOWN_DAYS,
  type ReEngageUser,
  type ReEngageCandidate,
} from './re_engage_push';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const NOW = 1_750_000_000_000;
const TOKEN = 'ExponentPushToken[abc123]';

function user(overrides: Partial<ReEngageUser>): ReEngageUser {
  return {
    uid: 'u1',
    expoPushToken: TOKEN,
    pushTokenLang: 'ru',
    lastActiveAt: NOW - 5 * DAY,
    streakCount: 0,
    lastReEngagePushAt: null,
    userName: 'Тест',
    ...overrides,
  };
}

describe('isValidExpoPushToken', () => {
  it('принимает ExponentPushToken и ExpoPushToken', () => {
    expect(isValidExpoPushToken('ExponentPushToken[xxx]')).toBe(true);
    expect(isValidExpoPushToken('ExpoPushToken[yyy]')).toBe(true);
  });
  it('отклоняет мусор/пустое/не-строки', () => {
    expect(isValidExpoPushToken('')).toBe(false);
    expect(isValidExpoPushToken('random')).toBe(false);
    expect(isValidExpoPushToken(null)).toBe(false);
    expect(isValidExpoPushToken(123)).toBe(false);
    expect(isValidExpoPushToken('ExponentPushToken[]')).toBe(false);
  });
});

describe('parseReEngageUser', () => {
  it('извлекает поля из сырого документа (числа и строки)', () => {
    const parsed = parseReEngageUser('uX', {
      expoPushToken: TOKEN,
      pushTokenLang: 'es',
      last_active_at: NOW - 4 * DAY,
      lastReEngagePushAt: NOW - 10 * DAY,
      progress: { streak_count: '7', user_name: 'Ana' },
    });
    expect(parsed).toEqual({
      uid: 'uX',
      expoPushToken: TOKEN,
      pushTokenLang: 'es',
      pushTokenTimezone: null,
      lastActiveAt: NOW - 4 * DAY,
      streakCount: 7,
      lastReEngagePushAt: NOW - 10 * DAY,
      userName: 'Ana',
    });
  });
  it('терпит отсутствие полей', () => {
    const parsed = parseReEngageUser('uY', undefined);
    expect(parsed.lastActiveAt).toBeNull();
    expect(parsed.streakCount).toBeNull();
    expect(parsed.expoPushToken).toBeNull();
  });
});

describe('classifyReEngageUser', () => {
  it('streak_at_risk: есть серия, не заходил 22ч (< суток)', () => {
    const u = user({ streakCount: 5, lastActiveAt: NOW - 22 * HOUR });
    expect(classifyReEngageUser(u, NOW)).toBe('streak_at_risk');
  });

  it('НЕ streak_at_risk, если серия меньше порога', () => {
    const u = user({ streakCount: STREAK_AT_RISK_MIN - 1, lastActiveAt: NOW - 22 * HOUR });
    // 22ч < 3 дней → и не inactive_return
    expect(classifyReEngageUser(u, NOW)).toBeNull();
  });

  it('inactive_return: не заходил 5 дней', () => {
    const u = user({ streakCount: 0, lastActiveAt: NOW - 5 * DAY });
    expect(classifyReEngageUser(u, NOW)).toBe('inactive_return');
  });

  it('граница окна: ровно MIN дней — шлём', () => {
    const u = user({ lastActiveAt: NOW - INACTIVE_MIN_DAYS * DAY });
    expect(classifyReEngageUser(u, NOW)).toBe('inactive_return');
  });

  it('слишком давно (> MAX дней) — не шлём (мёртвый)', () => {
    const u = user({ lastActiveAt: NOW - (INACTIVE_MAX_DAYS + 1) * DAY });
    expect(classifyReEngageUser(u, NOW)).toBeNull();
  });

  it('заходил вчера (< MIN дней, без стрик-риска) — не шлём', () => {
    const u = user({ streakCount: 0, lastActiveAt: NOW - 1 * DAY });
    expect(classifyReEngageUser(u, NOW)).toBeNull();
  });

  it('cooldown: недавно уже слали — не шлём', () => {
    const u = user({
      lastActiveAt: NOW - 5 * DAY,
      lastReEngagePushAt: NOW - (REENGAGE_COOLDOWN_DAYS - 1) * DAY,
    });
    expect(classifyReEngageUser(u, NOW)).toBeNull();
  });

  it('cooldown истёк — снова можно слать', () => {
    const u = user({
      lastActiveAt: NOW - 5 * DAY,
      lastReEngagePushAt: NOW - (REENGAGE_COOLDOWN_DAYS + 1) * DAY,
    });
    expect(classifyReEngageUser(u, NOW)).toBe('inactive_return');
  });

  it('невалидный токен — не шлём', () => {
    expect(classifyReEngageUser(user({ expoPushToken: 'garbage' }), NOW)).toBeNull();
    expect(classifyReEngageUser(user({ expoPushToken: null }), NOW)).toBeNull();
  });

  it('нет lastActiveAt — не шлём', () => {
    expect(classifyReEngageUser(user({ lastActiveAt: null }), NOW)).toBeNull();
  });

  it('приоритет: стрик-риск важнее (серия 10, 23ч без захода)', () => {
    const u = user({ streakCount: 10, lastActiveAt: NOW - 23 * HOUR });
    expect(classifyReEngageUser(u, NOW)).toBe('streak_at_risk');
  });
});

describe('selectReEngageCandidates', () => {
  it('фильтрует и маппит только подходящих', () => {
    const users: ReEngageUser[] = [
      user({ uid: 'send_inactive', lastActiveAt: NOW - 5 * DAY }),
      user({ uid: 'skip_recent', lastActiveAt: NOW - 1 * DAY, streakCount: 0 }),
      user({ uid: 'send_streak', streakCount: 4, lastActiveAt: NOW - 21 * HOUR }),
      user({ uid: 'skip_token', expoPushToken: 'bad', lastActiveAt: NOW - 5 * DAY }),
    ];
    const got = selectReEngageCandidates(users, NOW);
    const uids = got.map((c) => c.uid).sort();
    expect(uids).toEqual(['send_inactive', 'send_streak']);
    const streakC = got.find((c) => c.uid === 'send_streak')!;
    expect(streakC.reason).toBe('streak_at_risk');
    expect(streakC.streakCount).toBe(4);
  });

  it('пустой вход → пустой выход', () => {
    expect(selectReEngageCandidates([], NOW)).toEqual([]);
  });
});

describe('buildExpoPushMessage', () => {
  const base: ReEngageCandidate = {
    uid: 'u1', token: TOKEN, lang: 'ru', reason: 'inactive_return', streakCount: 0, userName: '',
  };

  it('inactive_return на русском', () => {
    const m = buildExpoPushMessage(base);
    expect(m.to).toBe(TOKEN);
    expect(m.data.type).toBe('inactive_return');
    expect(m.sound).toBe('default');
    expect(m.title.length).toBeGreaterThan(0);
    expect(m.body.length).toBeGreaterThan(0);
  });

  it('streak_at_risk подставляет число серии', () => {
    const m = buildExpoPushMessage({ ...base, reason: 'streak_at_risk', streakCount: 12 });
    expect(m.title).toContain('12');
    expect(m.data.type).toBe('streak_at_risk');
  });

  it('неизвестный язык падает на ru (не падает)', () => {
    const m = buildExpoPushMessage({ ...base, lang: 'zz' });
    expect(m.title.length).toBeGreaterThan(0);
  });

  it.each(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'])('есть локализация для %s', (lang) => {
    const inactive = buildExpoPushMessage({ ...base, lang });
    const streak = buildExpoPushMessage({ ...base, lang, reason: 'streak_at_risk', streakCount: 5 });
    expect(inactive.title).toBeTruthy();
    expect(inactive.body).toBeTruthy();
    expect(streak.title).toContain('5');
  });
});

describe('chunkMessages', () => {
  it('режет по 100 по умолчанию', () => {
    const arr = Array.from({ length: 250 }, (_, i) => i);
    const chunks = chunkMessages(arr);
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBe(100);
    expect(chunks[2].length).toBe(50);
  });
  it('меньше размера — один чанк', () => {
    expect(chunkMessages([1, 2, 3], 100)).toEqual([[1, 2, 3]]);
  });
  it('пустой массив — нет чанков', () => {
    expect(chunkMessages([], 100)).toEqual([]);
  });
});

import {
  resolveExpiringAccess,
  classifyExpiryReminder,
  selectExpiryReminderCandidates,
  buildExpiryReminderMessage,
  REMINDER_COOLDOWN_DAYS,
  type ExpiryReminderUser,
} from './premium_expiry_reminder';

// Полдень UTC (14:00) — вне тихих часов 22:00–09:00, чтобы дневные кейсы не глушились.
const NOW = Date.UTC(2023, 10, 14, 14, 0, 0);
const DAY = 86_400_000;
const IN_3_DAYS = NOW + 3 * DAY + 60_000; // внутри окна [3,4) дня
const IN_10_DAYS = NOW + 10 * DAY;        // слишком рано
const IN_1_DAY = NOW + 1 * DAY;           // слишком поздно (последний день, не наш случай)
const PAST = NOW - DAY;

const TOKEN = 'ExponentPushToken[abc123]';

/** users/{uid}-подобный объект с прокинутым токеном и progress. */
function user(progress: Record<string, unknown>, extra: Partial<ExpiryReminderUser> = {}): ExpiryReminderUser {
  return {
    uid: 'u1',
    expoPushToken: TOKEN,
    pushTokenLang: 'ru',
    pushTokenTimezone: 'UTC',
    progress,
    lastExpiryReminderAt: null,
    ...extra,
  };
}

describe('resolveExpiringAccess — только конкретный срок в будущем', () => {
  test('месячная подписка со сроком через 3 дня → subscription', () => {
    const r = resolveExpiringAccess({ premium_plan: 'monthly', premium_expiry: String(IN_3_DAYS) }, NOW);
    expect(r).toEqual({ kind: 'subscription', expiryMs: IN_3_DAYS });
  });

  test('premium_expiry=0 но rc-срок в будущем → subscription по rc-сроку', () => {
    const r = resolveExpiringAccess(
      { premium_plan: 'yearly', premium_expiry: '0', premium_rc_expiry_ms: String(IN_3_DAYS) },
      NOW,
    );
    expect(r).toEqual({ kind: 'subscription', expiryMs: IN_3_DAYS });
  });

  test('lifetime (бессрочный, expiry=0 без rc) → null, продлевать нечего', () => {
    expect(resolveExpiringAccess({ premium_plan: 'lifetime', premium_expiry: '0' }, NOW)).toBeNull();
  });

  test('бессрочный store-премиум monthly с expiry=0 и без rc → null', () => {
    expect(resolveExpiringAccess({ premium_plan: 'monthly', premium_expiry: '0' }, NOW)).toBeNull();
  });

  test('админский override не считаем истекающей подпиской', () => {
    expect(
      resolveExpiringAccess(
        { premium_plan: 'monthly', premium_expiry: String(IN_3_DAYS), admin_premium_override: 'true' },
        NOW,
      ),
    ).toBeNull();
  });

  test('VIP со сроком через 3 дня → vip', () => {
    const r = resolveExpiringAccess({ vip_active: 'true', vip_until: String(IN_3_DAYS) }, NOW);
    expect(r).toEqual({ kind: 'vip', expiryMs: IN_3_DAYS });
  });

  test('бессрочный VIP (vip_until<=0) → null', () => {
    expect(resolveExpiringAccess({ vip_active: 'true', vip_until: '0' }, NOW)).toBeNull();
  });

  test('отозванный VIP → null даже если срок в будущем', () => {
    expect(
      resolveExpiringAccess({ vip_active: 'false', vip_admin_override: 'false', vip_until: String(IN_3_DAYS) }, NOW),
    ).toBeNull();
  });

  test('уже истёкшая подписка (срок в прошлом) → null', () => {
    expect(resolveExpiringAccess({ premium_plan: 'monthly', premium_expiry: String(PAST) }, NOW)).toBeNull();
  });

  test('нет доступа вообще → null', () => {
    expect(resolveExpiringAccess({}, NOW)).toBeNull();
  });
});

describe('classifyExpiryReminder — окно, токен, тихие часы, cooldown', () => {
  const sub = { premium_plan: 'monthly', premium_expiry: String(IN_3_DAYS) };

  test('в окне 3 дня + валидный токен + день по UTC → кандидат', () => {
    const c = classifyExpiryReminder(user(sub), NOW);
    expect(c).not.toBeNull();
    expect(c?.kind).toBe('subscription');
    expect(c?.expiryMs).toBe(IN_3_DAYS);
  });

  test('срок через 10 дней → рано, null', () => {
    expect(classifyExpiryReminder(user({ premium_plan: 'monthly', premium_expiry: String(IN_10_DAYS) }), NOW)).toBeNull();
  });

  test('срок через 1 день → поздно (вне [3,4) дня), null', () => {
    expect(classifyExpiryReminder(user({ premium_plan: 'monthly', premium_expiry: String(IN_1_DAY) }), NOW)).toBeNull();
  });

  test('нет валидного токена → null', () => {
    expect(classifyExpiryReminder(user(sub, { expoPushToken: 'garbage' }), NOW)).toBeNull();
    expect(classifyExpiryReminder(user(sub, { expoPushToken: null }), NOW)).toBeNull();
  });

  test('недавно уже напоминали (в пределах cooldown) → null', () => {
    const recent = NOW - (REMINDER_COOLDOWN_DAYS - 1) * DAY;
    expect(classifyExpiryReminder(user(sub, { lastExpiryReminderAt: recent }), NOW)).toBeNull();
  });

  test('напоминали давно (за пределами cooldown) → снова кандидат', () => {
    const old = NOW - (REMINDER_COOLDOWN_DAYS + 2) * DAY;
    expect(classifyExpiryReminder(user(sub, { lastExpiryReminderAt: old }), NOW)).not.toBeNull();
  });

  test('тихие часы (03:00 по локали юзера) → null, не будим ночью', () => {
    // 03:00 UTC: подберём now так, чтобы час по UTC = 3.
    const nightNow = Date.UTC(2023, 10, 15, 3, 0, 0);
    const expiry = nightNow + 3 * DAY + 60_000;
    const c = classifyExpiryReminder(
      user({ premium_plan: 'monthly', premium_expiry: String(expiry) }, { pushTokenTimezone: 'UTC' }),
      nightNow,
    );
    expect(c).toBeNull();
  });
});

describe('selectExpiryReminderCandidates + build', () => {
  test('отбирает только подходящих из смешанного списка', () => {
    const users: ExpiryReminderUser[] = [
      user({ premium_plan: 'monthly', premium_expiry: String(IN_3_DAYS) }, { uid: 'good' }),
      user({ premium_plan: 'lifetime', premium_expiry: '0' }, { uid: 'lifetime' }),
      user({ premium_plan: 'monthly', premium_expiry: String(IN_10_DAYS) }, { uid: 'early' }),
      user({ vip_active: 'true', vip_until: String(IN_3_DAYS) }, { uid: 'vip' }),
    ];
    // час дня NOW по UTC — проверим, что это не тихие часы, иначе тест-данные бессмысленны.
    const hour = new Date(NOW).getUTCHours();
    const expectGood = hour >= 9 && hour < 22;
    const got = selectExpiryReminderCandidates(users, NOW).map((c) => c.uid).sort();
    if (expectGood) {
      expect(got).toEqual(['good', 'vip']);
    } else {
      expect(got).toEqual([]);
    }
  });

  test('текст подписки и VIP различаются и содержат один эмодзи', () => {
    const subMsg = buildExpiryReminderMessage({ uid: 'u', token: TOKEN, lang: 'ru', kind: 'subscription', expiryMs: IN_3_DAYS });
    const vipMsg = buildExpiryReminderMessage({ uid: 'u', token: TOKEN, lang: 'ru', kind: 'vip', expiryMs: IN_3_DAYS });
    expect(subMsg.title).not.toBe(vipMsg.title);
    expect(subMsg.data.type).toBe('premium_expiry_reminder');
    expect(subMsg.to).toBe(TOKEN);
    // ровно один 💛
    expect((subMsg.title.match(/💛/g) || []).length).toBe(1);
  });

  test('неизвестный язык падает на ru', () => {
    const msg = buildExpiryReminderMessage({ uid: 'u', token: TOKEN, lang: 'zz', kind: 'subscription', expiryMs: IN_3_DAYS });
    expect(msg.title).toContain('Plus');
  });
});

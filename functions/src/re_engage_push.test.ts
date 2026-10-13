/**
 * Тесты чистой логики re-engage push.
 * Покрываем отбор кандидатов, классификацию причин, анти-спам cooldown,
 * валидацию токена, локализацию текста и разбивку на чанки.
 * I/O (Firestore scan + Expo fetch) здесь не тестируется — только чистые функции.
 */
import fs from 'fs';
import path from 'path';
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
  MAX_PUSHES_PER_RUN,
  capCandidates,
  summarizeQuietSkipped,
  reEngageUtcOffsetLabel,
  resolveReEngageTimezone,
  decideReEngageUser,
  summarizeReEngageTzSkips,
  logReEngageTzSkips,
  isInQuietHours,
  REENGAGE_TZ_LOG_MAX_GROUPS,
  type ReEngageTzSkipGroup,
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
      pushPrefs: null,
    });
  });
  it('парсит pushPrefs (булевы), мусор внутри игнорирует', () => {
    const parsed = parseReEngageUser('uZ', {
      pushPrefs: { streak: false, offers: 'да' },
    });
    expect(parsed.pushPrefs).toEqual({ streak: false, offers: undefined });
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

  it('pushPrefs.streak === false: стрик-риск НЕ шлём (юзер выключил категорию)', () => {
    const u = user({
      streakCount: STREAK_AT_RISK_MIN,
      lastActiveAt: NOW - 22 * HOUR,
      pushPrefs: { streak: false },
    });
    expect(classifyReEngageUser(u, NOW)).toBeNull();
  });
  // PM-200: решение изменено — «давно не заходил» подчиняется тому же opt-out
  // (pushPrefs.streak = master && «Серия под угрозой»), иначе выключить их было нельзя.
  it('PM-200: pushPrefs.streak === false глушит и inactive_return, и inactive_long', () => {
    expect(classifyReEngageUser(user({ lastActiveAt: NOW - 5 * DAY, pushPrefs: { streak: false } }), NOW)).toBeNull();
    expect(classifyReEngageUser(user({ lastActiveAt: NOW - 20 * DAY, pushPrefs: { streak: false } }), NOW)).toBeNull();
  });
  it('PM-200: offers=false не трогает inactive_return (другая категория), нет поля — шлём', () => {
    expect(classifyReEngageUser(user({ lastActiveAt: NOW - 5 * DAY, pushPrefs: { offers: false } }), NOW)).toBe('inactive_return');
    expect(classifyReEngageUser(user({ lastActiveAt: NOW - 20 * DAY, pushPrefs: null }), NOW)).toBe('inactive_long');
  });
  it('pushPrefs отсутствует (старый клиент) — стрик-риск шлём как раньше', () => {
    const u = user({ streakCount: STREAK_AT_RISK_MIN, lastActiveAt: NOW - 22 * HOUR, pushPrefs: null });
    expect(classifyReEngageUser(u, NOW)).toBe('streak_at_risk');
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

  it.each(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'])('есть локализация для %s', (lang) => {
    const inactive = buildExpoPushMessage({ ...base, lang });
    const streak = buildExpoPushMessage({ ...base, lang, reason: 'streak_at_risk', streakCount: 5 });
    expect(inactive.title).toBeTruthy();
    expect(inactive.body).toBeTruthy();
    expect(streak.title).toContain('5');
  });

  // зачем (EN_READINESS_R1): английский интерфейс не должен получать русский пуш (запасной язык — ru).
  it('en: английский текст, без кириллицы', () => {
    const inactive = buildExpoPushMessage({ ...base, lang: 'en' });
    const streak = buildExpoPushMessage({ ...base, lang: 'en', reason: 'streak_at_risk', streakCount: 5 });
    expect(streak.title).toBe('🔥 Your 5-day streak is waiting');
    expect(`${inactive.title}${inactive.body}${streak.body}`).not.toMatch(/[А-Яа-яЁё]/);
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

describe('проекция полей в скане users', () => {
  // зачем: скан users читает документы через .select(), чтобы не тянуть их целиком —
  // доки users самые «толстые» в базе. Но проекция и parseReEngageUser должны знать об
  // одних и тех же полях: добавят поле в парсер и забудут в .select() — оно молча придёт
  // пустым, кандидат отсеется, и пуш просто перестанет уходить. Молча. Этот храповик
  // ловит рассинхрон на CI, а не в проде.
  const source = fs.readFileSync(path.join(__dirname, 're_engage_push.ts'), 'utf8');
  const projection = source.slice(source.indexOf('.select('), source.indexOf('if (lastDoc)'));

  it.each([
    'expoPushToken',
    'pushTokenLang',
    'pushTokenTimezone',
    'last_active_at',
    'lastReEngagePushAt',
    'progress.streak_count',
    'progress.user_name',
    'pushPrefs',
  ])('проекция включает поле %s, которое читает parseReEngageUser', (field) => {
    expect(projection).toContain(`'${field}'`);
  });

  it('парсер не читает полей сверх спроецированных', () => {
    const parser = source.slice(
      source.indexOf('export function parseReEngageUser'),
      source.indexOf('/** Возвращает локальный час'),
    );
    // Все обращения вида data?.X и progress.X внутри парсера.
    const read = new Set<string>();
    for (const m of parser.matchAll(/data\?\.([a-zA-Z_0-9]+)/g)) read.add(m[1]);
    for (const m of parser.matchAll(/progress\.([a-zA-Z_0-9]+)/g)) read.add(`progress.${m[1]}`);
    read.delete('progress'); // сам объект progress, а не поле внутри него
    for (const field of read) {
      expect(projection).toContain(`'${field}'`);
    }
  });
});

describe('потолок рассылки за один прогон', () => {
  // зачем (аудит 2026-08-15): cooldown защищает КОНКРЕТНОГО человека от
  // повторного пуша, но общего потолка на прогон не было — цикл шёл по всей
  // коллекции users. Ошибка в условиях отбора означала бы веерную рассылку
  // всей базе за один заход, без единого подтверждения человеком.
  // Это класс инцидента Funko/itch.io: автоматика без потолка ломает громко.
  test('константа потолка существует и разумна', () => {
    expect(MAX_PUSHES_PER_RUN).toBeGreaterThan(0);
    // Достаточно для нормального дня и мало для катастрофы.
    expect(MAX_PUSHES_PER_RUN).toBeLessThanOrEqual(5_000);
  });

  test('лишние кандидаты отбрасываются, а не отправляются', () => {
    const many = Array.from({ length: MAX_PUSHES_PER_RUN + 250 }, (_, i) => ({
      uid: `u${i}`,
      token: `ExponentPushToken[${i}]`,
      reason: 'inactive_return' as const,
      lang: 'ru',
      userName: '',
      streakCount: 0,
    }));
    const capped = capCandidates(many);
    expect(capped.length).toBe(MAX_PUSHES_PER_RUN);
  });

  test('когда кандидатов меньше потолка — не трогаем никого', () => {
    const few = Array.from({ length: 5 }, (_, i) => ({
      uid: `u${i}`,
      token: `ExponentPushToken[${i}]`,
      reason: 'streak_at_risk' as const,
      lang: 'ru',
      userName: '',
      streakCount: 3,
    }));
    expect(capCandidates(few).length).toBe(5);
  });
});

// зачем (владелец 13.10 «сначала посчитать»): крон в 10:00 UTC — тихие часы не пускают Америку (UTC−2 и западнее) и UTC+12+.
// Счётчик по поясам; отбор не меняется.
describe('summarizeQuietSkipped', () => {
  const AT_10_UTC = Date.UTC(2026, 9, 13, 10, 0, 0);
  const inactive = AT_10_UTC - 5 * DAY;

  it('метка смещения пояса', () => {
    expect(reEngageUtcOffsetLabel(AT_10_UTC, 'America/New_York')).toBe('UTC-4');
    expect(reEngageUtcOffsetLabel(AT_10_UTC, 'Europe/Moscow')).toBe('UTC+3');
    expect(reEngageUtcOffsetLabel(AT_10_UTC, 'Asia/Kolkata')).toBe('UTC+5:30');
    expect(reEngageUtcOffsetLabel(AT_10_UTC, null)).toBe('no_tz');
    expect(reEngageUtcOffsetLabel(AT_10_UTC, 'Mars/Olympus')).toBe('bad_tz');
  });

  it('считает пропущенных тихими часами по поясам и тех, кто прошёл бы отбор; дневные пояса не считаются', () => {
    const users = [
      user({ uid: 'ny', pushTokenTimezone: 'America/New_York', lastActiveAt: inactive }),
      user({ uid: 'ny_cooldown', pushTokenTimezone: 'America/New_York', lastActiveAt: inactive, lastReEngagePushAt: AT_10_UTC - DAY }),
      user({ uid: 'akl', pushTokenTimezone: 'Pacific/Auckland', lastActiveAt: inactive }),
      user({ uid: 'msk', pushTokenTimezone: 'Europe/Moscow', lastActiveAt: inactive }),
      user({ uid: 'notz', pushTokenTimezone: null, lastActiveAt: inactive }),
    ];
    const res = summarizeQuietSkipped(users, AT_10_UTC);
    expect(res.quietSkipped).toBe(3);
    expect(res.quietWouldBeCandidates).toBe(2);
    expect(res.quietByOffset['UTC-4']).toEqual({ skipped: 2, wouldBe: 1 });
    expect(res.quietByOffset['UTC+13']).toEqual({ skipped: 1, wouldBe: 1 });
    expect(res.quietByOffset['UTC+3']).toBeUndefined();
  });

  it('отбор не изменился: тихие часы по-прежнему не пускают', () => {
    const u = user({ pushTokenTimezone: 'America/New_York', lastActiveAt: inactive });
    expect(classifyReEngageUser(u, AT_10_UTC)).toBeNull();
    expect(classifyReEngageUser(u, AT_10_UTC, { ignoreQuietHours: true })).toBe('inactive_return');
  });
});

// зачем (координатор 13.10, «Америка — крупный рынок»): второй прогон 22:00 UTC + пояс по языку, если устройство пояс не прислало.
describe('пуши «вернись» доходят до каждого пояса', () => {
  const RUN_HOURS_UTC = [10, 22];
  // Etc/GMT+N — это UTC−N (знак в именах Etc обратный).
  const WHOLE_OFFSETS = Array.from({ length: 27 }, (_, i) => i - 12).map((offset) => (
    offset === 0 ? 'Europe/London' : `Etc/GMT${offset > 0 ? '-' : '+'}${Math.abs(offset)}`
  ));
  const HALF_OFFSETS = ['America/St_Johns', 'Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Adelaide', 'Pacific/Chatham', 'Pacific/Marquesas'];
  const DAYS = [Date.UTC(2026, 9, 13), Date.UTC(2026, 0, 15), Date.UTC(2026, 6, 1)];

  it('каждый пояс UTC−12…+14 (и получасовые) хотя бы в одном прогоне днём по местному времени', () => {
    const notCovered: string[] = [];
    for (const day of DAYS) {
      for (const tz of [...WHOLE_OFFSETS, ...HALF_OFFSETS]) {
        const covered = RUN_HOURS_UTC.some((h) => !isInQuietHours(day + h * HOUR, tz));
        if (!covered) notCovered.push(`${new Date(day).toISOString().slice(0, 10)} ${tz}`);
      }
    }
    expect(notCovered).toEqual([]);
  });

  it('расписание крона — 10:00 и 22:00 UTC', () => {
    const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(index).toMatch(/reEngagePushCron = functions\.scheduler\.onSchedule\(\s*\{ schedule: "0 10,22 \* \* \*", timeZone: "UTC" \}/);
  });

  it('Нью-Йорк: ночью в 10:00 UTC пропуск по тихим часам, в 22:00 UTC — пуш', () => {
    const at10 = Date.UTC(2026, 9, 13, 10);
    const at22 = Date.UTC(2026, 9, 13, 22);
    const ny = user({ pushTokenTimezone: 'America/New_York', pushTokenLang: 'en', lastActiveAt: at10 - 5 * DAY });
    expect(decideReEngageUser(ny, at10)).toEqual({ reason: null, skip: 'quiet_hours' });
    expect(decideReEngageUser(ny, at22)).toEqual({ reason: 'inactive_return', skip: null });
  });

  it('пересечение двух прогонов не даёт второго пуша в те же сутки (cooldown)', () => {
    const at10 = Date.UTC(2026, 9, 13, 10);
    const at22 = Date.UTC(2026, 9, 13, 22);
    const bangkok = user({ pushTokenTimezone: 'Asia/Bangkok', lastActiveAt: at10 - 5 * DAY });
    expect(decideReEngageUser(bangkok, at10).reason).toBe('inactive_return');
    expect(decideReEngageUser({ ...bangkok, lastReEngagePushAt: at10 }, at22).skip).toBe('quiet_hours');
    const magadan = user({ pushTokenTimezone: 'Etc/GMT-11', lastActiveAt: at10 - 5 * DAY });
    expect(decideReEngageUser(magadan, at10).reason).toBe('inactive_return');
    expect(decideReEngageUser({ ...magadan, lastReEngagePushAt: at10 }, at22)).toEqual({ reason: null, skip: 'cooldown' });
  });

  it('пояс: устройство → язык → UTC', () => {
    expect(resolveReEngageTimezone({ pushTokenTimezone: 'America/Chicago', pushTokenLang: 'ru' })).toEqual({ timezone: 'America/Chicago', source: 'device' });
    expect(resolveReEngageTimezone({ pushTokenTimezone: 'UTC', pushTokenLang: 'ru' })).toEqual({ timezone: 'Europe/Moscow', source: 'lang_default' });
    expect(resolveReEngageTimezone({ pushTokenTimezone: 'Etc/UTC', pushTokenLang: 'pt-BR' })).toEqual({ timezone: 'America/Sao_Paulo', source: 'lang_default' });
    expect(resolveReEngageTimezone({ pushTokenTimezone: null, pushTokenLang: 'vi' })).toEqual({ timezone: 'Asia/Ho_Chi_Minh', source: 'lang_default' });
    expect(resolveReEngageTimezone({ pushTokenTimezone: 'Mars/Olympus', pushTokenLang: 'uk' })).toEqual({ timezone: 'Europe/Kyiv', source: 'lang_default' });
    expect(resolveReEngageTimezone({ pushTokenTimezone: null, pushTokenLang: 'en' })).toEqual({ timezone: 'UTC', source: 'utc_fallback' });
    expect(resolveReEngageTimezone({ pushTokenTimezone: 'UTC', pushTokenLang: 'es' })).toEqual({ timezone: 'UTC', source: 'utc_fallback' });
    expect(resolveReEngageTimezone({ pushTokenTimezone: undefined, pushTokenLang: null })).toEqual({ timezone: 'UTC', source: 'utc_fallback' });
  });

  it('пояс по языку решает тихие часы, когда устройство прислало UTC', () => {
    const at22 = Date.UTC(2026, 9, 13, 22); // Москва 01:00 — ночь; UTC 22:00 — тоже ночь
    const at10 = Date.UTC(2026, 9, 13, 10);
    const saoPauloNoTz = user({ pushTokenTimezone: 'UTC', pushTokenLang: 'pt-BR', lastActiveAt: at10 - 5 * DAY });
    // 10:00 UTC = 07:00 в Сан-Паулу — ночь (по UTC было бы 10:00 — день, и пуш ушёл бы в 7 утра).
    expect(decideReEngageUser(saoPauloNoTz, at10).skip).toBe('quiet_hours');
    // 22:00 UTC = 19:00 в Сан-Паулу — день.
    expect(decideReEngageUser(saoPauloNoTz, at22).reason).toBe('inactive_return');
  });

  it('причины пропуска: нет токена, нет активности, cooldown, отписка, рано', () => {
    const at = Date.UTC(2026, 9, 13, 10);
    const base = { pushTokenTimezone: 'Europe/Moscow', lastActiveAt: at - 5 * DAY };
    expect(decideReEngageUser(user({ ...base, expoPushToken: 'bad' }), at).skip).toBe('no_token');
    expect(decideReEngageUser(user({ ...base, lastActiveAt: null }), at).skip).toBe('no_activity');
    expect(decideReEngageUser(user({ ...base, lastReEngagePushAt: at - DAY }), at).skip).toBe('cooldown');
    expect(decideReEngageUser(user({ ...base, pushPrefs: { streak: false } }), at).skip).toBe('opted_out');
    expect(decideReEngageUser(user({ ...base, lastActiveAt: at - HOUR }), at).skip).toBe('not_due');
  });

  it('[REENGAGE-TZ]: группы (причина, источник пояса, пояс, местный час) с числом, без uid', () => {
    const at10 = Date.UTC(2026, 9, 13, 10);
    const users = [
      user({ uid: 'secret_ny_1', pushTokenTimezone: 'America/New_York', lastActiveAt: at10 - 5 * DAY }),
      user({ uid: 'secret_ny_2', pushTokenTimezone: 'America/New_York', lastActiveAt: at10 - 6 * DAY }),
      user({ uid: 'secret_msk', pushTokenTimezone: 'Europe/Moscow', lastActiveAt: at10 - HOUR }),
      user({ uid: 'secret_sent', pushTokenTimezone: 'Europe/Moscow', lastActiveAt: at10 - 5 * DAY }),
    ];
    const groups = summarizeReEngageTzSkips(users, at10);
    expect(groups).toEqual([
      { reason: 'quiet_hours', tzSource: 'device', timezone: 'America/New_York', localHour: 6, count: 2 },
      { reason: 'not_due', tzSource: 'device', timezone: 'Europe/Moscow', localHour: 13, count: 1 },
    ]);
    const lines: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
    try {
      logReEngageTzSkips(groups, at10);
    } finally {
      spy.mockRestore();
    }
    expect(lines.filter((l) => l.startsWith('[REENGAGE-TZ] skip'))).toHaveLength(2);
    expect(lines.some((l) => l.startsWith('[REENGAGE-TZ] summary'))).toBe(true);
    expect(lines.join('\n')).not.toMatch(/secret_/);
    expect(lines[0]).toContain('"tz":"America/New_York"');
    expect(lines[0]).toContain('"localHour":6');
    expect(lines[0]).toContain('"reason":"quiet_hours"');
  });

  it('[REENGAGE-TZ]: строк не больше потолка, остальное — в итоге', () => {
    const groups: ReEngageTzSkipGroup[] = Array.from({ length: REENGAGE_TZ_LOG_MAX_GROUPS + 5 }, (_, i) => ({
      reason: 'not_due', tzSource: 'device', timezone: `Zone/${i}`, localHour: 12, count: 1,
    }));
    const lines: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
    try {
      logReEngageTzSkips(groups, Date.UTC(2026, 9, 13, 22));
    } finally {
      spy.mockRestore();
    }
    expect(lines.filter((l) => l.startsWith('[REENGAGE-TZ] skip'))).toHaveLength(REENGAGE_TZ_LOG_MAX_GROUPS);
    const summary = lines.find((l) => l.startsWith('[REENGAGE-TZ] summary')) ?? '';
    expect(summary).toContain('"groupsNotShown":5');
    expect(summary).toContain('"runUtcHour":22');
  });
});

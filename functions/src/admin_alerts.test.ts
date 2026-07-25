import {
  formatContentReportAlert,
  formatContentReportAlertSafe,
  isAuthFailureErrorDoc,
  nextAuthFailureSpikeState,
} from './admin_alerts';

const TELEGRAM_TEXT_LIMIT = 4096;

const baseReport = {
  uid: 'stable_abcd1234',
  authUid: 'auth_xyz',
  platform: 'android',
  appVersion: '1.4.2',
  screen: 'lesson1',
  category: 'free_text',
  dataId: 'lesson3_phrase_2',
  dataText: 'Я пью кофе каждое утро.\nI drink coffee every morning.',
  userAnswer: 'I drink a coffee every morning',
  comment: 'Тут лишний артикль в ответе, а приложение говорит что я неправ',
  deviceModel: 'Pixel 7',
  deviceOS: 'Android',
  deviceOSVersion: '14',
  userName: 'Лена',
  userLevel: 12,
  userXP: 3400,
  userStreak: 5,
  userPremium: true,
  userDaysInApp: 21,
};

describe('formatContentReportAlert', () => {
  it('включает полный текст репорта: комментарий, контент, ответ юзера, экран, dataId, юзера', () => {
    const text = formatContentReportAlert(baseReport);
    expect(text).toContain('Content-репорт');
    expect(text).toContain('Тут лишний артикль в ответе, а приложение говорит что я неправ');
    expect(text).toContain('Я пью кофе каждое утро.');
    expect(text).toContain('I drink coffee every morning.');
    expect(text).toContain('I drink a coffee every morning');
    expect(text).toContain('lesson1');
    expect(text).toContain('lesson3_phrase_2');
    expect(text).toContain('Лена');
    expect(text).toContain('#1234'); // хвост stable uid
    expect(text).toContain('Premium');
  });

  it('экранирует HTML в пользовательском тексте (parse_mode=HTML не должен ломаться)', () => {
    const text = formatContentReportAlert({
      ...baseReport,
      comment: 'тег <b>жирный</b> & "кавычки"',
      dataText: '<script>alert(1)</script>',
    });
    expect(text).not.toContain('<script>');
    expect(text).toContain('&lt;script&gt;');
    expect(text).toContain('тег &lt;b&gt;жирный&lt;/b&gt; &amp;');
  });

  it('не печатает строку «Ответ юзера» когда ответа нет', () => {
    const text = formatContentReportAlert({ ...baseReport, userAnswer: '' });
    expect(text).not.toContain('Ответ юзера');
  });

  it('скрывает категорию free_text, но показывает кастомную', () => {
    expect(formatContentReportAlert(baseReport)).not.toContain('free_text');
    expect(formatContentReportAlert({ ...baseReport, category: 'wrong_translation' }))
      .toContain('wrong_translation');
  });
});

describe('formatContentReportAlertSafe', () => {
  it('обычный репорт проходит без обрезки', () => {
    const text = formatContentReportAlertSafe(baseReport);
    expect(text).toContain('Тут лишний артикль');
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_TEXT_LIMIT);
  });

  it('гигантские поля ужимаются под лимит Telegram (4096)', () => {
    const huge = {
      ...baseReport,
      comment: 'к'.repeat(2000),
      dataText: 'т&т<т>'.repeat(900), // 5400 сырых символов + раздувание при экранировании
      userAnswer: 'о'.repeat(1000),
    };
    const text = formatContentReportAlertSafe(huge);
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_TEXT_LIMIT);
    // сообщение остаётся валидным HTML: <pre> закрыт, и комментарий присутствует (пусть и обрезанный)
    expect((text.match(/<pre>/g) || []).length).toBe((text.match(/<\/pre>/g) || []).length);
    expect(text).toContain('кккк');
  });

  it('держит лимит даже при патологическом экранировании (сплошные &)', () => {
    const nasty = {
      ...baseReport,
      comment: '&'.repeat(2000),
      dataText: '&'.repeat(5000),
      userAnswer: '&'.repeat(1000),
      userName: '&'.repeat(60),
    };
    const text = formatContentReportAlertSafe(nasty);
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_TEXT_LIMIT);
  });
});

// зачем: adminAlertOnAuthFailureSpike — новый триггер на КАЖДЫЙ документ app_errors.
// Тестов не было. Здесь два риска, которые нельзя ловить в проде:
// 1) стоимость/спам — при аварии ошибок тысячи, а Telegram должен получить ОДИН алерт
//    в час (cooldown), иначе бот зальёт чат и сожжёт вызовы функции;
// 2) слепота — если окно не сбрасывается или порог считается неверно, всплеск входа
//    (а это отвал авторизации у живых юзеров) останется незамеченным.
const HOUR_MS = 60 * 60 * 1000;

describe('isAuthFailureErrorDoc', () => {
  it('ловит auth-ошибки по feature и по context, не реагируя на прочие', () => {
    expect(isAuthFailureErrorDoc({ feature: 'auth' })).toBe(true);
    expect(isAuthFailureErrorDoc({ context: 'auth:signin_failure' })).toBe(true);
    // Регистр и пробелы приходят из клиента как попало.
    expect(isAuthFailureErrorDoc({ feature: '  AUTH  ' })).toBe(true);

    // Чужие ошибки НЕ должны заводить окно — иначе алерт про вход врёт.
    expect(isAuthFailureErrorDoc({ feature: 'lesson' })).toBe(false);
    expect(isAuthFailureErrorDoc({ context: 'payment:failed' })).toBe(false);
    expect(isAuthFailureErrorDoc({})).toBe(false);
    // Похожее, но не то: подстрока не считается совпадением.
    expect(isAuthFailureErrorDoc({ feature: 'oauth_provider' })).toBe(false);
  });
});

describe('nextAuthFailureSpikeState', () => {
  const base = { lastAlertedAt: 0, now: 1_000_000, threshold: 3 };

  it('первое событие открывает окно и НЕ алертит', () => {
    const res = nextAuthFailureSpikeState({ ...base, window: undefined });
    expect(res).toMatchObject({ shouldAlert: false, count: 1, alertedAt: null });
    expect(res.window).toMatchObject({ since: base.now, count: 1 });
  });

  it('алертит ровно при достижении порога, но не раньше', () => {
    const since = base.now - 10 * 60 * 1000; // 10 минут назад — окно живо
    const below = nextAuthFailureSpikeState({ ...base, window: { since, count: 1 } });
    expect(below).toMatchObject({ shouldAlert: false, count: 2 });

    const atThreshold = nextAuthFailureSpikeState({ ...base, window: { since, count: 2 } });
    expect(atThreshold).toMatchObject({ shouldAlert: true, count: 3, alertedAt: base.now });
    // Окно НЕ сбрасывается алертом — счёт продолжается, since сохраняется.
    expect(atThreshold.window.since).toBe(since);
  });

  it('молчит в час cooldown после алерта, даже когда ошибки продолжаются', () => {
    const since = base.now - 10 * 60 * 1000;
    const inCooldown = nextAuthFailureSpikeState({
      ...base,
      window: { since, count: 50 },
      lastAlertedAt: base.now - 5 * 60 * 1000, // алертили 5 минут назад
    });
    // Это и есть защита от спама/стоимости: 50 ошибок, но второго сообщения нет.
    expect(inCooldown).toMatchObject({ shouldAlert: false, alertedAt: null });
    expect(inCooldown.count).toBe(51); // счёт при этом продолжает идти

    const afterCooldown = nextAuthFailureSpikeState({
      ...base,
      window: { since, count: 50 },
      lastAlertedAt: base.now - HOUR_MS - 1,
    });
    expect(afterCooldown.shouldAlert).toBe(true);
  });

  it('сбрасывает окно старше часа — старые ошибки не копятся вечно', () => {
    const stale = base.now - HOUR_MS - 1;
    const res = nextAuthFailureSpikeState({ ...base, window: { since: stale, count: 999 } });
    // Новое окно с нуля: иначе один давний всплеск алертил бы вечно.
    expect(res).toMatchObject({ shouldAlert: false, count: 1 });
    expect(res.window.since).toBe(base.now);
  });

  it('считает stage и не даёт тегам раздувать документ', () => {
    const since = base.now - 60_000;
    const counted = nextAuthFailureSpikeState({
      ...base, window: { since, count: 1, stages: { google: 2 } }, stage: 'google',
    });
    expect(counted.window.stages).toEqual({ google: 3 });

    // Кап 8 stage: девятый НОВЫЙ ключ игнорируется (документ конфига не растёт без предела).
    const full: Record<string, number> = {};
    for (let i = 0; i < 8; i += 1) full[`stage-${i}`] = 1;
    const overflow = nextAuthFailureSpikeState({
      ...base, window: { since, count: 1, stages: full }, stage: 'stage-new',
    });
    expect(Object.keys(overflow.window.stages)).toHaveLength(8);
    expect(overflow.window.stages['stage-new']).toBeUndefined();

    // …но УЖЕ известный stage продолжает считаться и при полной карте.
    const existing = nextAuthFailureSpikeState({
      ...base, window: { since, count: 1, stages: full }, stage: 'stage-0',
    });
    expect(existing.window.stages['stage-0']).toBe(2);
  });

  it('переживает мусорное состояние из Firestore', () => {
    const res = nextAuthFailureSpikeState({
      ...base,
      window: { since: undefined, count: undefined, stages: undefined },
    });
    expect(res).toMatchObject({ shouldAlert: false, count: 1 });
    expect(res.window.stages).toEqual({});
  });
});

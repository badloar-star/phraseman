import {
  isAuthFailureErrorDoc,
  nextAuthFailureSpikeState,
} from './admin_alerts';

// зачем (§CORE-0160): тесты прямых форматтеров удалены вместе с ними — Telegram-тексты сбоев и жалоб
// проверяются на общем пути: admin_alert_privacy.test.ts и telegram_pii_guard.test.ts.

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

// зачем (владелец 21.10, эталон plus-launch-etalon.html, №35): правила показа заставки Plus — раз в 14 дней, не в первые 3 дня,
// после 3× «Не сейчас» раз в 30 дней, не с Plus и 30 дней после его окончания, не без магазина. Каждое решение несёт причину для журнала.
import {
  PLUS_SPLASH_AFTER_PLUS_QUIET_MS, PLUS_SPLASH_AFTER_REFUSALS_INTERVAL_MS, PLUS_SPLASH_INTERVAL_MS, PLUS_SPLASH_MIN_INSTALL_AGE_MS,
  decidePlusSplash, plusSplashIntervalMs, type PlusSplashFacts,
} from '../app/plus_splash_policy';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 21, 12, 0, 0);

const base: PlusSplashFacts = {
  nowMs: NOW, accessResolved: true, hasPremiumAccess: false, installedAtMs: NOW - 40 * DAY, lastShownAtMs: null,
  refusalsInRow: 0, lastPlusExpiryMs: null, storeUnavailable: null,
};
const decide = (over: Partial<PlusSplashFacts> = {}) => decidePlusSplash({ ...base, ...over });

describe('Plus splash policy (№35)', () => {
  it('константы — как в эталоне', () => {
    expect(PLUS_SPLASH_INTERVAL_MS).toBe(14 * DAY);
    expect(PLUS_SPLASH_AFTER_REFUSALS_INTERVAL_MS).toBe(30 * DAY);
    expect(PLUS_SPLASH_MIN_INSTALL_AGE_MS).toBe(3 * DAY);
    expect(PLUS_SPLASH_AFTER_PLUS_QUIET_MS).toBe(30 * DAY);
  });

  it('старый пользователь без Plus, ни разу не показывали → показать (show_first)', () => {
    const d = decide();
    expect(d).toMatchObject({ show: true, reason: 'show_first' });
    expect(d.detail).toContain('ещё не показывали');
  });

  it('доступ ещё не проверен → не показываем (access_unresolved), даже без Plus', () => {
    expect(decide({ accessResolved: false })).toMatchObject({ show: false, reason: 'access_unresolved' });
  });

  it('Plus / VIP / пробный (hasPremiumAccess) → не показываем (has_plus)', () => {
    expect(decide({ hasPremiumAccess: true })).toMatchObject({ show: false, reason: 'has_plus' });
  });

  it('первые 3 дня после установки → не показываем (recent_install); ровно 3 дня → можно', () => {
    expect(decide({ installedAtMs: NOW - 2 * DAY })).toMatchObject({ show: false, reason: 'recent_install' });
    expect(decide({ installedAtMs: NOW - 3 * DAY + 1 })).toMatchObject({ show: false, reason: 'recent_install' });
    expect(decide({ installedAtMs: NOW - 3 * DAY })).toMatchObject({ show: true });
  });

  it('дата установки неизвестна / мусор → не показываем (install_date_unknown)', () => {
    for (const installedAtMs of [null, 0, -5, Number.NaN]) {
      expect(decide({ installedAtMs })).toMatchObject({ show: false, reason: 'install_date_unknown' });
    }
  });

  it('раз в 14 дней: 13 дней — рано, 14 — можно (show_due)', () => {
    expect(decide({ lastShownAtMs: NOW - 13 * DAY })).toMatchObject({ show: false, reason: 'interval_not_elapsed' });
    expect(decide({ lastShownAtMs: NOW - 14 * DAY })).toMatchObject({ show: true, reason: 'show_due' });
  });

  it('после трёх «Не сейчас» подряд — раз в 30 дней', () => {
    expect(plusSplashIntervalMs(2)).toBe(14 * DAY);
    expect(plusSplashIntervalMs(3)).toBe(30 * DAY);
    expect(plusSplashIntervalMs(9)).toBe(30 * DAY);
    expect(decide({ refusalsInRow: 2, lastShownAtMs: NOW - 15 * DAY })).toMatchObject({ show: true, reason: 'show_due' });
    expect(decide({ refusalsInRow: 3, lastShownAtMs: NOW - 15 * DAY })).toMatchObject({ show: false, reason: 'interval_not_elapsed' });
    expect(decide({ refusalsInRow: 3, lastShownAtMs: NOW - 30 * DAY })).toMatchObject({ show: true, reason: 'show_due' });
  });

  it('30 дней тишины после окончания Plus (after_plus_quiet), потом можно', () => {
    expect(decide({ lastPlusExpiryMs: NOW - 10 * DAY })).toMatchObject({ show: false, reason: 'after_plus_quiet' });
    expect(decide({ lastPlusExpiryMs: NOW - 29 * DAY })).toMatchObject({ show: false, reason: 'after_plus_quiet' });
    expect(decide({ lastPlusExpiryMs: NOW - 30 * DAY })).toMatchObject({ show: true });
    // нулевое / отсутствующее окончание — не блокирует
    expect(decide({ lastPlusExpiryMs: 0 })).toMatchObject({ show: true });
  });

  it('магазина на устройстве нет (billing_unavailable) → не показываем; «ещё не знаем» (null) не блокирует', () => {
    expect(decide({ storeUnavailable: true })).toMatchObject({ show: false, reason: 'store_unavailable' });
    expect(decide({ storeUnavailable: false })).toMatchObject({ show: true });
    expect(decide({ storeUnavailable: null })).toMatchObject({ show: true });
  });

  it('метка прошлого показа из будущего (часы переводили) не блокирует навсегда, причина — в detail', () => {
    const d = decide({ lastShownAtMs: NOW + 400 * DAY });
    expect(d).toMatchObject({ show: true, reason: 'show_due' });
    expect(d.detail).toContain('из будущего');
  });

  it('порядок причин: нет Plus-проверки раньше всего, затем установка, затем окончание Plus, затем интервал', () => {
    expect(decide({ accessResolved: false, hasPremiumAccess: true })).toMatchObject({ reason: 'access_unresolved' });
    expect(decide({ hasPremiumAccess: true, installedAtMs: null })).toMatchObject({ reason: 'has_plus' });
    expect(decide({ installedAtMs: NOW - DAY, lastPlusExpiryMs: NOW - DAY })).toMatchObject({ reason: 'recent_install' });
    expect(decide({ lastPlusExpiryMs: NOW - DAY, lastShownAtMs: NOW - DAY })).toMatchObject({ reason: 'after_plus_quiet' });
  });

  it('каждое решение несёт непустую причину и подробность для журнала [PLUS-SPLASH]', () => {
    for (const over of [{}, { accessResolved: false }, { hasPremiumAccess: true }, { installedAtMs: null }, { lastShownAtMs: NOW - DAY }, { storeUnavailable: true }]) {
      const d = decide(over as Partial<PlusSplashFacts>);
      expect(d.reason.length).toBeGreaterThan(0);
      expect(d.detail.length).toBeGreaterThan(0);
    }
  });
});

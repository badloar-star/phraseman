// Раунд 2, Настройки п.1: 7 тапов по «Версия» — тост «Спасибо, что учишься с нами N дней»; долгое нажатие копирует «версия + сборка».
import { VERSION_TAPS_NEEDED, VERSION_TAP_WINDOW_MS, daysWithUs, nextVersionTap, versionThanksText } from '../app/settings_version_footer';

describe('счёт тапов по версии', () => {
  it('7 тапов подряд срабатывают, после срабатывания счёт обнуляется', () => {
    let state = { count: 0, lastAtMs: 0 };
    let fired = false;
    for (let i = 0; i < VERSION_TAPS_NEEDED; i += 1) ({ state, fired } = nextVersionTap(state, 1000 + i * 300));
    expect(fired).toBe(true);
    expect(state.count).toBe(0);
  });
  it('пауза дольше окна сбрасывает счёт', () => {
    let state = { count: 0, lastAtMs: 0 };
    for (let i = 0; i < 5; i += 1) ({ state } = nextVersionTap(state, 1000 + i * 300));
    ({ state } = nextVersionTap(state, 1000 + 5 * 300 + VERSION_TAP_WINDOW_MS + 1));
    expect(state.count).toBe(1);
  });
  it('шестого тапа мало', () => {
    let state = { count: 0, lastAtMs: 0 };
    let fired = false;
    for (let i = 0; i < 6; i += 1) ({ state, fired } = nextVersionTap(state, 1000 + i * 300));
    expect(fired).toBe(false);
  });
});

describe('дни «с нами»', () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  it('считает целые дни', () => { expect(daysWithUs(now - 10.5 * 86_400_000, now)).toBe(10); });
  it('нет даты, будущее или мусор — null', () => {
    expect(daysWithUs(null, now)).toBeNull();
    expect(daysWithUs(now + 1000, now)).toBeNull();
    expect(daysWithUs(Number.NaN, now)).toBeNull();
  });
  it('в первые сутки — «1 день», а не 0', () => { expect(daysWithUs(now - 3600_000, now)).toBe(1); });
});

describe('тексты', () => {
  it('русское склонение дней', () => {
    expect(versionThanksText('ru', 1)).toContain('1 день');
    expect(versionThanksText('ru', 3)).toContain('3 дня');
    expect(versionThanksText('ru', 11)).toContain('11 дней');
    expect(versionThanksText('ru', 21)).toContain('21 день');
  });
});

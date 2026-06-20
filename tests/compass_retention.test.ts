import {
  decideRetentionPush,
  needsComebackDay,
  STREAK_LOSS_FRAMING_MIN_DAYS,
  COMEBACK_PAUSE_MS,
} from '../app/compass/compass_retention';

const NOW = 10_000_000_000;
const HOUR = 60 * 60 * 1000;

describe('compass_retention — выбор пуша', () => {
  it('долгая пауза → тёплый возврат (gain-framing)', () => {
    const d = decideRetentionPush({
      lastSeenAtMs: NOW - COMEBACK_PAUSE_MS - HOUR,
      nowMs: NOW,
      streakDays: 4,
      hasNewPhrases: true,
    });
    expect(d.kind).toBe('comeback');
    expect(d.text?.ru).toContain('Всё твоё на месте');
  });

  it('серия 7+ дней, не заходил сегодня → loss-framing «серия ждёт»', () => {
    const d = decideRetentionPush({
      lastSeenAtMs: NOW - 14 * HOUR,
      nowMs: NOW,
      streakDays: STREAK_LOSS_FRAMING_MIN_DAYS,
      hasNewPhrases: false,
    });
    expect(d.kind).toBe('streak_keep');
    expect(d.days).toBe(7);
  });

  it('серия <7 дней → только gain-framing (правило Библии)', () => {
    const d = decideRetentionPush({
      lastSeenAtMs: NOW - 14 * HOUR,
      nowMs: NOW,
      streakDays: 3,
      hasNewPhrases: false,
    });
    expect(d.kind).toBe('streak_gain');
    expect(d.text?.ru).not.toContain('ждёт');
  });

  it('есть новые фразы, недавно заходил → приглашение к новым фразам', () => {
    const d = decideRetentionPush({
      lastSeenAtMs: NOW - 1 * HOUR,
      nowMs: NOW,
      streakDays: 0,
      hasNewPhrases: true,
    });
    expect(d.kind).toBe('new_phrases');
  });

  it('нет повода → none (Компас не шумит)', () => {
    const d = decideRetentionPush({
      lastSeenAtMs: NOW - 1 * HOUR,
      nowMs: NOW,
      streakDays: 0,
      hasNewPhrases: false,
    });
    expect(d.kind).toBe('none');
    expect(d.text).toBeNull();
  });
});

describe('compass_retention — день-возврат', () => {
  it('пауза дольше порога → нужен день-возврат', () => {
    expect(needsComebackDay(NOW - COMEBACK_PAUSE_MS - 1, NOW)).toBe(true);
  });
  it('недавно заходил → день-возврат не нужен', () => {
    expect(needsComebackDay(NOW - HOUR, NOW)).toBe(false);
  });
});

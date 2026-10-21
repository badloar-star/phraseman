import {
  decodeActiveDays,
  encodeActiveDays,
  hasCommonDay,
  daysTogether,
  levelForDays,
  nextThreshold,
  isQuietHours,
  nudgeLimitBlockReason,
  friendsTogetherConfigFromNumbers,
  shiftDayKey,
  FRIENDSHIP_LEVEL_THRESHOLDS,
  MAX_ACTIVE_DAYS_WINDOW,
  type ActiveDaysState,
} from './friends_together_core';

describe('friends_together_core: active days codec', () => {
  test('encode/decode round-trip for a simple set', () => {
    const dates = ['2026-08-17', '2026-08-16', '2026-08-14'];
    const encoded = encodeActiveDays('2026-08-17', dates);
    expect(encoded.anchor).toBe('2026-08-17');
    const decoded = decodeActiveDays(encoded);
    expect([...decoded].sort()).toEqual([...dates].sort());
  });

  test('decode: index 0 = anchor day, index i = anchor - i days', () => {
    const state: ActiveDaysState = { anchor: '2026-08-17', bits: '101' };
    const decoded = decodeActiveDays(state);
    expect(decoded.has('2026-08-17')).toBe(true); // bit 0
    expect(decoded.has('2026-08-16')).toBe(false); // bit 1 = '0'
    expect(decoded.has('2026-08-15')).toBe(true); // bit 2
  });

  test('decode: invalid/missing state returns empty set (no throw)', () => {
    expect(decodeActiveDays(null).size).toBe(0);
    expect(decodeActiveDays(undefined).size).toBe(0);
    expect(decodeActiveDays({ anchor: 'bad-date', bits: '111' }).size).toBe(0);
    expect(decodeActiveDays({ anchor: '2026-08-17', bits: '' }).size).toBe(0);
  });

  test('decode: bits longer than MAX_ACTIVE_DAYS_WINDOW are truncated', () => {
    const bits = '1'.repeat(200);
    const state: ActiveDaysState = { anchor: '2026-08-17', bits };
    const decoded = decodeActiveDays(state);
    expect(decoded.size).toBe(MAX_ACTIVE_DAYS_WINDOW);
  });

  test('hasCommonDay: true only when both have the bit set for that day', () => {
    const a: ActiveDaysState = { anchor: '2026-08-17', bits: '110' };
    const b: ActiveDaysState = { anchor: '2026-08-17', bits: '101' };
    expect(hasCommonDay(a, b, '2026-08-17')).toBe(true); // both bit0
    expect(hasCommonDay(a, b, '2026-08-16')).toBe(false); // only a
    expect(hasCommonDay(a, b, '2026-08-15')).toBe(false); // only b
    expect(hasCommonDay(a, b, 'not-a-date')).toBe(false);
  });

  test('shiftDayKey moves calendar dates correctly across month boundary', () => {
    expect(shiftDayKey('2026-09-01', -1)).toBe('2026-08-31');
    expect(shiftDayKey('2026-08-31', 1)).toBe('2026-09-01');
  });
});

describe('friends_together_core: daysTogether (merge windows, different anchors, bonusDays)', () => {
  test('counts intersection of active dates regardless of differing anchors', () => {
    // A's window anchored today; B's window anchored yesterday — but they share 2026-08-10 and 2026-08-12.
    const a = encodeActiveDays('2026-08-17', ['2026-08-17', '2026-08-12', '2026-08-10']);
    const b = encodeActiveDays('2026-08-16', ['2026-08-16', '2026-08-12', '2026-08-10']);
    expect(daysTogether(a, b)).toBe(2);
  });

  test('bonusDays adds flat to the intersection count (referral pair start)', () => {
    const a = encodeActiveDays('2026-08-17', ['2026-08-17']);
    const b = encodeActiveDays('2026-08-17', ['2026-08-17']);
    expect(daysTogether(a, b, 3)).toBe(4);
  });

  test('negative or non-finite bonusDays is clamped to 0', () => {
    const a = encodeActiveDays('2026-08-17', ['2026-08-17']);
    const b = encodeActiveDays('2026-08-17', ['2026-08-17']);
    expect(daysTogether(a, b, -5)).toBe(1);
    expect(daysTogether(a, b, NaN)).toBe(1);
  });

  test('no overlap → 0 (+ bonusDays if any)', () => {
    const a = encodeActiveDays('2026-08-17', ['2026-08-17']);
    const b = encodeActiveDays('2026-08-17', ['2026-08-10']);
    expect(daysTogether(a, b)).toBe(0);
    expect(daysTogether(a, b, 3)).toBe(3);
  });

  test('null/missing active days on either side → treated as empty set', () => {
    const a = encodeActiveDays('2026-08-17', ['2026-08-17']);
    expect(daysTogether(a, null)).toBe(0);
    expect(daysTogether(null, null, 3)).toBe(3);
  });
});

describe('friends_together_core: levels', () => {
  test('thresholds [0,3,10,30,100] map to levels 1..5', () => {
    expect(levelForDays(0)).toBe(1);
    expect(levelForDays(2)).toBe(1);
    expect(levelForDays(3)).toBe(2);
    expect(levelForDays(9)).toBe(2);
    expect(levelForDays(10)).toBe(3);
    expect(levelForDays(29)).toBe(3);
    expect(levelForDays(30)).toBe(4);
    expect(levelForDays(99)).toBe(4);
    expect(levelForDays(100)).toBe(5);
    expect(levelForDays(1000)).toBe(5);
  });

  test('negative days treated as 0', () => {
    expect(levelForDays(-5)).toBe(1);
  });

  test('nextThreshold returns the next level boundary, null at max level', () => {
    expect(nextThreshold(0)).toBe(3);
    expect(nextThreshold(5)).toBe(10);
    expect(nextThreshold(100)).toBeNull();
  });

  test('custom thresholds array changes level mapping', () => {
    const custom = [0, 1, 2];
    expect(levelForDays(1, custom)).toBe(2);
    expect(levelForDays(2, custom)).toBe(3);
    expect(nextThreshold(0, custom)).toBe(1);
  });
});

describe('friends_together_core: quiet hours (§1.3, 22:00-09:00 local, tz unknown → UTC+3)', () => {
  test('quiet at 22:00 local and after, up to but not including 09:00', () => {
    // UTC+0 tz offset for simplicity: local hour == UTC hour.
    const at22 = Date.parse('2026-08-17T22:00:00.000Z');
    const at23 = Date.parse('2026-08-17T23:30:00.000Z');
    const at00 = Date.parse('2026-08-18T00:00:00.000Z');
    const at08_59 = Date.parse('2026-08-18T08:59:00.000Z');
    expect(isQuietHours(at22, 0)).toBe(true);
    expect(isQuietHours(at23, 0)).toBe(true);
    expect(isQuietHours(at00, 0)).toBe(true);
    expect(isQuietHours(at08_59, 0)).toBe(true);
  });

  test('not quiet from 09:00 to 21:59 local', () => {
    const at09 = Date.parse('2026-08-18T09:00:00.000Z');
    const at21_59 = Date.parse('2026-08-17T21:59:00.000Z');
    const atNoon = Date.parse('2026-08-17T12:00:00.000Z');
    expect(isQuietHours(at09, 0)).toBe(false);
    expect(isQuietHours(at21_59, 0)).toBe(false);
    expect(isQuietHours(atNoon, 0)).toBe(false);
  });

  test('tz offset shifts the local window (Moscow UTC+3, tz=180 minutes)', () => {
    // 19:00 UTC = 22:00 Moscow → quiet.
    const utc19 = Date.parse('2026-08-17T19:00:00.000Z');
    expect(isQuietHours(utc19, 180)).toBe(true);
    // 18:59 UTC = 21:59 Moscow → not quiet.
    const utc18_59 = Date.parse('2026-08-17T18:59:00.000Z');
    expect(isQuietHours(utc18_59, 180)).toBe(false);
  });

  test('negative tz offset (west of UTC) shifts window the other way', () => {
    // UTC-5 (New York, tz=-300): 22:00 local = 03:00 UTC next day.
    const utc03NextDay = Date.parse('2026-08-18T03:00:00.000Z');
    expect(isQuietHours(utc03NextDay, -300)).toBe(true);
    const utc02_59 = Date.parse('2026-08-18T02:59:00.000Z');
    expect(isQuietHours(utc02_59, -300)).toBe(false);
  });

  test('unknown tz (null/undefined) defaults to UTC+3', () => {
    const utc19 = Date.parse('2026-08-17T19:00:00.000Z'); // 22:00 at UTC+3
    expect(isQuietHours(utc19, null)).toBe(true);
    expect(isQuietHours(utc19, undefined)).toBe(true);
    const utc18_59 = Date.parse('2026-08-17T18:59:00.000Z'); // 21:59 at UTC+3
    expect(isQuietHours(utc18_59, undefined)).toBe(false);
  });

  test('custom start/end hours and default tz are honored (remote_config override)', () => {
    // Custom window 20:00-06:00, tz 0.
    const at20 = Date.parse('2026-08-17T20:00:00.000Z');
    const at19_59 = Date.parse('2026-08-17T19:59:00.000Z');
    expect(isQuietHours(at20, 0, 20, 6)).toBe(true);
    expect(isQuietHours(at19_59, 0, 20, 6)).toBe(false);
  });
});

describe('friends_together_core: nudge limits (§1.3)', () => {
  test('daily_limit when already sent to this friend today (maxPerFriend=1 default)', () => {
    expect(nudgeLimitBlockReason({
      sentToThisFriendToday: true,
      senderSentCountToday: 0,
      receiverReceivedCountToday: 0,
    })).toBe('daily_limit');
  });

  test('sender_limit when sender already sent 5 today', () => {
    expect(nudgeLimitBlockReason({
      sentToThisFriendToday: false,
      senderSentCountToday: 5,
      receiverReceivedCountToday: 0,
    })).toBe('sender_limit');
  });

  test('receiver_limit when receiver already received 3 today', () => {
    expect(nudgeLimitBlockReason({
      sentToThisFriendToday: false,
      senderSentCountToday: 0,
      receiverReceivedCountToday: 3,
    })).toBe('receiver_limit');
  });

  test('null (allowed) when under all limits', () => {
    expect(nudgeLimitBlockReason({
      sentToThisFriendToday: false,
      senderSentCountToday: 4,
      receiverReceivedCountToday: 2,
    })).toBeNull();
  });

  test('daily_limit checked before sender/receiver limits (priority order)', () => {
    expect(nudgeLimitBlockReason({
      sentToThisFriendToday: true,
      senderSentCountToday: 5,
      receiverReceivedCountToday: 3,
    })).toBe('daily_limit');
  });

  test('custom limits from config override defaults', () => {
    expect(nudgeLimitBlockReason({
      sentToThisFriendToday: false,
      senderSentCountToday: 2,
      receiverReceivedCountToday: 0,
      maxSender: 2,
    })).toBe('sender_limit');
  });
});

describe('friends_together_core: remote_config overlay (friendsTogetherConfigFromNumbers)', () => {
  test('undefined/empty numbers → all defaults', () => {
    const cfg = friendsTogetherConfigFromNumbers(undefined);
    expect(cfg.levelThresholds).toEqual(FRIENDSHIP_LEVEL_THRESHOLDS);
    expect(cfg.nudgeMaxPerFriendPerDay).toBe(1);
    expect(cfg.nudgeMaxSenderPerDay).toBe(5);
    expect(cfg.nudgeMaxReceiverPerDay).toBe(3);
  });

  test('valid overrides are applied and clamped', () => {
    const cfg = friendsTogetherConfigFromNumbers({
      friends_nudge_max_sender_day: 10,
    });
    expect(cfg.nudgeMaxSenderPerDay).toBe(10);
  });

  test('garbage values fall back to defaults per-field (never throws)', () => {
    const cfg = friendsTogetherConfigFromNumbers({
      friends_level_thresholds: [1, 'nope', 3],
    } as unknown as Record<string, unknown>);
    expect(cfg.levelThresholds).toEqual(FRIENDSHIP_LEVEL_THRESHOLDS);
  });

});

// зачем (идея 1 «Серия вдвоём», владелец 21.10): пуш «Позвать» говорит о серии пары; серия — из active_days_v1 обоих.
import * as core from './friends_together_core';

describe('friends_together_core: серия вдвоём для пуша', () => {
  const enc = (anchor: string, back: number[]) => core.encodeActiveDays(anchor, back.map((n) => core.shiftDayKey(anchor, -n)));

  test('оба сегодня 7 дней подряд → 7', () => {
    expect(core.pairStreakDays(enc('2026-10-21', [0, 1, 2, 3, 4, 5, 6]), enc('2026-10-21', [0, 1, 2, 3, 4, 5, 6]), '2026-10-21')).toBe(7);
  });

  test('друг сегодня ещё нет → серия по вчера', () => {
    expect(core.pairStreakDays(enc('2026-10-21', [0, 1, 2]), enc('2026-10-20', [0, 1]), '2026-10-21')).toBe(2);
  });

  test('пропущен вчерашний день → 0', () => {
    expect(core.pairStreakDays(enc('2026-10-21', [0, 2, 3]), enc('2026-10-21', [2, 3]), '2026-10-21')).toBe(0);
  });

  test('день-ориентир — локальный день отправителя, если он рядом с UTC', () => {
    const now = Date.parse('2026-10-21T22:30:00.000Z');
    expect(core.pairStreakReferenceDay({ anchor: '2026-10-22', bits: '1' }, now)).toBe('2026-10-22');
    expect(core.pairStreakReferenceDay({ anchor: '2026-10-10', bits: '1' }, now)).toBe('2026-10-21');
    expect(core.pairStreakReferenceDay(null, now)).toBe('2026-10-21');
  });

  test('текст пуша: с серией — про огонь пары, без серии — прежний зов', () => {
    expect(core.friendNudgePushCopy('Алекс', 7)).toEqual({ title: 'Алекс: серия вдвоём ждёт', body: '7 дней подряд. Одно маленькое занятие — и огонь не погаснет.' });
    expect(core.friendNudgePushCopy('Алекс', 22).body.startsWith('22 дня подряд')).toBe(true);
    expect(core.friendNudgePushCopy('Алекс', 1)).toEqual({ title: 'Алекс: пять минут практики?', body: 'Одно маленькое занятие.' });
    expect(core.friendNudgePushCopy('', 0).title).toBe('Friend: пять минут практики?');
  });
});

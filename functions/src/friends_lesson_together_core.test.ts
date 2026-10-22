import {
  isLessonDayKey,
  lessonInviteId,
  lessonPairKey,
  lessonTogetherWalletRequestId,
  localDayKey,
  nextLocalMidnightMs,
  parseLessonInviteInput,
  tzOffsetOrDefault,
} from './friends_lesson_together_core';

describe('lesson together core', () => {
  test('invite input: 1–3 distinct friends, ordinals 1–999, minutes/stars dropped when out of bounds', () => {
    const ok = parseLessonInviteInput({ friendUids: ['b', 'c'], lessonOrdinal: 2, sessionOrdinal: 7, lessonKey: 'en:l2:s7', minutes: 12, stars: 5000 }, 'a');
    expect(ok).toEqual({ friendUids: ['b', 'c'], lessonKey: 'en:l2:s7', lessonOrdinal: 2, sessionOrdinal: 7, minutes: 12 });
    expect(parseLessonInviteInput({ friendUids: [], lessonOrdinal: 1, sessionOrdinal: 1 }, 'a')).toBeNull();
    expect(parseLessonInviteInput({ friendUids: ['b', 'c', 'd', 'e'], lessonOrdinal: 1, sessionOrdinal: 1 }, 'a')).toBeNull();
    expect(parseLessonInviteInput({ friendUids: ['b', 'b'], lessonOrdinal: 1, sessionOrdinal: 1 }, 'a')).toBeNull();
    expect(parseLessonInviteInput({ friendUids: ['a'], lessonOrdinal: 1, sessionOrdinal: 1 }, 'a')).toBeNull();
    expect(parseLessonInviteInput({ friendUids: ['b'], lessonOrdinal: 0, sessionOrdinal: 1 }, 'a')).toBeNull();
    expect(parseLessonInviteInput({ friendUids: ['b'], lessonOrdinal: 1, sessionOrdinal: 1000 }, 'a')).toBeNull();
  });

  test('local midnight and day key follow minutes east of UTC (Moscow +180)', () => {
    const now = Date.parse('2026-10-22T20:30:00Z'); // 23:30 in Moscow
    expect(localDayKey(now, 180)).toBe('2026-10-22');
    expect(nextLocalMidnightMs(now, 180)).toBe(Date.parse('2026-10-22T21:00:00Z'));
    expect(localDayKey(now + 60 * 60_000, 180)).toBe('2026-10-23');
    expect(nextLocalMidnightMs(now, 0)).toBe(Date.parse('2026-10-23T00:00:00Z'));
    expect(tzOffsetOrDefault('x', 180)).toBe(180);
    expect(tzOffsetOrDefault(-300, 180)).toBe(-300);
    expect(tzOffsetOrDefault(99_999, 180)).toBe(180);
  });

  test('anti-farm by key (phone decides): A→B and B→A on the same day share one wallet key; next day is a new key', () => {
    const pairAB = lessonPairKey('uid-a', 'uid-b');
    const pairBA = lessonPairKey('uid-b', 'uid-a');
    expect(pairAB).toBe(pairBA);
    expect(lessonTogetherWalletRequestId(pairAB, '2026-10-22', 'uid-a')).toBe(lessonTogetherWalletRequestId(pairBA, '2026-10-22', 'uid-a'));
    expect(lessonTogetherWalletRequestId(pairAB, '2026-10-23', 'uid-a')).not.toBe(lessonTogetherWalletRequestId(pairAB, '2026-10-22', 'uid-a'));
    expect(lessonTogetherWalletRequestId(pairAB, '2026-10-22', 'uid-b')).not.toBe(lessonTogetherWalletRequestId(pairAB, '2026-10-22', 'uid-a'));
    // кошелёк принимает ровно lessontogether_<40 hex>, REQUEST_ID callable — 16..80 знаков
    expect(lessonTogetherWalletRequestId(pairAB, '2026-10-22', 'uid-a')).toMatch(/^lessontogether_[0-9a-f]{40}$/);
  });

  test('day key from the friend phone: YYYY-MM-DD only', () => {
    expect(isLessonDayKey('2026-10-22')).toBe(true);
    expect(isLessonDayKey('2026-10-22T00')).toBe(false);
    expect(isLessonDayKey(20261022)).toBe(false);
  });

  test('invite id is deterministic per request and friend', () => {
    expect(lessonInviteId('flt_req_000000001', 'b')).toBe(lessonInviteId('flt_req_000000001', 'b'));
    expect(lessonInviteId('flt_req_000000001', 'b')).not.toBe(lessonInviteId('flt_req_000000001', 'c'));
    expect(lessonInviteId('flt_req_000000001', 'b')).toMatch(/^fli_[a-f0-9]{32}$/);
  });
});

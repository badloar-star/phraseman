import {
  judgeLessonClaim,
  lessonInviteId,
  lessonPairKey,
  lessonTogetherOpId,
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

  test('anti-farm: A→B and B→A on the same day share one pair-day key; next day is a new key', () => {
    const pairAB = lessonPairKey('uid-a', 'uid-b');
    const pairBA = lessonPairKey('uid-b', 'uid-a');
    expect(pairAB).toBe(pairBA);
    expect(lessonTogetherOpId(pairAB, '2026-10-22', 'uid-a')).toBe(lessonTogetherOpId(pairBA, '2026-10-22', 'uid-a'));
    expect(lessonTogetherOpId(pairAB, '2026-10-23', 'uid-a')).not.toBe(lessonTogetherOpId(pairAB, '2026-10-22', 'uid-a'));
    // OP_ID_RE журнала: одно двоеточие, хвост ≤ 96.
    expect(lessonTogetherOpId(pairAB, '2026-10-22', 'uid-a')).toMatch(/^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/);
  });

  test('invite id is deterministic per request and friend', () => {
    expect(lessonInviteId('flt_req_000000001', 'b')).toBe(lessonInviteId('flt_req_000000001', 'b'));
    expect(lessonInviteId('flt_req_000000001', 'b')).not.toBe(lessonInviteId('flt_req_000000001', 'c'));
    expect(lessonInviteId('flt_req_000000001', 'b')).toMatch(/^fli_[a-f0-9]{32}$/);
  });

  test('claim verdict: same lesson and session, awarded inside [invite created, friend midnight]; language may differ', () => {
    const invite = { lessonOrdinal: 2, sessionOrdinal: 7, createdAtMs: 1_000, expiresAtMs: 5_000 };
    expect(judgeLessonClaim(invite, null)).toEqual({ ok: false, reason: 'not_completed' });
    expect(judgeLessonClaim(invite, { lessonOrdinal: 2, sessionOrdinal: 7, studyTarget: 'es', awardedAtMs: 3_000 })).toEqual({ ok: true });
    expect(judgeLessonClaim(invite, { lessonOrdinal: 2, sessionOrdinal: 8, studyTarget: 'en', awardedAtMs: 3_000 })).toEqual({ ok: false, reason: 'wrong_session' });
    expect(judgeLessonClaim(invite, { lessonOrdinal: 2, sessionOrdinal: 7, studyTarget: 'en', awardedAtMs: 999 })).toEqual({ ok: false, reason: 'outside_window' });
    expect(judgeLessonClaim(invite, { lessonOrdinal: 2, sessionOrdinal: 7, studyTarget: 'en', awardedAtMs: 5_001 })).toEqual({ ok: false, reason: 'outside_window' });
  });
});

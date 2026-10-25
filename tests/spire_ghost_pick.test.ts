// зачем (ТЗ spire-engagement-2026-10-25.md §3а, владелец 25.10): выбор «призрака друга» — все ветки «нет призрака» и порядок «друг → соперник».
import {
  spireGhostAhead,
  spireGhostLetter,
  spireGhostLogLine,
  spireGhostMarginMs,
  spireGhostMarkFrac,
  spireGhostStepNumber,
  spireGhostTrackFrac,
  spirePickGhost,
} from '../modules/spire/ghost';
import { spireStepsForFloorLocal } from '../modules/spire/report_queue';
import type { SpireRoomMember, SpireRoomSnapshot } from '../modules/spire/room_rows';

function member(uid: string, steps: number, avgMs: number, name = uid.toUpperCase()): SpireRoomMember {
  return { uid, name, steps, reachedAtMs: steps > 0 ? 1 : 0, totalMs: steps * avgMs };
}
function room(members: readonly SpireRoomMember[]): SpireRoomSnapshot {
  return { schema: 'spire-room-cache.v1', uid: 'me', lang: 'en', weekId: '2026-W44', groupId: 'g', tier: 0, cohortDay: 1, weekStartMs: 0, members, roster: [], fetchedAtMs: 0 };
}
const NO_FRIENDS = new Set<string>();

describe('spirePickGhost', () => {
  it('нет комнаты в кэше — no_room', () => {
    expect(spirePickGhost({ room: null, friendUids: new Set(['anya']), myUid: 'me', stepNumber: 3 })).toEqual({ ghost: null, reason: 'no_room' });
  });

  it('в комнате только я — no_room', () => {
    expect(spirePickGhost({ room: room([member('me', 5, 100_000)]), friendUids: NO_FRIENDS, myUid: 'me', stepNumber: 3 }).reason).toBe('no_room');
  });

  it('друг дошёл до моей ступени — берём его, почему=friend, среднее = totalMs / steps', () => {
    const pick = spirePickGhost({ room: room([member('me', 2, 100_000), member('anya', 5, 130_000, 'Аня')]), friendUids: new Set(['anya']), myUid: 'me', stepNumber: 3 });
    expect(pick.ghost).toMatchObject({ uid: 'anya', name: 'Аня', letter: 'А', avgMs: 130_000, steps: 5, why: 'friend' });
  });

  it('друг ещё не дошёл (steps < номер моей ступени) — not_reached, берём следующего друга', () => {
    const pick = spirePickGhost({ room: room([member('a', 2, 90_000), member('b', 6, 110_000)]), friendUids: new Set(['a', 'b']), myUid: 'me', stepNumber: 3 });
    expect(pick.ghost?.uid).toBe('b');
  });

  it('все друзья не дошли и соперников нет — not_reached', () => {
    const pick = spirePickGhost({ room: room([member('a', 2, 90_000)]), friendUids: new Set(['a']), myUid: 'me', stepNumber: 3 });
    expect(pick).toEqual({ ghost: null, reason: 'not_reached' });
  });

  it('из нескольких подходящих друзей — ближайший по ступеням сверху', () => {
    const pick = spirePickGhost({ room: room([member('far', 20, 90_000), member('near', 4, 95_000)]), friendUids: new Set(['far', 'near']), myUid: 'me', stepNumber: 3 });
    expect(pick.ghost?.uid).toBe('near');
  });

  it('друзей в комнате нет — ближайший участник выше меня, почему=rival', () => {
    const pick = spirePickGhost({ room: room([member('p1', 9, 80_000), member('p2', 4, 120_000), member('p3', 1, 70_000)]), friendUids: new Set(['stranger']), myUid: 'me', stepNumber: 3 });
    expect(pick.ghost).toMatchObject({ uid: 'p2', why: 'rival', avgMs: 120_000 });
  });

  it('друг приоритетнее соперника, даже если соперник ближе', () => {
    const pick = spirePickGhost({ room: room([member('rival', 3, 100_000), member('friend', 12, 100_000)]), friendUids: new Set(['friend']), myUid: 'me', stepNumber: 3 });
    expect(pick.ghost).toMatchObject({ uid: 'friend', why: 'friend' });
  });

  it('у друга нет времени (totalMs = 0 при steps > 0) — no_time, переходим к сопернику', () => {
    const noTime: SpireRoomMember = { uid: 'f', name: 'Фёдор', steps: 8, reachedAtMs: 1, totalMs: 0 };
    const pick = spirePickGhost({ room: room([noTime, member('rival', 9, 100_000)]), friendUids: new Set(['f']), myUid: 'me', stepNumber: 3 });
    expect(pick.ghost).toMatchObject({ uid: 'rival', why: 'rival' });
    expect(spirePickGhost({ room: room([noTime]), friendUids: new Set(['f']), myUid: 'me', stepNumber: 3 })).toEqual({ ghost: null, reason: 'no_time' });
  });

  it('среднее < 20 с — suspicious; > 15 мин — suspicious; ровно на границах — годится', () => {
    for (const avg of [19_999, 900_001]) {
      expect(spirePickGhost({ room: room([member('x', 8, avg)]), friendUids: new Set(['x']), myUid: 'me', stepNumber: 3 })).toEqual({ ghost: null, reason: 'suspicious' });
    }
    for (const avg of [20_000, 900_000]) {
      expect(spirePickGhost({ room: room([member('x', 8, avg)]), friendUids: new Set(['x']), myUid: 'me', stepNumber: 3 }).ghost?.avgMs).toBe(avg);
    }
  });

  it('без имени («—» из документа комнаты) — no_name, чужое имя не выдумываем', () => {
    expect(spirePickGhost({ room: room([member('x', 8, 100_000, '—')]), friendUids: new Set(['x']), myUid: 'me', stepNumber: 3 })).toEqual({ ghost: null, reason: 'no_name' });
  });

  it('если подозрительных и не дошедших вперемешку — причина самая содержательная (suspicious раньше not_reached)', () => {
    const pick = spirePickGhost({ room: room([member('slow', 8, 2_000_000), member('late', 1, 90_000)]), friendUids: NO_FRIENDS, myUid: 'me', stepNumber: 3 });
    expect(pick).toEqual({ ghost: null, reason: 'suspicious' });
  });

  it('первая буква — заглавная и целая, в том числе эмодзи и пустое имя', () => {
    expect(spireGhostLetter('аня')).toBe('А');
    expect(spireGhostLetter('  max')).toBe('M');
    expect(spireGhostLetter('😀 Zoe')).toBe('😀');
    expect(spireGhostLetter('   ')).toBe('?');
  });
});

describe('номер ступени недели', () => {
  it('первая ступень первого этажа = 1; ступени этажей складываются', () => {
    expect(spireGhostStepNumber(1, 0)).toBe(1);
    expect(spireGhostStepNumber(1, 3)).toBe(4);
    expect(spireGhostStepNumber(2, 0)).toBe(spireStepsForFloorLocal(1) + 1);
    expect(spireGhostStepNumber(3, 2)).toBe(spireStepsForFloorLocal(1) + spireStepsForFloorLocal(2) + 3);
  });
});

describe('метка, бегунок, обгон, разрыв', () => {
  it('метка на кольце: доля оставшегося времени при финише друга; среднее не короче бюджета — метки нет', () => {
    expect(spireGhostMarkFrac(130_000, 240_000)).toBeCloseTo(110 / 240, 5);
    expect(spireGhostMarkFrac(240_000, 240_000)).toBeNull();
    expect(spireGhostMarkFrac(300_000, 240_000)).toBeNull();
    expect(spireGhostMarkFrac(0, 240_000)).toBeNull();
    expect(spireGhostMarkFrac(130_000, 0)).toBeNull();
    expect(spireGhostMarkFrac(1_000, 240_000)).toBe(0.97); // крайность не залезает на шов кольца
  });

  it('бегунок друга линейный и не выходит за 0..1', () => {
    expect(spireGhostTrackFrac(0, 130_000)).toBe(0);
    expect(spireGhostTrackFrac(65_000, 130_000)).toBe(0.5);
    expect(spireGhostTrackFrac(500_000, 130_000)).toBe(1);
  });

  it('обгон — не раньше 5-го задания и только если сделано больше, чем успел бы друг', () => {
    const avgMs = 130_000;
    expect(spireGhostAhead({ done: 4, elapsedMs: 10_000, avgMs })).toBe(false); // рано — мигало бы
    expect(spireGhostAhead({ done: 5, elapsedMs: 10_000, avgMs })).toBe(true);
    expect(spireGhostAhead({ done: 5, elapsedMs: 65_000, avgMs })).toBe(false); // ровно вровень — ещё не обогнал
    expect(spireGhostAhead({ done: 6, elapsedMs: 65_000, avgMs })).toBe(true);
    expect(spireGhostAhead({ done: 9, elapsedMs: 100_000, avgMs })).toBe(true); // 9 > 7,69
    expect(spireGhostAhead({ done: 7, elapsedMs: 100_000, avgMs })).toBe(false); // 7 < 7,69
    expect(spireGhostAhead({ done: 9, elapsedMs: 1, avgMs: 0 })).toBe(false);
  });

  it('разрыв в итоге: от секунды; не быстрее — 0 (ничего не показываем)', () => {
    expect(spireGhostMarginMs(130_000, 116_000)).toBe(14_000);
    expect(spireGhostMarginMs(130_000, 129_001)).toBe(0);
    expect(spireGhostMarginMs(130_000, 129_000)).toBe(1000);
    expect(spireGhostMarginMs(130_000, 140_000)).toBe(0);
  });
});

describe('журнал [SPIRE-GHOST]', () => {
  it('кандидат с шестью символами uid и причиной; без призрака — причина', () => {
    const pick = spirePickGhost({ room: room([member('abcdefgh', 5, 130_000)]), friendUids: new Set(['abcdefgh']), myUid: 'me', stepNumber: 3 });
    expect(spireGhostLogLine(pick, 3)).toBe('кандидат=abcdef почему=friend steps=5 avgMs=130000 ступень=3');
    expect(spireGhostLogLine({ ghost: null, reason: 'not_reached' }, 3)).toBe('нет призрака: причина=not_reached ступень=3');
  });
});

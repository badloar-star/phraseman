// зачем (владелец 21.10, реестр №6): признак Plus участников комнаты Пика сквозь чистые функции — документ комнаты → участники → строки → соперники по этажам.
// Клиент берёт ТОЛЬКО то, что пришло с сервера (=== true): поля нет — не Plus, ничего не угадываем. Свою строку экран перекрывает живым статусом (useIsPlus).
import { spireBuildRoomRows, spireDecodeRoomMembers, type SpireRoomSnapshot } from '../modules/spire/room_rows';
import { spireRivalsByFloor } from '../components/spire/spire_tower_model';
import { isPlusProfile } from '../components/plus/plus_ring_spec';

const member = (uid: string, extra: Record<string, unknown> = {}) => ({ uid, name: uid.toUpperCase(), steps: 3, reachedAtMs: 1, totalMs: 1000, coinRank: 5, weekCoins: 0, ...extra });

describe('Plus в комнате Пика', () => {
  it('документ комнаты: isPremium берётся только при строгом true, иначе false', () => {
    const members = spireDecodeRoomMembers({
      a: member('a', { isPremium: true }),
      b: member('b', { isPremium: 'yes' }),
      c: member('c', { isPremium: 1 }),
      d: member('d'),
    });
    const byUid = Object.fromEntries(members.map((m) => [m.uid, m.isPremium]));
    expect(byUid).toEqual({ a: true, b: false, c: false, d: false });
  });

  it('строки комнаты несут isPremium чужих, у каждого своё значение', () => {
    const room: SpireRoomSnapshot = {
      schema: 'spire-room-cache.v1', uid: 'me', lang: 'ru', weekId: 'w1', groupId: 'g1', tier: 0, cohortDay: 0, weekStartMs: 0,
      members: spireDecodeRoomMembers({ me: member('me'), a: member('a', { isPremium: true, steps: 9 }), b: member('b', { steps: 5 }) }),
      roster: [], fetchedAtMs: 0,
    };
    const rows = spireBuildRoomRows({ room, myUid: 'me', mySteps: 3, myReachedAtMs: 1, nowMs: 0, tuning: { targetZoneMarginSteps: 0, maxStepsPerHour: 0 } });
    const premium = Object.fromEntries(rows.map((r) => [r.uid, r.isPremium]));
    expect(premium).toEqual({ me: false, a: true, b: false });
  });

  it('соперники по этажам передают isPremium к монетам на башне', () => {
    const rivals = spireRivalsByFloor([
      { uid: 'a', name: 'A', steps: 0, isMe: false, coinRank: 3, isPremium: true },
      { uid: 'b', name: 'B', steps: 0, isMe: false, coinRank: 4 },
      { uid: 'me', name: 'Я', steps: 0, isMe: true, coinRank: 5, isPremium: true },
    ]);
    const first = [...rivals.values()][0]!;
    expect(first.map((r) => [r.uid, r.isPremium])).toEqual([['a', true], ['b', false]]);
  });
});

describe('isPlusProfile · другие люди', () => {
  it('покупка, VIP или пожизненный Pro — Plus; пустой профиль, null и false — нет', () => {
    expect(isPlusProfile({ isPremium: true })).toBe(true);
    expect(isPlusProfile({ isPremium: false, isVip: true })).toBe(true);
    expect(isPlusProfile({ isPremium: false, isLifetime: true })).toBe(true);
    expect(isPlusProfile({ isPremium: false, isVip: false, isLifetime: false })).toBe(false);
    expect(isPlusProfile({})).toBe(false);
    expect(isPlusProfile(null)).toBe(false);
    expect(isPlusProfile(undefined)).toBe(false);
  });
});

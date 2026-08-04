// ═══════════════════════════════════════════════════════════════════════════
// Страж подселения жителей в комнаты лиг (решения владельца 2026-08-04).
//
// Фиксирует ровно то, что просил владелец:
//   • «во всех лигах где игроков меньше чем 15 добавлять жителей»;
//   • комната дозаполняется до 28 (владелец выбрал запас мест до лимита 30);
//   • «их опыт засчитывается в бонус получения сундука обязательно»;
//   • житель не получает наград и не мешает живым.
// ═══════════════════════════════════════════════════════════════════════════

import {
  LEAGUE_GROUP_SIZE,
  RESIDENT_FILL_THRESHOLD,
  RESIDENT_TARGET_VISIBLE,
  countLiveMembers,
  countVisibleMembers,
  fillRoomWithResidents,
  isResidentMember,
  isResidentUid,
  refreshResidents,
  residentIndexForSlot,
  withoutResidents,
} from './league_residents';
import { RESIDENT_EPOCH_MS } from './synthetic_residents';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_START = RESIDENT_EPOCH_MS + 70 * DAY_MS;
const NOW = WEEK_START + 3 * DAY_MS;

function liveMembers(count: number): Record<string, Record<string, unknown>> {
  const members: Record<string, Record<string, unknown>> = {};
  for (let i = 0; i < count; i++) {
    members[`live_uid_${i}`] = { uid: `live_uid_${i}`, name: `Player ${i}`, points: 100 + i };
  }
  return members;
}

describe('жители лиг — правила владельца', () => {
  it('комната-одиночка дозаполняется до 28 (случай со скриншота владельца)', () => {
    const filled = fillRoomWithResidents(liveMembers(1), 'group_a', WEEK_START, NOW);
    expect(countVisibleMembers(filled)).toBe(RESIDENT_TARGET_VISIBLE);
    expect(countLiveMembers(filled)).toBe(1);
  });

  it('где живых 15 и больше — жителей не добавляем вовсе', () => {
    const members = liveMembers(RESIDENT_FILL_THRESHOLD);
    const filled = fillRoomWithResidents(members, 'group_b', WEEK_START, NOW);
    expect(filled).toEqual(members);
    expect(countVisibleMembers(filled)).toBe(RESIDENT_FILL_THRESHOLD);
  });

  it('на границе: 14 живых — дозаполняем, 15 — нет', () => {
    const under = fillRoomWithResidents(liveMembers(14), 'group_c', WEEK_START, NOW);
    expect(countVisibleMembers(under)).toBe(RESIDENT_TARGET_VISIBLE);
    const over = fillRoomWithResidents(liveMembers(15), 'group_c', WEEK_START, NOW);
    expect(countVisibleMembers(over)).toBe(15);
  });

  it('комната никогда не превышает жёсткий лимит 30', () => {
    for (let live = 0; live < RESIDENT_FILL_THRESHOLD; live++) {
      const filled = fillRoomWithResidents(liveMembers(live), 'group_d', WEEK_START, NOW);
      expect(countVisibleMembers(filled)).toBeLessThanOrEqual(LEAGUE_GROUP_SIZE);
    }
  });

  it('живые записи не изменяются и не удаляются', () => {
    const original = liveMembers(3);
    const filled = fillRoomWithResidents(original, 'group_e', WEEK_START, NOW);
    for (const uid of Object.keys(original)) {
      expect(filled[uid]).toEqual(original[uid]);
    }
    // Иммутабельность: исходная карта не тронута (правило владельца).
    expect(Object.keys(original)).toHaveLength(3);
  });

  it('повторный вызов идемпотентен — состав жителей не «прыгает»', () => {
    const once = fillRoomWithResidents(liveMembers(2), 'group_f', WEEK_START, NOW);
    const twice = fillRoomWithResidents(once, 'group_f', WEEK_START, NOW);
    expect(Object.keys(twice).sort()).toEqual(Object.keys(once).sort());
  });

  it('разные комнаты получают разные «лица»', () => {
    const a = new Set(
      Array.from({ length: 10 }, (_, slot) => residentIndexForSlot('group_one', slot)),
    );
    const b = new Set(
      Array.from({ length: 10 }, (_, slot) => residentIndexForSlot('group_two', slot)),
    );
    const shared = [...a].filter((index) => b.has(index));
    expect(shared.length).toBeLessThan(5);
  });

  it('внутри комнаты имена персонажей не повторяются', () => {
    const indexes = Array.from(
      { length: RESIDENT_TARGET_VISIBLE },
      (_, slot) => residentIndexForSlot('group_g', slot),
    );
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it('житель распознаётся и по uid, и по метке', () => {
    expect(isResidentUid('res_07')).toBe(true);
    expect(isResidentUid('live_uid_1')).toBe(false);
    expect(isResidentMember('legacy_id', { isResident: true })).toBe(true);
    expect(isResidentMember('live_uid_1', { name: 'Player' })).toBe(false);
  });

  it('в наградах жителей нет — withoutResidents оставляет только живых', () => {
    const filled = fillRoomWithResidents(liveMembers(2), 'group_h', WEEK_START, NOW);
    const live = withoutResidents(filled);
    expect(Object.keys(live)).toHaveLength(2);
    expect(Object.keys(live).every((uid) => !isResidentUid(uid))).toBe(true);
  });

  it('опыт жителей растёт со временем — они «живут своей жизнью»', () => {
    const early = fillRoomWithResidents({}, 'group_i', WEEK_START, WEEK_START + DAY_MS);
    const later = refreshResidents(early, 'group_i', WEEK_START, WEEK_START + 6 * DAY_MS);
    const earlySum = Object.values(early).reduce((s, m) => s + Number(m.points ?? 0), 0);
    const laterSum = Object.values(later).reduce((s, m) => s + Number(m.points ?? 0), 0);
    expect(laterSum).toBeGreaterThan(earlySum);
  });

  it('очки жителя — недельные, а не весь его опыт (иначе выдал бы себя)', () => {
    const filled = fillRoomWithResidents({}, 'group_j', WEEK_START, NOW);
    for (const [uid, member] of Object.entries(filled)) {
      if (!isResidentUid(uid)) continue;
      expect(Number(member.points)).toBeLessThan(Number(member.totalXp));
    }
  });

  it('житель выглядит как обычный игрок: те же поля профиля', () => {
    const filled = fillRoomWithResidents({}, 'group_k', WEEK_START, NOW);
    const resident = Object.entries(filled).find(([uid]) => isResidentUid(uid))?.[1];
    expect(resident).toBeDefined();
    for (const field of ['uid', 'name', 'points', 'totalXp', 'avatar', 'streak']) {
      expect(resident).toHaveProperty(field);
    }
    // Аватар — номер уровня, как у живого игрока.
    expect(Number(resident!.avatar)).toBeGreaterThanOrEqual(1);
  });

  it('refreshResidents не трогает живых участников', () => {
    const original = liveMembers(4);
    const filled = fillRoomWithResidents(original, 'group_l', WEEK_START, NOW);
    const refreshed = refreshResidents(filled, 'group_l', WEEK_START, NOW + DAY_MS);
    for (const uid of Object.keys(original)) {
      expect(refreshed[uid]).toEqual(original[uid]);
    }
  });
});

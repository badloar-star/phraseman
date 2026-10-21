// зачем (владелец 21.10, №49 В1, «пустые комнаты Пика»): новичок доливается в самую заполненную неполную комнату своей недели,
// языка и шпиля — независимо от дня входа и от того, насколько соседи продвинулись.
import fs from 'node:fs';
import path from 'node:path';
import { pickSpireJoinCandidates } from './spire_groups';

const members = (n: number): Record<string, unknown> => Object.fromEntries(
  Array.from({ length: n }, (_, i) => [`u${i}`, { steps: 100 + i }]),
);

describe('pickSpireJoinCandidates', () => {
  it('самая заполненная неполная — первой, полные отброшены', () => {
    const picked = pickSpireJoinCandidates([
      { id: 'a', members: members(3) },
      { id: 'full', members: members(30) },
      { id: 'b', members: members(17) },
      { id: 'c', members: members(1) },
    ]);
    expect(picked.map((c) => c.id)).toEqual(['b', 'a', 'c']);
    expect(picked[0]).toEqual({ id: 'b', n: 17 });
  });

  it('ничья по заполненности — детерминированно по id; пустые/битые members считаются нулём', () => {
    const picked = pickSpireJoinCandidates([
      { id: 'z', members: members(2) },
      { id: 'y', members: members(2) },
      { id: 'x', members: null },
    ]);
    expect(picked.map((c) => c.id)).toEqual(['y', 'z', 'x']);
  });

  it('нет неполных — пусто (тогда сервер создаёт новую комнату)', () => {
    expect(pickSpireJoinCandidates([{ id: 'full', members: members(30) }])).toEqual([]);
  });
});

describe('spireJoinRoom: поиск комнаты без дня входа', () => {
  const src = fs.readFileSync(path.join(__dirname, 'spire_groups.ts'), 'utf8').replace(/\r\n/g, '\n');
  const join = src.slice(src.indexOf('export const spireJoinRoom'), src.indexOf('// 3) Новая комната'));

  it('ищет по неделе, языку, шпилю и открытости — cohortDay в запросе нет', () => {
    expect(join).toContain(".where('weekId', '==', weekId)");
    expect(join).toContain(".where('lang', '==', lang)");
    // шпиль остаётся: итог недели считает повышение по шпилю КОМНАТЫ
    expect(join).toContain(".where('tier', '==', tier)");
    expect(join).toContain(".where('open', '==', true)");
    expect(join).toContain('.limit(ROOM_QUERY_LIMIT)');
    expect(join).not.toContain(".where('cohortDay'");
    expect(join).toContain('pickSpireJoinCandidates(');
  });

  it('каждый шаг подбора пишет [SPIRE-ROOM]: что искали, кандидаты, куда посадили, почему новая', () => {
    expect(join).toContain("event: 'search'");
    expect(join).toContain("event: 'candidates'");
    expect(join).toContain("event: 'joined'");
    expect(join).toContain("event: 'no_open_room'");
    expect(src).toContain("event: 'created', groupId, lang, tier, cohortDay, reason:");
  });
});

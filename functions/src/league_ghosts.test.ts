jest.mock('firebase-admin', () => ({
  firestore: jest.fn(),
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn((_options, handler) => handler),
}));

import {
  buildGhostMember,
  ghostPointsAt,
  ghostUid,
  padRoomWithGhosts,
  refreshGhostPoints,
} from './league_ghosts';
import { SHARED_POOL_TARGET_VISIBLE, isoWeekStartMs } from './league_shared_pool';
import { REDDIT_BOT_NAMES, isSafeTournamentBotName } from './tournament_reddit_bot_names';

const WEEK = '2026-W33';
const WEEK_START = isoWeekStartMs(WEEK);
const DAY = 24 * 60 * 60 * 1000;

describe('league ghosts', () => {
  it('is fully deterministic for the same week and index', () => {
    const a = buildGhostMember(WEEK, 3, WEEK_START + 2 * DAY);
    const b = buildGhostMember(WEEK, 3, WEEK_START + 2 * DAY);
    expect(a).toEqual(b);
  });

  it('rotates the roster between weeks and keeps names inside the safe corpus', () => {
    const namesW33 = Array.from({ length: SHARED_POOL_TARGET_VISIBLE }, (_, i) => String(buildGhostMember('2026-W33', i, WEEK_START).name));
    const namesW34 = Array.from({ length: SHARED_POOL_TARGET_VISIBLE }, (_, i) => String(buildGhostMember('2026-W34', i, WEEK_START).name));
    expect(new Set(namesW33).size).toBe(namesW33.length);
    namesW33.forEach((name) => {
      expect(REDDIT_BOT_NAMES).toContain(name);
      expect(isSafeTournamentBotName(name)).toBe(true);
    });
    expect(namesW33.join('|')).not.toBe(namesW34.join('|'));
  });

  it('grows points monotonically through the week from zero start', () => {
    for (let index = 0; index < 8; index++) {
      expect(ghostPointsAt(WEEK, index, WEEK_START)).toBe(0);
      let prev = -1;
      for (let day = 0; day <= 7; day++) {
        const value = ghostPointsAt(WEEK, index, WEEK_START + day * DAY);
        expect(value).toBeGreaterThanOrEqual(Math.max(0, prev));
        prev = value;
      }
      expect(prev).toBeGreaterThanOrEqual(0);
      expect(prev).toBeLessThanOrEqual(2600);
    }
  });

  it('keeps a healthy share of beatable ghosts in every weekly roster', () => {
    const endOfWeek = WEEK_START + 7 * DAY;
    const finals = Array.from({ length: SHARED_POOL_TARGET_VISIBLE }, (_, i) => ghostPointsAt(WEEK, i, endOfWeek));
    expect(finals.filter((points) => points < 600).length).toBeGreaterThanOrEqual(5);
  });

  it('pads a room only up to the target and never touches real members', () => {
    const real = { me: { points: 42, name: 'Me' } };
    const padded = padRoomWithGhosts(real, WEEK, WEEK_START + DAY);
    expect(Object.keys(padded).length).toBe(SHARED_POOL_TARGET_VISIBLE);
    expect(padded.me).toEqual(real.me);
    const again = padRoomWithGhosts(padded, WEEK, WEEK_START + 2 * DAY);
    expect(again).toEqual(padded);
    const overfull: Record<string, { points: number }> = {};
    for (let i = 0; i < SHARED_POOL_TARGET_VISIBLE + 5; i++) overfull[`u${i}`] = { points: i };
    expect(Object.keys(padRoomWithGhosts(overfull, WEEK, WEEK_START)).length).toBe(SHARED_POOL_TARGET_VISIBLE + 5);
  });

  it('refreshes only ghost points, leaving real members and foreign ghosts intact', () => {
    const members = {
      me: { points: 42 },
      [ghostUid(WEEK, 0)]: { ...buildGhostMember(WEEK, 0, WEEK_START), points: 0 },
      'ghost_2026-W20_00': { isGhost: true, points: 777 },
    };
    const refreshed = refreshGhostPoints(members, WEEK, WEEK_START + 5 * DAY);
    expect(refreshed.me).toEqual(members.me);
    expect(refreshed['ghost_2026-W20_00']).toEqual(members['ghost_2026-W20_00']);
    expect(Number(refreshed[ghostUid(WEEK, 0)].points))
      .toBe(ghostPointsAt(WEEK, 0, WEEK_START + 5 * DAY));
  });

  it('produces ghost profiles renderable by any client version', () => {
    const ghost = buildGhostMember(WEEK, 7, WEEK_START + DAY);
    expect(String(ghost.uid)).toMatch(/^ghost_2026-W33_\d{2}$/);
    expect(ghost.isGhost).toBe(true);
    expect(ghost.avatar).toBeNull();
    expect(Number(ghost.totalXp)).toBeGreaterThan(0);
    expect(Number(ghost.streak)).toBeGreaterThanOrEqual(0);
    expect(ghost.isPremium).toBe(false);
    expect(ghost.isLifetime).toBe(false);
  });
});

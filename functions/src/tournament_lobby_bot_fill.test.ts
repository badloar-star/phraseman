import {
  TOURNAMENT_BOT_FILL_WINDOW_MS,
  TOURNAMENT_ROOM_GATHER_MS,
  planBotJoinTimes,
  planTournamentHumanLobbyJoin,
  selectTournamentBotProfiles,
  type BotProfile,
  type TournamentPlayer,
  type TournamentRoomDoc,
} from './tournament_core';

const player = (id: string, options: { bot?: boolean; joinAtMs?: number } = {}): TournamentPlayer => ({
  id,
  isBot: options.bot === true,
  name: id,
  avatar: '1',
  color: '#123456',
  score: 0,
  streak: 0,
  joinAtMs: options.joinAtMs,
  ...(options.bot ? { botWinRate: 0.5 } : {}),
});

const room = (players: TournamentPlayer[], deadlineAtMs = 1_090_001): TournamentRoomDoc => ({
  roomId: 'room-fill',
  slotId: 'slot',
  seed: 'room-fill',
  state: 'lobby',
  startsAt: 2_000_000,
  players,
  rounds: [],
  participantAuthUids: [],
  participantAuthUidsComplete: true,
  stateDeadlineAtMs: deadlineAtMs,
  version: 1,
  createdAtMs: 900_000,
});

const botProfile = (botId: string): BotProfile => ({
  botId,
  name: botId,
  avatarEmoji: '1',
  color: '#123456',
  winRate: 0.5,
  rank: 'silver',
  titles: [],
});

describe('owner lobby bot-fill contract', () => {
  test('all bot reservations are scheduled from +45s through +90s and never earlier', () => {
    const gatherStartedAtMs = 1_000_000;
    const fillEndsAtMs = gatherStartedAtMs + TOURNAMENT_ROOM_GATHER_MS + TOURNAMENT_BOT_FILL_WINDOW_MS;
    const times = planBotJoinTimes({
      seed: 'room-fill',
      botCount: 15,
      fromMs: gatherStartedAtMs,
      startsAtMs: fillEndsAtMs,
    });

    expect(TOURNAMENT_ROOM_GATHER_MS).toBe(45_000);
    expect(TOURNAMENT_BOT_FILL_WINDOW_MS).toBe(45_000);
    expect(times).toHaveLength(15);
    expect(new Set(times).size).toBeGreaterThan(1);
    for (const value of times) {
      expect(value).toBeGreaterThanOrEqual(gatherStartedAtMs + 45_000);
      expect(value).toBeLessThanOrEqual(gatherStartedAtMs + 90_000);
    }
  });

  test('bot selection is unique, seeded, and excludes the immediately prior roster when alternatives exist', () => {
    const profiles = Array.from({ length: 40 }, (_, index) => botProfile(`bot-${index}`));
    const recentBotIds = profiles.slice(0, 15).map((profile) => profile.botId);
    const selected = selectTournamentBotProfiles({
      profiles: [...profiles, profiles[20]],
      count: 15,
      seed: 'room-new',
      recentBotIds,
    });

    expect(selected).toHaveLength(15);
    expect(new Set(selected.map((profile) => profile.botId)).size).toBe(15);
    expect(selected.some((profile) => recentBotIds.includes(profile.botId))).toBe(false);
    expect(selectTournamentBotProfiles({ profiles, count: 15, seed: 'room-new', recentBotIds })).toEqual(selected);
    expect(selectTournamentBotProfiles({ profiles, count: 15, seed: 'room-other', recentBotIds })).not.toEqual(selected);
  });

  test('recent profiles are used only as a bounded fallback when fresh unique profiles cannot fill the room', () => {
    const profiles = Array.from({ length: 18 }, (_, index) => botProfile(`bot-${index}`));
    const recentBotIds = profiles.slice(0, 15).map((profile) => profile.botId);
    const selected = selectTournamentBotProfiles({ profiles, count: 15, seed: 'room-new', recentBotIds });

    expect(selected).toHaveLength(15);
    expect(new Set(selected.map((profile) => profile.botId)).size).toBe(15);
    expect(selected.filter((profile) => !recentBotIds.includes(profile.botId))).toHaveLength(3);
  });

  test('a human displaces a future bot reservation without exceeding sixteen seats', () => {
    const nowMs = 1_050_000;
    const humans = [player('human-1')];
    const bots = Array.from({ length: 15 }, (_, index) => player(`bot-${index}`, {
      bot: true,
      joinAtMs: index < 4 ? nowMs - 1_000 : nowMs + 10_000 + index,
    }));

    const planned = planTournamentHumanLobbyJoin(room([...humans, ...bots]), player('human-2'), 'auth-2', nowMs);

    expect(planned.room.players).toHaveLength(16);
    expect(planned.room.players.filter((entry) => !entry.isBot)).toHaveLength(2);
    expect(planned.displacedBotPlayerId).toBeTruthy();
    expect(planned.room.players.some((entry) => entry.id === planned.displacedBotPlayerId)).toBe(false);
    expect(planned.startImmediately).toBe(false);
  });

  test('the sixteenth visible participant pulls the lobby deadline to now exactly once', () => {
    const nowMs = 1_050_000;
    const occupants = Array.from({ length: 15 }, (_, index) => player(`human-${index}`));
    const first = planTournamentHumanLobbyJoin(room(occupants), player('human-16'), 'auth-16', nowMs);
    const replay = planTournamentHumanLobbyJoin(first.room, player('human-16'), 'auth-16', nowMs + 500);

    expect(first.room.players).toHaveLength(16);
    expect(first.startImmediately).toBe(true);
    expect(first.room.stateDeadlineAtMs).toBe(nowMs);
    expect(replay.startImmediately).toBe(false);
    expect(replay.room.stateDeadlineAtMs).toBe(nowMs);
    expect(replay.room.version).toBe(first.room.version);
  });

  test('a full room with no future reservation remains closed and never grows past sixteen', () => {
    const nowMs = 1_050_000;
    const occupants = Array.from({ length: 16 }, (_, index) => player(`human-${index}`));
    expect(() => planTournamentHumanLobbyJoin(room(occupants), player('late-human'), 'late-auth', nowMs))
      .toThrow('room_full');
  });
});

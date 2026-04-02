import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    checkLeaguePromotion,
    CLUBS,
    getLeagueRanking,
    getWeekId,
    GroupMember,
    LeagueState,
    loadLeagueState,
    saveLeagueState,
} from '../app/league_engine';

jest.mock('@react-native-async-storage/async-storage');

describe('League Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CLUBS', () => {
    it('should have 12 clubs with correct IDs', () => {
      expect(CLUBS).toHaveLength(12);
      for (let i = 0; i < CLUBS.length; i++) {
        expect(CLUBS[i].id).toBe(i);
      }
    });

    it('should have all required fields in each club', () => {
      CLUBS.forEach(club => {
        expect(club.id).toBeDefined();
        expect(club.nameRU).toBeDefined();
        expect(club.nameUK).toBeDefined();
        expect(club.shortRU).toBeDefined();
        expect(club.shortUK).toBeDefined();
        expect(club.color).toBeDefined();
        expect(club.frameId).toBeDefined();
      });
    });

    it('should have unique club IDs', () => {
      const ids = CLUBS.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(CLUBS.length);
    });
  });

  describe('getWeekId', () => {
    it('should return week ID in format YYYY-Www', () => {
      const weekId = getWeekId();
      expect(weekId).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('should return consistent week ID for same week', () => {
      const weekId1 = getWeekId();
      const weekId2 = getWeekId();
      expect(weekId1).toBe(weekId2);
    });

    it('should have week number between 01 and 53', () => {
      const weekId = getWeekId();
      const weekNum = parseInt(weekId.split('-W')[1]);
      expect(weekNum).toBeGreaterThanOrEqual(1);
      expect(weekNum).toBeLessThanOrEqual(53);
    });
  });

  describe('loadLeagueState', () => {
    it('should return null when storage is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const state = await loadLeagueState();

      expect(state).toBeNull();
    });

    it('should return parsed league state when available', async () => {
      const mockState: LeagueState = {
        leagueId: 3,
        weekId: '2026-W10',
        group: [
          { name: 'Player1', points: 100, isMe: true },
          { name: 'Player2', points: 80, isMe: false },
        ],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockState));

      const state = await loadLeagueState();

      expect(state).toEqual(mockState);
      expect(state?.leagueId).toBe(3);
      expect(state?.group).toHaveLength(2);
    });

    it('should return null on parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const state = await loadLeagueState();

      expect(state).toBeNull();
    });
  });

  describe('saveLeagueState', () => {
    it('should save league state to storage', async () => {
      const mockState: LeagueState = {
        leagueId: 5,
        weekId: '2026-W15',
        group: [{ name: 'Me', points: 150, isMe: true }],
      };
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveLeagueState(mockState);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'league_state_v3',
        JSON.stringify(mockState)
      );
    });
  });

  describe('getLeagueRanking', () => {
    it('should rank members by points descending', () => {
      const group: GroupMember[] = [
        { name: 'Player1', points: 50, isMe: false },
        { name: 'Player2', points: 100, isMe: true },
        { name: 'Player3', points: 75, isMe: false },
      ];

      const ranking = getLeagueRanking(group);

      expect(ranking[0].points).toBe(100);
      expect(ranking[1].points).toBe(75);
      expect(ranking[2].points).toBe(50);
    });

    it('should handle equal points', () => {
      const group: GroupMember[] = [
        { name: 'Player1', points: 100, isMe: false },
        { name: 'Player2', points: 100, isMe: true },
        { name: 'Player3', points: 100, isMe: false },
      ];

      const ranking = getLeagueRanking(group);

      expect(ranking).toHaveLength(3);
      expect(ranking[0].points).toBe(100);
      expect(ranking[1].points).toBe(100);
      expect(ranking[2].points).toBe(100);
    });

    it('should find my rank in group', () => {
      const group: GroupMember[] = [
        { name: 'Weak', points: 10, isMe: false },
        { name: 'Medium', points: 50, isMe: false },
        { name: 'Me', points: 75, isMe: true },
        { name: 'Strong', points: 100, isMe: false },
      ];

      const ranking = getLeagueRanking(group);
      const myRank = ranking.findIndex(m => m.isMe) + 1;

      expect(myRank).toBe(2);
    });

    it('should handle single player', () => {
      const group: GroupMember[] = [
        { name: 'OnlyMe', points: 50, isMe: true },
      ];

      const ranking = getLeagueRanking(group);

      expect(ranking).toHaveLength(1);
      expect(ranking[0].name).toBe('OnlyMe');
    });

    it('should handle empty group', () => {
      const group: GroupMember[] = [];

      const ranking = getLeagueRanking(group);

      expect(ranking).toHaveLength(0);
    });
  });

  describe('checkLeaguePromotion', () => {
    it('should not promote if not in top 50%', () => {
      const group: GroupMember[] = [
        { name: 'Winner', points: 200, isMe: false },
        { name: 'Second', points: 150, isMe: false },
        { name: 'Third', points: 100, isMe: false },
        { name: 'Me', points: 50, isMe: true },
      ];

      const result = checkLeaguePromotion(group, 3, 6);

      expect(result.promoted).toBe(false);
    });

    it('should promote if in top 50% of league', () => {
      const group: GroupMember[] = [
        { name: 'Me', points: 150, isMe: true },
        { name: 'Other', points: 100, isMe: false },
        { name: 'Other2', points: 50, isMe: false },
      ];

      const result = checkLeaguePromotion(group, 3, 5);

      expect(result.promoted).toBe(true);
    });

    it('should not demote if in top 25% of league', () => {
      const group: GroupMember[] = [
        { name: 'Me', points: 150, isMe: true },
        { name: 'Other', points: 100, isMe: false },
        { name: 'Other2', points: 50, isMe: false },
        { name: 'Other3', points: 25, isMe: false },
      ];

      const result = checkLeaguePromotion(group, 4, 6);

      expect(result.demoted).toBe(false);
    });

    it('should demote if in bottom 25% of league', () => {
      const group: GroupMember[] = [
        { name: 'Winner', points: 200, isMe: false },
        { name: 'Strong', points: 150, isMe: false },
        { name: 'Me', points: 25, isMe: true },
      ];

      const result = checkLeaguePromotion(group, 3, 3);

      expect(result.demoted).toBe(true);
    });

    it('should include correct league transition info', () => {
      const group: GroupMember[] = [
        { name: 'Me', points: 150, isMe: true },
        { name: 'Other', points: 100, isMe: false },
      ];

      const result = checkLeaguePromotion(group, 2, 5);

      expect(result.prevLeagueId).toBe(2);
      expect(result.newLeagueId).toBeGreaterThanOrEqual(0);
      expect(result.newLeagueId).toBeLessThan(12);
    });

    it('should not promote from top league', () => {
      const group: GroupMember[] = [
        { name: 'Me', points: 200, isMe: true },
      ];

      const result = checkLeaguePromotion(group, 1, 11);

      expect(result.newLeagueId).toBe(11);
    });

    it('should not demote from bottom league', () => {
      const group: GroupMember[] = [
        { name: 'Me', points: 1, isMe: true },
      ];

      const result = checkLeaguePromotion(group, 1, 0);

      expect(result.newLeagueId).toBe(0);
    });
  });
});

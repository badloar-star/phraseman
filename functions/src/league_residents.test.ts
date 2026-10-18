import {
  countLiveMembers,
  countVisibleMembers,
  fillRoomWithResidents,
} from './league_residents';

describe('legacy league rooms contain only real players', () => {
  it('removes proven synthetic residents while preserving human progress and hidden identity', () => {
    const real = { uid: 'human-1', points: 17, profileCardLevel: 3 };
    const hidden = { uid: 'human-2', points: 4, identityHidden: true };
    const members = {
      'human-1': real,
      'human-2': hidden,
      res_00: { uid: 'res_00', points: 23 },
      bot_42: { uid: 'bot_42', isBot: true, points: 11 },
    };
    const result = fillRoomWithResidents(members, 'room', 0, 0);
    expect(result).toEqual({ 'human-1': real, 'human-2': hidden });
    expect(countLiveMembers(result)).toBe(1);
    expect(countVisibleMembers(result)).toBe(1);
  });

  it('does not classify a human from an untrusted bot flag alone', () => {
    const human = { uid: 'real-uid', isBot: true, isResident: true, points: 8 };
    expect(fillRoomWithResidents({ 'real-uid': human }, 'room', 0, 0)).toEqual({ 'real-uid': human });
  });
});

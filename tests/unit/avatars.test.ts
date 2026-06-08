/**
 * tests/unit/avatars.test.ts
 * Unit tests for constants/avatars.ts — getBestAvatarForLevel(), getBestFrameForLevel()
 */

import {
  getBestAvatarForLevel,
  getBestFrameForLevel,
  getFrameById,
  getAvatarByIndex,
  botLevelFromBase,
  FRAMES,
  AVATARS,
} from '../../constants/avatars';

// Mock AsyncStorage — used only in unlockAllFrames/getUnlockedFrames, not tested here
jest.mock('@react-native-async-storage/async-storage');

// Mock asset require() calls so Jest doesn't choke on image imports
jest.mock('../../assets/images/levels/1.png', () => 1, { virtual: true });

describe('avatars', () => {
  // ── getBestAvatarForLevel ────────────────────────────────────────────────

  describe('getBestAvatarForLevel', () => {
    it('returns "1" for level 1', () => {
      expect(getBestAvatarForLevel(1)).toBe('1');
    });

    it('returns "10" for level 10', () => {
      expect(getBestAvatarForLevel(10)).toBe('10');
    });

    it('returns "50" for level 50', () => {
      expect(getBestAvatarForLevel(50)).toBe('50');
    });

    it('clamps to "1" for level 0 or negative', () => {
      expect(getBestAvatarForLevel(0)).toBe('1');
      expect(getBestAvatarForLevel(-5)).toBe('1');
    });

    it('clamps to "50" for levels above 50', () => {
      expect(getBestAvatarForLevel(51)).toBe('50');
      expect(getBestAvatarForLevel(100)).toBe('50');
    });

    it('returns string (not number)', () => {
      expect(typeof getBestAvatarForLevel(15)).toBe('string');
    });
  });

  // ── getBestFrameForLevel ──────────────────────────────────────────────────

  describe('getBestFrameForLevel', () => {
    it('returns plain frame for level 1', () => {
      const frame = getBestFrameForLevel(1);
      expect(frame.id).toBe('plain');
      expect(frame.unlockLevel).toBe(1);
    });

    it('returns a higher frame for level 10 (ice unlocks at 10)', () => {
      const frame = getBestFrameForLevel(10);
      expect(frame.unlockLevel).toBeLessThanOrEqual(10);
    });

    it('returns the best available frame — not any lower one — for level 10', () => {
      const frame = getBestFrameForLevel(10);
      // ice unlocks at 10, plasma at 13 — so best at lvl10 is ice
      expect(frame.id).toBe('ice');
    });

    it('returns legendary frame for level 50', () => {
      const frame = getBestFrameForLevel(50);
      expect(frame.id).toBe('legendary');
    });

    it('returns plain frame for level 0 (no frame available)', () => {
      const frame = getBestFrameForLevel(0);
      expect(frame.id).toBe('plain');
    });

    it('only considers level-unlocked frames (not achievement/club frames)', () => {
      const frame = getBestFrameForLevel(5);
      expect(frame.unlockType ?? 'level').toBe('level');
    });
  });

  // ── getFrameById ──────────────────────────────────────────────────────────

  describe('getFrameById', () => {
    it('returns correct frame for known id', () => {
      const frame = getFrameById('ice');
      expect(frame.id).toBe('ice');
    });

    it('falls back to first frame for unknown id', () => {
      const frame = getFrameById('nonexistent_id');
      expect(frame).toEqual(FRAMES[0]);
    });
  });

  // ── getAvatarByIndex ──────────────────────────────────────────────────────

  describe('getAvatarByIndex', () => {
    it('returns undefined for index 0', () => {
      expect(getAvatarByIndex(0)).toBeUndefined();
    });

    it('returns first avatar for index 1', () => {
      const avatar = getAvatarByIndex(1);
      expect(avatar).toBeDefined();
      expect(avatar?.unlockLevel).toBe(1);
    });

    it('returns undefined for out-of-range index', () => {
      expect(getAvatarByIndex(AVATARS.length + 1)).toBeUndefined();
    });
  });

  // ── botLevelFromBase ──────────────────────────────────────────────────────

  describe('botLevelFromBase', () => {
    it('returns low level for low weekBase', () => {
      expect(botLevelFromBase(5)).toBe(2);
    });

    it('returns high level for high weekBase', () => {
      expect(botLevelFromBase(200)).toBe(42);
    });

    it('returns level between 2 and 42 for any valid input', () => {
      [0, 10, 20, 35, 55, 80, 110, 140, 200].forEach(base => {
        const lvl = botLevelFromBase(base);
        expect(lvl).toBeGreaterThanOrEqual(2);
        expect(lvl).toBeLessThanOrEqual(42);
      });
    });
  });
});

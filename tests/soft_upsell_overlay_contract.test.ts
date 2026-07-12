import fs from 'fs';
import path from 'path';

import {
  deriveOverlayOccupied,
  useOverlayOccupied,
} from '../components/OverlayArbiter';
import {
  EMPTY_OVERLAY_WANTS,
  NATIVE_MODAL_KEYS,
  OVERLAY_PRIORITY,
} from '../components/overlay_arbiter_core';

const root = path.resolve(__dirname, '..');
const arbiterSource = fs.readFileSync(path.join(root, 'components/OverlayArbiter.tsx'), 'utf8');
const coreSource = fs.readFileSync(path.join(root, 'components/overlay_arbiter_core.ts'), 'utf8');

describe('soft upsell overlay occupancy contract', () => {
  it('exports a read-only occupancy hook without registering soft upsell in the queue', () => {
    expect(typeof useOverlayOccupied).toBe('function');
    expect(arbiterSource).toMatch(/export function useOverlayOccupied\(\): boolean/);
    expect(coreSource).not.toMatch(/soft_?upsell/i);
    expect(Object.keys(EMPTY_OVERLAY_WANTS)).not.toContain('softUpsell');
    expect(OVERLAY_PRIORITY).not.toContain('softUpsell');
    expect(NATIVE_MODAL_KEYS.has('softUpsell' as never)).toBe(false);
  });

  it('keeps the established overlay key/priority list unchanged', () => {
    expect(new Set(Object.keys(EMPTY_OVERLAY_WANTS))).toEqual(new Set(OVERLAY_PRIORITY));
    expect(OVERLAY_PRIORITY).toEqual([
      'onboardingWelcome', 'update', 'releaseNotes', 'broadcast',
      'leagueBonusAvailable', 'notifNudge', 'introFullAccess', 'loyaltyGift',
      'dailyPlan', 'levelUp', 'themedAlert', 'premiumCelebration',
      'vipCelebration', 'leagueResult', 'arenaSeasonResult', 'streakRevive',
      'entitlementExpired', 'referralWelcome', 'mysteryMondayChest', 'comebackDay',
      'boonActivated', 'lessonResultsSequence', 'lessonCompleteNotif',
      'arenaRoomConfirm', 'collectibleDrop', 'shardsEarned',
      'matchFoundToastScreen', 'matchFoundToast', 'arenaInvite',
      'achievementToast', 'dailyTaskRewardToast', 'coachToast', 'actionToast',
      'perfectWeekReward',
    ]);
  });

  it('is occupied for an active overlay or a native handoff gap', () => {
    expect(deriveOverlayOccupied(null, false)).toBe(false);
    expect(deriveOverlayOccupied('update', false)).toBe(true);
    expect(deriveOverlayOccupied(null, true)).toBe(true);
    expect(deriveOverlayOccupied('update', true)).toBe(true);
  });

  it('publishes occupancy in the existing memoized context value', () => {
    expect(arbiterSource).toMatch(
      /useMemo<Ctx>\(\(\) => \(\{ active, occupied, setWants \}\), \[active, occupied, setWants\]\)/,
    );
  });
});

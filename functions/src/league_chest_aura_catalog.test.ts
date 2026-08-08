import fs from 'fs';
import path from 'path';
import { buildRewardProgressPatch, type RewardDrop } from './league_chest';

const source = fs.readFileSync(path.join(__dirname, 'league_chest.ts'), 'utf8');

function auraDrop(auraId: string): RewardDrop {
  return {
    id: `league_${auraId}`,
    kind: 'avatar_aura',
    rarity: 'epic',
    auraId,
  };
}

describe('league chest aura rewards', () => {
  it('uses the strongest root/progress shield copy and dual-writes one canonical value', () => {
    const patch = buildRewardProgressPatch({
      drops: [{ id: 'shield', kind: 'streak_shield', rarity: 'rare', amount: 1 }],
      user: {
        chain_shield: JSON.stringify({ daysLeft: 1 }),
        progress: { chain_shield: JSON.stringify({ daysLeft: 3 }) },
      },
      now: 100,
      expiresAt: 200,
    });
    expect(JSON.parse(String(patch.chain_shield))).toMatchObject({ daysLeft: 4 });
    expect((patch.progress as Record<string, unknown>).chain_shield).toBe(patch.chain_shield);
  });

  it('uses a stable uid tie-break when equal XP must produce one crown winner', () => {
    expect(source).toContain("b.points - a.points || a.uid.localeCompare(b.uid)");
  });

  it('keeps every valid app aura in the server reward pool', () => {
    expect(source).toContain(
      "const AVATAR_AURA_IDS = ['aura-aurora', 'aura-ember', 'aura-mint', 'aura-violet', 'aura-coral'] as const;",
    );
  });

  it.each(['aura-gold'])(
    'does not grant or activate aura %s when it is outside the server reward pool',
    (auraId) => {
      expect(buildRewardProgressPatch({
        drops: [auraDrop(auraId)],
        user: {
          progress: {
            avatar_aura_owned_v1: JSON.stringify({ [auraId]: true }),
            user_avatar_aura: auraId,
          },
        },
        now: 100,
        expiresAt: 200,
      })).toEqual({});
    },
  );

  it.each(['aura-mint', 'aura-coral'])(
    'grants and activates valid aura %s',
    (auraId) => {
      const patch = buildRewardProgressPatch({
        drops: [auraDrop(auraId)],
        user: { progress: {} },
        now: 100,
        expiresAt: 200,
      });
      const progress = patch.progress as Record<string, unknown>;
      expect(JSON.parse(progress.avatar_aura_owned_v1 as string)).toEqual({ [auraId]: true });
      expect(progress.avatar_aura_gift_owned_v1).toBe(auraId);
      expect(progress.user_avatar_aura).toBe(auraId);
    },
  );

  it('preserves legacy ownership while adding and activating a retained reward', () => {
    const patch = buildRewardProgressPatch({
      drops: [auraDrop('aura-violet')],
      user: {
        progress: {
          avatar_aura_owned_v1: JSON.stringify({
            'aura-mint': true,
            'aura-coral': true,
            'aura-gold': true,
          }),
        },
      },
      now: 100,
      expiresAt: 200,
    });
    const progress = patch.progress as Record<string, unknown>;

    expect(JSON.parse(progress.avatar_aura_owned_v1 as string)).toEqual({
      'aura-mint': true,
      'aura-coral': true,
      'aura-gold': true,
      'aura-violet': true,
    });
    expect(progress.avatar_aura_gift_owned_v1).toBe('aura-violet');
    expect(progress.user_avatar_aura).toBe('aura-violet');
  });
});

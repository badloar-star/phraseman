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
  it('keeps the existing reward pool independent from the restored shop catalog', () => {
    expect(source).toContain(
      "const AVATAR_AURA_IDS = ['aura-aurora', 'aura-ember', 'aura-violet'] as const;",
    );
  });

  it.each(['aura-mint', 'aura-coral', 'aura-gold'])(
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

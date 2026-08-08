import fs from 'node:fs';
import path from 'node:path';

const read = (name: string) => fs.readFileSync(path.join(__dirname, name), 'utf8');

describe('canonical server-owned gift perk producers', () => {
  it('keeps new authority callables in both selective deployment commands', () => {
    const pkg = JSON.parse(read('../package.json')) as { scripts: Record<string, string> };
    for (const scriptName of ['deploy:safe', 'deploy:community-gift']) {
      expect(pkg.scripts[scriptName]).toContain('functions:friendConsumeChainShield');
      expect(pkg.scripts[scriptName]).toContain('functions:globalBroadcastClaim');
      expect(pkg.scripts[scriptName]).toContain('functions:seasonRedeemConsumable');
      expect(pkg.scripts[scriptName]).toContain('functions:leagueActivateGroupBoost');
    }
  });

  it('season shield reads both canonical copies and dual-writes one string value', () => {
    const source = read('season_pass.ts');
    const start = source.indexOf('export const seasonSendFriendShield');
    const end = source.indexOf('export const seasonBuyPass', start);
    const producer = source.slice(start, end);
    expect(producer).toContain('Math.max(parseDays(friendData.chain_shield), parseDays(progress.chain_shield))');
    expect(producer).toContain('chain_shield: canonicalShield');
    expect(producer).toContain('progress: { chain_shield: canonicalShield }');
    expect(producer).not.toContain('chain_shield: { daysLeft:');
  });

  it('level complete_claim validates a reservation and writes canonical perk fields server-side', () => {
    const source = read('community_packs.ts');
    const start = source.indexOf('export const levelGiftReserve');
    const end = source.indexOf('export const levelGiftActivatePackGift', start);
    const claim = source.slice(start, end);
    expect(claim).toContain("action === 'complete_claim'");
    expect(claim).toContain('levelGiftPerkActivation(requestedGiftId');
    expect(claim).toContain('tx.update(userRef, activation.userPatch)');
    expect(claim).toContain('perkResponse: activation.response');
  });

  it('season club voucher activation is server-owned and returns an exact count receipt', () => {
    const server = read('season_pass.ts');
    const client = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'season_reward_apply.ts'), 'utf8');
    expect(server).toContain("kind !== 'club_totem'");
    expect(server).toContain("'progress.club_gift_free_boost_v1'");
    expect(server).toContain('clubGiftFreeBoostCount');
    expect(client).toContain("seasonRedeemConsumableOnServer({ giftId: idempotencyKey, kind: 'club_totem' })");
    expect(client).toContain('setClubGiftFreeBoostCountFromAuthority');
  });
});

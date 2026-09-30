import fs from 'node:fs';
import path from 'node:path';

const read = (name: string) => fs.readFileSync(path.join(__dirname, name), 'utf8');

describe('canonical server-owned gift perk producers', () => {
  it('keeps new authority callables in both selective deployment commands', () => {
    const pkg = JSON.parse(read('../package.json')) as { scripts: Record<string, string> };
    for (const scriptName of ['deploy:safe', 'deploy:community-gift']) {
      expect(pkg.scripts[scriptName]).not.toContain('functions:friendConsumeChainShield');
      expect(pkg.scripts[scriptName]).toContain('functions:globalBroadcastClaim');
    }
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

});

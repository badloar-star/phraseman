import fs from 'fs';
import path from 'path';

describe('Season Pass pearl authority', () => {
  it('keeps the legacy claim marker and Plus entitlement but never authors a personal pearl event', () => {
    const source = fs.readFileSync(path.join(__dirname, 'season_pass.ts'), 'utf8');
    const claim = source.slice(source.indexOf('export const seasonClaimReward'), source.indexOf('export const seasonRedeemConsumable'));
    expect(claim).toContain("if (kind === 'pearls')");
    expect(claim).toContain("kind === 'plus_days'");
    expect(claim).toContain("patch['progress.vip_until']");
    expect(claim).not.toContain('appendExternalEconomyEvent');
    expect(claim).not.toContain('shardsBalance');
    expect(claim).not.toContain('shardsDelta');
    expect(claim).not.toContain('shardEventId');
  });
});

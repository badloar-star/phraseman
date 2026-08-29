import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('report reward bundle client contract', () => {
  it('uses exact three-currency tiers and a durable resumable claim intent', () => {
    const source = read('app/report_reward_bundle.ts');
    expect(source).toContain("minor: Object.freeze({ version: 1, severity: 'minor', spins: 1, runes: 300, pearls: 1 })");
    expect(source).toContain("serious: Object.freeze({ version: 1, severity: 'serious', spins: 2, runes: 600, pearls: 5 })");
    expect(source).toContain("critical: Object.freeze({ version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 10 })");
    expect(source).toContain("PENDING_KEY_PREFIX = 'report_reward_bundle_claims_v1:'");
    expect(source).toContain('serverConfirmed: boolean');
    expect(source).toContain('pearlsCredited: boolean');
    expect(source).toContain('runesCredited: boolean');
    expect(source).toContain('spinsCredited: boolean');
    expect(source).toContain('resumePendingReportRewardBundleClaims');
  });

  it('credits each lane idempotently only after the server confirms the immutable bundle', () => {
    const source = read('app/report_reward_bundle.ts');
    const server = source.indexOf('const server = await callClaim');
    const pearls = source.indexOf('await commitConfirmedExternalShardEvent', server);
    const runes = source.indexOf('await creditRunes', server);
    const spins = source.indexOf('grantLocalReportRewardSpins', server);
    expect(server).toBeGreaterThanOrEqual(0);
    expect(pearls).toBeGreaterThan(server);
    expect(runes).toBeGreaterThan(pearls);
    expect(spins).toBeGreaterThan(runes);
    expect(source).toContain("source: 'report_reply'");
    expect(source).toContain("reason: 'report_reward_bundle_claim'");
  });

  it('mints deterministic spin IDs for the exact report and ordinal', () => {
    const spins = read('app/local_level_spins.ts');
    const ids = read('app/level_spin_credit_ids.ts');
    expect(spins).toContain('grantLocalReportRewardSpins');
    expect(spins).toContain('`local_spin_report_${safeMessageId}_${index + 1}`');
    expect(ids).toContain('chest|report');
  });

  it('replays rune and spin extras from the immutable cloud event before marking it applied', () => {
    const source = read('app/report_reward_bundle.ts');
    const sync = read('app/economy/external_shard_event_sync.ts');
    const replay = sync.indexOf('applyConfirmedReportRewardBundleExtrasFromEvent');
    const marker = sync.indexOf('AsyncStorage.setItem(markerKey', replay);

    expect(source).toContain('export async function applyConfirmedReportRewardBundleExtrasFromEvent');
    expect(sync).toContain("event.source === 'report_reply'");
    expect(sync).toContain("event.kind === 'confirmed_report_reward_bundle'");
    expect(replay).toBeGreaterThanOrEqual(0);
    expect(marker).toBeGreaterThan(replay);
  });
});

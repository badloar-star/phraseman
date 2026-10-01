import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('report reward bundle client contract', () => {
  // зачем: Q4 (координатор 01.10) — новые награды в монетах (v2), v1 читается для старых.
  it('uses exact v2 coin tiers for new rewards', () => {
    const source = read('app/report_reward_bundle.ts');
    expect(source).toContain("minor: Object.freeze({ version: 2, severity: 'minor', coins: 300 })");
    expect(source).toContain("serious: Object.freeze({ version: 2, severity: 'serious', coins: 600 })");
    expect(source).toContain("critical: Object.freeze({ version: 2, severity: 'critical', coins: 1000 })");
    expect(source).toContain('[REPORT-REWARD]');
  });

  it('keeps exact v1 three-currency tiers readable and a durable resumable claim intent', () => {
    const source = read('app/report_reward_bundle.ts');
    expect(source).toContain("minor: Object.freeze({ version: 1, severity: 'minor', spins: 1, runes: 300, pearls: 1 })");
    expect(source).toContain("serious: Object.freeze({ version: 1, severity: 'serious', spins: 2, runes: 600, pearls: 5 })");
    expect(source).toContain("critical: Object.freeze({ version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 10 })");
    expect(source).toContain("PENDING_KEY_PREFIX = 'report_reward_bundle_claims_v1:'");
    expect(source).toContain('serverConfirmed: boolean');
    // зачем: D70/D104 — жемчужная часть набора больше не начисляется.
    expect(source).not.toContain('pearlsCredited');
    expect(source).toContain('runesCredited: boolean');
    expect(source).toContain('spinsCredited: boolean');
    expect(source).toContain('resumePendingReportRewardBundleClaims');
  });

  it('credits coins (runes) only after the server confirms the immutable bundle and never pearls', () => {
    const source = read('app/report_reward_bundle.ts');
    const server = source.indexOf('const server = await callClaim');
    const runes = source.indexOf('await creditRunes', server);
    expect(server).toBeGreaterThanOrEqual(0);
    expect(runes).toBeGreaterThan(server);
    expect(source).not.toContain('commitConfirmedExternalShardEvent');
    expect(source).toContain('[REPORT-REWARD]');
  });

  // PM-047 (владелец): спин убран как механика — grantLocalReportRewardSpins
  // больше не вызывается, spins-часть бандла закрывается молча логом
  // [SPIN-RETIRED] вместо начисления. Тест старого правила (спин начислялся
  // детерминированным id) заменён проверкой, что обещание отменено.
  it('retires the spins portion of a report reward without crediting or retrying', () => {
    const source = read('app/report_reward_bundle.ts');
    expect(source).not.toContain('grantLocalReportRewardSpins');
    expect(source).not.toContain("throw new Error('report_reward_spins_failed')");
    expect(source).toContain('[SPIN-RETIRED]');
  });

  // PM-289 (D70/D109): синхронизатор внешних событий жемчуга удалён, сервер
  // событий report_reply больше не пишет. Монеты за репорт идут ОДНИМ путём —
  // claimReportRewardBundle → creditRunes (level_spin_star_grants).
  it('credits report coins only through the claim path after the external event replay is removed', () => {
    const source = read('app/report_reward_bundle.ts');
    expect(fs.existsSync(path.join(__dirname, '../app/economy/external_shard_event_sync.ts'))).toBe(false);
    expect(source).not.toContain('export async function applyConfirmedReportRewardBundleExtrasFromEvent');
    expect(source).toContain('export async function claimReportRewardBundle');
    expect(source).toContain('await creditRunes(current.messageId, current.rewardBundle, token)');
  });
});

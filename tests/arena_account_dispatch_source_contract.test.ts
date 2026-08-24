import fs from 'node:fs';
import path from 'node:path';

const read = (relative: string): string => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');

describe('Arena account-reserved Firebase dispatch wiring', () => {
  it('prepares and creates the callable promise under reservation, then awaits it outside', () => {
    const client = read('app/arena_client.ts');
    const delivery = read('modules/arena/finish_delivery.ts');
    expect(client).toContain('arenaV2MatchFinishDispatch');
    expect(client).toContain('prepareArenaCall');
    expect(client).toContain('arenaReserveAccountDispatch');
    expect(delivery).toContain('const dispatch = await input.reserveDispatch();');
    expect(delivery).toContain('response = await dispatch.networkPromise;');
    expect(delivery.indexOf('response = await dispatch.networkPromise;'))
      .toBeGreaterThan(delivery.indexOf('const dispatch = await input.reserveDispatch();'));
  });

  it('uses the reserved dispatch for both direct finish and outbox replay', () => {
    const screen = read('app/arena_match.tsx');
    const client = read('app/arena_client.ts');
    expect(screen).toContain('reserveDispatch: () => arenaV2MatchFinishDispatch(');
    expect(client).toContain('const dispatch = await arenaV2MatchFinishDispatch(');
    expect(client).toContain('await dispatch.networkPromise;');
  });

  it('feeds initial delivery and current-match retry through one typed response handler', () => {
    const screen = read('app/arena_match.tsx');
    const client = read('app/arena_client.ts');
    expect(client).toContain('arenaRetryQueuedFinish');
    expect(screen).toContain('handleFinishDelivery(delivery)');
    expect(screen).toContain('handleFinishDelivery(retry)');
    expect(screen).toContain('response.viewerReview');
    expect(screen).toContain('response.settleProbeAtMs');
    expect(screen).toContain('openCoherentResult(response)');
  });

  it('reserves both initial and terminal result sync under the captured account', () => {
    const results = read('app/arena_results.tsx');
    expect(results).not.toMatch(/\barenaV2SyncMatch\(/);
    expect(results).toContain('const dispatch = await arenaV2SyncMatchDispatch(matchId, version, resultAccount);');
    expect(results).toContain('void requestResultSync(matchId)');
    expect(results).toContain('request: requestResultSync');
    expect(results).toContain("throw new Error('arena_account_scope_stale')");
  });
});

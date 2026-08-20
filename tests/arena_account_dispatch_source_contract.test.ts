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
});

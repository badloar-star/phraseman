import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relative: string): string => readFileSync(path.resolve(__dirname, '..', relative), 'utf8');

describe('Arena finish owner-scope wiring', () => {
  it('binds the plan/report to the captured account instead of recapturing at finish', () => {
    const screen = read('app/arena_match.tsx');
    expect(screen).toContain('arenaDeliverFinishedMatch');
    expect(screen).toContain('planAccountRef');
    expect(screen).not.toContain('const finishAccount = captureAccountGeneration();');
  });

  it('uses the account-transition lock only around durable local commits', () => {
    const delivery = read('modules/arena/finish_delivery.ts');
    expect(delivery).toContain('withTransitionLock');
    expect(delivery).toContain('const dispatch = await input.reserveDispatch();');
    expect(delivery).toContain('response = await dispatch.networkPromise;');
    expect(delivery.indexOf('await dispatch.networkPromise')).toBeGreaterThan(delivery.indexOf('withTransitionLock'));
  });

  it('flush captures one explicit current owner and fences the callable', () => {
    const client = read('app/arena_client.ts');
    expect(client).toContain('const account = captureAccountGeneration();');
    expect(client).toContain('scope,');
    expect(client).toContain('isScopeCurrent:');
  });
});

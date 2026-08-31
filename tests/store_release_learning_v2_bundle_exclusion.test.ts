import fs from 'node:fs';
import path from 'node:path';

describe('store release Learning V2 bundle boundary', () => {
  const routerContext = fs.readFileSync(path.join(__dirname, '..', 'router.ctx.js'), 'utf8');
  const metroConfig = fs.readFileSync(path.join(__dirname, '..', 'metro.config.js'), 'utf8');
  const outboxStub = fs.readFileSync(
    path.join(__dirname, '..', 'store_release_stubs', 'coin_exchange_wallet_outbox_stub.ts'),
    'utf8',
  );
  const sessionRuneStub = fs.readFileSync(
    path.join(__dirname, '..', 'store_release_stubs', 'learning_session_rune_reward_composite_stub.ts'),
    'utf8',
  );
  const storeBranch = routerContext.split(': require.context(')[0] ?? '';

  test('excludes every Learning V2 route module from the store require context', () => {
    expect(storeBranch).toContain("process.env.EXPO_PUBLIC_STORE_RELEASE === '1'");
    expect(storeBranch).toContain('(?!(?:.*learning[_-]v2.*)\\.tsx?$)');
    expect(storeBranch).toContain('coin_exchange(?:_client|_wallet_outbox)?');
  });

  test('keeps the non-store router context unchanged for future V2 development', () => {
    const nonStoreBranch = routerContext.split(': require.context(')[1] ?? '';
    expect(nonStoreBranch).not.toContain('(?!(?:.*learning[_-]v2.*)\\.tsx?$)');
  });

  test('replaces the root coin-exchange replay with a store-only no-op', () => {
    expect(metroConfig).toContain("moduleName === './coin_exchange_wallet_outbox'");
    expect(metroConfig).toContain('storeReleaseCoinExchangeOutboxStubPath');
    expect(outboxStub).toContain('resumePendingCoinExchangeWalletRewards');
    expect(outboxStub).toContain('return 0');
  });

  test('stubs only the inaccessible V2 session-rune authority in store builds', () => {
    expect(metroConfig).toContain(
      "moduleName === '../modules/learning-v2/progress/learning_session_rune_reward_composite_v1'",
    );
    expect(metroConfig).toContain('storeReleaseSessionRuneCompositeStubPath');
    expect(sessionRuneStub).toContain("throw new Error('learning_v2_store_disabled')");
  });
});

import assert from 'node:assert/strict';

type ModuleShape = typeof import('../app/customization_purchase_cta');

void (async () => {
  let purchaseCta: ModuleShape | null = null;
  try {
    purchaseCta = await import('../app/customization_purchase_cta');
  } catch {
    // RED is an assertion below, not a module-loader crash: the helper does not
    // exist until the affordability contract is implemented.
  }

  assert.ok(purchaseCta, 'customization purchase CTA affordability helper must exist');

const runeShortage = purchaseCta.resolveCustomizationPurchaseCta({
  price: { currency: 'runes', amount: 5_600 },
  runeBalance: 5_599,
  pearlBalance: 99_999,
});
assert.deepEqual(runeShortage, {
  price: { currency: 'runes', amount: 5_600 },
  canAfford: false,
  shortage: 'runes',
  shortageRoute: '/runes_wallet',
});

const pearlShortage = purchaseCta.resolveCustomizationPurchaseCta({
  price: { currency: 'pearls', amount: 120 },
  runeBalance: 99_999,
  pearlBalance: 119,
});
assert.deepEqual(pearlShortage, {
  price: { currency: 'pearls', amount: 120 },
  canAfford: false,
  shortage: 'pearls',
  shortageRoute: '/shards_shop',
});

const affordable = purchaseCta.resolveCustomizationPurchaseCta({
  price: { currency: 'pearls', amount: 120 },
  runeBalance: 0,
  pearlBalance: 120,
});
assert.deepEqual(affordable, {
  price: { currency: 'pearls', amount: 120 },
  canAfford: true,
  shortage: null,
  shortageRoute: null,
});

const free = purchaseCta.resolveCustomizationPurchaseCta({
  price: { currency: 'runes', amount: 0 },
  runeBalance: 0,
  pearlBalance: 0,
});
assert.equal(free.canAfford, true);
assert.equal(free.shortage, null);

const refreshBalances = (purchaseCta as any).refreshCurrentCustomizationBalances;
assert.equal(typeof refreshBalances, 'function', 'account-scoped balance refresh coordinator must exist');

let accountGeneration = 'account-a';
let resolvePearls!: (value: number) => void;
let resolveRunes!: (value: number) => void;
const pearlRead = new Promise<number>((resolve) => { resolvePearls = resolve; });
const runeRead = new Promise<number>((resolve) => { resolveRunes = resolve; });
const publishedBalances: Array<readonly [number, number]> = [];
const refresh = refreshBalances({
  captureAccount: () => accountGeneration,
  isCurrentAccount: (captured: string) => captured === accountGeneration,
  readPearlBalance: () => pearlRead,
  readRuneBalance: () => runeRead,
  publishBalances: (pearlBalance: number, runeBalance: number) => {
    publishedBalances.push([pearlBalance, runeBalance]);
  },
});
accountGeneration = 'account-b';
resolvePearls(120);
resolveRunes(5_600);
assert.equal(await refresh, 'stale-account');
assert.deepEqual(publishedBalances, [], 'account A balances must never publish into account B');

const runFreshPreflight = (purchaseCta as any).runFreshCustomizationPurchasePreflight;
assert.equal(typeof runFreshPreflight, 'function', 'fresh purchase preflight coordinator must exist');

const staleLowEvents: string[] = [];
const staleLowResult = await runFreshPreflight({
  price: { currency: 'pearls', amount: 120 },
  captureAccount: () => 'account-a',
  isCurrentAccount: () => true,
  readPearlBalance: async () => 120,
  readRuneBalance: async () => 0,
  publishBalances: () => staleLowEvents.push('published'),
  notifyShortage: () => staleLowEvents.push('notified'),
  openShortageDestination: () => staleLowEvents.push('routed'),
  onAffordable: () => staleLowEvents.push('purchase'),
});
assert.equal(staleLowResult, 'proceeded');
assert.deepEqual(
  staleLowEvents,
  ['published', 'purchase'],
  'a stale-low render must not route when the fresh balance can afford the purchase',
);

const staleHighEvents: string[] = [];
const staleHighResult = await runFreshPreflight({
  price: { currency: 'runes', amount: 5_600 },
  captureAccount: () => 'account-a',
  isCurrentAccount: () => true,
  readPearlBalance: async () => 999,
  readRuneBalance: async () => 5_599,
  publishBalances: () => staleHighEvents.push('published'),
  notifyShortage: (shortage: string) => staleHighEvents.push(`notified:${shortage}`),
  openShortageDestination: (shortage: string) => staleHighEvents.push(`routed:${shortage}`),
  onAffordable: () => staleHighEvents.push('purchase'),
});
assert.equal(staleHighResult, 'shortage');
assert.deepEqual(
  staleHighEvents,
  ['published', 'notified:runes', 'routed:runes'],
  'a stale-high render must explicitly notify and route without starting a purchase',
);

const switchedPurchaseEvents: string[] = [];
let currentPurchaseAccount = 'account-a';
const switchedPurchase = runFreshPreflight({
  price: { currency: 'pearls', amount: 120 },
  captureAccount: () => currentPurchaseAccount,
  isCurrentAccount: (captured: string) => captured === currentPurchaseAccount,
  readPearlBalance: async () => {
    currentPurchaseAccount = 'account-b';
    return 120;
  },
  readRuneBalance: async () => 5_600,
  publishBalances: () => switchedPurchaseEvents.push('published'),
  notifyShortage: () => switchedPurchaseEvents.push('notified'),
  openShortageDestination: () => switchedPurchaseEvents.push('routed'),
  onAffordable: () => switchedPurchaseEvents.push('purchase'),
});
assert.equal(await switchedPurchase, 'stale-account');
assert.deepEqual(switchedPurchaseEvents, [], 'account switch must cancel every purchase-side effect');

const runSingleFlight = (purchaseCta as any).runCustomizationPurchasePreflightSingleFlight;
assert.equal(typeof runSingleFlight, 'function', 'purchase preflight single-flight guard must exist');

const shortageFlight = { current: false };
const shortageFlightEvents: string[] = [];
const shortageTask = () => runFreshPreflight({
  price: { currency: 'pearls', amount: 120 },
  captureAccount: () => 'account-a',
  isCurrentAccount: () => true,
  readPearlBalance: async () => {
    shortageFlightEvents.push('read-pearls');
    await Promise.resolve();
    return 119;
  },
  readRuneBalance: async () => {
    shortageFlightEvents.push('read-runes');
    return 0;
  },
  publishBalances: () => shortageFlightEvents.push('published'),
  notifyShortage: () => shortageFlightEvents.push('notified'),
  openShortageDestination: () => shortageFlightEvents.push('routed'),
  onAffordable: () => shortageFlightEvents.push('purchase'),
});
const shortageFirst = runSingleFlight(shortageFlight, shortageTask);
const shortageSecond = runSingleFlight(shortageFlight, shortageTask);
assert.equal(await shortageSecond, 'in-flight');
assert.equal(await shortageFirst, 'shortage');
assert.deepEqual(shortageFlightEvents, [
  'read-pearls', 'read-runes', 'published', 'notified', 'routed',
]);
assert.equal(shortageFlight.current, false, 'single-flight guard must release after shortage');

const affordableFlight = { current: false };
const affordableFlightEvents: string[] = [];
const affordableTask = () => runFreshPreflight({
  price: { currency: 'runes', amount: 5_600 },
  captureAccount: () => 'account-a',
  isCurrentAccount: () => true,
  readPearlBalance: async () => {
    affordableFlightEvents.push('read-pearls');
    await Promise.resolve();
    return 0;
  },
  readRuneBalance: async () => {
    affordableFlightEvents.push('read-runes');
    return 5_600;
  },
  publishBalances: () => affordableFlightEvents.push('published'),
  notifyShortage: () => affordableFlightEvents.push('notified'),
  openShortageDestination: () => affordableFlightEvents.push('routed'),
  onAffordable: () => affordableFlightEvents.push('purchase'),
});
const affordableFirst = runSingleFlight(affordableFlight, affordableTask);
const affordableSecond = runSingleFlight(affordableFlight, affordableTask);
assert.equal(await affordableSecond, 'in-flight');
assert.equal(await affordableFirst, 'proceeded');
assert.deepEqual(affordableFlightEvents, [
  'read-pearls', 'read-runes', 'published', 'purchase',
]);
assert.equal(affordableFlight.current, false, 'single-flight guard must release after purchase');

const executeAccountScopedPurchase = (purchaseCta as any).executeAccountScopedCustomizationPurchase;
assert.equal(
  typeof executeAccountScopedPurchase,
  'function',
  'account-scoped purchase executor must exist',
);

const switchDuringPrepareEvents: string[] = [];
let prepareAccount = 'account-a';
await assert.rejects(
  executeAccountScopedPurchase({
    expectedAccount: 'account-a',
    isCurrentAccount: (captured: string) => captured === prepareAccount,
    prepare: async () => {
      switchDuringPrepareEvents.push('prepare');
      await Promise.resolve();
      prepareAccount = 'account-b';
      return 'prepared-a';
    },
    resume: async () => {
      switchDuringPrepareEvents.push('resume-debit');
      return 'applied';
    },
    readPostPurchaseBalance: async () => {
      switchDuringPrepareEvents.push('read-balance');
      return 80;
    },
    publishPostPurchaseBalance: () => switchDuringPrepareEvents.push('publish-balance'),
  }),
  /customization_purchase_account_mismatch/,
);
assert.deepEqual(
  switchDuringPrepareEvents,
  ['prepare'],
  'switch during async prepare must prevent resume/debit, balance publication, and success',
);

const switchDuringBalanceEvents: string[] = [];
let balanceAccount = 'account-a';
await assert.rejects(
  executeAccountScopedPurchase({
    expectedAccount: 'account-a',
    isCurrentAccount: (captured: string) => captured === balanceAccount,
    prepare: async () => {
      switchDuringBalanceEvents.push('prepare');
      return 'prepared-a';
    },
    resume: async () => {
      switchDuringBalanceEvents.push('resume-debit');
      return 'applied';
    },
    readPostPurchaseBalance: async () => {
      switchDuringBalanceEvents.push('read-balance');
      await Promise.resolve();
      balanceAccount = 'account-b';
      return 80;
    },
    publishPostPurchaseBalance: () => switchDuringBalanceEvents.push('publish-balance'),
  }),
  /customization_purchase_account_mismatch/,
);
assert.deepEqual(
  switchDuringBalanceEvents,
  ['prepare', 'resume-debit', 'read-balance'],
  'post-purchase balance from account A must not publish or produce success in account B',
);

const asyncAffordableEvents: string[] = [];
let asyncAffordableAccount = 'account-a';
await assert.rejects(
  runFreshPreflight({
    price: { currency: 'pearls', amount: 120 },
    captureAccount: () => asyncAffordableAccount,
    isCurrentAccount: (captured: string) => captured === asyncAffordableAccount,
    readPearlBalance: async () => 120,
    readRuneBalance: async () => 0,
    publishBalances: () => asyncAffordableEvents.push('publish-preflight-balances'),
    notifyShortage: () => asyncAffordableEvents.push('notified'),
    openShortageDestination: () => asyncAffordableEvents.push('routed'),
    onAffordable: async (captured: string) => {
      await Promise.resolve();
      asyncAffordableAccount = 'account-b';
      const outcome = await executeAccountScopedPurchase({
        expectedAccount: captured,
        isCurrentAccount: (expected: string) => expected === asyncAffordableAccount,
        prepare: async () => {
          asyncAffordableEvents.push('prepare');
          return 'prepared-a';
        },
        resume: async () => {
          asyncAffordableEvents.push('resume-debit');
          return 'applied';
        },
        readPostPurchaseBalance: async () => {
          asyncAffordableEvents.push('read-balance');
          return 80;
        },
        publishPostPurchaseBalance: () => asyncAffordableEvents.push('publish-balance'),
      });
      asyncAffordableEvents.push(`success:${outcome}`);
    },
  }),
  /customization_purchase_account_mismatch/,
);
assert.deepEqual(
  asyncAffordableEvents,
  ['publish-preflight-balances'],
  'switch inside async onAffordable must prevent prepare/resume/debit, balance publication, and success',
);

  console.log('customization_purchase_cta_gate: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

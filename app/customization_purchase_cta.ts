import type { CustomizationCurrency } from './customization_catalog';

export type CustomizationPurchasePrice = Readonly<{
  currency: CustomizationCurrency;
  amount: number;
}>;

export type CustomizationPurchaseShortage = CustomizationCurrency | null;

export type CustomizationPurchaseCtaDecision = Readonly<{
  /** Price is deliberately preserved even when the balance is insufficient. */
  price: CustomizationPurchasePrice;
  canAfford: boolean;
  shortage: CustomizationPurchaseShortage;
  shortageRoute: '/runes_wallet' | '/shards_shop' | null;
}>;

export type CustomizationBalanceRefreshStatus = 'published' | 'stale-account';

export async function refreshCurrentCustomizationBalances<AccountToken>(deps: Readonly<{
  captureAccount: () => AccountToken;
  isCurrentAccount: (captured: AccountToken) => boolean;
  readPearlBalance: () => Promise<number>;
  readRuneBalance: () => Promise<number>;
  publishBalances: (pearlBalance: number, runeBalance: number) => void;
}>): Promise<CustomizationBalanceRefreshStatus> {
  const capturedAccount = deps.captureAccount();
  const [pearlBalance, runeBalance] = await Promise.all([
    deps.readPearlBalance(),
    deps.readRuneBalance(),
  ]);
  if (!deps.isCurrentAccount(capturedAccount)) return 'stale-account';
  deps.publishBalances(pearlBalance, runeBalance);
  return 'published';
}

export type CustomizationPurchasePreflightStatus = 'proceeded' | 'shortage' | 'stale-account';

export type CustomizationPurchasePreflightFlight = { current: boolean };

export async function runCustomizationPurchasePreflightSingleFlight<T>(
  flight: CustomizationPurchasePreflightFlight,
  run: () => Promise<T>,
): Promise<T | 'in-flight'> {
  if (flight.current) return 'in-flight';
  // This assignment is intentionally synchronous: React state cannot close the
  // same-frame double-tap window, while a ref can.
  flight.current = true;
  try {
    return await run();
  } finally {
    flight.current = false;
  }
}

export async function executeAccountScopedCustomizationPurchase<AccountToken, Prepared, Outcome>(
  input: Readonly<{
    expectedAccount: AccountToken;
    isCurrentAccount: (captured: AccountToken) => boolean;
    prepare: (captured: AccountToken) => Promise<Prepared>;
    resume: (prepared: Prepared, captured: AccountToken) => Promise<Outcome>;
    readPostPurchaseBalance: (captured: AccountToken) => Promise<number>;
    publishPostPurchaseBalance: (balance: number, captured: AccountToken) => void;
  }>,
): Promise<Outcome> {
  const assertCurrentAccount = (): void => {
    if (!input.isCurrentAccount(input.expectedAccount)) {
      throw new Error('customization_purchase_account_mismatch');
    }
  };

  assertCurrentAccount();
  const prepared = await input.prepare(input.expectedAccount);
  assertCurrentAccount();
  const outcome = await input.resume(prepared, input.expectedAccount);
  assertCurrentAccount();
  const balance = await input.readPostPurchaseBalance(input.expectedAccount);
  assertCurrentAccount();
  input.publishPostPurchaseBalance(balance, input.expectedAccount);
  assertCurrentAccount();
  return outcome;
}

export async function runFreshCustomizationPurchasePreflight<AccountToken>(input: Readonly<{
  price: CustomizationPurchasePrice;
  captureAccount: () => AccountToken;
  isCurrentAccount: (captured: AccountToken) => boolean;
  readPearlBalance: () => Promise<number>;
  readRuneBalance: () => Promise<number>;
  publishBalances: (pearlBalance: number, runeBalance: number) => void;
  notifyShortage: (shortage: Exclude<CustomizationPurchaseShortage, null>) => void;
  openShortageDestination: (shortage: Exclude<CustomizationPurchaseShortage, null>) => void;
  onAffordable: (captured: AccountToken) => void | Promise<void>;
}>): Promise<CustomizationPurchasePreflightStatus> {
  const capturedAccount = input.captureAccount();
  const [pearlBalance, runeBalance] = await Promise.all([
    input.readPearlBalance(),
    input.readRuneBalance(),
  ]);
  if (!input.isCurrentAccount(capturedAccount)) return 'stale-account';

  input.publishBalances(pearlBalance, runeBalance);
  if (!input.isCurrentAccount(capturedAccount)) return 'stale-account';

  const decision = resolveCustomizationPurchaseCta({
    price: input.price,
    runeBalance,
    pearlBalance,
  });
  if (decision.shortage) {
    input.notifyShortage(decision.shortage);
    if (!input.isCurrentAccount(capturedAccount)) return 'stale-account';
    input.openShortageDestination(decision.shortage);
    return 'shortage';
  }

  if (!input.isCurrentAccount(capturedAccount)) return 'stale-account';
  await input.onAffordable(capturedAccount);
  if (!input.isCurrentAccount(capturedAccount)) return 'stale-account';
  return 'proceeded';
}

function safeBalance(value: number): number {
  const normalized = Math.floor(Number(value));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

export function resolveCustomizationPurchaseCta(input: Readonly<{
  price: CustomizationPurchasePrice;
  runeBalance: number;
  pearlBalance: number;
}>): CustomizationPurchaseCtaDecision {
  const amount = safeBalance(input.price.amount);
  const price = { ...input.price, amount };
  const balance = input.price.currency === 'runes'
    ? safeBalance(input.runeBalance)
    : safeBalance(input.pearlBalance);
  const canAfford = balance >= amount;

  if (canAfford) {
    return { price, canAfford: true, shortage: null, shortageRoute: null };
  }
  return input.price.currency === 'runes'
    ? { price, canAfford: false, shortage: 'runes', shortageRoute: '/runes_wallet' }
    : { price, canAfford: false, shortage: 'pearls', shortageRoute: '/shards_shop' };
}

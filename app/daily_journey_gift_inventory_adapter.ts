import type { ImageSourcePropType } from 'react-native';

const DAILY_JOURNEY_RUNE_IMAGE_SOURCE = require('../assets/images/level-spin-rewards/stars_10.webp') as ImageSourcePropType;

/** Clean-checkout rune raster shared with the approved Daily Journey reveal. */
export function dailyJourneyRuneImageSource(): ImageSourcePropType {
  return DAILY_JOURNEY_RUNE_IMAGE_SOURCE;
}

export type DailyJourneyGiftArtReward = Readonly<{
  kind: 'pearls' | 'energy_full' | 'energy_plus' | 'runes' | 'freeze' | 'spins';
  amount: number;
}>;

export type DailyJourneyGiftInventoryItem = Readonly<{
  operationId: string;
}>;

export type DailyJourneyGiftArtDescriptor =
  | Readonly<{ kind: 'level_spin'; rewardId: string }>
  | Readonly<{ kind: 'rune' }>
  | Readonly<{ kind: 'spin' }>
  | Readonly<{ kind: 'freeze' }>;

/** Maps the immutable journal payload itself; no preview-day reconstruction. */
export function dailyJourneyGiftArtDescriptor(
  reward: DailyJourneyGiftArtReward,
): DailyJourneyGiftArtDescriptor {
  switch (reward.kind) {
    case 'pearls':
      return Object.freeze({ kind: 'level_spin', rewardId: `pearls_${reward.amount}` });
    case 'runes':
      return Object.freeze({ kind: 'rune' });
    case 'spins':
      return Object.freeze({ kind: 'spin' });
    case 'energy_full':
      return Object.freeze({ kind: 'level_spin', rewardId: 'energy_full' });
    case 'energy_plus':
      return Object.freeze({
        kind: 'level_spin',
        rewardId: reward.amount >= 3 ? 'energy_plus3' : 'energy_plus2',
      });
    case 'freeze':
      return Object.freeze({ kind: 'freeze' });
  }
}

export type DailyJourneyGiftInventoryProjection<Item extends DailyJourneyGiftInventoryItem> = Readonly<{
  pending: readonly Item[];
  latestRevision: number;
}>;

export type DailyJourneyGiftInventoryErrorScope =
  | 'legacy_load'
  | 'daily_load'
  | 'daily_mark_seen'
  | 'daily_claim'
  | 'account_reset';

export type DailyJourneyGiftInventoryControllerDependencies<LegacySnapshot, Token, Item extends DailyJourneyGiftInventoryItem> = Readonly<{
  captureToken: () => Token;
  isTokenCurrent: (token: Token) => boolean;
  loadLegacy: (token: Token) => Promise<LegacySnapshot>;
  loadDaily: (token: Token) => Promise<DailyJourneyGiftInventoryProjection<Item>>;
  displayLegacy: (snapshot: LegacySnapshot) => void;
  displayDaily: (items: readonly Item[]) => void;
  clearViews: () => void;
  markSnapshotSeen: (revision: number, token: Token) => Promise<boolean>;
  claimGift: (operationId: string, token: Token) => Promise<unknown>;
  clearClaimView: () => void;
  setClaimBusy: (operationId: string | null) => void;
  reportError: (scope: DailyJourneyGiftInventoryErrorScope, error: unknown) => void;
}>;

export type DailyJourneyGiftInventoryController<Item extends DailyJourneyGiftInventoryItem> = Readonly<{
  activate: () => Promise<void>;
  deactivate: () => void;
  reloadAll: () => Promise<void>;
  reloadDaily: () => Promise<void>;
  resetForAccount: (reloadActiveAccount: boolean) => Promise<void>;
  claim: (item: Item) => Promise<'claimed' | 'failed' | 'ignored'>;
  isClaimBusy: (operationId: string) => boolean;
}>;

/**
 * Coordinates the two independent inventory sources. Every public async method
 * settles: UI event handlers may safely fire-and-forget without leaking a
 * rejected promise. Source failures never clear or suppress the other source.
 */
export function createDailyJourneyGiftInventoryController<LegacySnapshot, Token, Item extends DailyJourneyGiftInventoryItem>(
  dependencies: DailyJourneyGiftInventoryControllerDependencies<LegacySnapshot, Token, Item>,
): DailyJourneyGiftInventoryController<Item> {
  let active = false;
  let lifecycleEpoch = 0;
  let legacyRequestId = 0;
  let dailyRequestId = 0;
  let acknowledgeDisplayedSnapshot = false;
  let acknowledgementInFlight = false;
  let acknowledgementRunId = 0;
  let lastDisplayedSnapshot: Readonly<{
    revision: number;
    token: Token;
    epoch: number;
    requestId: number;
  }> | null = null;
  const claimsInFlight = new Map<string, number>();

  const report = (scope: DailyJourneyGiftInventoryErrorScope, error: unknown): void => {
    try {
      dependencies.reportError(scope, error);
    } catch {
      // Diagnostics must never turn a settled UI reload into an unhandled rejection.
    }
  };

  const clearExternalClaimView = (scope: 'daily_claim' | 'account_reset'): boolean => {
    try {
      dependencies.clearClaimView();
      return true;
    } catch (error) {
      report(scope, error);
      return false;
    }
  };

  const isLive = (token: Token, epoch: number): boolean => (
    active && epoch === lifecycleEpoch && dependencies.isTokenCurrent(token)
  );

  const reloadLegacy = async (): Promise<void> => {
    const requestId = ++legacyRequestId;
    const epoch = lifecycleEpoch;
    try {
      const token = dependencies.captureToken();
      const snapshot = await dependencies.loadLegacy(token);
      if (!isLive(token, epoch) || requestId !== legacyRequestId) return;
      dependencies.displayLegacy(snapshot);
    } catch (error) {
      if (active && epoch === lifecycleEpoch && requestId === legacyRequestId) {
        report('legacy_load', error);
      }
    }
  };

  const acknowledgeLatestDisplayedSnapshot = async (): Promise<void> => {
    if (!acknowledgeDisplayedSnapshot || acknowledgementInFlight) return;
    acknowledgementInFlight = true;
    const runId = ++acknowledgementRunId;
    try {
      while (acknowledgeDisplayedSnapshot && runId === acknowledgementRunId) {
        const candidate = lastDisplayedSnapshot;
        if (!candidate || !isLive(candidate.token, candidate.epoch)) return;
        if (candidate.requestId !== dailyRequestId) return;
        if (candidate.revision < 1) {
          acknowledgeDisplayedSnapshot = false;
          return;
        }

        let marked = false;
        try {
          marked = await dependencies.markSnapshotSeen(candidate.revision, candidate.token);
        } catch (error) {
          if (isLive(candidate.token, candidate.epoch)) report('daily_mark_seen', error);
          const latestAfterFailure = lastDisplayedSnapshot;
          if (latestAfterFailure?.epoch === candidate.epoch
            && latestAfterFailure.requestId === candidate.requestId) return;
          continue;
        }
        const latest = lastDisplayedSnapshot;
        const candidateIsStillDisplayed = latest?.epoch === candidate.epoch
          && latest.requestId === candidate.requestId;
        if (marked
          && candidateIsStillDisplayed
          && candidate.requestId === dailyRequestId
          && isLive(candidate.token, candidate.epoch)) {
          acknowledgeDisplayedSnapshot = false;
          return;
        }
        if (candidateIsStillDisplayed) return;
      }
    } finally {
      if (runId === acknowledgementRunId) acknowledgementInFlight = false;
    }
  };

  const reloadDaily = async (): Promise<void> => {
    const requestId = ++dailyRequestId;
    const epoch = lifecycleEpoch;
    let token: Token;
    try {
      token = dependencies.captureToken();
      const snapshot = await dependencies.loadDaily(token);
      if (!isLive(token, epoch) || requestId !== dailyRequestId) return;
      dependencies.displayDaily(snapshot.pending);
      lastDisplayedSnapshot = Object.freeze({
        revision: snapshot.latestRevision,
        token,
        epoch,
        requestId,
      });
      await acknowledgeLatestDisplayedSnapshot();
    } catch (error) {
      if (active && epoch === lifecycleEpoch && requestId === dailyRequestId) {
        report('daily_load', error);
      }
    }
  };

  const reloadAll = async (): Promise<void> => {
    await Promise.all([reloadLegacy(), reloadDaily()]);
  };

  const clearClaimLifecycle = (scope: 'daily_claim' | 'account_reset'): void => {
    claimsInFlight.clear();
    clearExternalClaimView(scope);
  };

  const activate = async (): Promise<void> => {
    active = true;
    lifecycleEpoch += 1;
    legacyRequestId += 1;
    dailyRequestId += 1;
    acknowledgeDisplayedSnapshot = true;
    acknowledgementRunId += 1;
    acknowledgementInFlight = false;
    lastDisplayedSnapshot = null;
    clearClaimLifecycle('account_reset');
    await reloadAll();
  };

  const deactivate = (): void => {
    active = false;
    lifecycleEpoch += 1;
    legacyRequestId += 1;
    dailyRequestId += 1;
    acknowledgeDisplayedSnapshot = false;
    acknowledgementRunId += 1;
    acknowledgementInFlight = false;
    lastDisplayedSnapshot = null;
    clearClaimLifecycle('account_reset');
  };

  const resetForAccount = async (reloadActiveAccount: boolean): Promise<void> => {
    lifecycleEpoch += 1;
    legacyRequestId += 1;
    dailyRequestId += 1;
    acknowledgeDisplayedSnapshot = true;
    acknowledgementRunId += 1;
    acknowledgementInFlight = false;
    lastDisplayedSnapshot = null;
    clearClaimLifecycle('account_reset');
    try {
      dependencies.clearViews();
    } catch (error) {
      report('account_reset', error);
    }
    if (active && reloadActiveAccount) await reloadAll();
  };

  const claim = async (
    item: Item,
  ): Promise<'claimed' | 'failed' | 'ignored'> => {
    if (claimsInFlight.has(item.operationId)) return 'ignored';
    const epoch = lifecycleEpoch;
    let token: Token;
    try {
      token = dependencies.captureToken();
      if (!isLive(token, epoch)) return 'ignored';
    } catch (error) {
      report('daily_claim', error);
      return 'failed';
    }

    claimsInFlight.set(item.operationId, epoch);
    let claimViewCleared = false;
    try {
      dependencies.setClaimBusy(item.operationId);
      await dependencies.claimGift(item.operationId, token);
      if (!isLive(token, epoch)) return 'ignored';
      claimViewCleared = clearExternalClaimView('daily_claim');
      await reloadAll();
      return 'claimed';
    } catch (error) {
      if (!isLive(token, epoch)) return 'ignored';
      report('daily_claim', error);
      return 'failed';
    } finally {
      if (claimsInFlight.get(item.operationId) === epoch) {
        claimsInFlight.delete(item.operationId);
      }
      if (isLive(token, epoch) && !claimViewCleared) {
        try {
          dependencies.setClaimBusy(null);
        } catch (error) {
          report('daily_claim', error);
        }
      }
    }
  };

  return Object.freeze({
    activate,
    deactivate,
    reloadAll,
    reloadDaily,
    resetForAccount,
    claim,
    isClaimBusy: (operationId: string) => claimsInFlight.has(operationId),
  });
}

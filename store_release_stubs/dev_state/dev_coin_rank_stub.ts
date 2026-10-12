// Стор-сборка: заглушка app/dev_coin_rank.ts. Ранг, баланс и повышение не подменяются.
export function setDevCoinRankOverride(): boolean { return false; }
export function getDevCoinRankOverride(): null { return null; }
export function setDevCoinBalanceOverride(): boolean { return false; }
export function getDevCoinBalanceOverride(): null { return null; }
export function setDevCoinUpgradeHold(): boolean { return false; }
export function isDevCoinUpgradeHold(): boolean { return false; }
export function resetDevCoinStateForTests(): void {}

export function shouldDevUnlockStatsPremiumContent(
  enableDevTools: boolean,
  testerStripsPremium: boolean | null,
): boolean {
  return enableDevTools && testerStripsPremium === false;
}

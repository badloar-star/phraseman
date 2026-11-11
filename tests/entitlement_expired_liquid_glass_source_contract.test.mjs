import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync(new URL('../components/EntitlementExpiredHost.tsx', import.meta.url), 'utf8');

test('expiration opens the themed paywall instead of rendering its own view', () => {
  const paywall = readFileSync(new URL('../components/paywall/PaywallPlusScreen.tsx', import.meta.url), 'utf8');
  assert.ok(src.includes('openPremiumPaywall(router'));
  assert.ok(src.includes("source: 'entitlement_expired'"));
  assert.ok(src.includes("pending.kind === 'premium' ? 'premium_expired' : 'vip_expired'"));
  assert.doesNotMatch(src, /HybridSheetShell|RewardCardV2|PlusLaunchSplashHost/);
  assert.ok(paywall.includes('backgroundColor: g.bg'));
  assert.ok(paywall.includes('entitlement-expired-invite'));
});

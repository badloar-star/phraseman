import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRootNavigationState, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { LinearGradient } from '../components/SafeLinearGradient';
import { usePremium } from '../components/PremiumContext';
import { dismissPaywallModal } from './navigation_back';
import { scheduleAfterRootNavigationReady } from './paywall_navigation';
import {
  resolvePremiumModalEntry,
  type PaywallEntry,
} from './paywall_entry_contract';

type RouteParams = Record<string, string | string[]>;

export type DirectPaywallRouteProps = Readonly<{
  render: (entry: PaywallEntry) => React.ReactElement;
}>;

/**
 * Public A–G routes remain registered for old/deep links, but they may render
 * acquisition only through the same live entitlement decision as
 * `/premium_modal`. The actual A–G views require a typed entry.
 */
export default function DirectPaywallRoute({ render }: DirectPaywallRouteProps) {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();
  const rootNavigationState = useRootNavigationState();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const [impressionId] = useState(() => Crypto.randomUUID());
  const resolution = resolvePremiumModalEntry({
    params,
    accessResolved,
    hasPremiumAccess,
    impressionId,
  });
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!rootNavigationState?.key || resolution.decision !== 'dismiss') return;
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    const scheduled = scheduleAfterRootNavigationReady(() => dismissPaywallModal(router));
    return () => scheduled.cancel();
  }, [resolution.decision, rootNavigationState?.key, router]);

  if (resolution.decision === 'show') return render(resolution.entry);

  return (
    <LinearGradient
      colors={['#111827', '#18233D', '#101827']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
});

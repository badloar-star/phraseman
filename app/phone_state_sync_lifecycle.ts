import { AppState } from 'react-native';

import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import type { PhoneStateSyncCoordinator } from '../modules/phone-state/sync_coordinator';

export type PhoneStateLifecycleNetInfo = Readonly<{
  addEventListener: (
    listener: (state: Readonly<{
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
    }>) => void,
  ) => () => void;
}>;

export type PhoneStateLifecycleAppState = Readonly<{
  addEventListener: (
    event: 'change',
    listener: (state: string) => void,
  ) => Readonly<{ remove: () => void }>;
}>;

export type InstallPhoneStateSyncLifecycleOptions = Readonly<{
  coordinator: PhoneStateSyncCoordinator;
  netInfo: PhoneStateLifecycleNetInfo | null;
  appState: PhoneStateLifecycleAppState;
}>;

type PhoneStateLifecycleNetInfoModule = Readonly<{
  default?: PhoneStateLifecycleNetInfo;
  addEventListener?: PhoneStateLifecycleNetInfo['addEventListener'];
}>;

export function resolvePhoneStateLifecycleNetInfo(
  // Metro must not evaluate the native package until the installed binary is
  // known to expose it; old development clients otherwise crash during boot.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  load: () => unknown = () => require('@react-native-community/netinfo'),
): PhoneStateLifecycleNetInfo | null {
  try {
    const loaded = load() as PhoneStateLifecycleNetInfoModule | null;
    const candidate = loaded?.default ?? loaded;
    return candidate && typeof candidate.addEventListener === 'function'
      ? candidate as PhoneStateLifecycleNetInfo
      : null;
  } catch {
    // A Metro bundle can outlive its native dev-client. Keep the app usable;
    // connectivity events resume automatically after installing a new build.
    return null;
  }
}

type ConfiguredRuntime = Readonly<{
  scope: PhoneStateScope;
  coordinator: PhoneStateSyncCoordinator;
  rolloutEnabled: boolean;
}>;

let configuredRuntime: ConfiguredRuntime | null = null;
let installedCleanup: (() => void) | null = null;
let installedStableUid: string | null = null;

export function installPhoneStateSyncLifecycleSubscriptions(
  options: InstallPhoneStateSyncLifecycleOptions,
): () => void {
  const unsubscribeNetInfo = options.netInfo?.addEventListener((state) => {
    if (state.isConnected === true && state.isInternetReachable !== false) {
      options.coordinator.trigger('connectivity_online');
    }
  }) ?? (() => undefined);
  const appStateSubscription = options.appState.addEventListener('change', (state) => {
    if (state === 'active') {
      options.coordinator.trigger('foreground');
    } else if (state === 'background') {
      // Immediate: durable local work is already committed; do not add the old
      // 1.8-second UI delay before asking the bounded background pass to run.
      options.coordinator.trigger('background');
    }
  });
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    unsubscribeNetInfo();
    appStateSubscription.remove();
  };
}

export function configurePhoneStateSyncLifecycleRuntime(
  runtime: ConfiguredRuntime | null,
): void {
  if (installedCleanup) {
    installedCleanup();
    installedCleanup = null;
    installedStableUid = null;
  }
  configuredRuntime?.coordinator.dispose();
  configuredRuntime = runtime;
}

export function ensurePhoneStateSyncLifecycleInstalled(
  identity: Readonly<{ stableUid: string }>,
): () => void {
  const runtime = configuredRuntime;
  if (
    !runtime?.rolloutEnabled
    || runtime.scope.stableUid !== identity.stableUid
  ) {
    return () => undefined;
  }
  if (installedCleanup && installedStableUid === identity.stableUid) {
    return () => undefined;
  }

  const cleanupSubscriptions = installPhoneStateSyncLifecycleSubscriptions({
    coordinator: runtime.coordinator,
    netInfo: resolvePhoneStateLifecycleNetInfo(),
    appState: AppState,
  });
  installedStableUid = identity.stableUid;
  installedCleanup = () => {
    cleanupSubscriptions();
    runtime.coordinator.dispose();
  };
  void runtime.coordinator.restore()
    .then(() => runtime.coordinator.trigger('hydrated'))
    .catch(() => {
      // Retry state remains durable; lifecycle installation must never surface
      // a boot error to the user.
    });

  return () => {
    if (installedStableUid !== identity.stableUid) return;
    installedCleanup?.();
    installedCleanup = null;
    installedStableUid = null;
  };
}

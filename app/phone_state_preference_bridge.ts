import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import type { PendingPersonalOperation } from '../modules/phone-state/contracts';
import type { PhoneStateStore } from '../modules/phone-state/store';
import type { PreferenceReducerState } from '../modules/phone-state/domains/preferences';
import { portableOwnerForKey } from '../modules/phone-state/domain_ownership';

type Runtime = Readonly<{ scope: PhoneStateScope; deviceId: string; store: PhoneStateStore }>;
let runtime: Runtime | null = null;

export function configurePhoneStatePreferenceBridge(next: Runtime | null): void {
  runtime = next;
}

export async function persistPortablePreference(key: string, value: string): Promise<void> {
  if (portableOwnerForKey(key) !== 'preferences') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  const active = runtime;
  if (active) {
    const operation: PendingPersonalOperation = Object.freeze({
      schemaVersion: 1,
      stableUid: active.scope.stableUid,
      accountGeneration: active.scope.accountGeneration,
      deviceId: active.deviceId,
      domain: 'preferences',
      kind: 'set_field',
      entityId: key,
      payload: Object.freeze({ field: key, value }),
      exactResult: Object.freeze({ value }),
      createdAtMs: Date.now(),
    });
    await active.store.commit(operation, { idempotencyKey: `preference:${Crypto.randomUUID()}` })
      .catch(() => undefined);
  }
  await AsyncStorage.setItem(key, value);
}

export async function readPortablePreference(key: string): Promise<string | null> {
  if (portableOwnerForKey(key) !== 'preferences' || !runtime) return AsyncStorage.getItem(key);
  try {
    const projection = await runtime.store.readProjection('preferences');
    const state = projection?.state as PreferenceReducerState | undefined;
    const value = state?.registers?.[key]?.value;
    return typeof value === 'string' ? value : AsyncStorage.getItem(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

export default function __RouteShim() { return null; }

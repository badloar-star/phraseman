import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import type { PendingPersonalOperation } from '../modules/phone-state/contracts';
import { portableOwnerForKey } from '../modules/phone-state/domain_ownership';
import { legacyInventory } from '../modules/phone-state/legacy_inventory';
import type { PhoneStateStore } from '../modules/phone-state/store';

type Runtime = Readonly<{
  scope: PhoneStateScope;
  deviceId: string;
  store: PhoneStateStore;
  triggerSync(): void;
}>;

let runtime: Runtime | null = null;

function isPortableProgressRegister(key: string): boolean {
  const row = legacyInventory.rows.find((candidate) => candidate.key === key);
  return portableOwnerForKey(key) === 'progress'
    && row?.scope === 'portable'
    && row.reducer === 'field_register';
}

export function configurePhoneStateProgressRegisterBridge(next: Runtime | null): void {
  runtime = next;
}

export async function persistPortableProgressRegister(
  key: string,
  value: string | null,
): Promise<void> {
  if (!isPortableProgressRegister(key) || (value !== null && value.length > 48 * 1024)) {
    throw new Error('phone_state_progress_register_field_invalid');
  }
  const active = runtime;
  if (active) {
    const operation: PendingPersonalOperation = Object.freeze({
      schemaVersion: 1,
      stableUid: active.scope.stableUid,
      accountGeneration: active.scope.accountGeneration,
      deviceId: active.deviceId,
      domain: 'progress_registers',
      kind: 'set_field',
      entityId: key,
      payload: Object.freeze({ field: key, value }),
      exactResult: Object.freeze({ value }),
      createdAtMs: Date.now(),
    });
    const committed = await active.store.commit(operation, {
      idempotencyKey: `progress-register:${Crypto.randomUUID()}`,
    }).then(() => true).catch(() => false);
    if (committed) active.triggerSync();
  }
  if (value === null) await AsyncStorage.removeItem(key);
  else await AsyncStorage.setItem(key, value);
}

export default function __RouteShim() { return null; }

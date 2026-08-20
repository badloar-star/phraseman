import AsyncStorage from '@react-native-async-storage/async-storage';
import { CUSTOMIZATION_ACCOUNT_LOCAL_PREFIXES } from '../constants/customization_storage_keys';

const MAX_CUSTOMIZATION_ACCOUNT_LOCAL_KEYS = 4_096;
const REMOVE_CHUNK_SIZE = 128;

export function isCustomizationAccountLocalKey(key: string): boolean {
  return CUSTOMIZATION_ACCOUNT_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function customizationAccountLocalKeysFrom(allKeys: readonly string[]): string[] {
  const keys = Array.from(new Set(allKeys.filter(isCustomizationAccountLocalKey)));
  if (keys.length > MAX_CUSTOMIZATION_ACCOUNT_LOCAL_KEYS) {
    throw new Error('customization_account_cleanup_key_limit_exceeded');
  }
  return keys;
}

export async function clearCustomizationAccountLocalState(): Promise<void> {
  let keys: string[];
  try {
    keys = customizationAccountLocalKeysFrom(await AsyncStorage.getAllKeys());
  } catch (error) {
    if (error instanceof Error && error.message === 'customization_account_cleanup_key_limit_exceeded') {
      throw error;
    }
    throw new Error('customization_account_cleanup_scan_failed');
  }

  for (let offset = 0; offset < keys.length; offset += REMOVE_CHUNK_SIZE) {
    const chunk = keys.slice(offset, offset + REMOVE_CHUNK_SIZE);
    await AsyncStorage.multiRemove(chunk);
    const residue = (await AsyncStorage.multiGet(chunk)).some(([, raw]) => raw !== null);
    if (residue) throw new Error('customization_account_cleanup_incomplete');
  }
}

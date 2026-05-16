import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Gets a parsed JSON value from AsyncStorage. Returns null if missing or invalid JSON.
 */
export async function storageGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Gets a raw string value from AsyncStorage. Returns null if missing.
 */
export async function storageGetString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Gets a number from AsyncStorage. Returns defaultValue if missing or not a number.
 */
export async function storageGetNumber(key: string, defaultValue = 0): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return defaultValue;
    const n = Number(raw);
    return isNaN(n) ? defaultValue : n;
  } catch {
    return defaultValue;
  }
}

/**
 * Saves a value to AsyncStorage as JSON. Silently fails on error.
 */
export async function storageSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/**
 * Saves a raw string to AsyncStorage. Silently fails on error.
 */
export async function storageSetString(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {}
}

/**
 * Removes a key from AsyncStorage. Silently fails on error.
 */
export async function storageRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

import AsyncStorage from '@react-native-async-storage/async-storage';

let cached: boolean = true;

export async function hydrateHapticsTapFromStorage(): Promise<void> {
  try {
    const v = await AsyncStorage.getItem('haptics_tap');
    cached = v === null ? true : v !== 'false';
  } catch {
    cached = true;
  }
}

export function getHapticsTapSnapshot(): boolean {
  return cached;
}

export function setHapticsTapCache(v: boolean): void {
  cached = v;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

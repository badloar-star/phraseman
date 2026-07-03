import AsyncStorage from '@react-native-async-storage/async-storage';

import { getFreeDialogsLifetime } from './ai_dialog_flags';

// Client-side UX gate for the lifetime free AI-dialog allowance. The server
// remains the source of truth; this local counter only hides input quickly and
// keeps the app copy consistent with the configured free-dialog count.
export const FREE_DIALOG_LEGACY_USED_KEY = 'dialogs_free_lifetime_used_v2';
export const FREE_DIALOG_USED_KEY = 'dialogs_free_lifetime_count_v3';

function parseStoredCount(raw: string | null): number {
  const value = Math.floor(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function getFreeDialogsUsed(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(FREE_DIALOG_USED_KEY);
    if (stored != null) return Math.min(getFreeDialogsLifetime(), parseStoredCount(stored));

    // Migration from the previous one-free-dialog boolean. Users who already
    // spent that attempt keep one spent dialog, and still receive the second
    // attempt when the configured allowance is 2.
    const legacyUsed = (await AsyncStorage.getItem(FREE_DIALOG_LEGACY_USED_KEY)) === '1';
    return legacyUsed ? 1 : 0;
  } catch {
    return 0;
  }
}

export async function getFreeDialogsLeft(): Promise<number> {
  const limit = getFreeDialogsLifetime();
  const used = await getFreeDialogsUsed();
  return Math.max(0, limit - used);
}

/** Whether the non-premium lifetime free allowance has been fully spent. */
export async function hasUsedFreeDialog(): Promise<boolean> {
  return (await getFreeDialogsLeft()) <= 0;
}

/**
 * Mark one free dialog as consumed. Called on the first successful user turn,
 * so opening and closing a dialog never burns the allowance.
 */
export async function markFreeDialogUsed(): Promise<void> {
  try {
    const limit = getFreeDialogsLifetime();
    const used = await getFreeDialogsUsed();
    await AsyncStorage.setItem(FREE_DIALOG_USED_KEY, String(Math.min(limit, used + 1)));
  } catch {
    // Best-effort local UX state; the server remains authoritative.
  }
}

/** true = a non-premium user can still start another free AI dialog. */
export async function hasFreeDialogLeft(): Promise<boolean> {
  return (await getFreeDialogsLeft()) > 0;
}

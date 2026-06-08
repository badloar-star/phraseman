// Утилиты дневного лимита ИИ-диалогов (по образцу trainer_session.ts).
// Клиентский гейт — UX-слой; источник правды по квоте — сервер (premium_dialog CF).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFreeDialogsPerDay } from './ai_dialog_flags';

export const DAILY_FREE_DIALOG_KEY = 'dialogs_free_session_v1';

interface DailyDialogState {
  date: string;
  count: number;
}

const todayKey = (): string => new Date().toISOString().split('T')[0];

function parseState(raw: string | null): DailyDialogState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DailyDialogState;
    if (typeof data?.date === 'string' && typeof data?.count === 'number') return data;
    return null;
  } catch {
    return null;
  }
}

export async function hasUsedFreeDialogToday(): Promise<boolean> {
  try {
    const data = parseState(await AsyncStorage.getItem(DAILY_FREE_DIALOG_KEY));
    if (!data || data.date !== todayKey()) return false;
    return data.count >= getFreeDialogsPerDay();
  } catch {
    return false;
  }
}

export async function markFreeDialogUsed(): Promise<void> {
  try {
    const existing = parseState(await AsyncStorage.getItem(DAILY_FREE_DIALOG_KEY));
    const data: DailyDialogState =
      existing && existing.date === todayKey() ? existing : { date: todayKey(), count: 0 };
    const next: DailyDialogState = { date: data.date, count: data.count + 1 };
    await AsyncStorage.setItem(DAILY_FREE_DIALOG_KEY, JSON.stringify(next));
  } catch {}
}

export async function getFreeDialogsLeftToday(): Promise<number> {
  const cap = getFreeDialogsPerDay();
  try {
    const data = parseState(await AsyncStorage.getItem(DAILY_FREE_DIALOG_KEY));
    if (!data || data.date !== todayKey()) return cap;
    return Math.max(0, cap - data.count);
  } catch {
    return cap;
  }
}

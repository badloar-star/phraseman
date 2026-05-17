// AsyncStorage gateway for flashcards-only persistence keys and payloads.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FLASHCARDS_CUSTOM_KEY = 'custom_flashcards_v2';
export const FLASHCARDS_PROGRESS_KEY = 'flashcards_progress_v1';

export type FlashcardsProgress = {
  cat: string;
  idx: number;
};

let customCardsInMemory: unknown[] | null = null;

function cloneList(cards: unknown[]): unknown[] {
  return cards.map((card) => (
    card && typeof card === 'object'
      ? { ...(card as Record<string, unknown>) }
      : card
  ));
}

export function peekCustomCardsCache(): unknown[] | null {
  return customCardsInMemory === null ? null : cloneList(customCardsInMemory);
}

export async function readCustomCards(): Promise<unknown[]> {
  const raw = await AsyncStorage.getItem(FLASHCARDS_CUSTOM_KEY);
  if (!raw) {
    customCardsInMemory = [];
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    customCardsInMemory = Array.isArray(parsed) ? parsed : [];
    return cloneList(customCardsInMemory);
  } catch {
    customCardsInMemory = [];
    return [];
  }
}

export async function writeCustomCards(cards: unknown[]): Promise<void> {
  customCardsInMemory = cloneList(cards);
  await AsyncStorage.setItem(FLASHCARDS_CUSTOM_KEY, JSON.stringify(cards));
}

export async function readFlashcardsProgress(): Promise<FlashcardsProgress | null> {
  const raw = await AsyncStorage.getItem(FLASHCARDS_PROGRESS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FlashcardsProgress;
    if (!parsed || typeof parsed.cat !== 'string' || typeof parsed.idx !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeFlashcardsProgress(progress: FlashcardsProgress): Promise<void> {
  await AsyncStorage.setItem(FLASHCARDS_PROGRESS_KEY, JSON.stringify(progress));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

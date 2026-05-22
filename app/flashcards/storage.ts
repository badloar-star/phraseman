// AsyncStorage gateway for flashcards-only persistence keys and payloads.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  customFlashcardsKey,
  flashcardsProgressKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from '../target_storage_keys';
import type { StudyTarget } from '../study_target';

export type FlashcardsProgress = {
  cat: string;
  idx: number;
};

let customCardsInMemoryByTarget: Partial<Record<StudyTarget, unknown[]>> = {};

function cloneList(cards: unknown[]): unknown[] {
  return cards.map((card) => (
    card && typeof card === 'object'
      ? { ...(card as Record<string, unknown>) }
      : card
  ));
}

function cacheTarget(studyTarget?: RuntimeStudyTarget): StudyTarget {
  return storageStudyTarget(studyTarget);
}

export function peekCustomCardsCache(studyTarget?: RuntimeStudyTarget): unknown[] | null {
  const target = cacheTarget(studyTarget);
  const cached = customCardsInMemoryByTarget[target];
  return cached === undefined ? null : cloneList(cached);
}

export async function readCustomCards(studyTarget?: RuntimeStudyTarget): Promise<unknown[]> {
  const target = cacheTarget(studyTarget);
  const raw = await AsyncStorage.getItem(customFlashcardsKey(target));
  if (!raw) {
    customCardsInMemoryByTarget[target] = [];
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    customCardsInMemoryByTarget[target] = Array.isArray(parsed) ? parsed : [];
    return cloneList(customCardsInMemoryByTarget[target] ?? []);
  } catch {
    customCardsInMemoryByTarget[target] = [];
    return [];
  }
}

export async function writeCustomCards(
  cards: unknown[],
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const target = cacheTarget(studyTarget);
  customCardsInMemoryByTarget[target] = cloneList(cards);
  await AsyncStorage.setItem(customFlashcardsKey(target), JSON.stringify(cards));
}

export async function readFlashcardsProgress(
  studyTarget?: RuntimeStudyTarget,
): Promise<FlashcardsProgress | null> {
  const raw = await AsyncStorage.getItem(flashcardsProgressKey(studyTarget));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FlashcardsProgress;
    if (!parsed || typeof parsed.cat !== 'string' || typeof parsed.idx !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeFlashcardsProgress(
  progress: FlashcardsProgress,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  await AsyncStorage.setItem(flashcardsProgressKey(studyTarget), JSON.stringify(progress));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

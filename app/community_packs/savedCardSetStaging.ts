import AsyncStorage from '@react-native-async-storage/async-storage';
import { isPackLanguage, type PackLanguage } from '../flashcards/pack_languages';
import { captureAccountGeneration, isCurrentAccountGeneration, withAccountTransitionLock, type AccountGenerationToken } from '../account_generation';

const STAGE_PREFIX = 'fc_saved_set_stage_v1:';
let stageCounter = 0;

export type SavedCardSetStageCard = {
  id: string;
  [key: string]: unknown;
};

export type SavedCardSetStage = {
  v: 1;
  packLanguage: PackLanguage;
  cardIds: string[];
  cards: SavedCardSetStageCard[];
  createdAt: number;
  accountToken?: AccountGenerationToken;
};

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean))];
}

function stageKey(key: string): string {
  return `${STAGE_PREFIX}${key}`;
}

export async function stageSavedCardSet(input: {
  packLanguage: PackLanguage;
  cardIds: readonly string[];
  cards: readonly SavedCardSetStageCard[];
}): Promise<string> {
  const accountToken = captureAccountGeneration();
  const cardIds = uniqueIds(input.cardIds);
  const cardsById = new Map(input.cards.map((card) => [card.id, card]));
  const cards = cardIds.map((id) => cardsById.get(id)).filter((card): card is SavedCardSetStageCard => Boolean(card));
  const key = `${Date.now().toString(36)}_${(stageCounter++).toString(36)}`;
  const stage: SavedCardSetStage = {
    v: 1,
    packLanguage: input.packLanguage,
    cardIds: cards.map((card) => card.id),
    cards,
    createdAt: Date.now(),
    accountToken,
  };
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken)) throw new Error('Account changed');
    await AsyncStorage.setItem(stageKey(key), JSON.stringify(stage));
  });
  return key;
}

export async function consumeSavedCardSetStage(key: string): Promise<SavedCardSetStage | null> {
  const normalizedKey = String(key ?? '').trim();
  if (!normalizedKey || normalizedKey.includes('/') || normalizedKey.includes('..')) return null;
  const storageKey = stageKey(normalizedKey);
  const raw = await AsyncStorage.getItem(storageKey).catch(() => null);
  await AsyncStorage.removeItem(storageKey).catch(() => {});
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedCardSetStage>;
    if (parsed.v !== 1 || !Array.isArray(parsed.cardIds) || !Array.isArray(parsed.cards)) return null;
    if (!isPackLanguage(parsed.packLanguage)) return null;
    if (!parsed.accountToken || !isCurrentAccountGeneration(parsed.accountToken)) return null;
    if (Date.now() - Number(parsed.createdAt ?? 0) > 24 * 60 * 60 * 1000) return null;
    return {
      v: 1,
      packLanguage: parsed.packLanguage as PackLanguage,
      cardIds: uniqueIds(parsed.cardIds),
      cards: parsed.cards.filter((card): card is SavedCardSetStageCard => Boolean(card && typeof card === 'object' && typeof card.id === 'string')),
      createdAt: Number(parsed.createdAt ?? 0),
    };
  } catch {
    return null;
  }
}

/* expo-router route shim: keeps the staging helper out of the route tree. */
export default function __RouteShim() { return null; }

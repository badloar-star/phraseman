// Доступ к каталогу «Сокровищницы» поверх сгенерированных данных.
// Сами данные — app/collectibles/catalog_data.ts (НЕ править руками,
// регенерация: node tools/collectibles/generate.mjs build-app).
import {
  COLLECTIBLE_SETS,
  CollectibleCardData,
  CollectibleRarity,
  CollectibleSecretData,
  CollectibleSetData,
} from './catalog_data';

export type {
  CollectibleCardData,
  CollectibleRarity,
  CollectibleSecretData,
  CollectibleSetData,
};
export { COLLECTIBLE_SETS };

export type CollectibleAnyCard =
  | { kind: 'card'; setId: string; card: CollectibleCardData }
  | { kind: 'secret'; setId: string; card: CollectibleSecretData };

const cardIndex: Map<string, CollectibleAnyCard> = new Map();
for (const set of COLLECTIBLE_SETS) {
  for (const card of set.cards) {
    cardIndex.set(card.id, { kind: 'card', setId: set.setId, card });
  }
  cardIndex.set(set.secret.id, { kind: 'secret', setId: set.setId, card: set.secret });
}

const setIndex: Map<string, CollectibleSetData> = new Map(
  COLLECTIBLE_SETS.map((s) => [s.setId, s]),
);

export function findCollectibleCard(cardId: string): CollectibleAnyCard | null {
  return cardIndex.get(cardId) ?? null;
}

export function findCollectibleSet(setId: string): CollectibleSetData | null {
  return setIndex.get(setId) ?? null;
}

/** Всего видимых позиций коллекции: карточки + секретки live-сетов. */
export function collectiblesTotalCount(): number {
  return COLLECTIBLE_SETS.reduce((sum, s) => sum + s.cards.length + 1, 0);
}

export const COLLECTIBLE_RARITY_ORDER: CollectibleRarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Язык цветов редкостей (из утверждённого макета): серый/синий/фиолетовый/золотой. */
export const COLLECTIBLE_RARITY_COLORS: Record<CollectibleRarity, string> = {
  common: '#9AA6C0',
  rare: '#38BDF8',
  epic: '#A78BFA',
  legendary: '#FBBF24',
};

export const COLLECTIBLE_RARITY_LABEL_RU: Record<CollectibleRarity, string> = {
  common: 'Обычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная',
};

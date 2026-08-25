// Доступ к каталогу «Сокровищницы» поверх сгенерированных данных.
// Сами данные — app/collectibles/catalog_data.ts (НЕ править руками,
// регенерация: node tools/collectibles/generate.mjs build-app).
import type {
  CollectibleCardData,
  CollectibleRarity,
  CollectibleSecretData,
  CollectibleSetData,
} from './catalog_data';
import { COLLECTIBLE_CARD_ES, COLLECTIBLE_SET_ES } from './collectibles_es_locale';
import type { Lang } from '../../constants/i18n';

export type {
  CollectibleCardData,
  CollectibleRarity,
  CollectibleSecretData,
  CollectibleSetData,
};
/**
 * СЕЙМ ЛЕНИВОЙ ЗАГРУЗКИ (Фаза 2 «Бандл-диеты», 2026-08-25).
 *
 * зачем: `catalog_data.ts` — 0.67 МБ сгенерированных данных, а `catalog.ts`
 * строил по ним ДВА индекса прямо на загрузке модуля. При этом `storage.ts`
 * (ради `maybeRollCollectibleDrop`) статически импортируется четырьмя экранами
 * уроков — значит 0.67 МБ парсились и индексировались на пути КАЖДОГО урока,
 * хотя дроп карточки случается редко и всегда после ответа сервера.
 *
 * Теперь данные подтягиваются синхронным ленивым require() при первом реальном
 * обращении и кэшируются. Вызывающий код остался синхронным и не изменился —
 * тот же приём, что в `lesson_help_theory_registry.ts`.
 */
let SETS_CACHE: readonly CollectibleSetData[] | null = null;

function loadSets(): readonly CollectibleSetData[] {
  if (SETS_CACHE) return SETS_CACHE;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: держит 0.67 МБ каталога вне пути экранов уроков, пока карточка реально не понадобилась
  const mod = require('./catalog_data') as { COLLECTIBLE_SETS: readonly CollectibleSetData[] };
  SETS_CACHE = mod.COLLECTIBLE_SETS;
  return SETS_CACHE;
}

/**
 * Все сеты каталога. ВНИМАНИЕ: первое обращение материализует 0.67 МБ данных —
 * зовите только там, где каталог реально показывается или перебирается
 * (экран «Сокровищница», выдача всей коллекции), а не на пути урока.
 */
export function collectibleSets(): readonly CollectibleSetData[] {
  return loadSets();
}

export type CollectibleAnyCard =
  | { kind: 'card'; setId: string; card: CollectibleCardData }
  | { kind: 'secret'; setId: string; card: CollectibleSecretData };

export type CollectibleLocalizedCardText = {
  translation: string;
  literal: string;
  meaning: string;
  example: string;
  origin: string;
};

// зачем: индексы строятся вместе с данными — при первом обращении, а не на
// загрузке модуля (раньше два прохода по всем картам шли на пути каждого урока).
let cardIndex: Map<string, CollectibleAnyCard> | null = null;
let setIndex: Map<string, CollectibleSetData> | null = null;

function loadIndexes(): {
  cards: Map<string, CollectibleAnyCard>;
  sets: Map<string, CollectibleSetData>;
} {
  if (cardIndex && setIndex) return { cards: cardIndex, sets: setIndex };
  const cards = new Map<string, CollectibleAnyCard>();
  const sets = new Map<string, CollectibleSetData>();
  for (const set of loadSets()) {
    for (const card of set.cards) {
      cards.set(card.id, { kind: 'card', setId: set.setId, card });
    }
    cards.set(set.secret.id, { kind: 'secret', setId: set.setId, card: set.secret });
    sets.set(set.setId, set);
  }
  cardIndex = cards;
  setIndex = sets;
  return { cards, sets };
}

export function findCollectibleCard(cardId: string): CollectibleAnyCard | null {
  return loadIndexes().cards.get(cardId) ?? null;
}

export function findCollectibleSet(setId: string): CollectibleSetData | null {
  return loadIndexes().sets.get(setId) ?? null;
}

/** Всего видимых позиций коллекции: карточки + секретки live-сетов. */
export function collectiblesTotalCount(): number {
  return loadSets().reduce((sum, s) => sum + s.cards.length + 1, 0);
}

function isSpanish(lang: Lang | string): boolean {
  return String(lang).toLowerCase() === 'es';
}

export function collectibleSetTitleForLang(set: CollectibleSetData, lang: Lang | string): string {
  if (isSpanish(lang)) return COLLECTIBLE_SET_ES[set.setId]?.titleEs ?? set.titleEn ?? set.titleRu;
  return set.titleRu;
}

export function collectibleCardTextForLang(
  card: CollectibleCardData | CollectibleSecretData,
  lang: Lang | string,
): CollectibleLocalizedCardText {
  const es = isSpanish(lang) ? COLLECTIBLE_CARD_ES[card.id] : null;
  return {
    translation: es?.translationEs ?? card.ru,
    literal: es?.literalEs ?? card.literalRu,
    meaning: es?.meaningEs ?? card.meaningRu,
    example: es?.exampleEs ?? card.exampleRu,
    origin: es?.originEs ?? card.originRu,
  };
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

/** Подписи редкости на все языки интерфейса. Ключи — коды Lang. */
export const COLLECTIBLE_RARITY_LABELS: Record<
  CollectibleRarity,
  { ru: string; uk: string; es: string } & Record<string, string>
> = {
  common: {
    ru: 'Обычная',
    uk: 'Звичайна',
    es: 'Común',
    'pt-BR': 'Comum',
    vi: 'Thông thường',
    id: 'Biasa',
    tr: 'Sıradan',
    pl: 'Zwykła',
  },
  rare: {
    ru: 'Редкая',
    uk: 'Рідкісна',
    es: 'Rara',
    'pt-BR': 'Rara',
    vi: 'Hiếm',
    id: 'Langka',
    tr: 'Nadir',
    pl: 'Rzadka',
  },
  epic: {
    ru: 'Эпическая',
    uk: 'Епічна',
    es: 'Épica',
    'pt-BR': 'Épica',
    vi: 'Sử thi',
    id: 'Epik',
    tr: 'Destansı',
    pl: 'Epicka',
  },
  legendary: {
    ru: 'Легендарная',
    uk: 'Легендарна',
    es: 'Legendaria',
    'pt-BR': 'Lendária',
    vi: 'Huyền thoại',
    id: 'Legendaris',
    tr: 'Efsanevi',
    pl: 'Legendarna',
  },
};

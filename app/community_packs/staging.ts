import type { CardItem } from '../flashcards/types';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { fetchCommunityPackCards } from './communityFirestore';

let stagedCommunityPackMarketCards: CardItem[] | null = null;
/** `packId` з останнього успішного `stageCommunityPackCardsForNavigation` — для перевірки `?pack=` до зчитування AsyncStorage. */
let stagedNavigationPackId: string | null = null;

/**
 * Підготувати картки UGC-набору перед `router.push` на колекцію з `?pack=`.
 *
 * зачем: раньше вызывающий делал `await` перед навигацией — тап по своему
 * набору висел на сетевом чтении Firestore, и экран открывался с задержкой.
 * Теперь помечаем `packId` синхронно и уходим в навигацию сразу, а карточки
 * догружаются фоном: коллекция всё равно сама грузит UGC-наборы и кладёт их
 * в кэш, так что первый кадр берётся из кэша, а свежие данные догоняют.
 */
export function stageCommunityPackCardsForNavigation(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): void {
  stagedCommunityPackMarketCards = null;
  stagedNavigationPackId = packId;
  void fetchCommunityPackCards(packId, studyTarget)
    .then((cards) => {
      // Гонка: пока грузили, пользователь мог уйти в другой набор —
      // поздний ответ не должен подменять актуальный staging.
      if (stagedNavigationPackId !== packId) return;
      if (cards.length > 0) stagedCommunityPackMarketCards = cards;
    })
    .catch(() => {});
}

export function consumeStagedCommunityPackMarketCards(): CardItem[] | null {
  const x = stagedCommunityPackMarketCards;
  stagedCommunityPackMarketCards = null;
  return x;
}

export function getStagedNavigationPackId(): string | null {
  return stagedNavigationPackId;
}

export function clearStagedNavigationPackId(): void {
  stagedNavigationPackId = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

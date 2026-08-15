import type { CardItem } from '../flashcards/types';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { fetchCommunityPackCards } from './communityFirestore';

let stagedCommunityPackMarketCards: CardItem[] | null = null;
/** `packId` з останнього успішного `stageCommunityPackCardsForNavigation` — для перевірки `?pack=` до зчитування AsyncStorage. */
let stagedNavigationPackId: string | null = null;

/**
 * Картки наборів, які вже вдалося завантажити в цій сесії.
 *
 * зачем (владелец, 2026-08-13 — «набор открывается через промежуточное окно»):
 * `stage…` синхронно ничего не клал, поэтому первый кадр коллекции приходил
 * БЕЗ карточек — экран показывал заглушку «пусто» и только потом сам набор.
 * Теперь повторное открытие набора берёт карточки из памяти синхронно, а
 * первый (холодный) заход отдаёт промис — коллекция подхватывает карточки
 * сразу, как ответит Firestore, не дожидаясь общего цикла загрузки.
 */
const communityPackCardsMemo = new Map<string, CardItem[]>();
/** Память ограничена: наборы большие, храним только последние открытые. */
const MEMO_LIMIT = 8;
/** Запрос, запущенный последним `stage…` — коллекция ждёт именно его. */
let pendingStagedFetch: { packId: string; cards: Promise<CardItem[]> } | null = null;

function rememberCommunityPackCards(packId: string, cards: CardItem[]): void {
  if (cards.length === 0) return;
  communityPackCardsMemo.delete(packId);
  communityPackCardsMemo.set(packId, cards);
  while (communityPackCardsMemo.size > MEMO_LIMIT) {
    const oldest = communityPackCardsMemo.keys().next().value;
    if (oldest === undefined) break;
    communityPackCardsMemo.delete(oldest);
  }
}

/**
 * Підготувати картки UGC-набору перед `router.push` на колекцію з `?pack=`.
 *
 * зачем: раньше вызывающий делал `await` перед навигацией — тап по своему
 * набору висел на сетевом чтении Firestore, и экран открывался с задержкой.
 * Теперь помечаем `packId` синхронно и уходим в навигацию сразу: карточки
 * уже открытого набора берутся из памяти тем же синхронным шагом, а свежие
 * данные догоняют через `stagedCommunityPackCardsPromise`.
 */
export function stageCommunityPackCardsForNavigation(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): void {
  const memo = communityPackCardsMemo.get(packId);
  stagedCommunityPackMarketCards = memo && memo.length > 0 ? memo : null;
  stagedNavigationPackId = packId;
  const cards = fetchCommunityPackCards(packId, studyTarget)
    .then((next) => {
      if (next.length === 0) return next;
      rememberCommunityPackCards(packId, next);
      // Гонка: пока грузили, пользователь мог уйти в другой набор —
      // поздний ответ не должен подменять актуальный staging.
      if (stagedNavigationPackId === packId) stagedCommunityPackMarketCards = next;
      return next;
    })
    .catch((): CardItem[] => []);
  pendingStagedFetch = { packId, cards };
}

export function consumeStagedCommunityPackMarketCards(): CardItem[] | null {
  const x = stagedCommunityPackMarketCards;
  stagedCommunityPackMarketCards = null;
  return x;
}

/**
 * Промис карточек набора, подготовленного последним `stage…`.
 * Коллекция подписывается на него и рисует набор, как только пришёл ответ.
 */
export function stagedCommunityPackCardsPromise(packId: string): Promise<CardItem[]> | null {
  return pendingStagedFetch && pendingStagedFetch.packId === packId ? pendingStagedFetch.cards : null;
}

/** Карточки набора из памяти сессии (синхронно, без сети). */
export function peekStagedCommunityPackCards(packId: string): CardItem[] | null {
  const cards = communityPackCardsMemo.get(packId);
  return cards && cards.length > 0 ? cards : null;
}

export function getStagedNavigationPackId(): string | null {
  return stagedNavigationPackId;
}

export function clearStagedNavigationPackId(): void {
  stagedNavigationPackId = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

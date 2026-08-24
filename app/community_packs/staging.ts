import type { CardItem } from '../flashcards/types';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import { fetchCommunityPackCards } from './communityFirestore';
import {
  isLocalAuthorPackId,
  loadLocalAuthorPacks,
  localAuthorPackCardItems,
} from './localAuthorPacks';

let stagedCommunityPackMarketCards: { key: string; cards: CardItem[] } | null = null;
/** Метаданные нужны на том же первом кадре, что и карточки: без них тема пака мигает. */
let stagedCommunityPackMeta: { key: string; pack: FlashcardMarketPack } | null = null;
/** `packId` з останнього успішного `stageCommunityPackCardsForNavigation` — для перевірки `?pack=` до зчитування AsyncStorage. */
let stagedNavigationPack: { key: string; packId: string; target: string } | null = null;

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
let pendingStagedFetch: { key: string; cards: Promise<CardItem[]> } | null = null;

function scopedPackKey(packId: string, studyTarget?: RuntimeStudyTarget): string {
  return `${storageStudyTarget(studyTarget)}::${packId}`;
}

function rememberCommunityPackCards(key: string, cards: CardItem[]): void {
  if (cards.length === 0) return;
  communityPackCardsMemo.delete(key);
  communityPackCardsMemo.set(key, cards);
  while (communityPackCardsMemo.size > MEMO_LIMIT) {
    const oldest = communityPackCardsMemo.keys().next().value;
    if (oldest === undefined) break;
    communityPackCardsMemo.delete(oldest);
  }
}

/**
 * Підготувати картки UGC-набору перед `router.push` на колекцію з `?pack=`.
 *
 * Навигация обязана дождаться результата: лучше оставить нажатую плитку с
 * компактным progress, чем смонтировать коллекцию без карточек/темы и тут же
 * перестроить весь экран. Memo-путь остаётся практически синхронным.
 */
export async function stageCommunityPackCardsForNavigation(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
  packMeta?: FlashcardMarketPack,
): Promise<CardItem[]> {
  const key = scopedPackKey(packId, studyTarget);
  const target = storageStudyTarget(studyTarget);
  const memo = communityPackCardsMemo.get(key);
  stagedCommunityPackMarketCards = memo && memo.length > 0 ? { key, cards: memo } : null;
  stagedCommunityPackMeta = packMeta ? { key, pack: packMeta } : null;
  stagedNavigationPack = { key, packId, target };
  if (memo && memo.length > 0 && !isLocalAuthorPackId(packId)) {
    // Не теряем прежний background-refresh: первый кадр берёт memo, а свежий
    // ответ обновляет кэш для следующего входа и текущий staging без блокировки.
    const refresh = fetchCommunityPackCards(packId, studyTarget)
      .then((next) => {
        if (next.length === 0) return memo;
        rememberCommunityPackCards(key, next);
        if (stagedNavigationPack?.key === key) stagedCommunityPackMarketCards = { key, cards: next };
        return next;
      })
      .catch(() => memo);
    pendingStagedFetch = { key, cards: refresh };
    return memo;
  }

  const cards = (async (): Promise<CardItem[]> => {
    if (isLocalAuthorPackId(packId)) {
      const localPacks = await loadLocalAuthorPacks(studyTarget);
      const localPack = localPacks.find((candidate) => candidate.id === packId);
      if (localPack) return localAuthorPackCardItems(localPack);
    }
    return fetchCommunityPackCards(packId, studyTarget);
  })()
    .then((next) => {
      if (next.length === 0) return next;
      rememberCommunityPackCards(key, next);
      // Гонка: пока грузили, пользователь мог уйти в другой набор —
      // поздний ответ не должен подменять актуальный staging.
      if (stagedNavigationPack?.key === key) stagedCommunityPackMarketCards = { key, cards: next };
      return next;
    })
    .catch((): CardItem[] => []);
  pendingStagedFetch = { key, cards };
  const result = await cards;
  if (result.length === 0 && stagedNavigationPack?.key === key) {
    // Не оставляем неудачный preload как ложное доказательство доступа для guard.
    stagedCommunityPackMarketCards = null;
    stagedCommunityPackMeta = null;
    stagedNavigationPack = null;
    pendingStagedFetch = null;
  }
  return result;
}

export function consumeStagedCommunityPackMarketCards(
  packId: string | null,
  studyTarget?: RuntimeStudyTarget,
): CardItem[] | null {
  const key = packId ? scopedPackKey(packId, studyTarget) : null;
  const x = key && stagedCommunityPackMarketCards?.key === key
    ? stagedCommunityPackMarketCards.cards
    : null;
  if (!x) return null;
  stagedCommunityPackMarketCards = null;
  return x;
}

/**
 * Промис карточек набора, подготовленного последним `stage…`.
 * Коллекция подписывается на него и рисует набор, как только пришёл ответ.
 */
export function stagedCommunityPackCardsPromise(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<CardItem[]> | null {
  const key = scopedPackKey(packId, studyTarget);
  return pendingStagedFetch?.key === key ? pendingStagedFetch.cards : null;
}

/** Карточки набора из памяти сессии (синхронно, без сети). */
export function peekStagedCommunityPackCards(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): CardItem[] | null {
  const cards = communityPackCardsMemo.get(scopedPackKey(packId, studyTarget));
  return cards && cards.length > 0 ? cards : null;
}

/** Метаданные выбранной плитки — готовая шапка/палитра до первого commit коллекции. */
export function peekStagedCommunityPackMeta(
  packId: string | null,
  studyTarget?: RuntimeStudyTarget,
): FlashcardMarketPack | null {
  const key = packId ? scopedPackKey(packId, studyTarget) : null;
  return key && stagedCommunityPackMeta?.key === key ? stagedCommunityPackMeta.pack : null;
}

export function getStagedNavigationPackId(studyTarget?: RuntimeStudyTarget): string | null {
  return stagedNavigationPack?.target === storageStudyTarget(studyTarget)
    ? stagedNavigationPack.packId
    : null;
}

export function clearStagedNavigationPackId(): void {
  stagedNavigationPack = null;
  stagedCommunityPackMeta = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

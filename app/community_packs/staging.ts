import type { CardItem } from '../flashcards/types';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import { fetchCommunityPackCards } from './communityFirestore';
import {
  isLocalAuthorPackId,
  loadLocalAuthorPacks,
  localAuthorPackCardItems,
} from './localAuthorPacks';
import { noteSwallowed } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
/**
 * зачем (packs-simple-004: открытие ~138 с): у .doc().get() нет своего потолка — повисший запрос держал каждую из трёх
 * попыток десятки секунд. 8 с на попытку; по таймауту — отказ, тихий повтор решает stage_with_retry.
 */
export const PACK_CARDS_FETCH_CEILING_MS = 8_000;

function withPackCardsFetchCeiling<T>(work: Promise<T>, packId: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ceiling = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      console.warn(`[PACK-OPEN] fetch:timeout packId=${packId} ms=${PACK_CARDS_FETCH_CEILING_MS}`); // guard-ok: таймаут логируется
      reject(new Error('pack_cards_fetch_timeout'));
    }, PACK_CARDS_FETCH_CEILING_MS);
  });
  return Promise.race([work, ceiling]).finally(() => { if (timer) clearTimeout(timer); });
}

export async function stageCommunityPackCardsForNavigation(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
  packMeta?: FlashcardMarketPack,
): Promise<CardItem[]> {
  const key = scopedPackKey(packId, studyTarget);
  const target = storageStudyTarget(studyTarget);
  const memo = communityPackCardsMemo.get(key);
  // зачем (координатор 04.10, «набор открывается 138 с»): сперва логи — откуда берутся карточки и сколько это длится.
  const t0 = Date.now();
  console.log(`[PACK-OPEN] stage:start packId=${packId} key=${key} memo=${memo ? memo.length : 'нет'} local=${isLocalAuthorPackId(packId)} meta=${packMeta ? 'есть' : 'нет'}`);
  stagedCommunityPackMarketCards = memo && memo.length > 0 ? { key, cards: memo } : null;
  stagedCommunityPackMeta = packMeta ? { key, pack: packMeta } : null;
  stagedNavigationPack = { key, packId, target };
  if (memo && memo.length > 0 && !isLocalAuthorPackId(packId)) {
    // Не теряем прежний background-refresh: первый кадр берёт memo, а свежий
    // ответ обновляет кэш для следующего входа и текущий staging без блокировки.
    const refresh = fetchCommunityPackCards(packId, studyTarget)
      .then((next) => {
        console.log(`[PACK-OPEN] refresh:done packId=${packId} cards=${next.length} ms=${Date.now() - t0}`);
        if (next.length === 0) return memo;
        rememberCommunityPackCards(key, next);
        if (stagedNavigationPack?.key === key) stagedCommunityPackMarketCards = { key, cards: next };
        return next;
      })
      .catch((refreshError: unknown) => {
        console.warn(`[PACK-OPEN] refresh:failed packId=${packId} ms=${Date.now() - t0}`, refreshError instanceof Error ? refreshError.message : String(refreshError));
        return memo;
      });
    pendingStagedFetch = { key, cards: refresh };
    console.log(`[PACK-OPEN] stage:memo-hit packId=${packId} cards=${memo.length} ms=${Date.now() - t0} (фоновое обновление запущено)`);
    return memo;
  }

  const cards = (async (): Promise<CardItem[]> => {
    if (isLocalAuthorPackId(packId)) {
      const localPacks = await loadLocalAuthorPacks(studyTarget);
      const localPack = localPacks.find((candidate) => candidate.id === packId);
      console.log(`[PACK-OPEN] local:lookup packId=${packId} found=${!!localPack} ms=${Date.now() - t0}`);
      if (localPack) return localAuthorPackCardItems(localPack);
    }
    console.log(`[PACK-OPEN] net:fetch:start packId=${packId} ms=${Date.now() - t0}`);
    return withPackCardsFetchCeiling(fetchCommunityPackCards(packId, studyTarget), packId);
  })()
    .then((next) => {
      console.log(`[PACK-OPEN] fetch:done packId=${packId} cards=${next.length} ms=${Date.now() - t0}`);
      if (next.length === 0) return next;
      rememberCommunityPackCards(key, next);
      // Гонка: пока грузили, пользователь мог уйти в другой набор —
      // поздний ответ не должен подменять актуальный staging.
      if (stagedNavigationPack?.key === key) stagedCommunityPackMarketCards = { key, cards: next };
      return next;
    })
    .catch((swallowedError: unknown): CardItem[] => { noteSwallowed('staging:promise_1', swallowedError); return []; });
  pendingStagedFetch = { key, cards };
  const result = await cards;
  console.log(`[PACK-OPEN] stage:end packId=${packId} cards=${result.length} ms=${Date.now() - t0}`);
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

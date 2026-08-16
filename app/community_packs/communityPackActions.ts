/**
 * Cards 2.1 §1.3 / §2 — действия над набором сообщества без валюты:
 *   • «Добавить себе» — одно нажатие, оптимистично, без списаний и подтверждений;
 *   • лайк активности — повторное нажатие снимает лайк, один пользователь = один лайк.
 *
 * Осколки/звёзды/XP здесь не участвуют вообще: наборы бесплатны и ничего не приносят (§1.4).
 */
import { emitAppEvent } from '../events';
import { getCanonicalUserId } from '../user_id_policy';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { addCommunityOwnedPackId, loadCommunityOwnedPackIds } from './communityOwnedStorage';
import {
  isCommunityPackLikedLocally,
  markCommunityPackAddCounted,
  setCommunityPackLikedLocally,
} from './packSocialStorage';
import { registerCommunityPackAddRemote, setCommunityPackLikeRemote } from './packSocialFirestore';

export type AddPackToLibraryResult =
  /** Добавлен сейчас. */
  | 'added'
  /** Уже был у пользователя — повторное нажатие ничего не меняет и не увеличивает счётчик. */
  | 'already_added'
  /** Официальные наборы выведены из оборота (§1.1) — получить их больше нельзя. */
  | 'unavailable';

/**
 * «Добавить себе»: локальное владение пишем сразу (UI обновляется оптимистично),
 * серверный счётчик добавлений догоняет в фоне и дедуплицируется по пользователю.
 */
export async function addCommunityPackToLibrary(
  pack: Pick<FlashcardMarketPack, 'id' | 'titleRu' | 'titleUk' | 'titleEs' | 'isCommunityUgc'>,
  studyTarget?: RuntimeStudyTarget,
): Promise<AddPackToLibraryResult> {
  if (!pack?.id) return 'unavailable';
  if (!pack.isCommunityUgc) return 'unavailable';

  /**
   * ПРИЧИНА БАГА «лайк не ставится» (владелец, iPhone), часть 2.
   *
   * Владение писалось БЕЗ `studyTarget`, то есть всегда в легаси-ключ английской
   * цели, а читают его все экраны уже по текущей цели (`flashcardsCommunityOwnedPacksKey`).
   * На не-английской цели набор после «Добавить себе» так и не считался «моим»,
   * и правило «лайк только после добавления» блокировало лайк НАВСЕГДА.
   */
  const owned = await loadCommunityOwnedPackIds(studyTarget);
  if (owned.includes(pack.id)) return 'already_added';

  await addCommunityOwnedPackId(pack.id, studyTarget, {
    titleRu: pack.titleRu, titleUk: pack.titleUk, titleEs: pack.titleEs,
  });
  void bumpAddedCountOnce(pack.id);

  const titleEs = pack.titleEs?.trim() || pack.titleUk?.trim() || pack.titleRu?.trim() || pack.id;
  emitAppEvent('community_pack_added', { packId: pack.id });
  emitAppEvent('action_toast', {
    type: 'success',
    messageRu: `Набор «${pack.titleRu}» добавлен в «Карточки».`,
    messageUk: `Набір «${pack.titleUk}» додано в «Картки».`,
    messageEs: `El pack «${titleEs}» se ha añadido en Tarjetas.`,
  });
  return 'added';
}

/** Инкремент `addedCount` ровно один раз на пользователя (локальная отметка + серверная дедупликация). */
async function bumpAddedCountOnce(packId: string): Promise<void> {
  try {
    const firstTime = await markCommunityPackAddCounted(packId);
    if (!firstTime) return;
    const userId = await getCanonicalUserId();
    if (!userId) return;
    await registerCommunityPackAddRemote(packId, userId);
  } catch {
    /* счётчик — не критичный путь, UI уже обновлён */
  }
}

export type ToggleLikeResult = {
  liked: boolean;
  changed: boolean;
  /** Долетела ли запись до Firestore (для точного пересчёта цифры в UI). */
  synced?: boolean;
};

/**
 * Лайк активности набора. Локальный флаг переключаем сразу (для оптимистичного UI),
 * сервер догоняет; при отсутствии облака остаётся только локальное состояние.
 */
export async function toggleCommunityPackLike(packId: string): Promise<ToggleLikeResult> {
  if (!packId) return { liked: false, changed: false };
  const wasLiked = await isCommunityPackLikedLocally(packId);
  const nextLiked = !wasLiked;
  const changed = await setCommunityPackLikedLocally(packId, nextLiked);
  if (!changed) return { liked: wasLiked, changed: false };

  emitAppEvent('community_pack_like_changed', { packId, liked: nextLiked });
  /**
   * Серверную запись ЖДЁМ (раньше был «выстрелил и забыл»): вызывающий UI должен
   * знать, долетел ли лайк, иначе оптимистичная цифра расходится с сервером и при
   * следующем чтении откатывается. Ошибку наружу не бросаем — лайк уже записан
   * локально и переживает перезаход.
   */
  let synced = false;
  try {
    const userId = await getCanonicalUserId();
    if (userId) {
      const res = await setCommunityPackLikeRemote(packId, userId, nextLiked);
      synced = res.changed;
    }
  } catch {
    /* лайк остаётся локальным до следующей попытки */
  }
  return { liked: nextLiked, changed: true, synced };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

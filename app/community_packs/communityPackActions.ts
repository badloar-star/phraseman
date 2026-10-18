/**
 * Cards 2.1 §1.3 / §2 — действия над набором сообщества без валюты:
 *   • «Добавить себе» — одно нажатие, оптимистично, без списаний и подтверждений;
 *   • лайк активности — повторное нажатие снимает лайк, один пользователь = один лайк.
 *
 * Осколки/звёзды/legacy reward здесь не участвуют вообще: наборы бесплатны и ничего не приносят (§1.4).
 */
import { emitAppEvent } from '../events';
import { isDevCardsFail } from '../dev_cards_state';
import { getCanonicalUserId } from '../user_id_policy';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { addCommunityOwnedPackId, loadCommunityOwnedPackIds } from './communityOwnedStorage';
import {
  isCommunityPackAddCounted,
  isCommunityPackLikedLocally,
  markCommunityPackAddCounted,
  setCommunityPackLikedLocally,
} from './packSocialStorage';
import { registerCommunityPackAddRemote, setCommunityPackLikeRemote } from './packSocialFirestore';
import { DebugLogger } from '../debug-logger';
import { createSerialPerKey } from './serial_per_key';

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
/**
 * Набор фраз ролика (строка «Видео → Наборы», `app/video_phrase_set_packs.ts`) и его документ сообщества.
 *
 * зачем (баг владельца 11.10: «+» у наборов Professor Lingman → «Не удалось добавить набор · Проверь связь»;
 * факт из журнала: `[PACK-SOCIAL] добавление отклонено pack=video:cnrVN_uz7Sg причина=unavailable`):
 * строка рисует общий «+», а набор фраз ролика собран клиентом БЕЗ `isCommunityUgc` → ранний отказ ниже.
 * По решению владельца 23.09 набор ролика — ОБЫЧНЫЙ документ `community_packs/video_<videoId>`
 * (`functions/src/video_phrases.ts` → `videoPackId`), поэтому «Добавить себе» идёт через него.
 * Префиксы продублированы здесь, чтобы не тянуть в действие загрузчик каталога YouTube;
 * сторож — tests/video_pack_add_maps_to_community_doc.test.ts (сверяет с исходниками клиента и сервера).
 */
export const VIDEO_PHRASE_SET_PACK_ID_PREFIX = 'video:';
export const VIDEO_COMMUNITY_PACK_ID_PREFIX = 'video_';
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function communityPackIdForVideoPhraseSet(packId: string): string | null {
  if (!packId.startsWith(VIDEO_PHRASE_SET_PACK_ID_PREFIX)) return null;
  const videoId = packId.slice(VIDEO_PHRASE_SET_PACK_ID_PREFIX.length);
  return YOUTUBE_VIDEO_ID.test(videoId) ? `${VIDEO_COMMUNITY_PACK_ID_PREFIX}${videoId}` : null;
}

export async function addCommunityPackToLibrary(
  // зачем (координатор 18.10): лог [PACK-ADD] читает язык/цель/видео набора — поля были вне типа (TS2339 с 7d3ff1c50).
  // Необязательные, чтобы вызывающие без них не краснели; полный FlashcardMarketPack их и так несёт.
  pack: Pick<FlashcardMarketPack, 'id' | 'titleRu' | 'titleUk' | 'titleEs' | 'isCommunityUgc'> & Partial<Pick<FlashcardMarketPack, 'packLanguage' | 'studyTarget' | 'videoId'>>,
  studyTarget?: RuntimeStudyTarget,
): Promise<AddPackToLibraryResult> {
  if (!pack?.id) {
    console.warn('[PACK-ADD] unavailable reason=no_pack_id'); // guard-ok: ранний выход называет причину
    return 'unavailable';
  }
  // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `fail=pack_write` — запись набора в «Мои» не удалась (тост «Не получилось сохранить набор на телефоне»); в стор-сборке геттер выключен.
  if (isDevCardsFail('pack_write')) {
    console.warn(`[PACK-ADD] запись подменена сбоем (pack_write) pack=${pack.id}`); // guard-ok: dev-ветка
    throw new Error('dev_pack_write_failed');
  }
  const videoCommunityId = communityPackIdForVideoPhraseSet(pack.id);
  if (videoCommunityId) {
    // зачем: см. communityPackIdForVideoPhraseSet — добавляем документ сообщества ролика, а не клиентскую сборку фраз.
    console.log(`[PACK-ADD] video_phrase_set mapped from=${pack.id} to=${videoCommunityId} target=${studyTarget ?? 'default'}`); // guard-ok
    return addCommunityPackToLibrary({ ...pack, id: videoCommunityId, isCommunityUgc: true }, studyTarget);
  }
  if (!pack.isCommunityUgc) {
    console.warn(`[PACK-ADD] unavailable reason=not_community_ugc pack=${pack.id}`); // guard-ok: ранний выход называет причину
    return 'unavailable';
  }
  console.log(`[PACK-ADD] in pack=${pack.id} target=${studyTarget ?? 'default'}`); // guard-ok: вход в добавление
  // зачем (координатор 15.10, R06, «сперва логи»): с каким языком набор попадает в «Мои наборы» — поле packLanguage, поле studyTarget и признак видео-набора
  console.log(`[PACK-ADD] language pack=${pack.id} packLanguage=${String(pack.packLanguage)} studyTarget=${String(pack.studyTarget)} video=${pack.videoId ? 'yes' : 'no'}`); // guard-ok: язык набора при добавлении

  /**
   * ПРИЧИНА БАГА «лайк не ставится» (владелец, iPhone), часть 2.
   *
   * Владение писалось БЕЗ `studyTarget`, то есть всегда в легаси-ключ английской
   * цели, а читают его все экраны уже по текущей цели (`flashcardsCommunityOwnedPacksKey`).
   * На не-английской цели набор после «Добавить себе» так и не считался «моим»,
   * и правило «лайк только после добавления» блокировало лайк НАВСЕГДА.
  */
  const owned = await loadCommunityOwnedPackIds(studyTarget);
  if (owned.includes(pack.id)) {
    // A legacy/offline add may have stored only the id. Reopening the same pack
    // is a safe opportunity to hydrate its real title and card-back metadata.
    await addCommunityOwnedPackId(pack.id, studyTarget, {
      titleRu: pack.titleRu,
      titleUk: pack.titleUk,
      titleEs: pack.titleEs,
    });
    console.log(`[PACK-ADD] result=already_added pack=${pack.id}`); // guard-ok
    return 'already_added';
  }

  await addCommunityOwnedPackId(pack.id, studyTarget, {
    titleRu: pack.titleRu,
    titleUk: pack.titleUk,
    titleEs: pack.titleEs,
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
  console.log(`[PACK-ADD] result=added pack=${pack.id}`); // guard-ok
  return 'added';
}

/**
 * Инкремент `addedCount` ровно один раз на пользователя (локальная отметка +
 * серверная дедупликация).
 *
 * зачем локальный флаг ставится ПОСЛЕ успеха сервера, а не до (владелец
 * 17.09.2026, «комментарий не отправляется, permission-denied»): раньше
 * `markCommunityPackAddCounted` писал флаг ПЕРВЫМ и возвращал `true` ещё до
 * попытки записи, а результат `registerCommunityPackAddRemote` никто не
 * проверял. Любой единичный сбой (отказ правил, не поднявшийся анонимный
 * вход, оффлайн) навсегда сжигал единственную попытку: при следующем заходе
 * `firstTime=false` → ранний выход, документ `pack_adds/{uid}` не создавался
 * НИКОГДА. А именно его ищет `packAddedByMe()` в firestore.rules, разрешая
 * писать отклик под набором — отсюда вечный permission-denied.
 *
 * Дедупликация серверной записи при этом не теряется: сама транзакция
 * `applyPackAdd` идемпотентна (проверяет существование `pack_adds/{uid}` и не
 * трогает счётчик повторно). Локальный флаг остаётся лишь дешёвым способом не
 * ходить в сеть, когда успех уже подтверждён.
 */
async function bumpAddedCountOnce(packId: string): Promise<void> {
  try {
    const alreadyCounted = await isCommunityPackAddCounted(packId);
    if (alreadyCounted) {
      DebugLogger.warn('communityPackActions:add', `[PACK-SOCIAL] добавление уже подтверждено сервером ранее packId=${packId}`);
      return;
    }
    const userId = await getCanonicalUserId();
    if (!userId) {
      DebugLogger.warn('communityPackActions:add', `[PACK-SOCIAL] регистрация добавления отложена: нет canonical uid packId=${packId}`);
      return;
    }
    const res = await registerCommunityPackAddRemote(packId, userId);
    if (res.ok === false) {
      // Флаг НЕ ставим — следующая попытка (в том числе из шторки откликов
      // перед отправкой комментария) обязана повторить запись.
      DebugLogger.warn('communityPackActions:add', `[PACK-SOCIAL] регистрация добавления НЕ удалась, флаг не ставим packId=${packId} — повторим позже`);
      return;
    }
    await markCommunityPackAddCounted(packId);
    DebugLogger.warn('communityPackActions:add', `[PACK-SOCIAL] добавление подтверждено сервером, флаг поставлен packId=${packId} изменено=${res.changed}`);
  } catch (e) {
      // счётчик — не критичный путь, UI уже обновлён
      DebugLogger.error('communityPackActions:userId', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export type ToggleLikeResult = {
  liked: boolean;
  changed: boolean;
  /** Долетела ли запись до Firestore (для точного пересчёта цифры в UI). */
  synced?: boolean;
  /** Облако отказало (вход не поднялся / транзакция отклонена): локальный флаг возвращён, экран откатывает сердце и цифру с тостом. */
  rejected?: boolean;
};

/**
 * Лайк активности набора. Локальный флаг переключаем сразу (для оптимистичного UI),
 * сервер догоняет; при отсутствии облака остаётся только локальное состояние.
 */
// зачем (аудит Optimistic UI, 12.10): два быстрых тапа по сердцу шли параллельно и читали флаг до записи первого —
// экран и хранилище расходились. Тапы по одному набору идут строго по очереди (см. serial_per_key.ts).
const likeQueue = createSerialPerKey();

export function toggleCommunityPackLike(packId: string): Promise<ToggleLikeResult> {
  if (!packId) return Promise.resolve({ liked: false, changed: false });
  return likeQueue(`like:${packId}`, () => toggleCommunityPackLikeNow(packId));
}

async function toggleCommunityPackLikeNow(packId: string): Promise<ToggleLikeResult> {
  // зачем (координатор 12.10, cards-gap-033): dev `fail=pack_like` — исключение, на которое экран показывает откат сердца и тост.
  if (isDevCardsFail('pack_like')) {
    console.warn(`[DEV-STATE] community: лайк подменён сбоем pack=${packId}`); // guard-ok: dev-ветка
    throw new Error('dev_pack_like_failed');
  }
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
      // зачем (координатор 18.10, решение по аудиту (б)): очереди повторной отправки до релиза нет — лайк, который облако не приняло,
      // при следующем чтении молча откатывался. Теперь откат сразу: локальный флаг назад, экран покажет тост. Сборка без облака
      // ('cloud_off') — лайк законно остаётся на устройстве.
      if (res.ok === false && res.reason !== 'cloud_off') {
        console.warn(`[PACK-LIKE] облако не приняло pack=${packId} liked=${nextLiked} reason=${res.reason ?? 'unknown'} → откат локального флага`); // guard-ok: отказ облака, один раз на тап
        await setCommunityPackLikedLocally(packId, wasLiked);
        emitAppEvent('community_pack_like_changed', { packId, liked: wasLiked });
        return { liked: wasLiked, changed: false, synced: false, rejected: true };
      }
    }
  } catch (e) {
      // лайк остаётся локальным до следующей попытки
      DebugLogger.error('communityPackActions:res', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return { liked: nextLiked, changed: true, synced };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

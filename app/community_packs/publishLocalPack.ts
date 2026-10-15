/**
 * «Сделать публичным» — отправка своего (пока локального) набора на публикацию
 * прямо с экрана набора, без захода в редактор.
 *
 * Замечание владельца после теста на iPhone: у своей коллекции/набора вверху
 * должна быть кнопка публикации; уже опубликованный набор её не показывает.
 * Заявка уходит тем же callable, что и из редактора (`communitySubmitPackForReview`),
 * и попадает в админку владельца.
 */
import auth from '@react-native-firebase/auth';
import { isDevCardsFail, isDevPublishOk } from '../dev_cards_state';

import { getCanonicalUserId } from '../user_id_policy';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { callCommunitySubmitPackForReview, callCommunityAuthorRemovePack, isCommunityPacksCloudEnabled } from './functionsClient';
import { loadLocalAuthorPacks, updateLocalPackPublication } from './localAuthorPacks';
import { forgetAuthorPackLastKnown, invalidateCommunityPackCatalog } from './communityFirestore';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';
import type { PackLanguage } from '../flashcards/pack_languages';
import { normalizePackLevel, type PackLevel } from '../flashcards/pack_deck_meta';
import {
  buildCommunityPackPayloadForCloud,
  validateCommunityPackPayload,
  type CommunityPackSubmissionPayload,
} from './schema';
import type { Lang } from '../../constants/i18n';
import { isPublishDailyLimitError } from './publish_limit_copy';

export type PublishLocalPackResult =
  /** Заявка ушла на публикацию. */
  | 'submitted'
  /** Набор не найден на устройстве (например, он уже облачный). */
  | 'not_found'
  /** Облако выключено (Expo Go / CLOUD_SYNC_ENABLED=false). */
  | 'cloud_disabled'
  /** Набор не проходит правила каталога (мало карточек, нет описания и т.п.). */
  | 'invalid'
  /** Сервер: исчерпан суточный лимит новых публикаций (3 в сутки на человека). */
  | 'daily_limit'
  | 'error';

/** Payload публикации из локальной копии набора. */
export function localPackSubmissionPayload(
  pack: { title: string; description: string; cardThemeKey: string; cards: CommunityPackSubmissionPayload['cards']; packLanguage?: PackLanguage; priceRunes?: number; level?: PackLevel },
  sourceLang: Lang,
  studyTarget?: RuntimeStudyTarget,
): CommunityPackSubmissionPayload {
  return {
    packLanguage: pack.packLanguage,
    publishToCommunity: true,
    studyTarget,
    title: pack.title.trim(),
    description: pack.description.trim(),
    sourceLang,
    cards: pack.cards,
    cardThemeKey: pack.cardThemeKey || undefined,
    // зачем (владелец 2026-09-21): цена, которую автор поставил ползунком,
    // хранится в локальном наборе и обязана уехать вместе с заявкой.
    priceRunes: Math.max(0, Math.floor(Number(pack.priceRunes ?? 0))) || 0,
    // зачем (Карточки 2.0): уровень набора уезжает с заявкой, как и цена — иначе в каталоге его не будет.
    ...(normalizePackLevel(pack.level) ? { level: normalizePackLevel(pack.level) } : {}),
  };
}

/** Единый префикс трассировки публикации — вся цепочка достаётся одним grep. */
function logPublish(step: string, data: Record<string, unknown>): void {
  console.log(`[UGC-PUBLISH] ${step}`, JSON.stringify(data));
}

/**
 * Отказ «эта публикация отозвана, начните новую».
 *
 * Сервер бросает failed-precondition с текстом 'Publication withdrawn; start a
 * new publication' (functions/src/community_packs.ts:676). Отзыв мог произойти
 * не с этого телефона, поэтому локальный ключ идемпотентности остался прежним
 * и без распознавания этого кода автор упирался в отказ бесконечно.
 */
export function isPublicationWithdrawnError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  const code = String(e?.code ?? '');
  const message = String(e?.message ?? '');
  if (!/failed-precondition/i.test(code) && !/failed-precondition/i.test(message)) return false;
  return /withdrawn/i.test(message);
}

export async function publishLocalAuthorPack(
  packId: string,
  sourceLang: Lang,
  studyTarget?: RuntimeStudyTarget,
): Promise<PublishLocalPackResult> {
  // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `fail=publish_daily_limit` — «не больше 3 в сутки» без обращения к серверу; в стор-сборке геттер выключен.
  if (isDevCardsFail('publish_daily_limit')) {
    logPublish('submit:daily_limit', { packId, dev: true });
    return 'daily_limit';
  }
  // зачем (координатор 12.10, cards-gap-028 / cards-072): dev `fail=publish_error` — «не удалось отправить набор на публикацию»
  // без сети (авиарежим не воспроизводил кадр: отказ приходит до сервера по-разному). В стор-сборке геттер выключен.
  if (isDevCardsFail('publish_error')) {
    logPublish('submit:error', { packId, dev: true });
    return 'error';
  }
  // зачем (Авторизация 12.10, cards-gap-025): dev `publish=ok` — «отправлено» без сети и без записи (ни callable, ни локальной отметки). В сторе выключено.
  if (isDevPublishOk()) {
    logPublish('submit:submitted', { packId, dev: true, writes: 'none' });
    return 'submitted';
  }
  const token = captureAccountGeneration();
  // зачем: КАЖДЫЙ ранний выход обязан назвать причину. Немой выход — это
  // «нажал, ничего не произошло, в логе пусто»; именно так баги живут месяцами.
  if (!isCommunityPacksCloudEnabled()) {
    logPublish('exit:cloud_disabled', { packId, reason: 'community packs cloud is off (Expo Go / CLOUD_SYNC_ENABLED=false)' });
    return 'cloud_disabled';
  }
  const id = String(packId ?? '').trim();
  if (!id) {
    logPublish('exit:not_found', { packId, reason: 'empty packId argument' });
    return 'not_found';
  }

  const loaded = await loadLocalAuthorPacks(studyTarget).catch((e: unknown) => {
    // зачем: немой catch запрещён — пустой список здесь выглядит как «набора
    // нет», хотя на деле упало чтение хранилища. Причина обязана быть видна.
    logPublish('load:failed', { packId: id, studyTarget: studyTarget ?? null, message: String((e as { message?: string } | null)?.message ?? e) });
    return [];
  });
  const local = loaded.find((p) => p.id === id);
  if (!local) {
    logPublish('exit:not_found', { packId: id, studyTarget: studyTarget ?? null, loadedCount: loaded.length, reason: 'pack is absent in local storage (already cloud-only?)' });
    return 'not_found';
  }

  const payload = localPackSubmissionPayload(local, sourceLang, local.studyTarget ?? studyTarget);
  const invalidReason = validateCommunityPackPayload(payload);
  if (invalidReason !== null) {
    logPublish('exit:invalid', { packId: id, reason: String(invalidReason), cards: payload.cards.length, hasTitle: Boolean(payload.title), hasDescription: Boolean(payload.description) });
    return 'invalid';
  }
  // зачем (координатор 12.10, «без прод-записей» при съёмке R1): демо-наборы dev_state (local_pack_dev_demo_*) в dev-сборке
  // никогда не уходят на сервер публикации — даже если демо-данные однажды станут валидными. В стор-сборке __DEV__ = false.
  if (typeof __DEV__ !== 'undefined' && __DEV__ && id.startsWith('local_pack_dev_demo')) {
    logPublish('exit:dev_demo_pack', { packId: id, reason: 'demo pack never published from dev' });
    return 'error';
  }

  try {
    const authorStableId = await getCanonicalUserId().catch((e: unknown) => {
      logPublish('identity:failed', { packId: id, message: String((e as { message?: string } | null)?.message ?? e) });
      return null;
    });
    if (!isCurrentAccountGeneration(token)) {
      logPublish('exit:account_changed', { packId: id, at: 'after getCanonicalUserId' });
      return 'error';
    }
    if (!auth().currentUser) await auth().signInAnonymously();
    if (!isCurrentAccountGeneration(token)) {
      logPublish('exit:account_changed', { packId: id, at: 'after signInAnonymously' });
      return 'error';
    }

    // зачем: ключ идемпотентности обязан пережить повторные нажатия «Сделать
    // публичным» — именно он склеивает их в ОДНУ заявку на сервере. Раньше он
    // перезаписывался после каждой отправки, ключ каждый раз был новым, и
    // сервер честно создавал новый документ: владелец получил три одинаковые
    // заявки «My phrases verbs» за 18 минут (20.09.2026).
    const submissionKey = local.publicationKey ?? local.id;

    // зачем: id заявки и id опубликованного набора — ОДНО И ТО ЖЕ значение по
    // конструкции сервера: при одобрении набор создаётся как
    // community_packs.doc(submissionId) (functions/src/community_packs.ts:914).
    // Поэтому сохранённый submissionId — законный updatePackId, а не мусор, и
    // отличить «заявку» от «набора» по форме строки невозможно. Попытка
    // отбрасывать значения вида `create_*` (20.09.2026) ломала правку
    // опубликованного набора и удаление локальной копии — откачено.
    const cloudPackId = local.cloudPackId;

    logPublish('submit:start', {
      localId: local.id,
      submissionKey,
      cloudPackId: cloudPackId ?? null,
      // зачем: печатаем САМО значение, которое решает ветвление, а не true/false —
      // по нему видно, ушла правка опубликованного набора или создание заявки.
      mode: cloudPackId ? 'edit-published' : 'create-or-update-submission',
      publicationState: local.publicationState ?? null,
      cards: payload.cards.length,
      authorStableId: authorStableId ?? null,
    });

    const sendWithKey = async (key: string, attempt: 'first' | 'retry-after-withdrawn') => {
      const result = await callCommunitySubmitPackForReview({
        authorStableId: authorStableId ?? '',
        payload: buildCommunityPackPayloadForCloud(payload),
        submissionKey: key,
        replacePending: true,
        ...(cloudPackId ? { updatePackId: cloudPackId } : {}),
      });
      if (!isCurrentAccountGeneration(token)) {
        logPublish('exit:account_changed', { packId: id, at: 'after submit returned', attempt, submissionId: result.submissionId });
        return null;
      }
      // зачем: сохраняем id, под которым набор будет жить в community_packs —
      // он равен id заявки, сервер создаёт набор именно под ним. Заполняем с
      // опережением (до одобрения набора ещё нет, но id уже зарезервирован),
      // иначе автор не сможет править свой набор после публикации.
      const nextCloudPackId = cloudPackId ?? result.submissionId;
      logPublish('submit:ok', {
        localId: local.id,
        attempt,
        submissionId: result.submissionId,
        cloudPackIdBefore: cloudPackId ?? null,
        cloudPackIdAfter: nextCloudPackId,
        submissionKeyUsed: key,
      });
      await updateLocalPackPublication(local.id, {
        isPublic: true,
        publicationState: 'submitted',
        publicationKey: key,
        cloudPackId: nextCloudPackId,
      });
      invalidateCommunityPackCatalog();
      return 'submitted' as const;
    };

    try {
      // Обычный путь: ключ стабилен, повторное нажатие обновляет ту же заявку.
      const ok = await sendWithKey(submissionKey, 'first');
      return ok ?? 'error';
    } catch (submitError: unknown) {
      // зачем (владелец 20.09.2026, «исправь если ещё что-то найдёшь»): сервер
      // отвечает failed-precondition на ОТОЗВАННУЮ заявку и предлагает начать
      // публикацию заново (functions/src/community_packs.ts:676). Клиент этого
      // не понимал и слал тот же мёртвый ключ снова: человек получал вечный
      // отказ с ложным советом «нажмите ещё раз при подключении» — подключение
      // тут ни при чём. Отзыв мог случиться не с этого телефона (другое
      // устройство, действие администратора, переустановка), поэтому локальный
      // withdrawLocalAuthorPack ключ не сменил и свести состояние было нечем.
      if (!isPublicationWithdrawnError(submitError)) throw submitError;
      // Повтор РОВНО ОДИН: новый ключ на сервере заведомо свободен, цикла нет.
      const freshKey = `${local.id}_${Date.now()}`;
      logPublish('retry:withdrawn', {
        localId: local.id,
        deadKey: submissionKey,
        freshKey,
        reason: String((submitError as { message?: string } | null)?.message ?? submitError),
      });
      const ok = await sendWithKey(freshKey, 'retry-after-withdrawn');
      return ok ?? 'error';
    }
  } catch (e) {
    // зачем: Q55 — суточный лимит публикаций это не «нет связи», а отдельный исход:
    // экрану нужно показать «не больше 3 в сутки, попробуй завтра».
    if (isPublishDailyLimitError(e)) {
      logPublish('submit:daily_limit', {
        localId: local.id,
        code: String((e as { code?: string } | null)?.code ?? ''),
        message: String((e as { message?: string } | null)?.message ?? e),
      });
      return 'daily_limit';
    }
    // зачем: немой catch уже стоил месяцев немых багов — причина отказа
    // публикации остаётся в логе НАВСЕГДА, а не только в дев-сборке.
    logPublish('submit:failed', {
      localId: local.id,
      code: String((e as { code?: string } | null)?.code ?? ''),
      message: String((e as { message?: string } | null)?.message ?? e),
    });
    return 'error';
  }
}

/** Withdraw public visibility before deleting/changing the private local copy. */
// зачем (аудит Optimistic UI, координатор 15.10, потеря данных пользователя, дыры 1-3): редактор набора теперь снимает публикацию ПОСЛЕ успешного сохранения; сохранение переводит publicationState в 'private', поэтому прежнее состояние
// (заявка pending/submitted без cloudPackId) передаётся подсказкой `before` — иначе серверная заявка осталась бы висеть.
export async function withdrawLocalAuthorPack(packId: string, before?: Readonly<{ publicationState?: string }>): Promise<void> {
  const token = captureAccountGeneration();
  const local = (await loadLocalAuthorPacks()).find(pack => pack.id === packId);
  if (!local) throw new Error('Local pack not found');
  if (local.cloudPackId || local.publicationState === 'pending' || local.publicationState === 'submitted'
    || before?.publicationState === 'pending' || before?.publicationState === 'submitted') {
    const authorStableId = await getCanonicalUserId();
    if (!authorStableId || !isCommunityPacksCloudEnabled()) throw new Error('Connection required to withdraw a public pack');
    try {
      await callCommunityAuthorRemovePack({ authorStableId, packId: local.cloudPackId ?? local.id, submissionKey: local.publicationKey ?? local.id });
    } catch (error) {
      // A publication attempt that never reached the server has nothing to withdraw.
      if (!String((error as { code?: string }).code ?? '').includes('not-found')) throw error;
    }
  }
  if (!isCurrentAccountGeneration(token)) throw new Error('Account changed');
  await updateLocalPackPublication(packId, { cloudPackId: undefined, publicationState: 'private', publicationKey: `${local.id}_${Date.now()}`, isPublic: false });
  // зачем (Account V2, 8L): отозванный набор не должен «воскреснуть» из последнего
  // известного авторских наборов при следующем сбое чтения.
  forgetAuthorPackLastKnown(local.cloudPackId);
  forgetAuthorPackLastKnown(local.id);
  invalidateCommunityPackCatalog();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

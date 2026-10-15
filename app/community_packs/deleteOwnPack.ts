/**
 * Удаление СВОЕГО набора — одна общая функция для «Моих наборов» и экрана набора («Удалить набор» в шторке действий, cards-v2 `setActions`).
 *
 * зачем (координатор 12.10: «Удалить набор — через вынесенную общую функцию с подтверждением»): логика была зашита в экран «Моих наборов»;
 * шторка набора не должна копировать её (расхождение облачной и локальной веток = набор «воскресает»). Экран делает оптимистичное скрытие,
 * подтверждение и тосты, а сюда вынесен только ввод-вывод: локальный набор снимается с публикации и удаляется с устройства, облачный
 * удаляется вызовом автора, затем чистятся его локальные копии и каталог.
 *
 * Защита от гонок: `pendingPackDeletes` — общий для экранов набор id, чьё удаление ещё идёт. Список «Моих наборов» не показывает их при
 * фоновой перезагрузке, а повторный запрос на тот же id отклоняется (двойной тап).
 */
import { callCommunityAuthorRemovePack } from './functionsClient';
import { dropPacksFromVideoCatalog, forgetAuthorPackLastKnown, invalidateCommunityPackCatalog } from './communityFirestore';
import { isLocalAuthorPackId, loadLocalAuthorPacks, removeLocalAuthorPack } from './localAuthorPacks';
import { withdrawLocalAuthorPack } from './publishLocalPack';
import { getCanonicalUserId } from '../user_id_policy';
import type { RuntimeStudyTarget } from '../target_storage_keys';

const TAG = '[PACK-DELETE]';

/** Id наборов, удаление которых ещё не подтверждено сервером (общий для «Моих наборов» и экрана набора). */
export const pendingPackDeletes: Set<string> = new Set();

/** Освобождает набор от защёлки удаления; вызывать в finally. */
export function releasePackDelete(packId: string): void {
  pendingPackDeletes.delete(packId);
}

/** Занять защёлку удаления. false — удаление этого набора уже идёт (двойной тап). */
export function claimPackDelete(packId: string): boolean {
  if (pendingPackDeletes.has(packId)) {
    console.warn(`${TAG} повторный запрос на удаление отклонён`, { packId });
    return false;
  }
  pendingPackDeletes.add(packId);
  return true;
}

/**
 * Ввод-вывод удаления. Бросает ошибку при сбое (вызывающий откатывает интерфейс и показывает сообщение).
 * Аргумент назван `pack`, чтобы сторожа видели привычную связку `callCommunityAuthorRemovePack({ authorStableId, packId: pack.id })`.
 */
export async function deleteOwnPackEverywhere(pack: Readonly<{ id: string }>, studyTarget?: RuntimeStudyTarget): Promise<void> {
  const local = isLocalAuthorPackId(pack.id);
  console.log(`${TAG} старт`, { packId: pack.id, local }); // guard-ok: единичный лог на жест человека
  // R31: id опубликованной копии — чтобы вычеркнуть набор и из «Из видео»
  const droppedIds: string[] = [pack.id];
  if (local) {
    const cloudId = (await loadLocalAuthorPacks()).find((copy) => copy.id === pack.id)?.cloudPackId;
    if (cloudId) droppedIds.push(cloudId);
    await withdrawLocalAuthorPack(pack.id);
    await removeLocalAuthorPack(pack.id, studyTarget);
  } else {
    const authorStableId = await getCanonicalUserId().catch((error: unknown) => {
      console.warn(`${TAG} getCanonicalUserId не ответил при удалении`, error);
      return null;
    });
    if (!authorStableId) throw new Error('author_id_missing');
    await callCommunityAuthorRemovePack({ authorStableId, packId: pack.id });
    forgetAuthorPackLastKnown(pack.id); // зачем (8L): удалённый набор не возвращается из последнего известного
    for (const localCopy of await loadLocalAuthorPacks()) {
      if (localCopy.cloudPackId === pack.id) await removeLocalAuthorPack(localCopy.id, localCopy.studyTarget);
    }
  }
  invalidateCommunityPackCatalog();
  dropPacksFromVideoCatalog(droppedIds);
  console.log(`${TAG} готово`, { packId: pack.id }); // guard-ok: единичный лог на жест человека
}

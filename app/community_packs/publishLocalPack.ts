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

import { getCanonicalUserId } from '../user_id_policy';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { callCommunitySubmitPackForReview, callCommunityAuthorRemovePack, isCommunityPacksCloudEnabled } from './functionsClient';
import { loadLocalAuthorPacks, updateLocalPackPublication } from './localAuthorPacks';
import { invalidateCommunityPackCatalog } from './communityFirestore';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';
import type { PackLanguage } from '../flashcards/pack_languages';
import {
  buildCommunityPackPayloadForCloud,
  validateCommunityPackPayload,
  type CommunityPackSubmissionPayload,
} from './schema';
import type { Lang } from '../../constants/i18n';

export type PublishLocalPackResult =
  /** Заявка ушла на публикацию. */
  | 'submitted'
  /** Набор не найден на устройстве (например, он уже облачный). */
  | 'not_found'
  /** Облако выключено (Expo Go / CLOUD_SYNC_ENABLED=false). */
  | 'cloud_disabled'
  /** Набор не проходит правила каталога (мало карточек, нет описания и т.п.). */
  | 'invalid'
  | 'error';

/** Payload публикации из локальной копии набора. */
export function localPackSubmissionPayload(
  pack: { title: string; description: string; cardThemeKey: string; cardBackKey: string; cards: CommunityPackSubmissionPayload['cards']; packLanguage?: PackLanguage },
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
    cardBackKey: pack.cardBackKey || undefined,
  };
}

export async function publishLocalAuthorPack(
  packId: string,
  sourceLang: Lang,
  studyTarget?: RuntimeStudyTarget,
): Promise<PublishLocalPackResult> {
  const token = captureAccountGeneration();
  if (!isCommunityPacksCloudEnabled()) return 'cloud_disabled';
  const id = String(packId ?? '').trim();
  if (!id) return 'not_found';

  const local = (await loadLocalAuthorPacks(studyTarget).catch(() => [])).find((p) => p.id === id);
  if (!local) return 'not_found';

  const payload = localPackSubmissionPayload(local, sourceLang, local.studyTarget ?? studyTarget);
  if (validateCommunityPackPayload(payload) !== null) return 'invalid';

  try {
    const authorStableId = await getCanonicalUserId().catch(() => null);
    if (!isCurrentAccountGeneration(token)) return 'error';
    if (!auth().currentUser) await auth().signInAnonymously();
    if (!isCurrentAccountGeneration(token)) return 'error';
    const submissionKey = local.publicationKey ?? local.id;
    const result = await callCommunitySubmitPackForReview({
      authorStableId: authorStableId ?? '',
      payload: buildCommunityPackPayloadForCloud(payload),
      submissionKey,
      replacePending: true,
      ...(local.cloudPackId ? { updatePackId: local.cloudPackId } : {}),
    });
    if (!isCurrentAccountGeneration(token)) return 'error';
    await updateLocalPackPublication(local.id, { isPublic: true, publicationState: 'submitted', publicationKey: submissionKey, cloudPackId: local.cloudPackId ?? result.submissionId });
    invalidateCommunityPackCatalog();
    return 'submitted';
  } catch (e) {
    if (__DEV__) console.warn('[publishLocalPack] submit failed', e);
    return 'error';
  }
}

/** Withdraw public visibility before deleting/changing the private local copy. */
export async function withdrawLocalAuthorPack(packId: string): Promise<void> {
  const token = captureAccountGeneration();
  const local = (await loadLocalAuthorPacks()).find(pack => pack.id === packId);
  if (!local) throw new Error('Local pack not found');
  if (local.cloudPackId || local.publicationState === 'pending' || local.publicationState === 'submitted') {
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
  invalidateCommunityPackCatalog();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

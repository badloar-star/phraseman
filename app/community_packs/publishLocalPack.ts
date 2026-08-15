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
import { callCommunitySubmitPackForReview, isCommunityPacksCloudEnabled } from './functionsClient';
import { loadLocalAuthorPacks } from './localAuthorPacks';
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
  pack: { title: string; description: string; cardThemeKey: string; cardBackKey: string; cards: CommunityPackSubmissionPayload['cards'] },
  sourceLang: Lang,
  studyTarget?: RuntimeStudyTarget,
): CommunityPackSubmissionPayload {
  return {
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
  if (!isCommunityPacksCloudEnabled()) return 'cloud_disabled';
  const id = String(packId ?? '').trim();
  if (!id) return 'not_found';

  const local = (await loadLocalAuthorPacks(studyTarget).catch(() => [])).find((p) => p.id === id);
  if (!local) return 'not_found';

  const payload = localPackSubmissionPayload(local, sourceLang, studyTarget);
  if (validateCommunityPackPayload(payload) !== null) return 'invalid';

  try {
    const authorStableId = await getCanonicalUserId().catch(() => null);
    if (!auth().currentUser) await auth().signInAnonymously();
    await callCommunitySubmitPackForReview({
      authorStableId: authorStableId ?? '',
      payload: buildCommunityPackPayloadForCloud(payload),
    });
    return 'submitted';
  } catch (e) {
    if (__DEV__) console.warn('[publishLocalPack] submit failed', e);
    return 'error';
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

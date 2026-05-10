import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';

const REGION = 'us-central1';

export type PhraseContentRatingScope =
  | 'lesson_practice'
  | 'lesson_theory'
  | 'dictionary_word'
  | 'irregular_verb_drill'
  | 'preposition_drill'
  | 'quiz'
  | 'exam';

export function isPhraseRatingCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), REGION), name);
}

export async function phraseContentRatingFetchState(data: {
  stableUserId: string;
  scope: PhraseContentRatingScope;
  itemId: string;
  /** Тот же текст, что уходит в submit — нужен серверу, чтобы подставить новую подпись в админке и обнулить старые оценки при смене фразы. */
  labelSnippet: string;
}): Promise<{ myStars: number | null }> {
  const fn = callable<typeof data, { myStars: number | null }>('phraseContentRatingGetState');
  const res = await fn(data);
  return res.data;
}

export async function phraseContentRatingSubmit(data: {
  stableUserId: string;
  scope: PhraseContentRatingScope;
  itemId: string;
  stars: 1 | 2 | 3;
  labelSnippet?: string;
}): Promise<{ ok: boolean; alreadyRated: boolean; stars: number | null }> {
  const fn = callable<typeof data, { ok: boolean; alreadyRated: boolean; stars: number | null }>(
    'phraseContentRatingSubmit',
  );
  const res = await fn(data);
  return res.data;
}

/** stable_id для записи в users/{id} (как у cloud_sync). */
export async function getStableUserIdForRating(): Promise<string | null> {
  if (!isPhraseRatingCloudEnabled()) return null;
  return ensureAnonUser();
}

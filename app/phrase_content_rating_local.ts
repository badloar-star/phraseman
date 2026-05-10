import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { PhraseContentRatingScope } from './phrase_content_rating';

/** Совпадает с Cloud Function `normItemId`. */
export function normalizePhraseRatingItemId(itemId: string): string {
  return itemId.trim().slice(0, 400);
}

/** Должно совпадать с `trimLabel` в `functions/src/phrase_content_rating.ts`. */
export function trimPhraseRatingLabelSnippet(s: string | undefined | null): string {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}

/** Отпечаток текста для одного itemId: смена фразы → другой hash → сброс статистики на сервере. */
export async function phraseRatingLabelFingerprint(
  scope: string,
  normalizedItemId: string,
  rawSnippet: string | undefined | null,
): Promise<string> {
  const t = trimPhraseRatingLabelSnippet(rawSnippet ?? '');
  const payload = t || `${scope}:${normalizedItemId}`;
  const hex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return hex.slice(0, 32);
}

/** SHA-256 hex, первые 40 символов — как `statDocId` на сервере. */
export async function phraseRatingContentHash(scope: string, normalizedItemId: string): Promise<string> {
  const hex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${scope}:${normalizedItemId}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return hex.slice(0, 40);
}

/**
 * Ключ локального кэша: привязан к тексту подписи — после правки фразы звёзды сбрасываются как «ещё не оценено».
 */
export async function phraseRatingAsyncStorageKey(
  stableUserId: string,
  scope: PhraseContentRatingScope,
  normalizedItemId: string,
  rawSnippet: string | undefined | null,
): Promise<string> {
  const h = await phraseRatingContentHash(scope, normalizedItemId);
  const fp = await phraseRatingLabelFingerprint(scope, normalizedItemId, rawSnippet);
  return `pm_phrase_rating_v2:${stableUserId}:${h}:${fp}`;
}

export type LocalPhraseRating = {
  stars: 1 | 2 | 3;
  /** false = последняя отправка на сервер не удалась; повторим в фоне. */
  synced: boolean;
  updatedAt: number;
};

function parseLocal(raw: string | null): LocalPhraseRating | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { stars?: number; synced?: boolean; updatedAt?: number };
    const s = Math.floor(Number(j.stars));
    if (s !== 1 && s !== 2 && s !== 3) return null;
    return {
      stars: s as 1 | 2 | 3,
      synced: Boolean(j.synced),
      updatedAt: typeof j.updatedAt === 'number' ? j.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export async function readLocalPhraseRating(storageKey: string): Promise<LocalPhraseRating | null> {
  const raw = await AsyncStorage.getItem(storageKey);
  return parseLocal(raw);
}

export async function writeLocalPhraseRating(
  storageKey: string,
  stars: 1 | 2 | 3,
  synced: boolean,
): Promise<void> {
  const payload: LocalPhraseRating = { stars, synced, updatedAt: Date.now() };
  await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
}

export async function removeLocalPhraseRating(storageKey: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey);
}

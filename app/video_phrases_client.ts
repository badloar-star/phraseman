import { normalizeVideoPhraseList, type VideoPhrase } from '../shared/video_phrases_contract';

export type VideoPhraseReader = { get(path: string): Promise<unknown | null> };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function fetchPublishedVideoPhrasesWithReader(videoId: string, reader: VideoPhraseReader): Promise<readonly VideoPhrase[]> {
  const meta = record(await reader.get(`video_phrase_sets/${videoId}`));
  const activeVersion = typeof meta?.activeVersion === 'string' ? meta.activeVersion : '';
  if (!activeVersion) return [];
  const version = record(await reader.get(`video_phrase_sets/${videoId}/versions/${activeVersion}`));
  if (version?.status !== 'published') return [];
  const phrases = version?.phrases;
  if (!Array.isArray(phrases)) return [];
  try {
    return normalizeVideoPhraseList(videoId, phrases);
  } catch {
    // A malformed server payload must fail closed instead of showing or saving
    // partially trusted phrase data in the learner app.
    return [];
  }
}

export async function fetchPublishedVideoPhrases(videoId: string): Promise<readonly VideoPhrase[]> {
  const firestoreModule = await import('@react-native-firebase/firestore');
  const firestore = firestoreModule.default();
  return fetchPublishedVideoPhrasesWithReader(videoId, {
    get: async (path) => {
      const snapshot = await firestore.doc(path).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
  });
}

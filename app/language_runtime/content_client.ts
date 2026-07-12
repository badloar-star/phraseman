import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

const FUNCTIONS_REGION = 'us-central1';
const inFlight = new Map<string, Promise<PublishedLessonArtifact>>();

export type PublishedLessonArtifact = {
  readonly packId: string;
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly surface: 'lessons';
  readonly revision: number;
  readonly contentHash: string;
  readonly lessonId: number;
  readonly phrases: readonly { id: string; sourceText: string; targetText: string }[];
  readonly vocabulary: readonly { lemma: string; partOfSpeech: string; targetText: string }[];
  readonly drills: readonly { kind: string; applicable: boolean; itemCount: number }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePublishedLessonArtifact(value: unknown): PublishedLessonArtifact {
  if (!isRecord(value)) throw new Error('published_lesson_invalid');
  const phrases = value.phrases;
  const vocabulary = value.vocabulary;
  const drills = value.drills;
  const validPhrases = Array.isArray(phrases) && phrases.length === 50 && phrases.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.sourceText === 'string' && typeof item.targetText === 'string' && item.sourceText.trim() && item.targetText.trim());
  const validVocabulary = Array.isArray(vocabulary) && vocabulary.length > 0 && vocabulary.every((item) => isRecord(item) && typeof item.lemma === 'string' && typeof item.partOfSpeech === 'string' && typeof item.targetText === 'string' && item.lemma.trim() && item.partOfSpeech.trim() && item.targetText.trim());
  const validDrills = Array.isArray(drills) && drills.every((item) => isRecord(item) && typeof item.kind === 'string' && typeof item.applicable === 'boolean' && Number.isInteger(item.itemCount) && Number(item.itemCount) >= 0);
  if (
    typeof value.packId !== 'string' || !value.packId.trim()
    || typeof value.studyTarget !== 'string' || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(value.studyTarget)
    || typeof value.sourceLocale !== 'string' || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(value.sourceLocale)
    || value.surface !== 'lessons' || !Number.isInteger(value.revision) || Number(value.revision) < 1
    || typeof value.contentHash !== 'string' || !value.contentHash.trim()
    || !Number.isInteger(value.lessonId) || Number(value.lessonId) < 1 || Number(value.lessonId) > 100
    || !validPhrases || !validVocabulary || !validDrills
  ) throw new Error('published_lesson_invalid');
  return Object.freeze({
    packId: value.packId,
    studyTarget: value.studyTarget,
    sourceLocale: value.sourceLocale,
    surface: 'lessons',
    revision: Number(value.revision),
    contentHash: value.contentHash,
    lessonId: Number(value.lessonId),
    phrases: Object.freeze(phrases as PublishedLessonArtifact['phrases']),
    vocabulary: Object.freeze(vocabulary as PublishedLessonArtifact['vocabulary']),
    drills: Object.freeze(drills as PublishedLessonArtifact['drills']),
  });
}

export async function fetchPublishedLessonArtifact(
  studyTarget: string,
  sourceLocale: string,
  lessonId: number,
): Promise<PublishedLessonArtifact> {
  if (!/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(studyTarget) || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(sourceLocale) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100) {
    throw new Error('published_lesson_request_invalid');
  }
  const key = `${studyTarget}:${sourceLocale}:${lessonId}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const request = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'getPublishedLessonArtifact')({ studyTarget, sourceLocale, lessonId })
    .then((result) => {
      const artifact = parsePublishedLessonArtifact(result.data);
      if (artifact.studyTarget !== studyTarget || artifact.sourceLocale !== sourceLocale || artifact.lessonId !== lessonId) throw new Error('published_lesson_identity_mismatch');
      return artifact;
    })
    .finally(() => { inFlight.delete(key); });
  if (inFlight.size >= 20) inFlight.delete(inFlight.keys().next().value as string);
  inFlight.set(key, request);
  return request;
}

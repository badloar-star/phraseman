import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);

export type DialogueV2CatalogueStudyTarget = 'en' | 'es' | 'fr' | 'de';

/**
 * This envelope is intentionally not trusted content. Callers must pass it
 * through `projectReleasedDialogueV2Catalogue` before displaying any row.
 */
export type DialogueV2CatalogueReleaseEnvelope = Readonly<{
  ok: true;
  packets: readonly unknown[];
}>;

/** Callable failures may disclose release-operational details; do not expose them in UI. */
export class DialogueV2CatalogueUnavailableError extends Error {
  constructor(message = 'catalogue_release_unavailable') {
    super(message);
    this.name = 'DialogueV2CatalogueUnavailableError';
  }
}

type PlainRecord = Record<string, unknown>;

function plainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string')) return null;
    for (const descriptor of Object.values(descriptors)) {
      if (!descriptor.enumerable || !('value' in descriptor)) return null;
    }
    return value as PlainRecord;
  } catch {
    return null;
  }
}

function hasExactKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function safeStudyTarget(value: unknown): value is DialogueV2CatalogueStudyTarget {
  return typeof value === 'string' && STUDY_TARGETS.has(value);
}

function safeEnvelope(value: unknown): DialogueV2CatalogueReleaseEnvelope | null {
  const envelope = plainRecord(value);
  if (!envelope || !hasExactKeys(envelope, ['ok', 'packets']) || envelope.ok !== true) {
    return null;
  }
  if (!Array.isArray(envelope.packets) || Object.getPrototypeOf(envelope.packets) !== Array.prototype) {
    return null;
  }
  return Object.freeze({
    ok: true,
    packets: Object.freeze([...envelope.packets]),
  });
}

/**
 * Fetches only a server-authorized V2 release candidate for one learning
 * language. This request never carries rank, ownership, subscription, usage,
 * transcript or audio data; those concerns cannot alter catalogue release.
 */
export async function fetchReleasedDialogueV2Catalogue(
  studyTarget: DialogueV2CatalogueStudyTarget,
): Promise<DialogueV2CatalogueReleaseEnvelope | null> {
  if (!safeStudyTarget(studyTarget)) return null;

  try {
    await initFirebaseAppCheckIfAvailable();
    const callable = httpsCallable<Readonly<{ studyTarget: DialogueV2CatalogueStudyTarget }>, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2Catalogue',
    );
    const response = await callable(Object.freeze({ studyTarget }));
    return safeEnvelope(response.data);
  } catch {
    throw new DialogueV2CatalogueUnavailableError();
  }
}

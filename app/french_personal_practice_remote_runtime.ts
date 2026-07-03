import * as Crypto from 'expo-crypto';

import {
  getFrenchStudyTargetServerPackRegistrations,
  normalizeFrenchTargetSourceLocale,
  type FrenchTargetSourceLocale,
} from './french_target_remote_registration';
import type { TrainerItem } from './trainer_store';

type FrenchPersonalPracticeEntry = {
  entryId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  lessonId?: number;
  phraseId?: string;
  sourceText?: string;
  targetText?: string;
  promptSourceText?: string;
  acceptedAnswer?: string;
  grammarClusterId?: string;
  practiceType?: string;
  targetLanguageAnswerRequired?: string;
};

type FrenchPersonalPracticePayload = {
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  entries?: FrenchPersonalPracticeEntry[];
};

type FrenchPersonalPracticeManifest = {
  sha256?: string;
  payloadSha256?: string;
  payloadShard?: string;
  serverPathPreview?: string;
};

const LOAD_TIMEOUT_MS = 8000;
const payloadCache = new Map<FrenchTargetSourceLocale, Promise<readonly TrainerItem[]>>();
const resolvedPayloadCache = new Map<FrenchTargetSourceLocale, readonly TrainerItem[]>();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T | null>;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await withTimeout(fetch(url), LOAD_TIMEOUT_MS);
    if (!response || !response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function basename(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/\\/g, '/').split('?')[0].split('#')[0];
  const last = clean.split('/').filter(Boolean).pop();
  return last || null;
}

function payloadCandidates(manifest: FrenchPersonalPracticeManifest): string[] {
  return [
    basename(manifest.payloadShard),
    basename(manifest.serverPathPreview),
    typeof manifest.sha256 === 'string' ? `${manifest.sha256}.json` : null,
  ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);
}

async function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

function categoryForCluster(cluster?: string): TrainerItem['category'] {
  const normalized = (cluster || '').toLowerCase();
  if (normalized.includes('etre') || normalized.includes('être') || normalized.includes('agreement')) return 'to-be';
  if (normalized.includes('preposition')) return 'preposition';
  if (normalized.includes('pronoun')) return 'pronoun';
  if (normalized.includes('article') || normalized.includes('determiner')) return 'determiner';
  if (normalized.includes('modal')) return 'modal';
  if (normalized.includes('adverb')) return 'adverb';
  if (normalized.includes('adjective')) return 'adjective';
  if (normalized.includes('noun')) return 'noun';
  if (normalized.includes('syntax') || normalized.includes('word_order')) return 'syntax';
  return 'verb';
}

function entryToTrainerItem(entry: FrenchPersonalPracticeEntry): TrainerItem | null {
  const sourceLocale = normalizeFrenchTargetSourceLocale(entry.sourceLocale);
  const target = (entry.acceptedAnswer || entry.targetText || '').trim();
  const source = (entry.promptSourceText || entry.sourceText || '').trim();
  if (
    entry.studyTarget !== 'fr' ||
    entry.surface !== 'personal_practice' ||
    !sourceLocale ||
    typeof entry.lessonId !== 'number' ||
    typeof entry.phraseId !== 'string' ||
    entry.targetLanguageAnswerRequired !== 'fr' ||
    !target ||
    !source
  ) {
    return null;
  }

  return {
    key: target,
    queue: 'phrases',
    translationRu: sourceLocale === 'ru' ? source : '',
    translationUk: sourceLocale === 'uk' ? source : '',
    sourceLocales: { [sourceLocale]: source },
    errorWord: target.split(/\s+/).find(Boolean),
    lessonId: entry.lessonId,
    category: categoryForCluster(entry.grammarClusterId),
    grammarTag: entry.grammarClusterId || entry.practiceType,
    mistakeCount: 1,
    correctStreak: 0,
    nextDue: Date.now(),
    createdAt: Date.now(),
    archived: false,
  };
}

async function loadFrenchPersonalPracticePayload(sourceLocale: FrenchTargetSourceLocale): Promise<readonly TrainerItem[]> {
  const registration = getFrenchStudyTargetServerPackRegistrations(sourceLocale)
    .find((item) => item.surface === 'personal_practice');
  if (!registration) return [];

  const manifestText = await fetchText(registration.manifestUrl);
  if (!manifestText) return [];

  let manifest: FrenchPersonalPracticeManifest;
  try {
    manifest = JSON.parse(manifestText) as FrenchPersonalPracticeManifest;
  } catch {
    return [];
  }

  const expectedHash = (manifest.payloadSha256 || manifest.sha256 || '').toLowerCase();
  for (const payloadName of payloadCandidates(manifest)) {
    const payloadText = await fetchText(registration.rowUrl(payloadName));
    if (!payloadText) continue;
    if (expectedHash) {
      const actualHash = (await sha256(payloadText)).toLowerCase();
      if (actualHash !== expectedHash) continue;
    }
    let payload: FrenchPersonalPracticePayload;
    try {
      payload = JSON.parse(payloadText) as FrenchPersonalPracticePayload;
    } catch {
      continue;
    }
    if (payload.studyTarget !== 'fr' || payload.sourceLocale !== sourceLocale || payload.surface !== 'personal_practice') {
      continue;
    }
    return Object.freeze((payload.entries ?? [])
      .map(entryToTrainerItem)
      .filter((item): item is TrainerItem => !!item));
  }

  return [];
}

export function prefetchFrenchRemotePersonalPractice(sourceLocaleInput: unknown): void {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  if (!payloadCache.has(sourceLocale)) {
    const task = loadFrenchPersonalPracticePayload(sourceLocale)
      .then((rows) => {
        resolvedPayloadCache.set(sourceLocale, rows);
        return rows;
      })
      .catch(() => {
        resolvedPayloadCache.set(sourceLocale, []);
        return [];
      });
    payloadCache.set(sourceLocale, task);
  }
}

export async function ensureFrenchRemotePersonalPractice(sourceLocaleInput: unknown): Promise<void> {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  prefetchFrenchRemotePersonalPractice(sourceLocale);
  await payloadCache.get(sourceLocale);
}

export function getCachedFrenchRemotePersonalPractice(sourceLocaleInput: unknown): TrainerItem[] {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  return [...(resolvedPayloadCache.get(sourceLocale) ?? [])];
}

export default function __FrenchPersonalPracticeRemoteRuntimeRouteShim() {
  return null;
}

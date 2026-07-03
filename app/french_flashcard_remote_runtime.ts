import * as Crypto from 'expo-crypto';

import {
  getFrenchStudyTargetServerPackRegistrations,
  normalizeFrenchTargetSourceLocale,
  type FrenchTargetSourceLocale,
} from './french_target_remote_registration';
import type { CardItem } from './flashcards/types';

type FrenchFlashcardEntry = {
  entryId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  lessonId?: number;
  phraseId?: string;
  sourceText?: string;
  targetText?: string;
  front?: string;
  back?: string;
  hintGrammarCluster?: string;
};

type FrenchFlashcardPayload = {
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  entries?: FrenchFlashcardEntry[];
};

type FrenchFlashcardManifest = {
  sha256?: string;
  payloadSha256?: string;
  payloadShard?: string;
  serverPathPreview?: string;
};

const LOAD_TIMEOUT_MS = 8000;
const payloadCache = new Map<FrenchTargetSourceLocale, Promise<readonly CardItem[]>>();
const resolvedPayloadCache = new Map<FrenchTargetSourceLocale, readonly CardItem[]>();

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

function payloadCandidates(manifest: FrenchFlashcardManifest): string[] {
  return [
    basename(manifest.payloadShard),
    basename(manifest.serverPathPreview),
    typeof manifest.sha256 === 'string' ? `${manifest.sha256}.json` : null,
  ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);
}

async function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

function entryToCard(entry: FrenchFlashcardEntry): CardItem | null {
  const sourceLocale = normalizeFrenchTargetSourceLocale(entry.sourceLocale);
  const front = (entry.back || entry.targetText || '').trim();
  const sourceText = (entry.front || entry.sourceText || '').trim();
  if (
    entry.studyTarget !== 'fr' ||
    entry.surface !== 'flashcard' ||
    !sourceLocale ||
    typeof entry.lessonId !== 'number' ||
    typeof entry.phraseId !== 'string' ||
    !front ||
    !sourceText
  ) {
    return null;
  }

  return {
    id: entry.entryId || `fr-${sourceLocale}-${entry.phraseId}-flashcard`,
    en: front,
    ru: sourceLocale === 'ru' ? sourceText : '',
    uk: sourceLocale === 'uk' ? sourceText : '',
    sourceLocales: { [sourceLocale]: sourceText },
    description: entry.hintGrammarCluster,
    categoryId: 'situations',
    isSystem: true,
    source: 'lesson',
    sourceId: `lesson:${entry.lessonId}`,
    level: entry.lessonId <= 10 ? 'A1' : entry.lessonId <= 20 ? 'A2' : entry.lessonId <= 28 ? 'B1' : 'B2',
  };
}

async function loadFrenchFlashcardPayload(sourceLocale: FrenchTargetSourceLocale): Promise<readonly CardItem[]> {
  const registration = getFrenchStudyTargetServerPackRegistrations(sourceLocale)
    .find((item) => item.surface === 'flashcard');
  if (!registration) return [];

  const manifestText = await fetchText(registration.manifestUrl);
  if (!manifestText) return [];

  let manifest: FrenchFlashcardManifest;
  try {
    manifest = JSON.parse(manifestText) as FrenchFlashcardManifest;
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
    let payload: FrenchFlashcardPayload;
    try {
      payload = JSON.parse(payloadText) as FrenchFlashcardPayload;
    } catch {
      continue;
    }
    if (payload.studyTarget !== 'fr' || payload.sourceLocale !== sourceLocale || payload.surface !== 'flashcard') {
      continue;
    }
    return Object.freeze((payload.entries ?? [])
      .map(entryToCard)
      .filter((item): item is CardItem => !!item));
  }

  return [];
}

export function prefetchFrenchRemoteFlashcards(sourceLocaleInput: unknown): void {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  if (!payloadCache.has(sourceLocale)) {
    const task = loadFrenchFlashcardPayload(sourceLocale)
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

export async function ensureFrenchRemoteFlashcards(sourceLocaleInput: unknown): Promise<void> {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  prefetchFrenchRemoteFlashcards(sourceLocale);
  await payloadCache.get(sourceLocale);
}

export function getCachedFrenchRemoteFlashcards(sourceLocaleInput: unknown): CardItem[] {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  return [...(resolvedPayloadCache.get(sourceLocale) ?? [])];
}

export default function __FrenchFlashcardRemoteRuntimeRouteShim() {
  return null;
}

import * as Crypto from 'expo-crypto';

import type { LessonPhrase, LessonWord } from './lesson_data_types';
import {
  getFrenchStudyTargetServerPackRegistrations,
  normalizeFrenchTargetSourceLocale,
  type FrenchTargetSourceLocale,
} from './french_target_remote_registration';

type FrenchLessonPayloadEntry = {
  entryId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  lessonId?: number;
  phraseId?: string;
  sourceText?: string;
  targetText?: string;
  englishBase?: string;
};

type FrenchLessonPayload = {
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  entries?: FrenchLessonPayloadEntry[];
};

type FrenchLessonManifest = {
  sha256?: string;
  payloadSha256?: string;
  payloadShard?: string;
  serverPathPreview?: string;
};

const LOAD_TIMEOUT_MS = 8000;
const payloadCache = new Map<FrenchTargetSourceLocale, Promise<readonly LessonPhrase[]>>();

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

function payloadCandidates(manifest: FrenchLessonManifest): string[] {
  return [
    basename(manifest.payloadShard),
    basename(manifest.serverPathPreview),
    typeof manifest.sha256 === 'string' ? `${manifest.sha256}.json` : null,
  ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);
}

async function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

function wordsFromFrenchSurface(surface: string): LessonWord[] {
  const tokens = surface
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((text) => text.trim())
    .filter(Boolean);

  return tokens.map((text, index) => {
    const localDistractors = tokens.filter((token, tokenIndex) => tokenIndex !== index && token !== text);
    const distractors = [...localDistractors, 'je', 'tu', 'nous', 'pas', 'ici']
      .filter((token, tokenIndex, arr) => token !== text && arr.indexOf(token) === tokenIndex)
      .slice(0, 5);
    return { text, correct: text, distractors };
  });
}

function entryToLessonPhrase(entry: FrenchLessonPayloadEntry): LessonPhrase | null {
  if (
    entry.studyTarget !== 'fr' ||
    entry.surface !== 'lesson' ||
    typeof entry.lessonId !== 'number' ||
    typeof entry.phraseId !== 'string' ||
    typeof entry.sourceText !== 'string' ||
    typeof entry.targetText !== 'string' ||
    !entry.targetText.trim()
  ) {
    return null;
  }

  const wordsFr = wordsFromFrenchSurface(entry.targetText);
  if (wordsFr.length === 0) return null;

  const sourceLocale = normalizeFrenchTargetSourceLocale(entry.sourceLocale);
  return {
    id: entry.phraseId,
    english: entry.englishBase?.trim() || entry.targetText,
    russian: sourceLocale === 'ru' ? entry.sourceText : entry.englishBase?.trim() || entry.sourceText,
    ukrainian: sourceLocale === 'uk' ? entry.sourceText : entry.englishBase?.trim() || entry.sourceText,
    sourceLocales: sourceLocale ? { [sourceLocale]: entry.sourceText } : undefined,
    french: entry.targetText,
    words: wordsFr,
    wordsFr,
  };
}

async function loadFrenchLessonPayload(sourceLocale: FrenchTargetSourceLocale): Promise<readonly LessonPhrase[]> {
  const registration = getFrenchStudyTargetServerPackRegistrations(sourceLocale)
    .find((item) => item.surface === 'lesson');
  if (!registration) return [];

  const manifestText = await fetchText(registration.manifestUrl);
  if (!manifestText) return [];

  let manifest: FrenchLessonManifest;
  try {
    manifest = JSON.parse(manifestText) as FrenchLessonManifest;
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
    let payload: FrenchLessonPayload;
    try {
      payload = JSON.parse(payloadText) as FrenchLessonPayload;
    } catch {
      continue;
    }
    if (payload.studyTarget !== 'fr' || payload.sourceLocale !== sourceLocale || payload.surface !== 'lesson') {
      continue;
    }
    return Object.freeze((payload.entries ?? [])
      .map(entryToLessonPhrase)
      .filter((item): item is LessonPhrase => !!item));
  }

  return [];
}

export async function loadFrenchRemoteLessonRows(
  lessonId: number,
  sourceLocaleInput: unknown,
): Promise<LessonPhrase[]> {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  if (!payloadCache.has(sourceLocale)) {
    payloadCache.set(sourceLocale, loadFrenchLessonPayload(sourceLocale));
  }
  const rows = await payloadCache.get(sourceLocale)!;
  return rows.filter((row) => {
    if (typeof row.id !== 'string') return false;
    return row.id.startsWith(`lesson${lessonId}_phrase_`);
  });
}

export default function __FrenchLessonRemoteRuntimeRouteShim() {
  return null;
}

import * as Crypto from 'expo-crypto';

import type { DailyPhrase } from './daily_phrase_system';
import {
  getFrenchStudyTargetServerPackRegistrations,
  normalizeFrenchTargetSourceLocale,
  type FrenchTargetSourceLocale,
} from './french_target_remote_registration';

type FrenchDailyPhraseEntry = {
  id?: string;
  order?: number;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  targetText?: string;
  english?: string;
  literal?: string;
  meaning?: string;
  text?: string;
  literal_ru?: string;
  meaning_ru?: string;
  text_ru?: string;
  literal_uk?: string;
  meaning_uk?: string;
  text_uk?: string;
  allowSave?: boolean;
  active?: boolean;
  activationApproved?: boolean;
  scheduledDate?: string;
};

type FrenchDailyPhrasePayload = {
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  entries?: FrenchDailyPhraseEntry[];
};

type FrenchDailyPhraseManifest = {
  sha256?: string;
  payloadSha256?: string;
  payloadShard?: string;
  serverPathPreview?: string;
  entryIndex?: string;
};

const LOAD_TIMEOUT_MS = 8000;
const payloadCache = new Map<FrenchTargetSourceLocale, Promise<readonly DailyPhrase[]>>();
const resolvedPayloadCache = new Map<FrenchTargetSourceLocale, readonly DailyPhrase[]>();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
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
  if (typeof value !== 'string' || !value.trim()) return null;
  const clean = value.replace(/\\/g, '/').split('/').filter(Boolean).pop();
  return clean || null;
}

function payloadCandidates(manifest: FrenchDailyPhraseManifest): string[] {
  return [
    basename(manifest.payloadShard),
    basename(manifest.serverPathPreview),
    basename(manifest.entryIndex),
    typeof manifest.sha256 === 'string' ? `${manifest.sha256}.json` : null,
  ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);
}

async function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

function pickSourceText(entry: FrenchDailyPhraseEntry, sourceLocale: FrenchTargetSourceLocale, base: 'literal' | 'meaning' | 'text'): string {
  const localizedKey = `${base}_${sourceLocale}` as keyof FrenchDailyPhraseEntry;
  const localized = entry[localizedKey];
  const fallback = entry[base];
  return (typeof localized === 'string' && localized.trim())
    ? localized.trim()
    : (typeof fallback === 'string' ? fallback.trim() : '');
}

export function entryToFrenchDailyPhrase(
  entry: FrenchDailyPhraseEntry,
  date: string,
): DailyPhrase | null {
  const sourceLocale = normalizeFrenchTargetSourceLocale(entry.sourceLocale);
  const targetText = (entry.targetText || entry.english || '').trim();
  if (
    entry.studyTarget !== 'fr' ||
    entry.surface !== 'daily_phrase' ||
    !sourceLocale ||
    !targetText
  ) {
    return null;
  }
  const literalRu = (entry.literal_ru || entry.literal || '').trim();
  const meaningRu = (entry.meaning_ru || entry.meaning || '').trim();
  const textRu = (entry.text_ru || entry.text || '').trim();
  const literalUk = (entry.literal_uk || '').trim();
  const meaningUk = (entry.meaning_uk || '').trim();
  const textUk = (entry.text_uk || '').trim();
  const literal = pickSourceText(entry, sourceLocale, 'literal');
  const meaning = pickSourceText(entry, sourceLocale, 'meaning');
  const text = pickSourceText(entry, sourceLocale, 'text');
  if (!literal || !meaning || !text || !literalRu || !meaningRu || !textRu || !literalUk || !meaningUk || !textUk) {
    return null;
  }
  return {
    id: entry.id || `fr-daily-pack-${targetText}`,
    english: targetText,
    literal,
    meaning,
    text,
    literal_uk: literalUk,
    meaning_uk: meaningUk,
    text_uk: textUk,
    sourceLocales: undefined,
    date,
    scheduledDate: entry.scheduledDate || date,
    allowSave: entry.allowSave !== false,
    active: entry.active !== false,
    order: typeof entry.order === 'number' ? entry.order : undefined,
  };
}

async function loadFrenchDailyPhrasePayload(sourceLocale: FrenchTargetSourceLocale): Promise<readonly DailyPhrase[]> {
  const registration = getFrenchStudyTargetServerPackRegistrations(sourceLocale)
    .find((item) => item.surface === 'daily_phrase');
  if (!registration) return [];

  const manifestText = await fetchText(registration.manifestUrl);
  if (!manifestText) return [];

  let manifest: FrenchDailyPhraseManifest;
  try {
    manifest = JSON.parse(manifestText) as FrenchDailyPhraseManifest;
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
    let payload: FrenchDailyPhrasePayload;
    try {
      payload = JSON.parse(payloadText) as FrenchDailyPhrasePayload;
    } catch {
      continue;
    }
    if (payload.studyTarget !== 'fr' || payload.sourceLocale !== sourceLocale || payload.surface !== 'daily_phrase') {
      continue;
    }
    const today = new Date().toISOString().split('T')[0]!;
    return Object.freeze((payload.entries ?? [])
      .map((entry) => entryToFrenchDailyPhrase(entry, today))
      .filter((item): item is DailyPhrase => !!item));
  }

  return [];
}

export function prefetchFrenchRemoteDailyPhrases(sourceLocaleInput: unknown): void {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  if (!payloadCache.has(sourceLocale)) {
    const task = loadFrenchDailyPhrasePayload(sourceLocale)
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

export async function ensureFrenchRemoteDailyPhrases(sourceLocaleInput: unknown): Promise<void> {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  prefetchFrenchRemoteDailyPhrases(sourceLocale);
  await payloadCache.get(sourceLocale);
}

export function getCachedFrenchRemoteDailyPhraseForDay(
  sourceLocaleInput: unknown,
  dayIndex: number,
  date: string,
): DailyPhrase | null {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  const rows = resolvedPayloadCache.get(sourceLocale);
  if (!rows?.length) return null;
  const row = rows[Math.abs(dayIndex) % rows.length];
  return row ? { ...row, date, scheduledDate: date } : null;
}

export default function __FrenchDailyPhraseRemoteRuntimeRouteShim() {
  return null;
}

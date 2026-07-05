import * as Crypto from 'expo-crypto';

import {
  getFrenchStudyTargetServerPackRegistrations,
  normalizeFrenchTargetSourceLocale,
  type FrenchTargetSourceLocale,
} from './french_target_remote_registration';
import type { FlashcardMarketPack } from './flashcards/marketplace';
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
  entries?: Array<{
    sourceLocale?: string;
    surface?: string;
    payloadKind?: string;
    serverPath?: string;
    localArtifactSha256?: string;
  }>;
};

type FrenchMarketplacePayloadCard = {
  id?: string;
  targetText?: string;
  meaning?: string;
  literal?: string;
  explanation?: string;
  exampleFr?: string;
  exampleMeaning?: string;
  register?: string;
  level?: string;
};

type FrenchMarketplacePayloadPack = {
  id?: string;
  codeName?: string;
  title?: string;
  description?: string;
  category?: string;
  priceShards?: number;
  cardCount?: number;
  cards?: FrenchMarketplacePayloadCard[];
};

type FrenchMarketplacePayload = {
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  payloadKind?: string;
  contentVersion?: string;
  packs?: FrenchMarketplacePayloadPack[];
};

type FrenchMarketplaceRuntimePack = FlashcardMarketPack & {
  sourceLocale: FrenchTargetSourceLocale;
  cards: CardItem[];
};

const LOAD_TIMEOUT_MS = 8000;
const payloadCache = new Map<FrenchTargetSourceLocale, Promise<readonly CardItem[]>>();
const resolvedPayloadCache = new Map<FrenchTargetSourceLocale, readonly CardItem[]>();
const marketplacePayloadCache = new Map<FrenchTargetSourceLocale, Promise<readonly FrenchMarketplaceRuntimePack[]>>();
const resolvedMarketplacePackCache = new Map<FrenchTargetSourceLocale, readonly FrenchMarketplaceRuntimePack[]>();
const FRENCH_MARKETPLACE_PAYLOAD_KIND = 'official_marketplace_packs';

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
  const fromEntries = Array.isArray(manifest.entries)
    ? manifest.entries
        .filter((entry) => (
          entry.surface === 'flashcard' &&
          entry.payloadKind === FRENCH_MARKETPLACE_PAYLOAD_KIND &&
          typeof entry.serverPath === 'string'
        ))
        .map((entry) => {
          const marker = '/flashcard/';
          const index = entry.serverPath!.indexOf(marker);
          if (index < 0) return null;
          const rest = entry.serverPath!.slice(index + marker.length);
          const segments = rest.split('/').filter(Boolean);
          return segments.length >= 3 ? segments.slice(1).join('/') : null;
        })
    : [];
  return [
    ...fromEntries,
    basename(manifest.payloadShard),
    basename(manifest.serverPathPreview),
    typeof manifest.sha256 === 'string' ? `${manifest.sha256}.json` : null,
  ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);
}

function expectedHashForPayload(manifest: FrenchFlashcardManifest, payloadName: string): string {
  const entry = Array.isArray(manifest.entries)
    ? manifest.entries.find((item) => typeof item.serverPath === 'string' && item.serverPath.endsWith(payloadName))
    : null;
  return String(entry?.localArtifactSha256 || manifest.payloadSha256 || manifest.sha256 || '').toLowerCase();
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
    const hashForPayload = expectedHashForPayload(manifest, payloadName) || expectedHash;
    if (hashForPayload) {
      const actualHash = (await sha256(payloadText)).toLowerCase();
      if (actualHash !== hashForPayload) continue;
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

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function marketplaceCardToItem(packId: string, sourceLocale: FrenchTargetSourceLocale, card: FrenchMarketplacePayloadCard): CardItem | null {
  const targetText = clean(card.targetText);
  const meaning = clean(card.meaning);
  const id = clean(card.id);
  if (!id || !targetText || !meaning) return null;
  return {
    id,
    en: targetText,
    ru: sourceLocale === 'ru' ? meaning : '',
    uk: sourceLocale === 'uk' ? meaning : '',
    sourceLocales: { [sourceLocale]: meaning },
    literalRu: sourceLocale === 'ru' ? clean(card.literal) : undefined,
    literalUk: sourceLocale === 'uk' ? clean(card.literal) : undefined,
    explanationRu: sourceLocale === 'ru' ? clean(card.explanation) : undefined,
    explanationUk: sourceLocale === 'uk' ? clean(card.explanation) : undefined,
    exampleEn: clean(card.exampleFr),
    exampleRu: sourceLocale === 'ru' ? clean(card.exampleMeaning) : undefined,
    exampleUk: sourceLocale === 'uk' ? clean(card.exampleMeaning) : undefined,
    register: clean(card.register),
    level: clean(card.level),
    categoryId: 'situations',
    isSystem: true,
    source: 'lesson',
    sourceId: `DEV:${packId}`,
  };
}

function marketplacePackFromPayload(
  sourceLocale: FrenchTargetSourceLocale,
  pack: FrenchMarketplacePayloadPack,
  contentVersion: string,
): FrenchMarketplaceRuntimePack | null {
  const id = clean(pack.id);
  const title = clean(pack.title);
  const description = clean(pack.description);
  if (!id || !title || !description) return null;
  const cards = (pack.cards ?? [])
    .map((item) => marketplaceCardToItem(id, sourceLocale, item))
    .filter((item): item is CardItem => !!item);
  if (cards.length === 0) return null;
  return {
    id,
    codeName: clean(pack.codeName) || id,
    titleRu: sourceLocale === 'ru' ? title : '',
    titleUk: sourceLocale === 'uk' ? title : '',
    titleEs: '',
    descriptionRu: sourceLocale === 'ru' ? description : '',
    descriptionUk: sourceLocale === 'uk' ? description : '',
    descriptionEs: '',
    category: pack.category === 'business' || pack.category === 'travel' || pack.category === 'exam' || pack.category === 'slang' || pack.category === 'verbs'
      ? pack.category
      : 'daily',
    cardCount: cards.length,
    priceShards: Number.isFinite(pack.priceShards) ? Math.max(0, Math.floor(Number(pack.priceShards))) : 15,
    salesCount: 0,
    authorName: 'Phraseman',
    isOfficial: true,
    studyTarget: 'fr',
    listingStatus: 'published',
    updatedAt: contentVersion || new Date(0).toISOString(),
    sourceLocale,
    cards,
  };
}

export function parseFrenchMarketplacePayload(
  text: string,
  sourceLocaleInput: unknown,
): readonly FrenchMarketplaceRuntimePack[] {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput);
  if (!sourceLocale) return [];
  let payload: FrenchMarketplacePayload;
  try {
    payload = JSON.parse(text) as FrenchMarketplacePayload;
  } catch {
    return [];
  }
  if (
    payload.studyTarget !== 'fr' ||
    payload.sourceLocale !== sourceLocale ||
    payload.surface !== 'flashcard' ||
    payload.payloadKind !== FRENCH_MARKETPLACE_PAYLOAD_KIND
  ) {
    return [];
  }
  return Object.freeze((payload.packs ?? [])
    .map((pack) => marketplacePackFromPayload(sourceLocale, pack, clean(payload.contentVersion)))
    .filter((pack): pack is FrenchMarketplaceRuntimePack => !!pack));
}

export function primeFrenchFlashcardMarketplaceFromPayload(text: string, sourceLocaleInput: unknown): readonly FlashcardMarketPack[] {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  const packs = parseFrenchMarketplacePayload(text, sourceLocale);
  resolvedMarketplacePackCache.set(sourceLocale, packs);
  return packs;
}

async function loadFrenchMarketplacePayload(sourceLocale: FrenchTargetSourceLocale): Promise<readonly FrenchMarketplaceRuntimePack[]> {
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

  for (const payloadName of payloadCandidates(manifest)) {
    const payloadText = await fetchText(registration.rowUrl(payloadName));
    if (!payloadText) continue;
    const expectedHash = expectedHashForPayload(manifest, payloadName);
    if (expectedHash) {
      const actualHash = (await sha256(payloadText)).toLowerCase();
      if (actualHash !== expectedHash) continue;
    }
    const packs = parseFrenchMarketplacePayload(payloadText, sourceLocale);
    if (packs.length > 0) return packs;
  }

  return [];
}

export function prefetchFrenchRemoteMarketplacePacks(sourceLocaleInput: unknown): void {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  if ((resolvedMarketplacePackCache.get(sourceLocale) ?? []).length > 0) return;
  if (!marketplacePayloadCache.has(sourceLocale)) {
    const task = loadFrenchMarketplacePayload(sourceLocale)
      .then((packs) => {
        resolvedMarketplacePackCache.set(sourceLocale, packs);
        return packs;
      })
      .catch(() => {
        resolvedMarketplacePackCache.set(sourceLocale, []);
        return [];
      });
    marketplacePayloadCache.set(sourceLocale, task);
  }
}

export async function ensureFrenchRemoteMarketplacePacks(sourceLocaleInput: unknown): Promise<void> {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  prefetchFrenchRemoteMarketplacePacks(sourceLocale);
  await marketplacePayloadCache.get(sourceLocale);
}

export function getCachedFrenchRemoteMarketplacePacks(sourceLocaleInput: unknown): FlashcardMarketPack[] {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  return [...(resolvedMarketplacePackCache.get(sourceLocale) ?? [])];
}

export function buildFrenchMarketplaceOwnedCards(
  ownedPacks: readonly FlashcardMarketPack[],
  sourceLocaleInput?: unknown,
): CardItem[] {
  const sourceLocale = normalizeFrenchTargetSourceLocale(sourceLocaleInput) ?? 'ru';
  const runtimeById = new Map((resolvedMarketplacePackCache.get(sourceLocale) ?? []).map((pack) => [pack.id, pack]));
  return ownedPacks.flatMap((pack) => {
    const runtimePack = runtimeById.get(pack.id) ?? (pack as FrenchMarketplaceRuntimePack);
    return Array.isArray(runtimePack.cards) ? runtimePack.cards : [];
  });
}

export function __resetFrenchFlashcardMarketplaceRuntimeForTests(): void {
  marketplacePayloadCache.clear();
  resolvedMarketplacePackCache.clear();
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

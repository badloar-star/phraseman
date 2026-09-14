/**
 * Свои наборы «на устройстве» (Cards 2.1 / решение владельца 2026-08-13).
 *
 * зачем: кнопка в редакторе набора называется «Сохранить» и обязана СОХРАНЯТЬ —
 * набор должен появиться у пользователя сразу, а не «когда-нибудь после модерации».
 * Публикация в сообщество осталась серверной (модерация), но она больше не
 * определяет, увидит ли автор свой набор: локальная копия пишется всегда и
 * доступна и в «Мои наборы», и в коллекции (`?pack=<id>`).
 *
 * Дубликаты: когда серверная копия того же набора становится опубликованной,
 * `mergeLocalAuthorPacks` прячет локальную (сравнение по автору + названию).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { flashcardsLocalAuthorPacksKey, storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import type { CardItem } from '../flashcards/types';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { derivePackCodeName } from '../flashcards/marketplace';
import { communityPackCardsToCardItems } from './communityFirestore';
import type { CommunityPackCardPayload, CommunityPackSubmissionPayload } from './schema';
import { normalizePackLanguage, type PackLanguage } from '../flashcards/pack_languages';
import { captureAccountGeneration, isCurrentAccountGeneration, withAccountTransitionLock } from '../account_generation';

export const LOCAL_AUTHOR_PACK_ID_PREFIX = 'local_pack_';

export type LocalAuthorPack = {
  v: 1;
  id: string;
  title: string;
  description: string;
  cardThemeKey: string;
  cardBackKey: string;
  cards: CommunityPackCardPayload[];
  /** Independent language of the phrases in this pack; legacy local packs are English. */
  packLanguage?: PackLanguage;
  isPublic?: boolean;
  studyTarget?: 'en' | 'fr';
  cloudPackId?: string;
  publicationKey?: string;
  publicationState?: 'private' | 'pending' | 'submitted';
  authorStableId?: string;
  createdAt: number;
  updatedAt: number;
};

export function isLocalAuthorPackId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(LOCAL_AUTHOR_PACK_ID_PREFIX);
}

function parsePacks(raw: string | null): LocalAuthorPack[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is LocalAuthorPack =>
        !!p && typeof p === 'object' && typeof (p as LocalAuthorPack).id === 'string' && Array.isArray((p as LocalAuthorPack).cards),
    );
  } catch {
    return [];
  }
}

async function readPacksForTarget(studyTarget?: RuntimeStudyTarget): Promise<LocalAuthorPack[]> {
  try {
    return parsePacks(await AsyncStorage.getItem(flashcardsLocalAuthorPacksKey(studyTarget)));
  } catch {
    return [];
  }
}

/** Pack languages are independent from the course; retain the original write location. */
export async function loadLocalAuthorPacks(_studyTarget?: RuntimeStudyTarget): Promise<LocalAuthorPack[]> {
  const token = captureAccountGeneration();
  const lists = await Promise.all((['en', 'fr'] as const).map(async studyTarget =>
    (await readPacksForTarget(studyTarget)).map(pack => ({ ...pack, studyTarget }))));
  return isCurrentAccountGeneration(token) ? lists.flat() : [];
}

let localPackWrites: Promise<unknown> = Promise.resolve();
let localPackSequence = 0;
function serializePackWrite<T>(operation: () => Promise<T>): Promise<T> {
  const token = captureAccountGeneration();
  const result = localPackWrites.then(() => withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token)) throw new Error('Account changed');
    return operation();
  }));
  localPackWrites = result.catch(() => undefined);
  return result;
}

async function writePacks(packs: LocalAuthorPack[], studyTarget?: RuntimeStudyTarget): Promise<void> {
  await AsyncStorage.setItem(flashcardsLocalAuthorPacksKey(studyTarget), JSON.stringify(packs));
}

/** Сохранить/обновить набор на устройстве. Возвращает id локальной копии. */
export async function saveLocalAuthorPack(
  payload: CommunityPackSubmissionPayload,
  opts?: { packId?: string; authorStableId?: string; studyTarget?: RuntimeStudyTarget; cloudPackId?: string },
): Promise<string> {
  return serializePackWrite(async () => {
  const now = Date.now();
  const previous = (await loadLocalAuthorPacks()).find(pack => pack.id === opts?.packId);
  const target = previous?.studyTarget ?? storageStudyTarget(opts?.studyTarget);
  const list = await readPacksForTarget(target);
  const id = opts?.packId && opts.packId.trim().length > 0
    ? opts.packId.trim()
    : `${LOCAL_AUTHOR_PACK_ID_PREFIX}${now}_${++localPackSequence}`;
  const existing = list.find((p) => p.id === id);
  const next: LocalAuthorPack = {
    ...existing,
    v: 1,
    id,
    title: payload.title.trim(),
    description: payload.description.trim(),
    cardThemeKey: payload.cardThemeKey ?? existing?.cardThemeKey ?? '',
    cardBackKey: payload.cardBackKey ?? existing?.cardBackKey ?? '',
    cards: payload.cards,
    packLanguage: normalizePackLanguage(payload.packLanguage ?? payload.studyTarget ?? existing?.packLanguage),
    isPublic: payload.publishToCommunity !== false,
    studyTarget: target,
    cloudPackId: opts?.cloudPackId ?? existing?.cloudPackId,
    publicationKey: existing?.publicationKey ?? `${id}_${now}`,
    publicationState: payload.publishToCommunity === false ? 'private' : 'pending',
    authorStableId: opts?.authorStableId ?? existing?.authorStableId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const merged = existing ? list.map((p) => (p.id === id ? next : p)) : [...list, next];
  await writePacks(merged, target);
  return id;
  });
}

export async function updateLocalPackPublication(id: string, update: Pick<LocalAuthorPack, 'cloudPackId' | 'publicationState' | 'publicationKey' | 'isPublic'>): Promise<void> {
  return serializePackWrite(async () => {
    const pack = (await loadLocalAuthorPacks()).find(item => item.id === id);
    if (!pack) throw new Error('Local pack not found');
    const list = await readPacksForTarget(pack.studyTarget);
    await writePacks(list.map(item => item.id === id ? { ...item, ...update } : item), pack.studyTarget);
  });
}

export async function removeLocalAuthorPack(id: string, studyTarget?: RuntimeStudyTarget): Promise<void> {
  return serializePackWrite(async () => {
  const pack = (await loadLocalAuthorPacks()).find(item => item.id === id);
  const target = pack?.studyTarget ?? studyTarget;
  const list = await readPacksForTarget(target);
  if (!list.some((p) => p.id === id)) return;
  await writePacks(list.filter((p) => p.id !== id), target);
  });
}

/** Карточки локального набора в формате коллекции (`sourceId = DEV:<packId>`). */
export function localAuthorPackCardItems(pack: LocalAuthorPack): CardItem[] {
  return communityPackCardsToCardItems(pack.id, pack.cards, normalizePackLanguage(pack.packLanguage));
}

/** Метаданные локального набора в формате витрины — чтобы плитка/шапка рисовались как обычно. */
export function localAuthorPackToMarketPack(
  pack: LocalAuthorPack,
  studyTarget?: RuntimeStudyTarget,
): FlashcardMarketPack {
  const title = pack.title.trim() || derivePackCodeName(pack.id);
  const description = pack.description.trim();
  return {
    id: pack.id,
    codeName: title,
    titleRu: title,
    titleUk: title,
    titleEs: title,
    titlePtBr: title,
    titleVi: title,
    titleId: title,
    titleTr: title,
    titlePl: title,
    descriptionRu: description,
    descriptionUk: description,
    descriptionEs: description,
    descriptionPtBr: description,
    descriptionVi: description,
    descriptionId: description,
    descriptionTr: description,
    descriptionPl: description,
    category: 'slang',
    cardCount: pack.cards.length,
    priceShards: 0,
    likesCount: 0,
    addedCount: 0,
    salesCount: 0,
    /** Ник подставляет UI (`packAuthorNames.ts`) — это всегда сам автор. */
    authorName: '',
    authorStableId: pack.authorStableId,
    isOfficial: false,
    isCommunityUgc: true,
    studyTarget: storageStudyTarget(studyTarget),
    packLanguage: normalizePackLanguage(pack.packLanguage),
    listingStatus: 'local_only',
    ugcCardThemeKey: pack.cardThemeKey,
    ugcCardBackKey: pack.cardBackKey,
    updatedAt: new Date(pack.updatedAt).toISOString(),
  };
}

/**
 * Локальные копии, у которых уже есть серверный близнец (тот же автор + название),
 * скрываем — иначе после публикации набор двоился бы в «Мои наборы».
 */
export function mergeLocalAuthorPacks(
  cloudPacks: FlashcardMarketPack[],
  localPacks: LocalAuthorPack[],
  studyTarget?: RuntimeStudyTarget,
): FlashcardMarketPack[] {
  const cloudTitles = new Set(
    cloudPacks
      .filter((p) => p.isCommunityUgc)
      .map((p) => `${p.authorStableId ?? ''}|${normalizePackLanguage(p.packLanguage)}|${(p.titleRu || p.titleUk || p.titleEs || '').trim().toLowerCase()}`),
  );
  return localPacks
    .filter((p) => p.isPublic === false || !cloudTitles.has(`${p.authorStableId ?? ''}|${normalizePackLanguage(p.packLanguage)}|${p.title.trim().toLowerCase()}`))
    .map((p) => localAuthorPackToMarketPack(p, studyTarget));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

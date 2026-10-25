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
import type { StudyTarget } from '../study_target';
import { LEARNING_LANGUAGE_TARGETS } from '../learning_language_contour';
import type { CardItem } from '../flashcards/types';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { derivePackCodeName } from '../flashcards/marketplace';
import { communityPackCardsToCardItems } from './communityFirestore';
import type { CommunityPackCardPayload, CommunityPackSubmissionPayload } from './schema';
import { normalizePackLanguage, type PackLanguage } from '../flashcards/pack_languages';
import { captureAccountGeneration, isCurrentAccountGeneration, withAccountTransitionLock, type AccountGenerationToken } from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
import { normalizePackLevel, packPreviewWords, type PackLevel } from '../flashcards/pack_deck_meta';
import { BoundedScopeCache, parseStrictArrayJson } from '../flashcards/myPacksDataIntegrity';
import { noteSwallowedAs } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export const LOCAL_AUTHOR_PACK_ID_PREFIX = 'local_pack_';
export const FREE_AUTHOR_PACK_LIMIT = 3;
/** Текст ошибки сохранения при исчерпанном лимите Free — по нему экран показывает человеческий текст, а не код. */
export const FREE_AUTHOR_PACK_LIMIT_ERROR = 'free_author_pack_limit_reached';

/**
 * Сколько своих наборов у человека и упёрся ли он в лимит Free.
 *
 * зачем (координатор 11.10, Карточки 2.0): Free узнавал о лимите 3/3 только ПОСЛЕ того, как заполнил весь набор,
 * и видел сырой код ошибки. Экран «Новый набор» проверяет лимит заранее и сразу предлагает «Безлимит с Plus».
 * Считается по аккаунту на устройстве (все языки), Firestore не читается.
 */
export type AuthorPackQuota = Readonly<{
  count: number;
  /** null — без лимита (Plus). */
  limit: number | null;
  limitReached: boolean;
}>;

export function authorPackQuotaFor(count: number, isPremium: boolean): AuthorPackQuota {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  if (isPremium) return { count: safeCount, limit: null, limitReached: false };
  return { count: safeCount, limit: FREE_AUTHOR_PACK_LIMIT, limitReached: safeCount >= FREE_AUTHOR_PACK_LIMIT };
}

/** Последнее известное число своих наборов (процесс) — мгновенный первый кадр; null — ещё не считали. */
let lastKnownAuthorPackCount: number | null = null;
export function peekAuthorPackCount(): number | null {
  return lastKnownAuthorPackCount;
}

const warmPacksByKey = new BoundedScopeCache<LocalAuthorPack[]>(20);

function warmPacksKey(studyTarget: RuntimeStudyTarget, token: AccountGenerationToken): string | null {
  const scope = accountScopeKey(token);
  return scope ? `${scope}|storage:${flashcardsLocalAuthorPacksKey(studyTarget)}` : null;
}

export type LocalAuthorPack = {
  v: 1;
  id: string;
  title: string;
  description: string;
  cardThemeKey: string;
  cards: CommunityPackCardPayload[];
  /** Independent language of the phrases in this pack; legacy local packs are English. */
  packLanguage?: PackLanguage;
  isPublic?: boolean;
  /**
   * Цена набора в рунах. зачем (владелец 2026-09-21): раньше не хранилась —
   * автор открывал свой платный набор на правку, видел цену 0 и молча делал
   * набор бесплатным при сохранении.
   */
  priceRunes?: number;
  /** Уровень набора A1–C1, выбранный автором (Карточки 2.0, колода «40 · A2»); нет → не показываем. */
  level?: PackLevel;
  // зачем: поле заполняется из storageStudyTarget(), который возвращает StudyTarget
  // (все языки курса). Литерал 'en' | 'fr' был снимком двухъязычной эпохи и отстал,
  // когда добавили de/es — присваивание перестало типизироваться. Ссылаемся на
  // канонический тип, чтобы следующий язык не потребовал правки здесь снова.
  studyTarget?: StudyTarget;
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

function parsePacks(raw: string | null): LocalAuthorPacksForTargetResult {
  const parsed = parseStrictArrayJson(
    raw,
    (value): value is LocalAuthorPack => Boolean(
      value
      && typeof value === 'object'
      && typeof (value as LocalAuthorPack).id === 'string'
      && Array.isArray((value as LocalAuthorPack).cards),
    ),
  );
  return { packs: parsed.items, status: parsed.status };
}

type LocalAuthorPacksForTargetResult = {
  packs: LocalAuthorPack[];
  status: 'ready' | 'stale';
};

async function readPacksForTargetResult(
  studyTarget?: RuntimeStudyTarget,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<LocalAuthorPacksForTargetResult> {
  const key = flashcardsLocalAuthorPacksKey(studyTarget);
  const cacheKey = warmPacksKey(studyTarget, token);
  if (!cacheKey || !isCurrentAccountGeneration(token)) {
    console.warn(`[PACK-READ] stale до чтения ${JSON.stringify({ studyTarget: studyTarget ?? null, reason: !cacheKey ? 'account_not_ready' : 'account_generation_changed' })}`); // guard-ok: ранний выход называет причину
    return { packs: [], status: 'stale' };
  }
  try {
    const parsed = parsePacks(await AsyncStorage.getItem(key));
    if (!isCurrentAccountGeneration(token)) {
      console.warn(`[PACK-READ] stale после чтения ${JSON.stringify({ studyTarget: studyTarget ?? null, reason: 'account_generation_changed' })}`); // guard-ok: ранний выход называет причину
      return { packs: [], status: 'stale' };
    }
    if (parsed.status === 'ready') {
      warmPacksByKey.set(cacheKey, parsed.packs);
      return parsed;
    }
    return { packs: warmPacksByKey.get(cacheKey) ?? [], status: 'stale' };
  } catch (error: unknown) {
    // зачем (правило владельца «немой catch запрещён»; находка Ревизора 25.10): сбой хранилища уходил в 'stale' без причины —
    // в журнале шторки «В какой набор?» было не отличить «наборов нет» от «не прочиталось».
    const current = isCurrentAccountGeneration(token);
    const warm = current ? warmPacksByKey.get(cacheKey) : undefined;
    console.warn(`[PACK-READ] чтение наборов упало ${JSON.stringify({ studyTarget: studyTarget ?? null, message: error instanceof Error ? error.message : String(error), currentAccount: current, warmCache: warm?.length ?? null })} → stale`);
    return current
      ? { packs: warm ?? [], status: 'stale' }
      : { packs: [], status: 'stale' };
  }
}

async function readPacksForTarget(studyTarget?: RuntimeStudyTarget): Promise<LocalAuthorPack[]> {
  return (await readPacksForTargetResult(studyTarget)).packs;
}

/**
 * Pack languages are independent from the course; retain the original write location.
 *
 * зачем (22.09): здесь перебирались только `['en','fr']`, а цель обучения писалась
 * в СВОЙ ключ (`scopedOrLegacyKey`, target_storage_keys.ts). Набор, созданный на
 * испанском или немецком, сохранялся корректно — и не показывался НИ НА ОДНОМ
 * экране: ни в «Мои наборы», ни в выборе наборов, ни в публикации. Данные лежали
 * целыми, но для человека это неотличимо от пропажи.
 *
 * Перебираем канонический список языков курса, чтобы пятый язык не потребовал
 * править это место снова.
 */
export type LocalAuthorPacksLoadResult = {
  packs: LocalAuthorPack[];
  status: 'ready' | 'stale';
};

export async function loadLocalAuthorPacksResult(
  _studyTarget?: RuntimeStudyTarget,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<LocalAuthorPacksLoadResult> {
  const token = accountToken;
  if (!accountScopeKey(token) || !isCurrentAccountGeneration(token)) {
    console.warn(`[PACK-READ] все наборы: stale ${JSON.stringify({ reason: !accountScopeKey(token) ? 'account_not_ready' : 'account_generation_changed' })}`); // guard-ok: ранний выход называет причину
    return { packs: [], status: 'stale' };
  }
  const lists = await Promise.all(LEARNING_LANGUAGE_TARGETS.map(async studyTarget =>
    readPacksForTargetResult(studyTarget, token)));
  if (!isCurrentAccountGeneration(token)) return { packs: [], status: 'stale' };
  return {
    packs: lists.flatMap((result, index) => result.packs.map(pack => ({
      ...pack,
      studyTarget: LEARNING_LANGUAGE_TARGETS[index],
    }))),
    status: lists.every((result) => result.status === 'ready') ? 'ready' : 'stale',
  };
}

export async function loadLocalAuthorPacks(_studyTarget?: RuntimeStudyTarget): Promise<LocalAuthorPack[]> {
  return (await loadLocalAuthorPacksResult(_studyTarget)).packs;
}

let localPackWrites: Promise<unknown> = Promise.resolve();
let localPackSequence = 0;
function serializePackWrite<T>(operation: () => Promise<T>): Promise<T> {
  const token = captureAccountGeneration();
  const result = localPackWrites.then(() => withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token)) throw new Error('Account changed');
    return operation();
  }));
  localPackWrites = result.catch(noteSwallowedAs('localAuthorPacks:promise_1', undefined));
  return result;
}

async function writePacks(packs: LocalAuthorPack[], studyTarget?: RuntimeStudyTarget): Promise<void> {
  const key = flashcardsLocalAuthorPacksKey(studyTarget);
  await AsyncStorage.setItem(key, JSON.stringify(packs));
  const token = captureAccountGeneration();
  const cacheKey = warmPacksKey(studyTarget, token);
  if (cacheKey && isCurrentAccountGeneration(token)) warmPacksByKey.set(cacheKey, packs);
}

/** Сохранить/обновить набор на устройстве. Возвращает id локальной копии. */
export async function saveLocalAuthorPack(
  payload: CommunityPackSubmissionPayload,
  opts?: { packId?: string; authorStableId?: string; studyTarget?: RuntimeStudyTarget; cloudPackId?: string; isPremium?: boolean },
): Promise<string> {
  return serializePackWrite(async () => {
  const now = Date.now();
  const previous = (await loadLocalAuthorPacks()).find(pack => pack.id === opts?.packId);
  const target = previous?.studyTarget ?? storageStudyTarget(opts?.studyTarget);
  const list = await readPacksForTarget(target);
  // Лимит считается по аккаунту, а не по языковому ключу: иначе Free мог
  // обойти правило 3 наборов, создав по три набора в каждом языке курса.
  const accountPacks = await loadLocalAuthorPacks();
  const id = opts?.packId && opts.packId.trim().length > 0
    ? opts.packId.trim()
    : `${LOCAL_AUTHOR_PACK_ID_PREFIX}${now}_${++localPackSequence}`;
  const existing = list.find((p) => p.id === id);
  if (!existing && opts?.isPremium !== true && accountPacks.length >= FREE_AUTHOR_PACK_LIMIT) {
    console.warn('[AUTHOR-PACK-QUOTA] сохранение отклонено: лимит Free', JSON.stringify({ count: accountPacks.length, limit: FREE_AUTHOR_PACK_LIMIT })); // guard-ok: ранний выход логируется
    throw new Error(FREE_AUTHOR_PACK_LIMIT_ERROR);
  }
  // зачем (PM-108-A3): приватный по умолчанию. Раньше `publishToCommunity !== false`
  // делал публичным любой набор, где флаг не передан (undefined). Публичность
  // ставится ТОЛЬКО явным `true`; без флага сохраняем прежнее состояние набора.
  const publishFlag = payload.publishToCommunity;
  const isPublic = publishFlag === true || (publishFlag === undefined && existing?.isPublic === true);
  const publicationState: LocalAuthorPack['publicationState'] = publishFlag === true
    ? 'pending'
    : publishFlag === false ? 'private' : (existing?.publicationState ?? 'private');
  const next: LocalAuthorPack = {
    ...existing,
    v: 1,
    id,
    title: payload.title.trim(),
    description: payload.description.trim(),
    cardThemeKey: payload.cardThemeKey ?? existing?.cardThemeKey ?? '',
    cards: payload.cards,
    packLanguage: normalizePackLanguage(payload.packLanguage ?? payload.studyTarget ?? existing?.packLanguage),
    isPublic,
    priceRunes: Math.max(0, Math.floor(Number(payload.priceRunes ?? existing?.priceRunes ?? 0))) || 0,
    // Не прислали уровень (старый экран) → оставляем прежний, а не стираем.
    level: normalizePackLevel(payload.level) ?? normalizePackLevel(existing?.level),
    studyTarget: target,
    cloudPackId: opts?.cloudPackId ?? existing?.cloudPackId,
    publicationKey: existing?.publicationKey ?? `${id}_${now}`,
    publicationState,
    authorStableId: opts?.authorStableId ?? existing?.authorStableId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const merged = existing ? list.map((p) => (p.id === id ? next : p)) : [...list, next];
  await writePacks(merged, target);
  lastKnownAuthorPackCount = accountPacks.length + (existing ? 0 : 1);
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
  if (lastKnownAuthorPackCount !== null) lastKnownAuthorPackCount = Math.max(0, lastKnownAuthorPackCount - 1);
  });
}

/** Счётчик своих наборов + флаг лимита. Только устройство; при «stale» (смена аккаунта) — последнее известное. */
export async function loadAuthorPackQuota(isPremium: boolean): Promise<AuthorPackQuota> {
  const result = await loadLocalAuthorPacksResult();
  if (result.status === 'ready') {
    lastKnownAuthorPackCount = result.packs.length;
  } else {
    console.warn('[AUTHOR-PACK-QUOTA] список наборов не готов (смена аккаунта) — беру последнее известное', JSON.stringify({ lastKnown: lastKnownAuthorPackCount })); // guard-ok: ранний выход логируется
  }
  return authorPackQuotaFor(lastKnownAuthorPackCount ?? result.packs.length, isPremium);
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
    // зачем (координатор 12.10, cards-011 «Мои наборы»): у своего локального набора на стопке не было «40 · A2» и чипов слов — уровень и карточки лежат в самом локальном наборе,
    // но в метаданные витрины не переносились. Ничего не выдумываем: нет уровня → «· A2» скрыт, нет карточек → ряд чипов не рисуется.
    ...(normalizePackLevel(pack.level) ? { level: normalizePackLevel(pack.level) } : {}),
    previewWords: packPreviewWords(pack.cards, pack.packLanguage),
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

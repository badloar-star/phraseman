import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';
import { getCanonicalUserId } from './user_id_policy';
import type { IdeaLikeResult, IdeaPage, IdeaReportReason, IdeaReportResult, IdeaTab, PublicIdea } from './ideas_types';

const FUNCTIONS_REGION = 'us-central1';

export type IdeaCategory = 'feature' | 'improvement' | 'monetization' | 'content' | 'other';

export interface IdeaInput {
  title: string;
  description: string;
  benefit: string;
  category: IdeaCategory;
  lang: string;
  userName?: string | null;
}

type SubmitUserIdeaResult = { ok: boolean; id?: string; idea?: PublicIdea };
type SubmitUserIdeaRequest = { payload: Record<string, unknown> };
type SubmitUserIdeaCallable = (
  data: SubmitUserIdeaRequest,
) => Promise<{ data: SubmitUserIdeaResult }>;

let submitUserIdeaCallable: SubmitUserIdeaCallable | null = null;
let ideaAppCheckWarmupInFlight: Promise<void> | null = null;
const ideasPageCache = new Map<IdeaTab, { value: IdeaPage; expiresAt: number }>();
const IDEAS_CACHE_TTL_MS = 60_000;
const ideasDetailCache = new Map<string, { value: PublicIdea; expiresAt: number }>();
const IDEAS_DETAIL_CACHE_TTL_MS = 5 * 60_000;
const ideasPageRequests = new Map<string, Promise<IdeaPage>>();
const ideasDetailRequests = new Map<string, Promise<PublicIdea>>();
const ideaLikeQueues = new Map<string, Promise<unknown>>();
const ideaLikeDesiredOverrides = new Map<string, boolean>();
const IDEAS_DISK_CACHE_KEYS: Record<IdeaTab, string> = {
  new: 'phraseman:ideas:public-cache:v1:new',
  top: 'phraseman:ideas:public-cache:v1:top',
};
let ideasDiskHydrationInFlight: Promise<void> | null = null;
let ideasDiskHydrated = false;

function isCachedPublicIdea(value: unknown): value is PublicIdea {
  if (!value || typeof value !== 'object') return false;
  const idea = value as Partial<PublicIdea>;
  return typeof idea.id === 'string'
    && typeof idea.title === 'string'
    && typeof idea.description === 'string'
    && typeof idea.authorUid === 'string'
    && typeof idea.authorName === 'string'
    && typeof idea.category === 'string'
    && typeof idea.likeCount === 'number'
    && typeof idea.createdAtMs === 'number'
    && (idea.status === 'published' || idea.status === 'approved' || idea.status === 'in_progress' || idea.status === 'implemented');
}

function readDiskIdeaPage(raw: string | null, tab: IdeaTab): IdeaPage | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; page?: unknown };
    if (parsed.version !== 1 || !parsed.page || typeof parsed.page !== 'object') return null;
    const page = parsed.page as Partial<IdeaPage>;
    if (page.tab !== tab || !Array.isArray(page.ideas) || page.ideas.length > 50) return null;
    if (!page.ideas.every(isCachedPublicIdea)) return null;
    if (page.nextCursor !== null && typeof page.nextCursor !== 'string') return null;
    return { ok: true, tab, ideas: page.ideas, nextCursor: page.nextCursor ?? null };
  } catch {
    return null;
  }
}

function seedIdeaDetails(page: IdeaPage): void {
  const expiresAt = Date.now() + IDEAS_DETAIL_CACHE_TTL_MS;
  for (const idea of page.ideas) ideasDetailCache.set(idea.id, { value: idea, expiresAt });
}

function persistIdeasPage(tab: IdeaTab, page: IdeaPage): void {
  void AsyncStorage.setItem(
    IDEAS_DISK_CACHE_KEYS[tab],
    JSON.stringify({ version: 1, savedAtMs: Date.now(), page }),
  ).catch(() => undefined);
}

export function hydratePublicUserIdeasCache(): Promise<void> {
  if (ideasDiskHydrated) return Promise.resolve();
  if (!ideasDiskHydrationInFlight) {
    ideasDiskHydrationInFlight = AsyncStorage.multiGet(Object.values(IDEAS_DISK_CACHE_KEYS))
      .then((entries) => {
        for (const [key, raw] of entries) {
          const tab = key === IDEAS_DISK_CACHE_KEYS.new ? 'new' : key === IDEAS_DISK_CACHE_KEYS.top ? 'top' : null;
          if (!tab) continue;
          const page = readDiskIdeaPage(raw, tab);
          if (!page || ideasPageCache.has(tab)) continue;
          ideasPageCache.set(tab, { value: page, expiresAt: 0 });
          seedIdeaDetails(page);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        ideasDiskHydrated = true;
        ideasDiskHydrationInFlight = null;
      });
  }
  return ideasDiskHydrationInFlight;
}

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

function getSubmitUserIdeaCallable(): SubmitUserIdeaCallable {
  if (!submitUserIdeaCallable) {
    submitUserIdeaCallable = callable<SubmitUserIdeaRequest, SubmitUserIdeaResult>('submitUserIdea');
  }
  return submitUserIdeaCallable;
}

function warmIdeasAppCheck(): Promise<void> {
  if (!ideaAppCheckWarmupInFlight) {
    ideaAppCheckWarmupInFlight = initFirebaseAppCheckIfAvailable()
      .catch(() => false)
      .then(() => undefined)
      .finally(() => {
        ideaAppCheckWarmupInFlight = null;
      });
  }
  return ideaAppCheckWarmupInFlight;
}

/**
 * Отправить идею пользователя. Бросает ошибку при сбое/лимите (экран показывает
 * соответствующую модалку). Возвращает null только если облако недоступно.
 */
export async function submitUserIdea(input: IdeaInput): Promise<SubmitUserIdeaResult | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  await warmIdeasAppCheck();
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
  const fn = getSubmitUserIdeaCallable();
  // 30с вместо ~70с дефолта: отправка идеи не должна висеть минуту на плохой сети.
  const res = await withCallableTimeout(
    fn({
      payload: {
        title: input.title,
        description: input.description,
        benefit: input.benefit,
        category: input.category,
        lang: input.lang,
        userName: input.userName ?? null,
        platform: Platform.OS,
        appVersion,
      },
    }),
    'submitUserIdea',
  );
  if (res.data.idea) mergeCachedPublicIdea(res.data.idea);
  else invalidatePublicIdeasCache();
  return res.data;
}

export async function updateUserIdea(ideaId: string, input: IdeaInput): Promise<{ ok: boolean; id: string; idea?: PublicIdea }> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw Object.assign(new Error('offline'), { code: 'offline' });
  await warmIdeasAppCheck();
  try {
    const fn = publicIdeaCallable<{ ideaId: string; payload: Record<string, unknown> }, { ok: boolean; id: string; idea?: PublicIdea }>('updateUserIdea');
    const res = await withCallableTimeout(fn({
      ideaId,
      payload: { title: input.title, description: input.description, benefit: input.benefit, category: input.category, lang: input.lang },
    }), 'updateUserIdea');
    if (res.data.idea) mergeCachedPublicIdea(res.data.idea);
    else invalidatePublicIdeasCache(ideaId);
    return res.data;
  } catch (error) {
    throw normalizeIdeaError(error);
  }
}

type PublicIdeaListRequest = { tab: IdeaTab; limit?: number; cursor?: string };
type PublicIdeaListCallable = (data: PublicIdeaListRequest) => Promise<{ data: IdeaPage }>;
type IdeaDetailCallable = (data: { ideaId: string }) => Promise<{ data: { ok: boolean; idea: PublicIdea } }>;
type IdeaLikeCallable = (data: { ideaId: string }) => Promise<{ data: IdeaLikeResult }>;
type IdeaReportCallable = (data: { ideaId: string; reason: IdeaReportReason }) => Promise<{ data: IdeaReportResult }>;

function publicIdeaCallable<TReq, TRes>(name: string) {
  return callable<TReq, TRes>(name);
}

function normalizeIdeaError(error: unknown): Error {
  const code = String((error as { code?: string })?.code || '');
  const message = String((error as { message?: string })?.message || '');
  const normalized = message.includes('idea_submission_restricted')
    ? 'idea-restricted'
    : code.includes('resource-exhausted') || message.includes('rate_limited')
    ? 'rate-limited'
    : code.includes('not-found') || message.includes('idea_not_found')
      ? 'not-found'
      : code.includes('permission-denied')
        ? 'permission-denied'
        : code.includes('failed-precondition') || message.includes('requires an index')
          ? 'service-unavailable'
        : code.includes('network') || message.includes('network')
          ? 'offline'
          : 'unknown';
  return Object.assign(new Error(normalized), { code: normalized });
}

export async function listPublicUserIdeas(
  tab: IdeaTab,
  options: { force?: boolean; limit?: number; cursor?: string | null } = {},
): Promise<IdeaPage> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: true, tab, ideas: [], nextCursor: null };
  await hydratePublicUserIdeasCache();
  const cursor = options.cursor || null;
  const cached = cursor ? null : ideasPageCache.get(tab);
  if (!cursor && !options.force && cached && cached.expiresAt > Date.now()) return cached.value;
  const requestKey = `${tab}:${cursor || 'first'}`;
  const inFlight = ideasPageRequests.get(requestKey);
  if (inFlight) return inFlight;
  const request = (async () => {
    await warmIdeasAppCheck();
    try {
      const fn = publicIdeaCallable<PublicIdeaListRequest, IdeaPage>('listPublicUserIdeas') as PublicIdeaListCallable;
      const res = await withCallableTimeout(fn({ tab, limit: options.limit ?? 20, ...(cursor ? { cursor } : {}) }), 'listPublicUserIdeas');
      if (!cursor) ideasPageCache.set(tab, { value: res.data, expiresAt: Date.now() + IDEAS_CACHE_TTL_MS });
      seedIdeaDetails(res.data);
      if (!cursor) persistIdeasPage(tab, res.data);
      return res.data;
    } catch (error) {
      throw normalizeIdeaError(error);
    }
  })();
  ideasPageRequests.set(requestKey, request);
  try {
    return await request;
  } finally {
    if (ideasPageRequests.get(requestKey) === request) ideasPageRequests.delete(requestKey);
  }
}

/** Start the first-page request before navigation so the catalog can paint from cache. */
export function prefetchPublicUserIdeas(tab: IdeaTab = 'new'): void {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  void listPublicUserIdeas(tab).catch(() => undefined);
}

export async function getPublicUserIdea(ideaId: string, options: { force?: boolean } = {}): Promise<PublicIdea> {
  if (!ideaId) throw Object.assign(new Error('not-found'), { code: 'not-found' });
  await hydratePublicUserIdeasCache();
  const cached = ideasDetailCache.get(ideaId);
  if (!options.force && cached && cached.expiresAt > Date.now()) return cached.value;
  const inFlight = ideasDetailRequests.get(ideaId);
  if (inFlight) return inFlight;
  const request = (async () => {
    await warmIdeasAppCheck();
    try {
      const fn = publicIdeaCallable<{ ideaId: string }, { ok: boolean; idea: PublicIdea }>('getPublicUserIdea') as IdeaDetailCallable;
      const res = await withCallableTimeout(fn({ ideaId }), 'getPublicUserIdea');
      ideasDetailCache.set(ideaId, { value: res.data.idea, expiresAt: Date.now() + IDEAS_DETAIL_CACHE_TTL_MS });
      return res.data.idea;
    } catch (error) {
      throw normalizeIdeaError(error);
    }
  })();
  ideasDetailRequests.set(ideaId, request);
  try {
    return await request;
  } finally {
    if (ideasDetailRequests.get(ideaId) === request) ideasDetailRequests.delete(ideaId);
  }
}

function queueIdeaLike<T>(ideaId: string, desired: boolean, operation: () => Promise<T>): Promise<T> {
  ideaLikeDesiredOverrides.set(ideaId, desired);
  const previous = ideaLikeQueues.get(ideaId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  ideaLikeQueues.set(ideaId, next);
  const clear = () => {
    if (ideaLikeQueues.get(ideaId) === next) {
      ideaLikeQueues.delete(ideaId);
      ideaLikeDesiredOverrides.delete(ideaId);
    }
  };
  void next.then(clear, clear);
  return next;
}

export function likeUserIdea(ideaId: string): Promise<IdeaLikeResult> {
  return queueIdeaLike(ideaId, true, async () => {
    await warmIdeasAppCheck();
    try {
      const fn = publicIdeaCallable<{ ideaId: string }, IdeaLikeResult>('likeUserIdea') as IdeaLikeCallable;
      const res = await withCallableTimeout(fn({ ideaId }), 'likeUserIdea');
      updateCachedIdeaLikeCount(res.data.ideaId, res.data.likeCount);
      return res.data;
    } catch (error) {
      throw normalizeIdeaError(error);
    }
  });
}

export function unlikeUserIdea(ideaId: string): Promise<IdeaLikeResult> {
  return queueIdeaLike(ideaId, false, async () => {
    await warmIdeasAppCheck();
    try {
      const fn = publicIdeaCallable<{ ideaId: string }, IdeaLikeResult>('unlikeUserIdea') as IdeaLikeCallable;
      const res = await withCallableTimeout(fn({ ideaId }), 'unlikeUserIdea');
      updateCachedIdeaLikeCount(res.data.ideaId, res.data.likeCount);
      return res.data;
    } catch (error) {
      throw normalizeIdeaError(error);
    }
  });
}

export async function reportUserIdea(ideaId: string, reason: IdeaReportReason): Promise<IdeaReportResult> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw Object.assign(new Error('offline'), { code: 'offline' });
  await warmIdeasAppCheck();
  try {
    const fn = publicIdeaCallable<{ ideaId: string; reason: IdeaReportReason }, IdeaReportResult>('reportUserIdea') as IdeaReportCallable;
    const res = await withCallableTimeout(fn({ ideaId, reason }), 'reportUserIdea');
    invalidatePublicIdeasCache(ideaId);
    return res.data;
  } catch (error) {
    throw normalizeIdeaError(error);
  }
}

/** Restore filled hearts after reopening the catalog from the server-owned receipts. */
export async function getMyUserIdeaLikeIds(limit = 500): Promise<Set<string>> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return new Set<string>();
  const stableUid = await getCanonicalUserId();
  if (!stableUid) return new Set<string>();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firestore = require('@react-native-firebase/firestore').default;
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    const snap = await firestore()
      .collection('users')
      .doc(stableUid)
      .collection('idea_likes_sent')
      .limit(safeLimit)
      .get();
    const ids = new Set<string>(snap.docs.map((doc: { id: string }) => doc.id).filter(Boolean));
    for (const [ideaId, desired] of ideaLikeDesiredOverrides) {
      if (desired) ids.add(ideaId); else ids.delete(ideaId);
    }
    return ids;
  } catch {
    // The catalog remains usable if an older Rules deployment has not exposed
    // the owner-readable receipt subcollection yet.
    return new Set<string>([...ideaLikeDesiredOverrides]
      .filter(([, desired]) => desired)
      .map(([ideaId]) => ideaId));
  }
}

export function getCachedPublicIdeasPage(tab: IdeaTab): IdeaPage | null {
  return ideasPageCache.get(tab)?.value ?? null;
}

export function getCachedPublicUserIdea(ideaId: string): PublicIdea | null {
  return ideasDetailCache.get(ideaId)?.value ?? null;
}

function updateCachedIdeaLikeCount(ideaId: string, likeCount: number): void {
  for (const [tab, entry] of ideasPageCache) {
    if (!entry.value.ideas.some((idea) => idea.id === ideaId)) continue;
    ideasPageCache.set(tab, {
      ...entry,
      value: { ...entry.value, ideas: entry.value.ideas.map((idea) => idea.id === ideaId ? { ...idea, likeCount } : idea) },
    });
    persistIdeasPage(tab, ideasPageCache.get(tab)!.value);
  }
  const detail = ideasDetailCache.get(ideaId);
  if (detail) ideasDetailCache.set(ideaId, { ...detail, value: { ...detail.value, likeCount } });
}

function mergeCachedPublicIdea(idea: PublicIdea): void {
  const expiresAt = Date.now() + IDEAS_DETAIL_CACHE_TTL_MS;
  ideasDetailCache.set(idea.id, { value: idea, expiresAt });
  for (const [tab, entry] of ideasPageCache) {
    const oldIdeas = entry.value.ideas;
    const wasPresent = oldIdeas.some((item) => item.id === idea.id);
    const pageSize = oldIdeas.length || 20;
    const sorted = [...oldIdeas.filter((item) => item.id !== idea.id), idea].sort((left, right) => {
      if (tab === 'top' && right.likeCount !== left.likeCount) return right.likeCount - left.likeCount;
      return right.createdAtMs - left.createdAtMs;
    });
    const pageIdeas = sorted.slice(0, pageSize);
    const nextCursor = wasPresent
      ? entry.value.nextCursor
      : sorted.length > pageSize
        ? pageIdeas[pageIdeas.length - 1]?.id ?? entry.value.nextCursor
        : null;
    ideasPageCache.set(tab, { ...entry, value: { ...entry.value, ideas: pageIdeas, nextCursor } });
    persistIdeasPage(tab, ideasPageCache.get(tab)!.value);
  }
  if (!ideasPageCache.has('new')) {
    const page: IdeaPage = { ok: true, tab: 'new', ideas: [idea], nextCursor: null };
    ideasPageCache.set('new', { value: page, expiresAt: 0 });
    persistIdeasPage('new', page);
  }
}

export function invalidatePublicIdeasCache(ideaId?: string): void {
  ideasPageCache.clear();
  void AsyncStorage.multiRemove(Object.values(IDEAS_DISK_CACHE_KEYS)).catch(() => undefined);
  if (ideaId) ideasDetailCache.delete(ideaId);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}

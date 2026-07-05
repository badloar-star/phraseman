import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { ensureAnonUser, ensureStableAuthLink } from './cloud_sync';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import type { Lang } from '../constants/i18n';

const FUNCTIONS_REGION = 'us-central1';
const TOPICS_COLLECTION = 'help_board_topics';
const COMMENTS_COLLECTION = 'help_board_comments';
const HIDDEN_TOPICS_KEY = 'help_board_hidden_topics_v1';
const HIDDEN_COMMENTS_KEY = 'help_board_hidden_comments_v1';
const HIDDEN_COMPASS_KEY = 'help_board_hidden_compass_v1';
const LAST_SUBMIT_ERROR_KEY = 'help_board_last_submit_error_v1';
const MY_VOTES_KEY = 'help_board_my_votes_v1';

export const HELP_BOARD_POLICY_VERSION = 1;

export type HelpBoardSort = 'hot' | 'new' | 'unanswered' | 'best';
export type HelpBoardTargetType = 'topic' | 'comment' | 'compass';
export type HelpBoardStatus = 'visible' | 'review' | 'blocked' | 'hidden';
export type HelpBoardTopicSubmitStatus =
  | 'created'
  | 'review'
  | 'blocked'
  | 'restricted'
  | 'auth'
  | 'server_unavailable'
  | 'throttled'
  | 'offline'
  | 'failed';
export type HelpBoardTopicDeleteStatus =
  | 'deleted'
  | 'restricted'
  | 'auth'
  | 'server_unavailable'
  | 'not_found'
  | 'offline'
  | 'failed';
export type HelpBoardCommentSubmitStatus =
  | 'sent'
  | 'review'
  | 'blocked'
  | 'restricted'
  | 'auth'
  | 'server_unavailable'
  | 'not_found'
  | 'throttled'
  | 'offline'
  | 'failed';

export interface HelpBoardSubmitDiagnostic {
  at: number;
  action: 'create_topic' | 'add_comment' | 'delete_topic' | 'vote' | 'report';
  status: HelpBoardTopicSubmitStatus | HelpBoardCommentSubmitStatus | HelpBoardTopicDeleteStatus | 'ignored';
  code: string;
  message: string;
  details: string;
  nativeCode: string;
  boardKey?: string;
}

export interface HelpBoardScope {
  targetLang: string;
  uiLang: string;
  boardKey: string;
}

export interface HelpBoardTopic {
  id: string;
  boardKey: string;
  targetLang: string;
  uiLang: string;
  title: string;
  text: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorAura?: string;
  status: HelpBoardStatus;
  compassAnswer: string;
  compassStatus: 'pending' | 'generating' | 'ready' | 'rejected' | 'fallback' | 'hidden';
  helpfulScore: number;
  compassHelpfulScore: number;
  commentCount: number;
  reportCount: number;
  hotScore: number;
  bestScore: number;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
}

export interface HelpBoardComment {
  id: string;
  topicId: string;
  boardKey: string;
  targetLang: string;
  uiLang: string;
  text: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorAura?: string;
  isCompass?: boolean;
  /** Реплай как в Telegram: денормализованная цитата исходного комментария. */
  replyToCommentId?: string;
  replyToAuthorUid?: string;
  replyToAuthorName?: string;
  replyToText?: string;
  replyToIsCompass?: boolean;
  status: HelpBoardStatus;
  helpfulScore: number;
  reportCount: number;
  createdAt: number;
  updatedAt: number;
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return firestore();
  } catch {
    return null;
  }
};

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

function compactErrorField(value: unknown, maxLength = 180): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, maxLength);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value).slice(0, maxLength);
  } catch {
    return String(value).slice(0, maxLength);
  }
}

function normalizeCallableError(error: any) {
  const code = compactErrorField(error?.code || error?.nativeErrorCode || '');
  const message = compactErrorField(error?.message || error?.toString?.() || '');
  const details = compactErrorField(error?.details || error?.userInfo || '');
  const nativeCode = compactErrorField(error?.nativeErrorCode || error?.userInfo?.code || '');
  const haystack = `${code} ${message} ${details} ${nativeCode}`.toLowerCase();
  return { code, message, details, nativeCode, haystack };
}

function classifyTopicSubmitError(error: any): HelpBoardTopicSubmitStatus {
  const { haystack } = normalizeCallableError(error);
  if (haystack.includes('resource-exhausted') || haystack.includes('throttled')) return 'throttled';
  if (haystack.includes('not-found') || haystack.includes('not found') || haystack.includes('unimplemented') || haystack.includes('404')) return 'server_unavailable';
  if (haystack.includes('offline') || haystack.includes('network') || haystack.includes('unavailable') || haystack.includes('deadline-exceeded') || haystack.includes('timeout')) return 'offline';
  if (haystack.includes('stable_id') || haystack.includes('auth_required') || haystack.includes('unauthenticated')) return 'auth';
  if (haystack.includes('policy_required') || haystack.includes('age_restricted') || haystack.includes('user_banned') || haystack.includes('community_restricted') || haystack.includes('permission-denied')) return 'restricted';
  return 'failed';
}

function classifyCommentSubmitError(error: any): HelpBoardCommentSubmitStatus {
  const { haystack } = normalizeCallableError(error);
  if (haystack.includes('resource-exhausted') || haystack.includes('throttled')) return 'throttled';
  if (haystack.includes('topic_not_found')) return 'not_found';
  if (haystack.includes('not-found') || haystack.includes('not found') || haystack.includes('unimplemented') || haystack.includes('404')) return 'server_unavailable';
  if (haystack.includes('offline') || haystack.includes('network') || haystack.includes('unavailable') || haystack.includes('deadline-exceeded') || haystack.includes('timeout')) return 'offline';
  if (haystack.includes('stable_id') || haystack.includes('auth_required') || haystack.includes('unauthenticated')) return 'auth';
  if (haystack.includes('policy_required') || haystack.includes('age_restricted') || haystack.includes('user_banned') || haystack.includes('community_restricted') || haystack.includes('permission-denied')) return 'restricted';
  return 'failed';
}

function classifyTopicDeleteError(error: any): HelpBoardTopicDeleteStatus {
  const { haystack } = normalizeCallableError(error);
  if (haystack.includes('topic_not_found') || haystack.includes('target_not_found')) return 'not_found';
  if (haystack.includes('not-found') || haystack.includes('not found') || haystack.includes('unimplemented') || haystack.includes('404')) return 'server_unavailable';
  if (haystack.includes('offline') || haystack.includes('network') || haystack.includes('unavailable') || haystack.includes('deadline-exceeded') || haystack.includes('timeout')) return 'offline';
  if (haystack.includes('stable_id') || haystack.includes('auth_required') || haystack.includes('unauthenticated')) return 'auth';
  if (haystack.includes('not_topic_author') || haystack.includes('permission-denied')) return 'restricted';
  return 'failed';
}

async function rememberSubmitFailure(
  action: HelpBoardSubmitDiagnostic['action'],
  status: HelpBoardSubmitDiagnostic['status'],
  error: any,
  boardKey?: string,
): Promise<void> {
  const normalized = normalizeCallableError(error);
  const diagnostic: HelpBoardSubmitDiagnostic = {
    at: Date.now(),
    action,
    status,
    code: normalized.code,
    message: normalized.message,
    details: normalized.details,
    nativeCode: normalized.nativeCode,
    ...(boardKey ? { boardKey } : {}),
  };
  await AsyncStorage.setItem(LAST_SUBMIT_ERROR_KEY, JSON.stringify(diagnostic)).catch(() => {});
  void import('./app_health')
    .then(({ logAppWarning }) => logAppWarning('help_board:submit_failed', new Error(`${action}:${status}:${normalized.code || normalized.message || 'unknown'}`), {
      feature: 'help_board',
      writeToFirestore: true,
      tags: {
        action,
        status,
        code: normalized.code,
        nativeCode: normalized.nativeCode,
        boardKey: boardKey || null,
      },
    }))
    .catch(() => {});
}

export async function getLastHelpBoardSubmitError(): Promise<HelpBoardSubmitDiagnostic | null> {
  const raw = await AsyncStorage.getItem(LAST_SUBMIT_ERROR_KEY).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HelpBoardSubmitDiagnostic;
  } catch {
    return null;
  }
}

export function helpBoardBoardKey(targetLang: string, uiLang: string): string {
  const target = String(targetLang || '').trim().toLowerCase() === 'fr' ? 'fr' : 'en';
  const ui = String(uiLang || 'ru').trim() || 'ru';
  return `${target}:${ui}`;
}

export function getHelpBoardScope(studyTarget: RuntimeStudyTarget, uiLang: Lang | string): HelpBoardScope {
  const targetLang = storageStudyTarget(studyTarget);
  const uiLangSafe = String(uiLang || 'ru');
  return { targetLang, uiLang: uiLangSafe, boardKey: helpBoardBoardKey(targetLang, uiLangSafe) };
}

function normalizeTopic(doc: any): HelpBoardTopic {
  const data = doc.data?.() || {};
  return {
    id: doc.id,
    boardKey: String(data.boardKey || ''),
    targetLang: String(data.targetLang || 'en'),
    uiLang: String(data.uiLang || 'ru'),
    title: String(data.title || ''),
    text: String(data.text || ''),
    authorUid: String(data.authorUid || ''),
    authorName: String(data.authorName || 'Player'),
    authorAvatar: String(data.authorAvatar || ''),
    authorAura: String(data.authorAura || ''),
    status: (data.status || 'visible') as HelpBoardStatus,
    compassAnswer: String(data.compassAnswer || ''),
    compassStatus: (data.compassStatus || 'ready') as HelpBoardTopic['compassStatus'],
    helpfulScore: Number(data.helpfulScore || 0),
    compassHelpfulScore: Number(data.compassHelpfulScore || 0),
    commentCount: Number(data.commentCount || 0),
    reportCount: Number(data.reportCount || 0),
    hotScore: Number(data.hotScore || 0),
    bestScore: Number(data.bestScore || 0),
    createdAt: Number(data.createdAt || 0),
    updatedAt: Number(data.updatedAt || 0),
    lastActivityAt: Number(data.lastActivityAt || data.createdAt || 0),
  };
}

function normalizeComment(doc: any): HelpBoardComment {
  const data = doc.data?.() || {};
  return {
    id: doc.id,
    topicId: String(data.topicId || ''),
    boardKey: String(data.boardKey || ''),
    targetLang: String(data.targetLang || 'en'),
    uiLang: String(data.uiLang || 'ru'),
    text: String(data.text || ''),
    authorUid: String(data.authorUid || ''),
    authorName: String(data.authorName || 'Player'),
    authorAvatar: String(data.authorAvatar || ''),
    authorAura: String(data.authorAura || ''),
    isCompass: data.isCompass === true || String(data.authorUid || '') === 'compass',
    status: (data.status || 'visible') as HelpBoardStatus,
    helpfulScore: Number(data.helpfulScore || 0),
    reportCount: Number(data.reportCount || 0),
    createdAt: Number(data.createdAt || 0),
    updatedAt: Number(data.updatedAt || 0),
  };
}

async function readHidden(key: string): Promise<Record<string, boolean>> {
  const raw = await AsyncStorage.getItem(key).catch(() => null);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeHidden(key: string, map: Record<string, boolean>): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(map)).catch(() => {});
}

export async function getHiddenHelpBoardTopics(): Promise<Record<string, boolean>> {
  return readHidden(HIDDEN_TOPICS_KEY);
}

export async function getHiddenHelpBoardCompass(): Promise<Record<string, boolean>> {
  return readHidden(HIDDEN_COMPASS_KEY);
}

export async function hideHelpBoardTopic(topicId: string): Promise<void> {
  const map = await readHidden(HIDDEN_TOPICS_KEY);
  map[topicId] = true;
  await writeHidden(HIDDEN_TOPICS_KEY, map);
}

export async function hideHelpBoardComment(commentId: string): Promise<void> {
  const map = await readHidden(HIDDEN_COMMENTS_KEY);
  map[commentId] = true;
  await writeHidden(HIDDEN_COMMENTS_KEY, map);
}

export async function hideHelpBoardCompass(topicId: string): Promise<void> {
  const map = await readHidden(HIDDEN_COMPASS_KEY);
  map[topicId] = true;
  await writeHidden(HIDDEN_COMPASS_KEY, map);
}

export async function getHiddenHelpBoardComments(): Promise<Record<string, boolean>> {
  return readHidden(HIDDEN_COMMENTS_KEY);
}

export function subscribeHelpBoardTopics(
  scope: HelpBoardScope,
  sort: HelpBoardSort,
  onNext: (topics: HelpBoardTopic[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const db = getFirestore();
  if (!db) {
    onNext([]);
    return () => {};
  }
  let q: any = db
    .collection(TOPICS_COLLECTION)
    .where('boardKey', '==', scope.boardKey)
    .where('status', '==', 'visible');
  if (sort === 'new') {
    q = q.orderBy('createdAt', 'desc');
  } else if (sort === 'unanswered') {
    q = q.where('commentCount', '==', 0).orderBy('createdAt', 'desc');
  } else if (sort === 'best') {
    q = q.orderBy('bestScore', 'desc').orderBy('createdAt', 'desc');
  } else {
    q = q.orderBy('hotScore', 'desc').orderBy('lastActivityAt', 'desc');
  }
  return q.limit(60).onSnapshot(
    (snap: any) => onNext(snap.docs.map(normalizeTopic).filter((row: HelpBoardTopic) => row.title && row.text)),
    (err: unknown) => onError?.(err),
  );
}

export function subscribeHelpBoardTopic(
  topicId: string,
  onNext: (topic: HelpBoardTopic | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  const db = getFirestore();
  if (!db || !topicId) {
    onNext(null);
    return () => {};
  }
  return db.collection(TOPICS_COLLECTION).doc(topicId).onSnapshot(
    (snap: any) => onNext(snap.exists ? normalizeTopic(snap) : null),
    (err: unknown) => onError?.(err),
  );
}

export function subscribeHelpBoardComments(
  topicId: string,
  onNext: (comments: HelpBoardComment[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const db = getFirestore();
  if (!db || !topicId) {
    onNext([]);
    return () => {};
  }
  return db
    .collection(COMMENTS_COLLECTION)
    .where('topicId', '==', topicId)
    .where('status', '==', 'visible')
    .orderBy('helpfulScore', 'desc')
    .orderBy('createdAt', 'asc')
    .limit(200)
    .onSnapshot(
      (snap: any) => onNext(snap.docs.map(normalizeComment)),
      (err: unknown) => onError?.(err),
    );
}

async function prepareCallableIdentity(): Promise<string | null> {
  const stableId = await ensureAnonUser();
  if (!stableId) return null;
  await ensureStableAuthLink().catch(() => false);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  return stableId;
}

export async function createHelpBoardTopic(input: {
  scope: HelpBoardScope;
  title: string;
  text: string;
}): Promise<HelpBoardTopicSubmitStatus> {
  try {
    const stableId = await prepareCallableIdentity();
    if (!stableId) return 'offline';
    const fn = callable<{
      stableId?: string | null;
      targetLang: string;
      uiLang: string;
      title: string;
      text: string;
      allowCompass: boolean;
      policyVersion: number;
      platform: string;
      appVersion: string;
    }, { ok: boolean; status: string }>('helpBoardCreateTopic');
    const res = await fn({
      stableId,
      targetLang: input.scope.targetLang,
      uiLang: input.scope.uiLang,
      title: input.title,
      text: input.text,
      // Компас сам решает, отвечать ли; тумблера у пользователя больше нет.
      // Шлём true для обратной совместимости со старым (ещё не задеплоенным) сервером.
      allowCompass: true,
      policyVersion: HELP_BOARD_POLICY_VERSION,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? 'unknown',
    });
    if (res.data.status === 'created') return 'created';
    if (res.data.status === 'review') return 'review';
    return 'blocked';
  } catch (e: any) {
    const status = classifyTopicSubmitError(e);
    await rememberSubmitFailure('create_topic', status, e, input.scope.boardKey);
    if (__DEV__) console.warn('[help_board] create topic failed', normalizeCallableError(e), e);
    return status;
  }
}

export async function addHelpBoardComment(input: {
  topicId: string;
  text: string;
  /** id комментария, на который отвечаем (цитата как в Telegram). */
  replyToCommentId?: string;
}): Promise<HelpBoardCommentSubmitStatus> {
  try {
    const stableId = await prepareCallableIdentity();
    if (!stableId) return 'offline';
    const fn = callable<{
      stableId?: string | null;
      topicId: string;
      text: string;
      replyToCommentId?: string;
      policyVersion: number;
    }, { ok: boolean; status: string }>('helpBoardAddComment');
    const res = await fn({
      stableId,
      topicId: input.topicId,
      text: input.text,
      ...(input.replyToCommentId ? { replyToCommentId: input.replyToCommentId } : {}),
      policyVersion: HELP_BOARD_POLICY_VERSION,
    });
    if (res.data.status === 'sent') return 'sent';
    if (res.data.status === 'review') return 'review';
    return 'blocked';
  } catch (e: any) {
    const status = classifyCommentSubmitError(e);
    await rememberSubmitFailure('add_comment', status, e);
    if (__DEV__) console.warn('[help_board] add comment failed', normalizeCallableError(e), e);
    return status;
  }
}

export async function deleteHelpBoardTopicForEveryone(topicId: string): Promise<HelpBoardTopicDeleteStatus> {
  try {
    const stableId = await prepareCallableIdentity();
    if (!stableId) return 'offline';
    const fn = callable<{ stableId?: string | null; topicId: string }, { ok: boolean; status: string }>('helpBoardDeleteMyTopic');
    const res = await fn({ stableId, topicId });
    return res.data.status === 'deleted' ? 'deleted' : 'failed';
  } catch (e: any) {
    const status = classifyTopicDeleteError(e);
    await rememberSubmitFailure('delete_topic', status, e);
    if (__DEV__) console.warn('[help_board] delete topic failed', normalizeCallableError(e), e);
    return status;
  }
}

/** Ключ «моего голоса» — тот же формат, что doc id на сервере (без uid). */
export function helpBoardVoteKey(targetType: HelpBoardTargetType, targetId: string): string {
  return `${targetType}_${targetId}`;
}

/** Мои голоса (targetKey → 1) — для мгновенной подсветки «уже лайкнуто». */
export async function getMyHelpBoardVotes(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(MY_VOTES_KEY).catch(() => null);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function rememberMyHelpBoardVote(targetKey: string, value: number): Promise<void> {
  const map = await getMyHelpBoardVotes();
  if (value === 0) delete map[targetKey];
  else map[targetKey] = value;
  await AsyncStorage.setItem(MY_VOTES_KEY, JSON.stringify(map)).catch(() => {});
}

/**
 * Голос за тему/комментарий/ответ Компаса. Сервер — toggle: повторная отправка
 * того же значения снимает голос; возвращает ФАКТИЧЕСКОЕ итоговое значение
 * (истина на случай рассинхрона локального стейта). null — не получилось
 * (нет identity/сеть/throttle) — вызывающий обязан откатить оптимистичный UI.
 */
export async function voteHelpBoardItem(
  targetType: HelpBoardTargetType,
  targetId: string,
  value: 1 | -1 | 0,
): Promise<{ ok: boolean; value: number } | null> {
  const stableId = await prepareCallableIdentity();
  if (!stableId) return null;
  const fn = callable<{ stableId?: string | null; targetType: HelpBoardTargetType; targetId: string; value: number }, { ok: boolean; value: number }>('helpBoardVote');
  try {
    const res = await fn({ stableId, targetType, targetId, value });
    const nextValue = Number(res.data?.value ?? 0);
    void rememberMyHelpBoardVote(helpBoardVoteKey(targetType, targetId), nextValue);
    return { ok: res.data?.ok === true, value: nextValue };
  } catch (e) {
    void rememberSubmitFailure('vote', 'ignored', e);
    return null;
  }
}

/** true — этот юзер уже жаловался на эту цель (сервер: report_already_exists). */
export function isHelpBoardAlreadyReported(error: unknown): boolean {
  const { haystack } = normalizeCallableError(error);
  return haystack.includes('already-exists') || haystack.includes('report_already_exists');
}

export async function reportHelpBoardItem(targetType: HelpBoardTargetType, targetId: string, reason: string): Promise<void> {
  const stableId = await prepareCallableIdentity();
  if (!stableId) return;
  const fn = callable<{ stableId?: string | null; targetType: HelpBoardTargetType; targetId: string; reason: string }, { ok: boolean }>('helpBoardReport');
  try {
    await fn({ stableId, targetType, targetId, reason });
  } catch (e) {
    await rememberSubmitFailure('report', 'failed', e);
    throw e;
  }
}

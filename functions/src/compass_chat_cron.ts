// Daily Compass post for league chats.
//
// The cron creates exactly one Compass system message per active league group
// per UTC day. The content is generated once per product day and cached in
// league_compass_daily/{YYYY-MM-DD}; every group receives the same approved
// post, so reruns are idempotent and do not burn extra model calls.

import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { openAiChat } from './explain/explain_provider';
import { resolveJobConfig } from './openai_jobs_config';
import {
  buildLeagueCompassDailyPrompt,
  getDaySeed,
  getUtcDayKey,
  normalizeGeneratedCompassPost,
  pickCompassPostForDay,
  type CompassPost,
} from './compass_chat_content';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const LEAGUE_CHAT_SYSTEM_UID = '__league_system__';
const PAGE_SIZE = 200;
const BATCH_LIMIT = 400;
const MIN_MEMBERS_FOR_POST = 2;

const DAILY_COLLECTION = 'league_compass_daily';
const BILLING_COLLECTION = 'league_compass_daily_billing';
const DAILY_SCHEMA_VERSION = 1;
const GENERATION_LOCK_TTL_MS = 90_000;
const REJECTED_RETRY_TTL_MS = 10 * 60_000;
const GEN_MAX_TOKENS = 2200;
const GEN_TEMPERATURE = 0.9;

type DailyPostSource = 'ai' | 'cache' | 'fallback_disabled' | 'fallback_missing_key' | 'fallback_pending' | 'fallback_failed';

interface DailyCompassDoc {
  schemaVersion?: number;
  status?: 'pending' | 'ready' | 'rejected';
  post?: unknown;
  model?: string;
  reason?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

interface ResolvedDailyPost {
  post: CompassPost;
  source: DailyPostSource;
  model?: string;
}

type MemberRow = Record<string, unknown>;

function getCurrentWeekId(now: Date = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function compassPostDocId(weekId: string, groupId: string, daySeed: number): string {
  const safeGroup = String(groupId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'group';
  return `compass_${weekId}_${safeGroup}_${daySeed}`;
}

function membersMap(data: FirebaseFirestore.DocumentData | undefined): Record<string, MemberRow> {
  const members = data?.members;
  if (!members || typeof members !== 'object' || Array.isArray(members)) return {};
  return members as Record<string, MemberRow>;
}

function countMembers(data: FirebaseFirestore.DocumentData | undefined): number {
  return Object.values(membersMap(data)).filter((m) => m?.identityHidden !== true).length;
}

function buildMessagePayload(
  post: CompassPost,
  groupId: string,
  weekId: string,
  leagueId: number,
  createdAt: number,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    groupId,
    weekId,
    leagueId,
    authorUid: LEAGUE_CHAT_SYSTEM_UID,
    authorName: 'Compass',
    kind: 'system',
    systemType: post.systemType,
    compassKind: post.kind,
    text: post.i18n.ru,
    i18n: post.i18n,
    status: 'visible',
    reportCount: 0,
    createdAt,
    updatedAt: createdAt,
  };
  if (post.poll) {
    payload.poll = post.poll;
    payload.pollVotes = {};
  }
  return payload;
}

function getOpenAiApiKey(): string {
  try {
    return String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
  } catch {
    return String(process.env.OPENAI_API_KEY || '').trim();
  }
}

function dailyRef(db: FirebaseFirestore.Firestore, dayKey: string): FirebaseFirestore.DocumentReference {
  return db.collection(DAILY_COLLECTION).doc(dayKey);
}

function readReadyPost(data: DailyCompassDoc | undefined): CompassPost | null {
  if (!data || data.schemaVersion !== DAILY_SCHEMA_VERSION || data.status !== 'ready') return null;
  return normalizeGeneratedCompassPost(data.post);
}

async function readCachedDailyPost(
  db: FirebaseFirestore.Firestore,
  dayKey: string,
): Promise<ResolvedDailyPost | null> {
  const snap = await dailyRef(db, dayKey).get().catch(() => null);
  const data = snap?.data() as DailyCompassDoc | undefined;
  const post = readReadyPost(data);
  return post ? { post, source: 'cache', model: data?.model } : null;
}

async function claimDailyGenerationLock(
  db: FirebaseFirestore.Firestore,
  dayKey: string,
  nowMs: number,
): Promise<boolean> {
  const ref = dailyRef(db, dayKey);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as DailyCompassDoc | undefined;
    if (readReadyPost(data)) return false;

    const updatedAtMs = Number(data?.updatedAtMs ?? data?.createdAtMs ?? 0);
    const ageMs = nowMs - updatedAtMs;
    if (data?.schemaVersion === DAILY_SCHEMA_VERSION && data.status === 'pending' && ageMs < GENERATION_LOCK_TTL_MS) {
      return false;
    }
    if (data?.schemaVersion === DAILY_SCHEMA_VERSION && data.status === 'rejected' && ageMs < REJECTED_RETRY_TTL_MS) {
      return false;
    }

    tx.set(ref, {
      schemaVersion: DAILY_SCHEMA_VERSION,
      status: 'pending',
      reason: null,
      createdAtMs: data?.createdAtMs || nowMs,
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
}

function errorReason(err: unknown): string {
  const anyErr = err as { code?: unknown; message?: unknown };
  return String(anyErr?.code || anyErr?.message || err || 'unknown').slice(0, 160);
}

async function markDailyGenerationRejected(
  db: FirebaseFirestore.Firestore,
  dayKey: string,
  reason: string,
  meta?: { model?: string; promptTokens?: number; completionTokens?: number },
): Promise<void> {
  const nowMs = Date.now();
  await dailyRef(db, dayKey).set({
    schemaVersion: DAILY_SCHEMA_VERSION,
    status: 'rejected',
    reason,
    model: meta?.model || null,
    promptTokens: meta?.promptTokens ?? null,
    completionTokens: meta?.completionTokens ?? null,
    updatedAtMs: nowMs,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function resolveDailyCompassPost(
  db: FirebaseFirestore.Firestore,
  now: Date,
  daySeed: number,
): Promise<ResolvedDailyPost> {
  const dayKey = getUtcDayKey(now);
  const fallback = pickCompassPostForDay(daySeed);

  const cached = await readCachedDailyPost(db, dayKey);
  if (cached) return cached;

  const jobCfg = await resolveJobConfig(db, 'compass');
  if (!jobCfg.enabled) return { post: fallback, source: 'fallback_disabled', model: jobCfg.model };

  const apiKey = getOpenAiApiKey();
  if (!apiKey) return { post: fallback, source: 'fallback_missing_key', model: jobCfg.model };

  const nowMs = Date.now();
  const claimed = await claimDailyGenerationLock(db, dayKey, nowMs);
  if (!claimed) return { post: fallback, source: 'fallback_pending', model: jobCfg.model };

  let gen: Awaited<ReturnType<typeof openAiChat>> | null = null;
  try {
    gen = await openAiChat({
      apiKey,
      model: jobCfg.model,
      messages: [{ role: 'user', content: buildLeagueCompassDailyPrompt({ dayKey, seed: daySeed }) }],
      maxTokens: GEN_MAX_TOKENS,
      temperature: GEN_TEMPERATURE,
    });

    const post = normalizeGeneratedCompassPost(gen.text);
    if (!post) {
      await markDailyGenerationRejected(db, dayKey, 'invalid_generated_post', {
        model: jobCfg.model,
        promptTokens: gen.promptTokens,
        completionTokens: gen.completionTokens,
      });
      return { post: fallback, source: 'fallback_failed', model: jobCfg.model };
    }

    await dailyRef(db, dayKey).set({
      schemaVersion: DAILY_SCHEMA_VERSION,
      status: 'ready',
      reason: null,
      post,
      model: jobCfg.model,
      promptTokens: gen.promptTokens,
      completionTokens: gen.completionTokens,
      updatedAtMs: Date.now(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection(BILLING_COLLECTION).doc().set({
      dayKey,
      model: jobCfg.model,
      kind: post.kind,
      promptTokens: gen.promptTokens,
      completionTokens: gen.completionTokens,
      published: true,
      createdAtMs: Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { post, source: 'ai', model: jobCfg.model };
  } catch (err) {
    const reason = errorReason(err);
    console.error('league compass daily generation failed', { dayKey, reason });
    await markDailyGenerationRejected(db, dayKey, reason, {
      model: jobCfg.model,
      promptTokens: gen?.promptTokens,
      completionTokens: gen?.completionTokens,
    }).catch((writeErr) => console.error('league compass rejected write failed', writeErr));
    await db.collection(BILLING_COLLECTION).doc().set({
      dayKey,
      model: jobCfg.model,
      promptTokens: gen?.promptTokens ?? 0,
      completionTokens: gen?.completionTokens ?? 0,
      published: false,
      reason,
      createdAtMs: Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch((billingErr) => console.error('league compass billing write failed', billingErr));
    return { post: fallback, source: 'fallback_failed', model: jobCfg.model };
  }
}

export async function runCompassChatDailyPost(
  now: Date = new Date(),
): Promise<{
  weekId: string;
  daySeed: number;
  dayKey: string;
  kind: string;
  source: DailyPostSource;
  processed: number;
  written: number;
  summaries: number;
  skipped: number;
}> {
  const db = admin.firestore();
  const weekId = getCurrentWeekId(now);
  const daySeed = getDaySeed(now);
  const dayKey = getUtcDayKey(now);
  const resolved = await resolveDailyCompassPost(db, now, daySeed);
  const post = resolved.post;
  const createdAt = Date.now();
  console.log(`compassChatDailyCron: weekId=${weekId} dayKey=${dayKey} kind=${post.kind} source=${resolved.source}`);

  let processed = 0;
  let written = 0;
  let skipped = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let batch = db.batch();
  let batchCount = 0;

  const flushBatch = async () => {
    if (batchCount > 0) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query: FirebaseFirestore.Query = db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .orderBy('__name__')
      .limit(PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    for (const doc of snap.docs) {
      processed++;
      const data = doc.data();
      if (countMembers(data) < MIN_MEMBERS_FOR_POST) {
        skipped++;
        continue;
      }

      const leagueId = Math.max(0, Math.trunc(Number(data.leagueId ?? 0)));
      batch.set(
        db.collection('league_chat_messages').doc(compassPostDocId(weekId, doc.id, daySeed)),
        buildMessagePayload(post, doc.id, weekId, leagueId, createdAt),
        { merge: false },
      );
      batchCount++;
      written++;

      if (batchCount >= BATCH_LIMIT) {
        await flushBatch();
      }
    }
  }

  await flushBatch();
  console.log(`compassChatDailyCron: processed=${processed} groups, written=${written}, skipped=${skipped}`);
  return {
    weekId,
    daySeed,
    dayKey,
    kind: post.kind,
    source: resolved.source,
    processed,
    written,
    summaries: 0,
    skipped,
  };
}

export const compassChatDailyCron = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1',
    secrets: [OPENAI_API_KEY],
  },
  async () => {
    await runCompassChatDailyPost(new Date());
  },
);

export const compassChatRunNow = onCall(
  { region: 'us-central1', enforceAppCheck: ENFORCE_APP_CHECK_OPENAI, timeoutSeconds: 540, memory: '512MiB', secrets: [OPENAI_API_KEY] },
  async (request) => {
    if (request.auth?.token?.admin !== true) {
      throw new HttpsError('permission-denied', 'admin_required');
    }
    const stats = await runCompassChatDailyPost(new Date());
    return { ok: true, ...stats };
  },
);

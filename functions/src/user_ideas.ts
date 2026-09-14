import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK, ENFORCE_APP_CHECK_SENSITIVE } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { openAiChat } from './explain/explain_provider';
import { hasPermission } from './admin/permissions';
import { hasAdminRole } from './admin/roles';
import { buildUserNotification, userNotificationRef } from './user_notifications';
import { createHash } from 'node:crypto';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const IDEAS_COLLECTION = 'user_ideas';
const RATE_COLLECTION = 'user_idea_rate_limits';
const IDEA_INBOX = 'idea_inbox';
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;
const IDEAS_MAX_LIST_LIMIT = 50;
const IDEAS_CURSOR_RE = /^[A-Za-z0-9_-]{1,200}$/;
const IDEA_PUBLIC_STATUSES = ['published', 'approved', 'in_progress', 'implemented'] as const;
const IDEA_ALL_STATUSES = ['pending', 'published', 'approved', 'in_progress', 'implemented', 'rejected', 'deleted', 'all'] as const;
const IDEA_LIFECYCLE_STATUSES = ['published', 'in_progress', 'implemented'] as const;

function publicName(value: unknown, fallback = 'Phraseman user'): string {
  const name = text(value, 120).replace(/\s+/g, ' ');
  return name || fallback;
}

function firstPublicName(values: readonly unknown[], fallback = 'Phraseman user'): string {
  let placeholder = '';
  for (const value of values) {
    const name = text(value, 120).replace(/\s+/g, ' ');
    if (!name) continue;
    if (name.toLowerCase() === 'phraseman user') {
      placeholder = name;
      continue;
    }
    return name;
  }
  return placeholder || publicName(fallback);
}

function hasConcretePublicName(values: readonly unknown[]): boolean {
  return values.some((value) => {
    const name = text(value, 120).replace(/\s+/g, ' ');
    return Boolean(name) && name.toLowerCase() !== 'phraseman user';
  });
}

function publicNameFromSources(
  profile: Record<string, unknown>,
  user: Record<string, unknown>,
  fallback: unknown,
): string {
  const progress = asRecord(user.progress);
  return firstPublicName([
    // users.progress is the canonical nickname source used by the app
    // snapshot, leaderboard and profile-card surfaces.
    progress.user_name,
    progress.userName,
    profile.name,
    profile.nickname,
    profile.username,
    profile.displayName,
    user.user_name,
    user.userName,
    user.nickname,
    user.username,
    user.name,
    user.displayName,
    fallback,
  ]);
}

async function resolveIdeaAuthorName(db: FirebaseFirestore.Firestore, stableUid: string, fallback: unknown): Promise<string> {
  const [profileSnap, userSnap] = await Promise.all([
    db.collection('public_profiles').doc(stableUid).get(),
    db.collection('users').doc(stableUid).get(),
  ]);
  const profile = profileSnap.data() || {};
  const user = userSnap.data() || {};
  return publicNameFromSources(profile, user, fallback);
}

function ideaLikeReceiptId(senderUid: string, ideaId: string): string {
  return `il_${createHash('sha256').update(`idea-like-v1\0${senderUid}\0${ideaId}`, 'utf8').digest('hex').slice(0, 48)}`;
}

function ideaLikeNotificationId(senderUid: string, ideaId: string): string {
  return `idea_like_${senderUid}_${ideaId}`.slice(0, 160);
}

function publicIdea(id: string, data: Record<string, unknown>, resolvedAuthorName?: unknown): Record<string, unknown> {
  return {
    id,
    title: text(data.title, 120),
    description: text(data.description, 2000),
    benefit: text(data.benefit, 1000),
    lang: nullableText(data.lang, 16),
    authorUid: text(data.uid, 180),
    authorName: firstPublicName([resolvedAuthorName, data.authorName, data.userName]),
    category: text(data.category, 40) || 'other',
    likeCount: Math.max(0, Math.floor(numeric(data.likeCount))),
    createdAtMs: Math.max(0, Math.floor(numeric(data.createdAtMs))),
    status: IDEA_PUBLIC_STATUSES.includes(String(data.status) as (typeof IDEA_PUBLIC_STATUSES)[number])
      ? data.status
      : 'published',
  };
}

/** Resolve author names in one batched read so old ideas are repaired on read. */
async function resolveIdeaAuthorNames(
  db: FirebaseFirestore.Firestore,
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): Promise<Map<string, string>> {
  const authorUids = [...new Set(docs
    .filter((doc) => !hasConcretePublicName([doc.data().authorName, doc.data().userName]))
    .map((doc) => text(doc.data().uid, 180))
    .filter(Boolean))];
  if (!authorUids.length) return new Map<string, string>();
  try {
    const [profileSnapshots, userSnapshots] = await Promise.all([
      db.getAll(...authorUids.map((uid) => db.collection('public_profiles').doc(uid))),
      db.getAll(...authorUids.map((uid) => db.collection('users').doc(uid))),
    ]);
    return new Map(authorUids.map((uid, index) => [
      uid,
      publicNameFromSources(
        (profileSnapshots[index]?.data() ?? {}) as Record<string, unknown>,
        (userSnapshots[index]?.data() ?? {}) as Record<string, unknown>,
        '',
      ),
    ]));
  } catch {
    // A missing profile must never make the public ideas feed fail.
    return new Map<string, string>();
  }
}

/** 1 идея в сутки на пользователя (защита от спама в админ-очереди). */
const MAX_IDEAS_PER_DAY = 1;

type IdeaCategory = 'feature' | 'improvement' | 'monetization' | 'content' | 'other';
const IDEA_CATEGORIES: readonly IdeaCategory[] = ['feature', 'improvement', 'monetization', 'content', 'other'];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function nullableText(value: unknown, max: number): string | null {
  const out = text(value, max);
  return out || null;
}

function enumText<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const out = text(value, 80) as T;
  return allowed.includes(out) ? out : fallback;
}

function numeric(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Пользователь отправляет идею
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Пользователь присылает креативную идею (4 графы: название, как работает, чем
 * поможет, категория). Пишем в коллекцию user_ideas со status='published'.
 * Никаких наград при отправке — год полного доступа выдаёт АДМИН при одобрении
 * через adminDecideUserIdea. Паттерн — копия submitClientReport.
 */
export const submitUserIdea = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 20,
  },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUidForAuth(db, authUid);
    const payload = asRecord(request.data?.payload ?? request.data);
    const authToken = asRecord(request.auth?.token);
    const authorName = await resolveIdeaAuthorName(
      db,
      stableUid,
      payload.userName ?? authToken.name ?? authToken.displayName,
    );

    const title = text(payload.title, 120);
    const description = text(payload.description, 2000);
    const benefit = text(payload.benefit, 1000);
    const category = enumText(payload.category, IDEA_CATEGORIES, 'other');

    if (title.length < 3) throw new HttpsError('invalid-argument', 'title_required');
    if (description.length < 10) throw new HttpsError('invalid-argument', 'description_required');

    const now = Date.now();
    const rateRef = db.collection(RATE_COLLECTION).doc(stableUid);
    const ideaRef = db.collection(IDEAS_COLLECTION).doc();
    const userRef = db.collection('users').doc(stableUid);

    return db.runTransaction(async (tx) => {
      const [userSnap, rateSnap] = await Promise.all([tx.get(userRef), tx.get(rateRef)]);
      const user = userSnap.data() || {};
      const blockedUntilMs = numeric(user.ideaSubmissionBlockedUntilMs);
      if (user.ideaSubmissionBlocked === true || (blockedUntilMs > now && Number.isFinite(blockedUntilMs))) {
        throw new HttpsError('permission-denied', 'idea_submission_restricted');
      }
      const rate = rateSnap.data() || {};
      const windowStartMs = numeric(rate.windowStartMs);
      const sameWindow = now - windowStartMs < DAY_MS;
      const count = sameWindow ? numeric(rate.count) : 0;
      if (count >= MAX_IDEAS_PER_DAY) {
        throw new HttpsError('resource-exhausted', 'rate_limited');
      }

      tx.set(
        rateRef,
        {
          stableUid,
          authUid,
          windowStartMs: sameWindow ? windowStartMs : now,
          count: count + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: now,
        },
        { merge: true },
      );

      const ideaData = {
        uid: stableUid,
        authUid,
        title,
        description,
        benefit,
        category,
        status: 'published',
        authorName,
        likeCount: 0,
        userName: nullableText(payload.userName, 120),
        lang: nullableText(payload.lang, 16),
        platform: text(payload.platform, 40) || 'unknown',
        appVersion: text(payload.appVersion, 80) || 'unknown',
        createdAt: new Date(now).toISOString(),
        createdAtMs: now,
        updatedAtMs: now,
        serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      tx.create(ideaRef, ideaData);

      return { ok: true, id: ideaRef.id, idea: publicIdea(ideaRef.id, ideaData, authorName) };
    });
  },
);

/** Автор может исправить уже опубликованную идею; дневной лимит относится только к новым идеям. */
export const updateUserIdea = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 20,
  },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const ideaId = text(request.data?.ideaId, 180);
    if (!ideaId || ideaId.includes('/') || ideaId === '.' || ideaId === '..') {
      throw new HttpsError('invalid-argument', 'ideaId_required');
    }
    const payload = asRecord(request.data?.payload ?? request.data);
    const title = text(payload.title, 120);
    const description = text(payload.description, 2000);
    const benefit = text(payload.benefit, 1000);
    const category = enumText(payload.category, IDEA_CATEGORIES, 'other');
    if (title.length < 3) throw new HttpsError('invalid-argument', 'title_required');
    if (description.length < 10) throw new HttpsError('invalid-argument', 'description_required');

    const db = admin.firestore();
    const stableUid = await resolveStableUidForAuth(db, request.auth.uid);
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    const now = Date.now();
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ideaRef);
      if (!snap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const data = snap.data() as Record<string, unknown>;
      if (text(data.uid, 180) !== stableUid) throw new HttpsError('permission-denied', 'idea_author_only');
      if (!IDEA_PUBLIC_STATUSES.includes(String(data.status) as (typeof IDEA_PUBLIC_STATUSES)[number])) {
        throw new HttpsError('failed-precondition', 'idea_not_editable');
      }
      tx.update(ideaRef, {
        title,
        description,
        benefit,
        category,
        updatedAtMs: now,
        editedAtMs: now,
        editedByUid: stableUid,
        editVersion: Math.max(0, Math.floor(numeric(data.editVersion))) + 1,
      });
      return { ok: true, id: ideaId, idea: publicIdea(ideaId, { ...data, title, description, benefit, category }) };
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 1a) Публичный каталог идей
// ─────────────────────────────────────────────────────────────────────────────
export const listPublicUserIdeas = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 20,
  },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const tab = enumText(request.data?.tab, ['top', 'new'] as const, 'top');
    const cursor = text(request.data?.cursor, 200);
    if (cursor && !IDEAS_CURSOR_RE.test(cursor)) throw new HttpsError('invalid-argument', 'cursor_invalid');
    const requestedLimit = Number(request.data?.limit);
    const limit = Math.max(1, Math.min(IDEAS_MAX_LIST_LIMIT, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 20));

    const db = admin.firestore();
    let query: FirebaseFirestore.Query = db.collection(IDEAS_COLLECTION)
      .where('status', 'in', [...IDEA_PUBLIC_STATUSES]);
    query = tab === 'top'
      ? query.orderBy('likeCount', 'desc').orderBy('createdAtMs', 'desc')
      : query.orderBy('createdAtMs', 'desc');
    if (cursor) {
      const cursorDoc = await db.collection(IDEAS_COLLECTION).doc(cursor).get();
      if (!cursorDoc.exists) throw new HttpsError('failed-precondition', 'cursor_not_found');
      query = query.startAfter(cursorDoc);
    }
    const snap = await query.limit(limit + 1).get();
    const pageDocs = snap.docs.slice(0, limit);
    const authorNames = await resolveIdeaAuthorNames(db, pageDocs);
    return {
      ok: true,
      tab,
      ideas: pageDocs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return publicIdea(doc.id, data, authorNames.get(text(data.uid, 180)));
      }),
      nextCursor: snap.docs.length > limit ? pageDocs[pageDocs.length - 1]?.id ?? null : null,
    };
  },
);

export const getPublicUserIdea = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 20,
  },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const ideaId = text(request.data?.ideaId, 180);
    if (!ideaId || ideaId.includes('/') || ideaId === '.' || ideaId === '..') {
      throw new HttpsError('invalid-argument', 'ideaId_required');
    }
    const snap = await admin.firestore().collection(IDEAS_COLLECTION).doc(ideaId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'idea_not_found');
    const data = snap.data() as Record<string, unknown>;
    if (!IDEA_PUBLIC_STATUSES.includes(String(data.status) as (typeof IDEA_PUBLIC_STATUSES)[number])) {
      throw new HttpsError('not-found', 'idea_not_found');
    }
    const db = admin.firestore();
    const storedAuthorName = [data.authorName, data.userName];
    const authorName = hasConcretePublicName(storedAuthorName)
      ? firstPublicName(storedAuthorName, '')
      : await resolveIdeaAuthorName(db, text(data.uid, 180), data.authorName || data.userName);
    return { ok: true, idea: publicIdea(snap.id, data, authorName) };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 1b) Админ: список идей с фильтрами по статусу/категории и пагинацией
// ─────────────────────────────────────────────────────────────────────────────
/**
 * зачем: в новой админке раздел "Идеи" был урезан до 3 карточек без фильтров и
 * действий (владелец продукта провёл аудит и попросил вернуть полноценный
 * воркфлоу, как в старой админке — фильтр по статусу/категории, пагинация,
 * список для дальнейшего принять/отклонить через adminDecideUserIdea).
 * Курсор — id последнего документа предыдущей страницы (сортировка по
 * createdAtMs desc, тот же паттерн, что и adminListReportQueue).
 */
export const adminListUserIdeas = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    const role = request.auth?.token?.adminRole;
    if (request.auth?.token?.admin !== true || !hasAdminRole(role) || !hasPermission(role, 'ideas.read')) {
      throw new HttpsError('permission-denied', 'Admin only');
    }

    const status = enumText(request.data?.status, IDEA_ALL_STATUSES, 'pending');
    const category = text(request.data?.category, 40);
    const cursor = text(request.data?.cursor, 200);
    if (cursor && !IDEAS_CURSOR_RE.test(cursor)) throw new HttpsError('invalid-argument', 'cursor_invalid');
    const requestedLimit = Number(request.data?.limit);
    const limit = Math.max(1, Math.min(IDEAS_MAX_LIST_LIMIT, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 20));

    const db = admin.firestore();
    let query: FirebaseFirestore.Query = db.collection(IDEAS_COLLECTION);
    if (status !== 'all') query = query.where('status', '==', status);
    query = query.orderBy('createdAtMs', 'desc');

    if (cursor) {
      const cursorDoc = await db.collection(IDEAS_COLLECTION).doc(cursor).get();
      if (!cursorDoc.exists) throw new HttpsError('failed-precondition', 'cursor_not_found');
      query = query.startAfter(cursorDoc);
    }

    // Категория не индексирована вместе со статусом — фильтруем в памяти на разумном окне,
    // не вытягивая всю коллекцию (Firebase-экономия: страница остаётся маленькой).
    const fetchLimit = category ? Math.min(200, limit * 5) : limit + 1;
    const snap = await query.limit(fetchLimit).get();
    let docs = snap.docs;
    if (category) docs = docs.filter((doc) => String(doc.data().category ?? '') === category);
    const hasMore = docs.length > limit;
    const page = docs.slice(0, limit);

    const items = page.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        title: text(data.title, 120),
        description: text(data.description, 2000),
        benefit: text(data.benefit, 1000),
        category: text(data.category, 40),
        status: text(data.status, 20),
        userName: nullableText(data.userName, 120),
        uid: text(data.uid, 180),
        lang: nullableText(data.lang, 16),
        createdAtMs: numeric(data.createdAtMs),
        decidedAtMs: data.decidedAt != null ? numeric(data.decidedAt) : null,
        decidedBy: nullableText(data.decidedBy, 160),
        likeCount: Math.max(0, Math.floor(numeric(data.likeCount))),
        reportCount: Math.max(0, Math.floor(numeric(data.reportCount))),
        moderationStatus: nullableText(data.moderationStatus, 40),
        autoHiddenAtMs: data.autoHiddenAtMs != null ? numeric(data.autoHiddenAtMs) : null,
        lastReportedAtMs: data.lastReportedAtMs != null ? numeric(data.lastReportedAtMs) : null,
      };
    });

    return {
      ok: true,
      items,
      nextCursor: hasMore && page.length ? page[page.length - 1].id : '',
    };
  },
);

/** Hide an idea from public lists while preserving its admin audit history. */
export const adminDeleteUserIdea = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    const role = request.auth?.token?.adminRole;
    if (request.auth?.token?.admin !== true || !hasAdminRole(role) || !hasPermission(role, 'ideas.decide')) {
      throw new HttpsError('permission-denied', 'Admin only');
    }
    const ideaId = text(request.data?.ideaId, 180);
    const reason = text(request.data?.reason, 600);
    if (!ideaId) throw new HttpsError('invalid-argument', 'ideaId_required');
    if (!reason) throw new HttpsError('invalid-argument', 'delete_reason_required');
    const db = admin.firestore();
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    const now = Date.now();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ideaRef);
      if (!snap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const status = String(snap.data()?.status ?? '');
      if (status === 'deleted') return;
      tx.update(ideaRef, {
        status: 'deleted',
        deletedAtMs: now,
        deletedAtIso: new Date(now).toISOString(),
        deletedBy: text(request.auth?.token?.email, 160) || request.auth?.uid || 'admin',
        deleteReason: reason,
        updatedAtMs: now,
      });
    });
    return { ok: true, ideaId, status: 'deleted' };
  },
);

/** Move a public idea through the product lifecycle without changing the old decision workflow. */
export const adminSetUserIdeaStatus = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    const role = request.auth?.token?.adminRole;
    if (request.auth?.token?.admin !== true || !hasAdminRole(role) || !hasPermission(role, 'ideas.decide')) {
      throw new HttpsError('permission-denied', 'Admin only');
    }
    const ideaId = text(request.data?.ideaId, 180);
    const nextStatus = enumText(request.data?.status, IDEA_LIFECYCLE_STATUSES, 'published');
    if (!ideaId) throw new HttpsError('invalid-argument', 'ideaId_required');
    const db = admin.firestore();
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    const now = Date.now();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ideaRef);
      if (!snap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const currentStatus = String(snap.data()?.status ?? '');
      if (currentStatus === 'deleted') throw new HttpsError('failed-precondition', 'deleted_idea');
      const transitionAllowed = (currentStatus === 'published' || currentStatus === 'approved') && nextStatus === 'in_progress'
        || currentStatus === 'in_progress' && nextStatus === 'implemented'
        || currentStatus === 'implemented' && nextStatus === 'in_progress';
      if (!transitionAllowed) throw new HttpsError('failed-precondition', 'invalid_lifecycle_transition');
      tx.update(ideaRef, {
        status: nextStatus,
        lifecycleUpdatedAtMs: now,
        lifecycleUpdatedBy: text(request.auth?.token?.email, 160) || request.auth?.uid || 'admin',
        updatedAtMs: now,
      });
    });
    return { ok: true, ideaId, status: nextStatus };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 2) Админ принимает решение по идее
// ─────────────────────────────────────────────────────────────────────────────
type IdeaDecision = 'approve' | 'reject';

/**
 * Локализованные дефолтные тексты модалки решения. Админ может переопределить любой
 * текст (titleRu/Uk + messageRu/Uk) — тогда показываем его. По Библии Phraseman:
 * approve = Стиль ИГРА+ИНВЕСТОР («год полного доступа»), reject = Стиль ЧЕЛОВЕК+ТРЕНЕР.
 */
function defaultDecisionTexts(decision: IdeaDecision): {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  messageRu: string;
  messageUk: string;
  messageEs: string;
} {
  if (decision === 'approve') {
    return {
      titleRu: 'Поздравляем — твоя идея принята! 🎉',
      titleUk: 'Вітаємо — твою ідею прийнято! 🎉',
      titleEs: '¡Felicidades! Tu idea ha sido aceptada 🎉',
      messageRu:
        'Твоя идея одобрена и взята в разработку.\n\nВ благодарность мы открываем тебе Premium на целый год. Спасибо, что делаешь Phraseman лучше.',
      messageUk:
        'Твою ідею схвалено та взято в розробку.\n\nНа подяку ми відкриваємо тобі Premium на цілий рік. Дякуємо, що робиш Phraseman кращим.',
      messageEs:
        'Tu idea ha sido aprobada y pasa a desarrollo.\n\nComo agradecimiento, te abrimos Premium durante todo un año. Gracias por ayudar a mejorar Phraseman.',
    };
  }
  return {
    titleRu: 'Спасибо за идею',
    titleUk: 'Дякуємо за ідею',
    titleEs: 'Gracias por la idea',
    messageRu:
      'Мы внимательно прочитали твою идею, но пока не берём её в работу.\n\nЭто не повод останавливаться — присылай ещё. Каждая идея помогает нам расти.',
    messageUk:
      'Ми уважно прочитали твою ідею, але поки не беремо її в роботу.\n\nЦе не привід зупинятися — надсилай ще. Кожна ідея допомагає нам зростати.',
    messageEs:
      'Leímos tu idea con atención, pero por ahora no la vamos a tomar en desarrollo.\n\nNo es motivo para detenerse: envíanos más. Cada idea nos ayuda a crecer.',
  };
}

/**
 * Кладёт в персональный инбокс пользователя документ-решение, который приложение
 * покажет модалкой на следующем открытии (см. app/idea_decision_modals.ts).
 */
function writeIdeaInbox(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  decision: IdeaDecision,
  texts: { titleRu: string; titleUk: string; titleEs: string; messageRu: string; messageUk: string; messageEs: string },
  ideaId: string,
  now: number,
): void {
  const inboxRef = db.collection('users').doc(uid).collection(IDEA_INBOX).doc();
  tx.set(inboxRef, {
    type: 'idea_decision',
    decision,
    ideaId,
    titleRu: texts.titleRu,
    titleUk: texts.titleUk,
    titleEs: texts.titleEs,
    messageRu: texts.messageRu,
    messageUk: texts.messageUk,
    messageEs: texts.messageEs,
    createdAt: now,
    seen: false,
  });
}

/**
 * Админ: принять (approve) или отклонить (reject) идею.
 * approve → выдаём 1 год полного доступа (VIP-грант с конкретным сроком now+365д,
 *   крон погасит ровно через год) + персональная модалка-поздравление.
 * reject → персональная модалка с объяснением (текст редактируется в админке).
 * Тексты модалки можно переопределить (titleRu/Uk, messageRu/Uk).
 */
export const adminDecideUserIdea = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
    timeoutSeconds: 20,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError('permission-denied', 'Admin only');
    }

    const ideaId = text(request.data?.ideaId, 180);
    const decision = enumText(request.data?.decision, ['approve', 'reject'] as const, 'reject');
    if (!ideaId) throw new HttpsError('invalid-argument', 'ideaId_required');

    const db = admin.firestore();
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    const now = Date.now();
    const adminEmail = text(request.auth.token.email, 160) || 'admin';

    // Переопределённые тексты модалки (если админ их прислал), иначе дефолт по Библии.
    const def = defaultDecisionTexts(decision);
    const texts = {
      titleRu: text(request.data?.titleRu, 200) || def.titleRu,
      titleUk: text(request.data?.titleUk, 200) || def.titleUk,
      titleEs: text(request.data?.titleEs, 200) || def.titleEs,
      messageRu: text(request.data?.messageRu, 2000) || def.messageRu,
      messageUk: text(request.data?.messageUk, 2000) || def.messageUk,
      messageEs: text(request.data?.messageEs, 2000) || def.messageEs,
    };

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ideaRef);
      if (!snap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const idea = snap.data() as Record<string, unknown>;
      const status = String(idea.status ?? '');
      if (status === 'approved' || status === 'rejected') {
        throw new HttpsError('failed-precondition', 'already_decided');
      }
      const targetUid = text(idea.uid, 180);
      if (!targetUid) throw new HttpsError('failed-precondition', 'idea_missing_uid');

      if (decision === 'approve') {
        // 1 год полного доступа. VIP-грант с конкретным сроком — крон premiumExpiryCron
        // НЕ трогает grant с vip_until>0 раньше времени, но погасит ровно через год.
        const userRef = db.collection('users').doc(targetUid);
        tx.set(
          userRef,
          {
            progress: {
              vip_active: 'true',
              vip_plan: 'idea_reward',
              vip_from: String(now),
              vip_until: String(now + YEAR_MS),
              vip_admin_override: 'true',
              vip_admin_grant_at: String(now),
              vip_admin_grant_reason: 'user_idea_approved',
            },
          },
          { merge: true },
        );
      }

      tx.update(ideaRef, {
        status: decision === 'approve' ? 'approved' : 'rejected',
        decidedAt: now,
        decidedAtIso: new Date(now).toISOString(),
        decidedBy: adminEmail,
        decisionTitleRu: texts.titleRu,
        decisionTitleUk: texts.titleUk,
        decisionMessageRu: texts.messageRu,
        decisionMessageUk: texts.messageUk,
        premiumGranted: decision === 'approve',
        premiumGrantUntilMs: decision === 'approve' ? now + YEAR_MS : null,
      });

      writeIdeaInbox(tx, db, targetUid, decision, texts, ideaId, now);
    });

    return { ok: true };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 3) Админ: ИИ-черновик текста модалки решения (СРАЗУ на языке пользователя)
// ─────────────────────────────────────────────────────────────────────────────
/** Человекочитаемое название языка для промпта (чтобы модель точно поняла). */
const IDEA_LANG_NAMES: Record<string, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Spanish',
  pt: 'Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  en: 'English',
};

const IDEA_DECISION_MSG_MAX = 900;

const IDEA_DRAFT_SYSTEM_PROMPT = [
  'You write a short in-app modal message for a user of Phraseman, an English-learning app.',
  'The user submitted a product idea. The team has made a decision on it.',
  'Write a warm, human, 2-4 sentence message addressed to the user (informal "you"),',
  'STRICTLY in the language given in the "language" field — do not mix languages.',
  'If decision is "approve": thank them warmly, say the idea is accepted and going into development,',
  'and that as a thank-you we open full Premium access for a whole year. Sound genuinely glad.',
  'If decision is "reject": thank them for the idea, gently say we are not taking it into work for now,',
  'and encourage them to keep sending ideas. No excuses, no blame, no bureaucratic tone.',
  'Speak as the team ("we"). No links, no deadlines, at most one emoji.',
  'Return STRICTLY a JSON object: {"message": "..."} with the message in the target language only.',
].join(' ');

// Максимальная длина подсказки-тона от админа. Тон задаётся на любом языке
// (обычно русском) и влияет ТОЛЬКО на стиль/содержание, но не на язык ответа —
// сообщение пользователю всё равно пишется на его языке (idea.lang).
const IDEA_TONE_HINT_MAX = 600;

/**
 * adminDraftIdeaDecision — ИИ-черновик текста модалки решения по идее.
 * Пишет текст СРАЗУ на языке пользователя (idea.lang), чтобы админу не нужно
 * было переводить. Админ может отредактировать перед отправкой в adminDecideUserIdea.
 *
 * data: { ideaId: string; decision: 'approve' | 'reject' }
 * Возвращает: { ok: true, message: string, lang: string }
 */
export const adminDraftIdeaDecision = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
    secrets: [OPENAI_API_KEY],
  },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError('permission-denied', 'Admin only');
    }

    const ideaId = text(request.data?.ideaId, 180);
    const decision = enumText(request.data?.decision, ['approve', 'reject'] as const, 'reject');
    const toneHint = text(request.data?.toneHint, IDEA_TONE_HINT_MAX);
    if (!ideaId) throw new HttpsError('invalid-argument', 'ideaId_required');

    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

    const db = admin.firestore();
    const snap = await db.collection(IDEAS_COLLECTION).doc(ideaId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'idea_not_found');
    const idea = snap.data() as Record<string, unknown>;

    const langCode = (text(idea.lang, 8) || 'ru').toLowerCase();
    const languageName = IDEA_LANG_NAMES[langCode] || IDEA_LANG_NAMES[langCode.slice(0, 2)] || 'Russian';

    const userPayload = JSON.stringify({
      language: languageName,
      decision,
      // Тон — первоклассное поле payload'а: модель видит его вместе с идеей и
      // обязана применить. Пустая строка, если админ тон не задал.
      admin_tone_instruction: toneHint || '',
      idea: {
        title: text(idea.title, 120),
        description: text(idea.description, 1500),
        benefit: text(idea.benefit, 600),
        category: text(idea.category, 40),
      },
    });

    // Диагностика: видно, дошёл ли тон до функции и какой длины (в Cloud Logs).
    console.log('[draftIdeaDecision]', JSON.stringify({
      ideaId, decision, lang: langCode,
      toneLen: toneHint.length, tone: toneHint.slice(0, 200),
    }));

    // Базовый промпт. Если задан тон — он идёт ПОСЛЕДНИМ сообщением (после payload),
    // максимально императивно: модель сильнее слушает последнее указание, а базовый
    // сценарий явно объявляется переопределяемым тоном.
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: IDEA_DRAFT_SYSTEM_PROMPT },
      { role: 'user', content: userPayload },
    ];
    if (toneHint) {
      messages.push({
        role: 'system',
        content: [
          '=== OVERRIDE: ADMIN TONE INSTRUCTION (HIGHEST PRIORITY) ===',
          'The admin explicitly set a custom instruction for THIS reply. It OVERRIDES the default',
          'thank-you/rejection wording and the suggested sentence structure above. Rewrite the',
          'message so it clearly, obviously reflects this instruction — a reader must be able to',
          'tell the tone/content changed. Do NOT fall back to the generic template.',
          'Only these hard limits still apply: write in the target language, 2-4 sentences,',
          'at most one emoji, no links.',
          'If the instruction is written in another language, apply its MEANING but still WRITE',
          'the final message in the target language.',
          'ADMIN INSTRUCTION -> ' + toneHint,
        ].join('\n'),
      });
    }

    const result = await openAiChat({
      apiKey,
      model: 'gpt-4o-mini',
      messages,
      maxTokens: 400,
      // С тоном даём модели больше свободы отклониться от шаблона; без тона —
      // сдержаннее (стабильный дефолт).
      temperature: toneHint ? 0.9 : 0.6,
      responseFormat: { type: 'json_object' },
    });

    // Модель может вернуть НЕ JSON, а прозу/отказ. Тогда JSON.parse падает, и раньше
    // админ видел глухое «INTERNAL» без причины. Отдаём понятную ошибку с обрезанным
    // сырым текстом модели, чтобы было видно её ответ (в т.ч. текст отказа), и админ
    // мог написать сообщение вручную.
    const raw = String(result.text || '').trim();
    if (!raw) {
      throw new HttpsError('failed-precondition', 'ИИ вернул пустой ответ — сформулируй сообщение вручную.');
    }
    if (toneHint) console.log('[draftIdeaDecision] raw ->', raw.slice(0, 400));
    let message = '';
    try {
      const parsed = JSON.parse(raw) as { message?: unknown };
      message = text(parsed.message, IDEA_DECISION_MSG_MAX);
    } catch {
      throw new HttpsError(
        'failed-precondition',
        `ИИ не вернул черновик (возможно, отказ). Ответ модели: ${raw.slice(0, 300)}`,
      );
    }
    if (!message) {
      throw new HttpsError(
        'failed-precondition',
        `ИИ вернул пустое сообщение. Ответ модели: ${raw.slice(0, 300)}`,
      );
    }

    return { ok: true, message, lang: langCode };
  },
);

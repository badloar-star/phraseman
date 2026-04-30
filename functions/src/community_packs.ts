/**
 * Community (UGC) packs — Cloud Functions (источник правды для покупок и модерации).
 * Осколки только внутри приложения; вывода в фиат нет.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const COMMUNITY_PACKS = 'community_packs';
const COMMUNITY_SUBMISSIONS = 'community_pack_submissions';
const COMMUNITY_PURCHASES = 'community_pack_purchases';
const COMMUNITY_RATINGS = 'community_pack_ratings';
const SELLER_INBOX = 'community_seller_inbox';

/** Снят с витрины по требованию модерации; автор может доработать и снова отправить на ревью. */
const LISTING_ADMIN_REVISION = 'admin_revision_required';
/** Мягкое удаление: не в маркете; покупатели сохраняют доступ к карточкам через CF. */
const LISTING_ADMIN_REMOVED = 'admin_removed';

const CARD_MIN = 10;
const CARD_MAX = 50;
const PRICE_MIN = 20;
const PRICE_MAX = 300;
/** Базис 10_000 = 100 %. Часть цены не передаётся автору (остаётся в экономике приложения). */
const PLATFORM_FEE_BPS = 1500;

const UGC_CARD_THEME_KEYS = new Set([
  'neon_lime',
  'aqua_pulse',
  'magenta_pop',
  'solar_gold',
  'violet_nebula',
  'ember_coal',
]);

type SubmissionPayload = {
  title?: string;
  description?: string;
  titleRu: string;
  titleUk: string;
  descriptionRu?: string;
  descriptionUk?: string;
  cardThemeKey?: string;
  priceShards: number;
  cards: Array<{ id: string; en: string; ru: string; uk?: string }>;
};

function trimModeratorMessage(raw: unknown): string {
  const s = raw != null ? String(raw) : '';
  return s.trim().slice(0, 3500);
}

function moderatorMessageOrNull(s: string): string | null {
  const t = s.trim();
  return t ? t.slice(0, 3500) : null;
}

function normalizeSubmissionPayload(raw: SubmissionPayload): SubmissionPayload {
  const titleSingle = String(raw.title ?? raw.titleRu ?? raw.titleUk ?? '').trim();
  let descSingle = String(raw.description ?? raw.descriptionRu ?? raw.descriptionUk ?? '').trim();
  if (!titleSingle) {
    throw new HttpsError('invalid-argument', 'title required');
  }
  if (!descSingle) {
    descSingle = titleSingle;
  }
  const n = raw.cards?.length ?? 0;
  if (n < CARD_MIN || n > CARD_MAX) {
    throw new HttpsError('invalid-argument', `Cards must be ${CARD_MIN}–${CARD_MAX}`);
  }
  const price = Math.floor(Number(raw.priceShards));
  if (!Number.isFinite(price) || price < PRICE_MIN || price > PRICE_MAX) {
    throw new HttpsError('invalid-argument', `priceShards must be ${PRICE_MIN}–${PRICE_MAX}`);
  }
  for (const c of raw.cards) {
    if (!c?.id || !String(c.en).trim() || !String(c.ru).trim()) {
      throw new HttpsError('invalid-argument', 'Each card needs id, en, ru');
    }
  }
  let cardThemeKey = String(raw.cardThemeKey ?? 'neon_lime').trim();
  if (!UGC_CARD_THEME_KEYS.has(cardThemeKey)) {
    cardThemeKey = 'neon_lime';
  }
  return {
    titleRu: titleSingle,
    titleUk: titleSingle,
    descriptionRu: descSingle,
    descriptionUk: descSingle,
    priceShards: price,
    cards: raw.cards,
    cardThemeKey,
  };
}

function safeCardThemeKey(p: SubmissionPayload): string {
  const k = String(p.cardThemeKey ?? 'neon_lime').trim();
  return UGC_CARD_THEME_KEYS.has(k) ? k : 'neon_lime';
}

function parseShards(data: admin.firestore.DocumentData | undefined): number {
  const raw = data?.shards;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function authorNetShards(price: number): number {
  const fee = Math.floor((price * PLATFORM_FEE_BPS) / 10_000);
  const net = price - fee;
  return Math.max(0, net);
}

/**
 * Отправка набора на модерацию (создаёт документ в community_pack_submissions).
 * Доверие к authorStableId — как к клиентским путям users/{stableId} в текущей архитектуре; усиление через auth-мост — отдельная задача.
 */
export const communitySubmitPackForReview = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const callerAuthUid = request.auth.uid;
  const authorStableId = String(request.data?.authorStableId ?? '').trim();
  const rawPayload = request.data?.payload as SubmissionPayload | undefined;
  const updatePackId = String(request.data?.updatePackId ?? '').trim();
  if (!authorStableId) {
    throw new HttpsError('invalid-argument', 'authorStableId required');
  }
  if (!rawPayload) {
    throw new HttpsError('invalid-argument', 'payload required');
  }
  const payload = normalizeSubmissionPayload(rawPayload);

  const db = admin.firestore();
  const subRef = db.collection(COMMUNITY_SUBMISSIONS).doc();
  const now = Date.now();

  if (updatePackId) {
    const dup = await db
      .collection(COMMUNITY_SUBMISSIONS)
      .where('editTargetPackId', '==', updatePackId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (!dup.empty) {
      throw new HttpsError('failed-precondition', 'Edit review already pending');
    }
    const packRef = db.collection(COMMUNITY_PACKS).doc(updatePackId);
    await db.runTransaction(async (tx) => {
      const pSnap = await tx.get(packRef);
      if (!pSnap.exists) {
        throw new HttpsError('not-found', 'Pack not found');
      }
      const pd = pSnap.data() as Record<string, unknown>;
      if (String(pd.authorStableId ?? '') !== authorStableId) {
        throw new HttpsError('permission-denied', 'Not your pack');
      }
      const st = String(pd.listingStatus ?? '');
      if (st !== 'published' && st !== 'update_pending' && st !== LISTING_ADMIN_REVISION) {
        throw new HttpsError('failed-precondition', 'Pack not editable');
      }
      const previousPayloadSnapshot = {
        titleRu: pd.titleRu ?? '',
        titleUk: pd.titleUk ?? '',
        descriptionRu: pd.descriptionRu ?? '',
        descriptionUk: pd.descriptionUk ?? '',
        priceShards: pd.priceShards ?? 0,
        cards: pd.cards ?? [],
        cardThemeKey: pd.cardThemeKey ?? null,
      };
      tx.set(subRef, {
        status: 'pending',
        authorStableId,
        submittedAt: now,
        payload,
        submissionKind: 'edit',
        editTargetPackId: updatePackId,
        previousPayloadSnapshot,
        callerAuthUid,
      });
      tx.update(packRef, { listingStatus: 'update_pending', updatedAt: now });
    });
    return { submissionId: subRef.id };
  }

  await subRef.set({
    status: 'pending',
    authorStableId,
    submittedAt: now,
    payload,
    submissionKind: 'create',
    callerAuthUid,
  });
  return { submissionId: subRef.id };
});

/**
 * Модерация: approve | reject | request_changes. Только custom claim admin.
 * Опциональный moderatorMessage (и legacy rejectReason) — в заявке и в inbox автора.
 */
export const communityModerateSubmission = onCall(async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const submissionId = String(request.data?.submissionId ?? '').trim();
  const action = String(request.data?.action ?? '').trim() as 'approve' | 'reject' | 'request_changes';
  const moderatorMessage = trimModeratorMessage(request.data?.moderatorMessage);
  const legacyReject = trimModeratorMessage(request.data?.rejectReason);
  const effectiveMessage = moderatorMessage || legacyReject;

  if (!submissionId || !['approve', 'reject', 'request_changes'].includes(action)) {
    throw new HttpsError('invalid-argument', 'submissionId and action approve|reject|request_changes required');
  }

  const db = admin.firestore();
  const subRef = db.collection(COMMUNITY_SUBMISSIONS).doc(submissionId);

  let approvedPackId: string | null = null;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(subRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Submission not found');
    }
    const d = snap.data() as {
      status?: string;
      authorStableId?: string;
      payload?: SubmissionPayload;
      editTargetPackId?: string;
    };
    if (d.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Submission is not pending');
    }
    const authorStableId = String(d.authorStableId ?? '').trim();
    const now = Date.now();
    const msgForInbox = moderatorMessageOrNull(effectiveMessage);

    const writeModerationInbox = (result: 'approved' | 'rejected' | 'revision_requested') => {
      if (!authorStableId) return;
      const inboxRef = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc();
      tx.set(inboxRef, {
        type: 'moderation_result',
        result,
        submissionId,
        message: msgForInbox,
        titleRu: (d.payload?.titleRu ?? '').trim().slice(0, 200) || null,
        titleUk: (d.payload?.titleUk ?? '').trim().slice(0, 200) || null,
        createdAt: now,
        seen: false,
      });
    };

    const editTargetEarly = String(d.editTargetPackId ?? '').trim();
    let editPackExistsForRestore = false;
    if (editTargetEarly && (action === 'reject' || action === 'request_changes')) {
      const ps = await tx.get(db.collection(COMMUNITY_PACKS).doc(editTargetEarly));
      editPackExistsForRestore = ps.exists;
    }

    if (action === 'reject') {
      tx.update(subRef, {
        status: 'rejected',
        reviewedAt: now,
        rejectReason: effectiveMessage,
        moderatorMessage: msgForInbox,
      });
      if (editTargetEarly && editPackExistsForRestore) {
        tx.update(db.collection(COMMUNITY_PACKS).doc(editTargetEarly), { listingStatus: 'published', updatedAt: now });
      }
      writeModerationInbox('rejected');
      return;
    }

    if (action === 'request_changes') {
      tx.update(subRef, {
        status: 'needs_revision',
        reviewedAt: now,
        moderatorMessage: effectiveMessage,
      });
      if (editTargetEarly && editPackExistsForRestore) {
        tx.update(db.collection(COMMUNITY_PACKS).doc(editTargetEarly), { listingStatus: 'published', updatedAt: now });
      }
      writeModerationInbox('revision_requested');
      return;
    }

    const rawPayload = d.payload;
    if (!rawPayload) {
      throw new HttpsError('failed-precondition', 'Submission has no payload');
    }
    const payload = normalizeSubmissionPayload(rawPayload);
    const themeKey = safeCardThemeKey(payload);
    const editTarget = String(d.editTargetPackId ?? '').trim();

    if (editTarget) {
      const packRef = db.collection(COMMUNITY_PACKS).doc(editTarget);
      const packSnap = await tx.get(packRef);
      if (!packSnap.exists) {
        throw new HttpsError('not-found', 'Pack to update not found');
      }
      const existing = (packSnap.data() ?? {}) as Record<string, unknown>;
      tx.set(packRef, {
        ...existing,
        listingStatus: 'published',
        authorStableId: d.authorStableId ?? existing.authorStableId ?? null,
        submissionId: editTarget,
        titleRu: payload.titleRu.trim(),
        titleUk: payload.titleUk.trim(),
        descriptionRu: (payload.descriptionRu ?? '').trim() || null,
        descriptionUk: (payload.descriptionUk ?? '').trim() || null,
        priceShards: Math.floor(Number(payload.priceShards)),
        cards: payload.cards,
        cardCount: payload.cards.length,
        cardThemeKey: themeKey,
        updatedAt: now,
      });
      tx.update(subRef, {
        status: 'approved',
        reviewedAt: now,
        publishedPackId: editTarget,
        moderatorMessage: msgForInbox,
      });
      writeModerationInbox('approved');
      approvedPackId = editTarget;
      return;
    }

    const packRef = db.collection(COMMUNITY_PACKS).doc(submissionId);
    const packSnap = await tx.get(packRef);
    if (packSnap.exists) {
      throw new HttpsError('already-exists', 'Published pack already exists for this id');
    }

    tx.set(packRef, {
      listingStatus: 'published',
      authorStableId: d.authorStableId ?? null,
      submissionId,
      titleRu: payload.titleRu.trim(),
      titleUk: payload.titleUk.trim(),
      descriptionRu: (payload.descriptionRu ?? '').trim() || null,
      descriptionUk: (payload.descriptionUk ?? '').trim() || null,
      priceShards: Math.floor(Number(payload.priceShards)),
      cards: payload.cards,
      cardCount: payload.cards.length,
      cardThemeKey: themeKey,
      ratingSum: 0,
      ratingAvg: 0,
      ratingCount: 0,
      salesCount: 0,
      publishedAt: now,
      updatedAt: now,
    });

    tx.update(subRef, {
      status: 'approved',
      reviewedAt: now,
      publishedPackId: submissionId,
      moderatorMessage: msgForInbox,
    });
    writeModerationInbox('approved');
    approvedPackId = submissionId;
  });

  return { ok: true, publishedPackId: action === 'approve' ? approvedPackId : null };
});

function buildSellerInboxModerationRow(params: {
  result: 'revision_requested' | 'pack_removed';
  packId: string;
  now: number;
  message: string | null;
  titleRu: string | null;
  titleUk: string | null;
}): Record<string, unknown> {
  const row: Record<string, unknown> = {
    type: 'moderation_result',
    result: params.result,
    packId: params.packId,
    createdAt: params.now,
    seen: false,
  };
  if (params.message) row.message = params.message;
  if (params.titleRu) row.titleRu = params.titleRu;
  if (params.titleUk) row.titleUk = params.titleUk;
  return row;
}

/**
 * Админ: снять набор с витрины на доработку или удалить (мягко). Inbox автору — как при модерации заявок.
 * Явный регион us-central1 — как getFunctions в админке и в приложении.
 */
export const communityAdminModeratePack = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const packId = String(request.data?.packId ?? '').trim();
  const action = String(request.data?.action ?? '').trim() as 'require_revision' | 'remove';
  const moderatorMessage = trimModeratorMessage(request.data?.moderatorMessage);
  const msgForInbox = moderatorMessageOrNull(moderatorMessage);

  if (!packId || !['require_revision', 'remove'].includes(action)) {
    throw new HttpsError('invalid-argument', 'packId and action require_revision|remove required');
  }

  const db = admin.firestore();
  const packRef = db.collection(COMMUNITY_PACKS).doc(packId);

  const run = async () => {
    await db.runTransaction(async (tx) => {
      const packSnap = await tx.get(packRef);
      if (!packSnap.exists) {
        throw new HttpsError('not-found', 'Pack not found');
      }
      const pack = packSnap.data() as Record<string, unknown>;
      const st = String(pack.listingStatus ?? '');
      if (st === LISTING_ADMIN_REMOVED) {
        throw new HttpsError('failed-precondition', 'Pack already removed');
      }
      if (st !== 'published' && st !== 'update_pending' && st !== LISTING_ADMIN_REVISION) {
        throw new HttpsError('failed-precondition', 'Pack is not active for admin action');
      }
      const authorStableId = String(pack.authorStableId ?? '').trim();
      const now = Date.now();
      const tRu = String(pack.titleRu ?? '').trim().slice(0, 200) || null;
      const tUk = String(pack.titleUk ?? '').trim().slice(0, 200) || null;

      const writeInbox = (result: 'revision_requested' | 'pack_removed') => {
        if (!authorStableId) return;
        const inboxRef = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc();
        tx.set(
          inboxRef,
          buildSellerInboxModerationRow({
            result,
            packId,
            now,
            message: msgForInbox,
            titleRu: tRu,
            titleUk: tUk,
          }),
        );
      };

      const patchAdminMessage = (base: Record<string, unknown>) => {
        if (msgForInbox) {
          return { ...base, adminLastMessage: msgForInbox };
        }
        return { ...base, adminLastMessage: admin.firestore.FieldValue.delete() };
      };

      if (action === 'require_revision') {
        if (st === 'update_pending') {
          throw new HttpsError(
            'failed-precondition',
            'У набора уже висит заявка на правку в очереди — обработайте её во вкладке заявок.',
          );
        }
        tx.update(packRef, patchAdminMessage({
          listingStatus: LISTING_ADMIN_REVISION,
          updatedAt: now,
          adminLastAction: 'require_revision',
          adminLastActionAt: now,
        }) as Record<string, unknown>);
        writeInbox('revision_requested');
        return;
      }

      if (st === 'update_pending') {
        throw new HttpsError(
          'failed-precondition',
          'У набора висит заявка на правку в очереди — сначала заявки.',
        );
      }

      tx.update(packRef, patchAdminMessage({
        listingStatus: LISTING_ADMIN_REMOVED,
        updatedAt: now,
        adminLastAction: 'remove',
        adminLastActionAt: now,
      }) as Record<string, unknown>);
      writeInbox('pack_removed');
    });
  };

  try {
    await run();
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    const m = e instanceof Error ? e.message : String(e);
    console.error('communityAdminModeratePack failed', m, e);
    throw new HttpsError('internal', m || 'server');
  }

  return { ok: true };
});

/**
 * Карточки набора, если пользователь — автор (кроме admin_removed) или покупатель.
 */
export const communityFetchPackCardsIfAccessible = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const stableId = String(request.data?.stableId ?? '').trim();
  const packId = String(request.data?.packId ?? '').trim();
  if (!stableId || !packId) {
    throw new HttpsError('invalid-argument', 'stableId and packId required');
  }

  const db = admin.firestore();
  const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
  const packSnap = await packRef.get();
  if (!packSnap.exists) {
    throw new HttpsError('not-found', 'Pack not found');
  }
  const pack = packSnap.data() as Record<string, unknown>;
  const st = String(pack.listingStatus ?? '');
  const authorStableId = String(pack.authorStableId ?? '').trim();

  if (stableId === authorStableId) {
    if (st === LISTING_ADMIN_REMOVED) {
      throw new HttpsError('permission-denied', 'Pack was removed');
    }
    const cards = Array.isArray(pack.cards) ? pack.cards : [];
    return { ok: true, cards };
  }

  const purchaseId = `${stableId}__${packId}`;
  const purSnap = await db.collection(COMMUNITY_PURCHASES).doc(purchaseId).get();
  if (!purSnap.exists) {
    throw new HttpsError('permission-denied', 'No access');
  }
  if (st !== 'published' && st !== 'update_pending' && st !== LISTING_ADMIN_REVISION && st !== LISTING_ADMIN_REMOVED) {
    throw new HttpsError('failed-precondition', 'Pack unavailable');
  }
  const cards = Array.isArray(pack.cards) ? pack.cards : [];
  return { ok: true, cards };
});

/**
 * Покупка опубликованного набора: списание у покупателя, начисление автору (за вычетом внутриигровой комиссии), запись покупки, inbox продавцу.
 */
export const communityPurchasePack = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const buyerStableId = String(request.data?.buyerStableId ?? '').trim();
  const packId = String(request.data?.packId ?? '').trim();
  const buyerDisplayName = String(request.data?.buyerDisplayName ?? 'Игрок').trim().slice(0, 80);
  if (!buyerStableId || !packId) {
    throw new HttpsError('invalid-argument', 'buyerStableId and packId required');
  }

  const db = admin.firestore();
  const purchaseId = `${buyerStableId}__${packId}`;
  const purchaseRef = db.collection(COMMUNITY_PURCHASES).doc(purchaseId);
  const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
  const buyerRef = db.collection('users').doc(buyerStableId);

  const result = await db.runTransaction(async (tx) => {
    const [pSnap, purSnap, buyerSnap] = await Promise.all([
      tx.get(packRef),
      tx.get(purchaseRef),
      tx.get(buyerRef),
    ]);

    if (!pSnap.exists) {
      throw new HttpsError('not-found', 'Pack not found');
    }
    const pack = pSnap.data() as {
      listingStatus?: string;
      authorStableId?: string;
      priceShards?: number;
      salesCount?: number;
    };
    if (pack.listingStatus !== 'published') {
      throw new HttpsError('failed-precondition', 'Pack is not published');
    }
    const authorStableId = String(pack.authorStableId ?? '').trim();
    if (!authorStableId) {
      throw new HttpsError('failed-precondition', 'Pack has no author');
    }
    if (authorStableId === buyerStableId) {
      throw new HttpsError('failed-precondition', 'Cannot buy your own pack');
    }

    const price = Math.floor(Number(pack.priceShards));
    if (!Number.isFinite(price) || price < PRICE_MIN || price > PRICE_MAX) {
      throw new HttpsError('failed-precondition', 'Invalid pack price');
    }

    if (purSnap.exists) {
      return { alreadyOwned: true as const, priceShards: price };
    }

    const buyerShards = parseShards(buyerSnap.data());
    if (buyerShards < price) {
      throw new HttpsError('failed-precondition', 'Insufficient shards');
    }

    const authorRef = db.collection('users').doc(authorStableId);
    const authorSnap = await tx.get(authorRef);
    const authorShards = parseShards(authorSnap.data());
    const net = authorNetShards(price);

    tx.set(purchaseRef, {
      packId,
      buyerStableId,
      authorStableId,
      priceShards: price,
      authorNetShards: net,
      platformFeeShards: price - net,
      createdAt: Date.now(),
      buyerDisplayName,
    });

    tx.set(buyerRef, { shards: buyerShards - price }, { merge: true });
    tx.set(authorRef, { shards: authorShards + net }, { merge: true });

    tx.update(packRef, {
      salesCount: admin.firestore.FieldValue.increment(1),
      updatedAt: Date.now(),
    });

    const inboxRef = authorRef.collection(SELLER_INBOX).doc(purchaseId);
    tx.set(inboxRef, {
      type: 'pack_sold',
      packId,
      buyerStableId,
      buyerDisplayName,
      grossShards: price,
      authorNetShards: net,
      createdAt: Date.now(),
      seen: false,
    });

    return {
      alreadyOwned: false as const,
      priceShards: price,
      authorNetShards: net,
      buyerBalanceAfter: buyerShards - price,
    };
  });

  return result;
});

/**
 * Список непрочитанных событий продажи для автора (для модалки при входе).
 * Доверие к authorStableId — как у communityPurchasePack.
 */
export const communityListSellerInbox = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authorStableId = String(request.data?.authorStableId ?? '').trim();
  if (!authorStableId) {
    throw new HttpsError('invalid-argument', 'authorStableId required');
  }
  const limit = Math.min(50, Math.max(1, Math.floor(Number(request.data?.limit) || 20)));

  const db = admin.firestore();
  const snap = await db
    .collection('users')
    .doc(authorStableId)
    .collection(SELLER_INBOX)
    .where('seen', '==', false)
    .limit(limit)
    .get();

  const events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  return { events };
});

/**
 * Пометить события inbox как просмотренные (для модалки «уже показали»).
 */
export const communityMarkSellerInboxSeen = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authorStableId = String(request.data?.authorStableId ?? '').trim();
  const eventIds = request.data?.eventIds as unknown;
  if (!authorStableId || !Array.isArray(eventIds) || eventIds.length === 0) {
    throw new HttpsError('invalid-argument', 'authorStableId and eventIds[] required');
  }
  const ids = eventIds.map((x) => String(x).trim()).filter(Boolean).slice(0, 30);
  const db = admin.firestore();
  const batch = db.batch();
  const now = Date.now();
  for (const id of ids) {
    const ref = db.collection('users').doc(authorStableId).collection(SELLER_INBOX).doc(id);
    batch.set(ref, { seen: true, seenAt: now }, { merge: true });
  }
  await batch.commit();
  return { ok: true };
});

function readRatingAggregates(pack: Record<string, unknown>): { ratingSum: number; ratingCount: number; ratingAvg: number } {
  let ratingCount = Math.floor(Number(pack.ratingCount) || 0);
  if (ratingCount < 0) ratingCount = 0;
  let ratingSum = Number(pack.ratingSum);
  if (!Number.isFinite(ratingSum)) {
    const avg = Number(pack.ratingAvg);
    ratingSum = Number.isFinite(avg) && ratingCount > 0 ? avg * ratingCount : 0;
  }
  const ratingAvg = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 100) / 100 : 0;
  return { ratingSum, ratingCount, ratingAvg };
}

/** Средняя оценка и оценка текущего покупателя (документ оценок клиенту не читается из Firestore). */
export const communityGetPackRatingSummary = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const buyerStableId = String(request.data?.buyerStableId ?? '').trim();
  const packId = String(request.data?.packId ?? '').trim();
  if (!buyerStableId || !packId) {
    throw new HttpsError('invalid-argument', 'buyerStableId and packId required');
  }

  const db = admin.firestore();
  const packSnap = await db.collection(COMMUNITY_PACKS).doc(packId).get();
  if (!packSnap.exists) {
    throw new HttpsError('not-found', 'Pack not found');
  }
  const pack = packSnap.data() as Record<string, unknown>;
  const listingSt = String(pack.listingStatus ?? '');
  const purchaseId = `${buyerStableId}__${packId}`;
  const purSnap = await db.collection(COMMUNITY_PURCHASES).doc(purchaseId).get();
  const purchased = purSnap.exists;
  const { ratingAvg, ratingCount } = readRatingAggregates(pack);

  const ratingSnap = await db.collection(COMMUNITY_RATINGS).doc(purchaseId).get();
  let myStars: number | null = null;
  if (ratingSnap.exists) {
    const s = Math.floor(Number((ratingSnap.data() as { stars?: unknown })?.stars));
    if (s >= 1 && s <= 5) myStars = s;
  }

  if (listingSt !== 'published') {
    return { purchased, canRate: false, myStars, ratingAvg, ratingCount };
  }

  const authorStableId = String(pack.authorStableId ?? '').trim();
  const canRate = purchased && !!authorStableId && authorStableId !== buyerStableId;
  return { purchased, canRate, myStars, ratingAvg, ratingCount };
});

/**
 * Оценка 1–5 звёздами (как в Google Play): только после покупки, одна оценка на покупателя (можно изменить).
 */
export const communitySubmitPackRating = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const buyerStableId = String(request.data?.buyerStableId ?? '').trim();
  const packId = String(request.data?.packId ?? '').trim();
  const stars = Math.floor(Number(request.data?.stars));
  if (!buyerStableId || !packId) {
    throw new HttpsError('invalid-argument', 'buyerStableId and packId required');
  }
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    throw new HttpsError('invalid-argument', 'stars must be 1–5');
  }

  const db = admin.firestore();
  const purchaseId = `${buyerStableId}__${packId}`;
  const purchaseRef = db.collection(COMMUNITY_PURCHASES).doc(purchaseId);
  const packRef = db.collection(COMMUNITY_PACKS).doc(packId);
  const ratingRef = db.collection(COMMUNITY_RATINGS).doc(purchaseId);

  const out = await db.runTransaction(async (tx) => {
    const [purSnap, packSnap, rateSnap] = await Promise.all([tx.get(purchaseRef), tx.get(packRef), tx.get(ratingRef)]);

    if (!purSnap.exists) {
      throw new HttpsError('failed-precondition', 'Purchase required to rate');
    }
    if (!packSnap.exists) {
      throw new HttpsError('not-found', 'Pack not found');
    }
    const pack = packSnap.data() as Record<string, unknown>;
    if (String(pack.listingStatus ?? '') !== 'published') {
      throw new HttpsError('failed-precondition', 'Pack is not published');
    }
    const authorStableId = String(pack.authorStableId ?? '').trim();
    if (!authorStableId || authorStableId === buyerStableId) {
      throw new HttpsError('failed-precondition', 'Cannot rate own pack');
    }

    const { ratingSum: sum0, ratingCount: cnt0, ratingAvg: avg0 } = readRatingAggregates(pack);
    const oldStars = rateSnap.exists ? Math.floor(Number((rateSnap.data() as { stars?: unknown })?.stars)) : null;
    const oldValid = oldStars != null && oldStars >= 1 && oldStars <= 5;

    let newSum: number;
    let newCount: number;
    if (!oldValid) {
      newSum = sum0 + stars;
      newCount = cnt0 + 1;
    } else {
      newSum = sum0 - oldStars + stars;
      newCount = Math.max(1, cnt0);
    }
    const ratingAvg = newCount > 0 ? Math.round((newSum / newCount) * 100) / 100 : 0;
    const now = Date.now();

    tx.set(
      ratingRef,
      {
        packId,
        buyerStableId,
        stars,
        updatedAt: now,
      },
      { merge: true },
    );
    tx.update(packRef, {
      ratingSum: newSum,
      ratingCount: newCount,
      ratingAvg,
      updatedAt: now,
    });

    return { ratingAvg, ratingCount: newCount, myStars: stars };
  });

  return { ok: true, ...out };
});

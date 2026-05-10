/**
 * Одноразовая оценка контента (1–3★) на пользователя: users/{stableId}/phrase_content_ratings/{id}
 * + агрегаты phrase_content_rating_stats/{id} для админки.
 *
 * Версия текста (labelFingerprint): тот же itemId, но другая подпись → обнуление count* и обновление label
 * в phrase_content_rating_stats (при открытии экрана с новым текстом или при submit).
 */
import * as admin from 'firebase-admin';
import * as crypto from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

const REGION = 'us-central1';
const STATS = 'phrase_content_rating_stats';
const USERS = 'users';

const ALLOWED_SCOPES = new Set([
  'lesson_practice',
  'lesson_theory',
  'dictionary_word',
  'irregular_verb_drill',
  'preposition_drill',
  'quiz',
  'exam',
]);

function normItemId(raw: string): string {
  return raw.trim().slice(0, 400);
}

function statDocId(scope: string, itemId: string): string {
  const h = crypto.createHash('sha256').update(`${scope}:${itemId}`, 'utf8').digest('hex');
  return h.slice(0, 40);
}

function trimLabel(s: string | undefined): string {
  if (!s) return '';
  /** Длиннее подпись — админка показывает фактический текст из приложения. */
  return s.replace(/\s+/g, ' ').trim().slice(0, 1200);
}

/** SHA-256, 32 hex — один itemId + разный текст ⇒ разный отпечаток. */
function labelFingerprint(scope: string, itemId: string, trimmedLabel: string): string {
  const payload = trimmedLabel || `${scope}:${itemId}`;
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 32);
}

function effectiveStatsFingerprint(statsSnap: DocumentSnapshot, scope: string, itemId: string): string | null {
  if (!statsSnap.exists) return null;
  const d = statsSnap.data() as { labelFingerprint?: unknown; label?: unknown };
  if (typeof d.labelFingerprint === 'string' && d.labelFingerprint.length > 0) {
    return d.labelFingerprint;
  }
  return labelFingerprint(scope, itemId, trimLabel(d.label != null ? String(d.label) : ''));
}

const CALLABLE_BASE = { region: REGION, enforceAppCheck: false } as const;

export const phraseContentRatingGetState = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const stableUserId = String(request.data?.stableUserId ?? '').trim();
  const scope = String(request.data?.scope ?? '').trim();
  const itemId = normItemId(String(request.data?.itemId ?? ''));
  if (!stableUserId || !itemId) {
    throw new HttpsError('invalid-argument', 'stableUserId and itemId required');
  }
  if (!ALLOWED_SCOPES.has(scope)) {
    throw new HttpsError('invalid-argument', 'Invalid scope');
  }
  const id = statDocId(scope, itemId);
  const db = admin.firestore();
  const userRef = db.collection(USERS).doc(stableUserId).collection('phrase_content_ratings').doc(id);
  const statsRef = db.collection(STATS).doc(id);

  const data = request.data ?? {};
  const legacyMode = !Object.prototype.hasOwnProperty.call(data, 'labelSnippet');

  if (legacyMode) {
    const snap = await userRef.get();
    if (!snap.exists) {
      return { myStars: null as number | null };
    }
    const stars = Math.floor(Number((snap.data() as { stars?: unknown })?.stars));
    return { myStars: stars >= 1 && stars <= 3 ? stars : null };
  }

  const labelSnippet = trimLabel(data.labelSnippet != null ? String(data.labelSnippet) : '');
  const incomingFp = labelFingerprint(scope, itemId, labelSnippet);

  const [statsSnap, userSnap] = await Promise.all([statsRef.get(), userRef.get()]);
  const effFp = effectiveStatsFingerprint(statsSnap, scope, itemId);

  if (statsSnap.exists && effFp !== null && effFp !== incomingFp) {
    const prev = statsSnap.data() as { label?: unknown };
    const newLabel = trimLabel(labelSnippet) || trimLabel(prev.label != null ? String(prev.label) : '');
    const now = Date.now();
    await statsRef.set(
      {
        scope,
        itemId,
        count1: 0,
        count2: 0,
        count3: 0,
        label: newLabel,
        labelFingerprint: incomingFp,
        updatedAt: now,
      },
      { merge: true },
    );
    return { myStars: null as number | null };
  }

  if (!userSnap.exists) {
    return { myStars: null as number | null };
  }
  const u = userSnap.data() as { stars?: unknown; labelFingerprint?: unknown };
  const stars = Math.floor(Number(u.stars));
  const valid = stars >= 1 && stars <= 3;
  const userFp = typeof u.labelFingerprint === 'string' ? u.labelFingerprint : null;

  if (userFp !== null) {
    if (userFp !== incomingFp) return { myStars: null as number | null };
    return { myStars: valid ? stars : null };
  }

  return { myStars: valid ? stars : null };
});

export const phraseContentRatingSubmit = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const stableUserId = String(request.data?.stableUserId ?? '').trim();
  const scope = String(request.data?.scope ?? '').trim();
  const itemId = normItemId(String(request.data?.itemId ?? ''));
  const stars = Math.floor(Number(request.data?.stars));
  const labelSnippet = trimLabel(request.data?.labelSnippet != null ? String(request.data.labelSnippet) : '');

  if (!stableUserId || !itemId) {
    throw new HttpsError('invalid-argument', 'stableUserId and itemId required');
  }
  if (!ALLOWED_SCOPES.has(scope)) {
    throw new HttpsError('invalid-argument', 'Invalid scope');
  }
  if (!Number.isFinite(stars) || stars < 1 || stars > 3) {
    throw new HttpsError('invalid-argument', 'stars must be 1–3');
  }

  const db = admin.firestore();
  const id = statDocId(scope, itemId);
  const userRef = db.collection(USERS).doc(stableUserId).collection('phrase_content_ratings').doc(id);
  const statsRef = db.collection(STATS).doc(id);
  const now = Date.now();
  const cntField = stars === 1 ? 'count1' : stars === 2 ? 'count2' : 'count3';
  const incomingFp = labelFingerprint(scope, itemId, labelSnippet);

  const out = await db.runTransaction(async (tx) => {
    const [existing, statsSnap] = await Promise.all([tx.get(userRef), tx.get(statsRef)]);
    const d = statsSnap.exists ? (statsSnap.data() as { label?: unknown; createdAt?: unknown }) : null;
    const effFp = statsSnap.exists ? effectiveStatsFingerprint(statsSnap, scope, itemId) : null;
    const contentChanged = !!statsSnap.exists && effFp !== null && effFp !== incomingFp;

    if (existing.exists) {
      const u = existing.data() as { stars?: unknown; labelFingerprint?: unknown; createdAt?: unknown };
      const prev = Math.floor(Number(u.stars));
      const valid = prev >= 1 && prev <= 3;
      const userFp = typeof u.labelFingerprint === 'string' ? u.labelFingerprint : null;

      if (userFp !== null) {
        if (userFp === incomingFp && valid) {
          return { ok: false as const, alreadyRated: true, stars: prev };
        }
      } else if (!contentChanged && valid) {
        return { ok: false as const, alreadyRated: true, stars: prev };
      }
    }

    const trimmed = trimLabel(labelSnippet);
    const fallbackLabel = trimmed || (d && trimLabel(d.label != null ? String(d.label) : '')) || '';

    tx.set(
      userRef,
      {
        scope,
        itemId,
        stars,
        labelFingerprint: incomingFp,
        ...(!existing.exists ? { createdAt: now } : {}),
      },
      { merge: true },
    );

    if (contentChanged || !statsSnap.exists) {
      const patch: Record<string, unknown> = {
        scope,
        itemId,
        label: fallbackLabel,
        labelFingerprint: incomingFp,
        count1: stars === 1 ? 1 : 0,
        count2: stars === 2 ? 1 : 0,
        count3: stars === 3 ? 1 : 0,
        updatedAt: now,
      };
      if (!statsSnap.exists) {
        patch.createdAt = now;
      }
      tx.set(statsRef, patch, { merge: true });
    } else {
      tx.set(
        statsRef,
        {
          scope,
          itemId,
          label: trimmed || String(d?.label ?? ''),
          labelFingerprint: incomingFp,
          [cntField]: admin.firestore.FieldValue.increment(1),
          updatedAt: now,
        },
        { merge: true },
      );
    }

    return { ok: true as const, alreadyRated: false, stars };
  });

  if (!out.ok && out.alreadyRated) {
    return { ok: false, alreadyRated: true, stars: out.stars };
  }
  return { ok: true, alreadyRated: false, stars: out.stars };
});

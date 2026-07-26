/**
 * DEV: выдача +1 спин-кредита рулетки по кнопке «DEV +1» в referrals hero.
 *
 * Только для тестовых dev-сборок. Защита:
 *   - гейт «Пульта»: remote_config/app.numbers.referral_dev_grant_enabled === true,
 *     иначе failed-precondition 'DEV_GRANT_DISABLED' (в проде флаг выключен — см. scripts/enable_dev_grant.mjs);
 *   - та же привязка auth↔stableId, что у referralSpin (assertAuthStableLink).
 *
 * Пишет progress.referral_spin_credits тем же путём, что referralClaimSpin,
 * с клиента поле недоступно (rules: blockedPremiumProgressKeys) — пишем Admin SDK.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { assertAuthStableLink } from './referral';
import { randomUUID } from 'node:crypto';
import {
  assertReferralDevGrantAcquisitionAllowed,
  reconcileDevGrantLedger,
} from './referral_dev_grant_policy';
import {
  REFERRAL_ANALYTICS_EVENTS,
  referralRoulettePolicyFromData,
} from './referral_roulette_policy';
import {
  REFERRAL_SPIN_LEDGER,
  REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID,
  REFERRAL_SPIN_LEDGER_VERSION,
  buildAvailableCredit,
  buildLegacyCreditRows,
  ledgerRowFromData,
  shouldMigrateLegacyAggregate,
} from './referral_spin_ledger';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

const USERS = 'users';

/** Гейт «Пульта». Строго === true; отсутствие/мусор/ошибка чтения → запрещено (безопасный дефолт). */
async function isDevGrantEnabled(db: admin.firestore.Firestore): Promise<boolean> {
  try {
    const snap = await db.collection('remote_config').doc('app').get();
    const data = snap.data() as { numbers?: Record<string, unknown> } | undefined;
    return data?.numbers?.referral_dev_grant_enabled === true;
  } catch (e) {
    console.warn('isDevGrantEnabled: remote_config read failed, denying', e);
    return false;
  }
}

type DevGrantResult = {
  ok: true;
  spinsTotal: number;
};

/**
 * +1 спин-кредит для dev-теста. Ошибки:
 * unauthenticated / invalid-argument / failed-precondition
 * (DEV_GRANT_DISABLED, LINK_ACCOUNT_REQUIRED).
 */
export const referralDevGrantSpin = onCall(CALLABLE_BASE, async (request): Promise<DevGrantResult> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authUid = request.auth.uid;
  const stableId = String(request.data?.stableId ?? '').trim();
  if (!stableId) {
    throw new HttpsError('invalid-argument', 'stableId required');
  }

  const db = admin.firestore();
  if (!(await isDevGrantEnabled(db))) {
    throw new HttpsError('failed-precondition', 'DEV_GRANT_DISABLED');
  }
  await assertAuthStableLink(db, authUid, stableId);

  const userRef = db.collection(USERS).doc(stableId);
  const configRef = db.collection('remote_config').doc('app');
  const devCreditRef = userRef.collection(REFERRAL_SPIN_LEDGER).doc(`dev_${randomUUID()}`);

  return db.runTransaction(async (tx): Promise<DevGrantResult> => {
    const [configSnap, userSnap] = await Promise.all([tx.get(configRef), tx.get(userRef)]);
    const configData = configSnap.data() as { numbers?: Record<string, unknown> } | undefined;
    if (configData?.numbers?.referral_dev_grant_enabled !== true) {
      throw new HttpsError('failed-precondition', 'DEV_GRANT_DISABLED');
    }
    const policy = referralRoulettePolicyFromData(configData);
    assertReferralDevGrantAcquisitionAllowed(policy);
    const userData = userSnap.data() ?? {};
    const progress = (userData as { progress?: Record<string, unknown> }).progress ?? {};

    const aggregateBefore = Math.max(0, Math.floor(Number(progress.referral_spin_credits ?? 0)));
    const nowMs = Date.now();
    const ledgerCollection = userRef.collection(REFERRAL_SPIN_LEDGER);
    const migrationMarkerRef = ledgerCollection.doc(REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID);
    const [migrationMarkerSnap, anyLedgerSnap] = await Promise.all([
      tx.get(migrationMarkerRef),
      tx.get(ledgerCollection.limit(1)),
    ]);
    const migrateLegacyAggregate = shouldMigrateLegacyAggregate({
      migrationMarkerExists: migrationMarkerSnap.exists,
      anyLedgerDocumentExists: !anyLedgerSnap.empty,
    });
    const shouldWriteMigrationMarker = !migrationMarkerSnap.exists;
    let legacyRows: ReturnType<typeof buildLegacyCreditRows> = [];
    let legacyRefs: admin.firestore.DocumentReference[] = [];
    let legacySnaps: admin.firestore.DocumentSnapshot[] = [];
    if (migrateLegacyAggregate) {
      try {
        legacyRows = buildLegacyCreditRows(stableId, aggregateBefore);
      } catch {
        throw new HttpsError('failed-precondition', 'LEGACY_CREDIT_MIGRATION_TOO_LARGE');
      }
      legacyRefs = legacyRows.map((row) => userRef.collection(REFERRAL_SPIN_LEDGER).doc(row.id));
      legacySnaps = await Promise.all(legacyRefs.map((ref) => tx.get(ref)));
    }
    const availableSnap = await tx.get(
      ledgerCollection.where('status', '==', 'available').limit(450),
    );
    if (availableSnap.size >= 450) {
      throw new HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
    }
    const persistedRows = availableSnap.docs.map((doc) => {
      const parsed = ledgerRowFromData(doc.id, doc.data() as Record<string, unknown>);
      if (!parsed) throw new HttpsError('failed-precondition', 'LEDGER_INVALID_CREDIT');
      return parsed;
    });
    const persistedIds = new Set(persistedRows.map((row) => row.id));
    const migrationRows = legacyRows.filter((row, index) => (
      !legacySnaps[index].exists && !persistedIds.has(row.id)
    ));
    const reconciliation = reconcileDevGrantLedger([...persistedRows, ...migrationRows], nowMs);
    const expiredIds = new Set(reconciliation.expiredIds);
    const migrationIds = new Set(migrationRows.map((row) => row.id));
    const persistedExpiredCount = reconciliation.expiredIds
      .filter((id) => !migrationIds.has(id)).length;
    const conservativeWriteCount = migrationRows.length
      + persistedExpiredCount
      + 2
      + (shouldWriteMigrationMarker ? 1 : 0);
    if (conservativeWriteCount > 480) {
      throw new HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
    }

    migrationRows.forEach((row) => {
      const { id: _id, ...data } = row;
      tx.create(ledgerCollection.doc(row.id), {
        ...data,
        earnedAt: admin.firestore.Timestamp.fromMillis(row.earnedAtMs),
        expiresAt: admin.firestore.Timestamp.fromMillis(row.expiresAtMs),
        ...(expiredIds.has(row.id) ? {
          status: 'expired',
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          expiredAtMs: nowMs,
        } : {}),
      });
    });
    for (const creditId of expiredIds) {
      if (migrationIds.has(creditId)) continue;
      tx.set(ledgerCollection.doc(creditId), {
        status: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        expiredAtMs: nowMs,
      }, { merge: true });
    }
    if (shouldWriteMigrationMarker) {
      tx.create(migrationMarkerRef, {
        kind: 'migration_marker',
        version: REFERRAL_SPIN_LEDGER_VERSION,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
      });
    }

    const devCredit = buildAvailableCredit({
      id: devCreditRef.id,
      ownerStableId: stableId,
      source: 'dev_grant',
      earnedAtMs: nowMs,
    });
    const { id: _devCreditId, ...devCreditData } = devCredit;
    tx.create(devCreditRef, {
      ...devCreditData,
      earnedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(devCredit.expiresAtMs),
    });
    const spinsTotal = reconciliation.spinsTotalAfterGrant;

    tx.set(
      userRef,
      {
        progress: {
          referral_spin_credits: spinsTotal,
          referral_spin_ledger_version: REFERRAL_SPIN_LEDGER_VERSION,
          ...(migrateLegacyAggregate
            ? { referral_spin_ledger_migrated_at_ms: nowMs }
            : {}),
        },
        updatedAt: nowMs,
      },
      { merge: true },
    );

    console.log(JSON.stringify({
      event: REFERRAL_ANALYTICS_EVENTS.creditEarned,
      source: 'dev_grant',
      ownerStableId: stableId,
      creditId: devCreditRef.id,
      earnedAtMs: nowMs,
      expiresAtMs: devCredit.expiresAtMs,
    }));
    return { ok: true, spinsTotal };
  });
});

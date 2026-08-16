/**
 * Устав Phraseman в админке: чтение, сохранение с историей, откат.
 *
 * зачем (владелец, 2026-08-16): «изучи продукт и дай ему фулл описание… пиши
 * сразу устав где-то в админке, на который он будет ориентироваться… удобными
 * категориями, чтобы было удобно раз в месяц всё проверить и обновить, а также
 * записывать и сохранять всегда историю».
 *
 * Приём взят у admin_remote_config: ревизия против одновременной правки,
 * идемпотентность против двойного нажатия, неизменяемая история для отката.
 * Не изобретаю свой — расхождение двух похожих механик в этом проекте уже
 * приводило к багам.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, ENFORCE_APP_CHECK, requireAdminAppCheck } from './callable_options';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import {
  PRODUCT_CHARTER_HISTORY_COLLECTION,
  PRODUCT_CHARTER_SECTIONS,
  diffProductCharters,
  nextProductCharterReviewDate,
  parseProductCharter,
  validateProductCharterSections,
} from './jarvis/product_charter';

const REGION = 'us-central1';
const CHARTER_COLLECTION = 'admin_config';
const CHARTER_DOC_ID = 'product_charter';
/** Сколько версий показывать. Больше сотни владелец всё равно не листает. */
const HISTORY_LIMIT = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireCharterAdmin(request: { auth?: { token?: Record<string, unknown>; uid?: string } }): {
  actorUid: string;
  role: string;
} {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = roleFromAdminToken(request.auth.token);
  // зачем то же право, что у remote config: устав определяет, что бот говорит
  // клиентам, — это настройка приложения, а не просмотр отчёта.
  if (!role || !hasPermission(role, 'application.config.write')) {
    throw new HttpsError('permission-denied', 'Role cannot edit the product charter');
  }
  return { actorUid: String(request.auth.uid ?? ''), role };
}

export const adminGetProductCharter = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requireCharterAdmin(request);
    const db = admin.firestore();
    // зачем limit: история неограниченно растёт, а панели нужен хвост.
    const [charterSnap, historySnap] = await Promise.all([
      db.collection(CHARTER_COLLECTION).doc(CHARTER_DOC_ID).get(),
      db.collection(PRODUCT_CHARTER_HISTORY_COLLECTION)
        .orderBy('revision', 'desc').limit(HISTORY_LIMIT).get(),
    ]);
    const charter = parseProductCharter(charterSnap.data());
    const history = historySnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        revision: Number(data.revision ?? 0),
        timestamp: String(data.timestamp ?? ''),
        actorUid: String(data.actorUid ?? ''),
        reason: String(data.reason ?? ''),
        changes: Array.isArray(data.changes) ? data.changes : [],
      };
    });
    return {
      ok: true,
      charter,
      sections: PRODUCT_CHARTER_SECTIONS,
      history,
    };
  },
);

export const adminSaveProductCharter = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const { actorUid, role } = requireCharterAdmin(request);
    const data = isRecord(request.data) ? request.data : {};

    const idempotencyKey = String(data.idempotencyKey ?? '').trim();
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey)) {
      throw new HttpsError('invalid-argument', 'idempotencyKey is required');
    }
    const expectedRevision = Number(data.expectedRevision ?? -1);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new HttpsError('invalid-argument', 'expectedRevision is required');
    }
    const reason = String(data.reason ?? '').trim().slice(0, 500);

    let sections;
    try {
      sections = validateProductCharterSections(data.sections);
    } catch (error) {
      throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid sections');
    }
    if (sections.length === 0) {
      // зачем запрет на пустой устав: пустой документ выглядит как «знания
      // нет», и Джарвис молча переключится на запасной файл. Стереть устав
      // случайной правкой в панели нельзя.
      throw new HttpsError('invalid-argument', 'charter cannot be empty');
    }

    const db = admin.firestore();
    const charterRef = db.collection(CHARTER_COLLECTION).doc(CHARTER_DOC_ID);
    const operationRef = db.collection('admin_command_operations').doc(idempotencyKey);
    // guard-ok: .doc() без аргумента — ссылка на НОВЫЙ документ, а не выборка
    // коллекции. Чтений здесь нет: обе строки только резервируют id.
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection(PRODUCT_CHARTER_HISTORY_COLLECTION).doc();
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();

    return db.runTransaction(async (tx) => {
      const [charterSnap, operationSnap] = await Promise.all([tx.get(charterRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        // зачем: двойное нажатие «Сохранить» не должно плодить две версии.
        const previous = operationSnap.data() ?? {};
        if (previous.actorUid !== actorUid) {
          throw new HttpsError('already-exists', 'idempotencyKey replay does not match the original actor');
        }
        return { ok: true, revision: Number(previous.revision ?? 0), replayed: true };
      }

      const before = parseProductCharter(charterSnap.data());
      if (before.revision !== expectedRevision) {
        // зачем: устав правят из панели, и вторая вкладка не должна затирать
        // первую молча — иначе кусок работы исчезает без следа.
        throw new HttpsError('failed-precondition', 'charter changed; reload before saving');
      }

      const revision = before.revision + 1;
      const reviewBy = nextProductCharterReviewDate(nowMs);
      const after = {
        sections: sections.map((section) => ({ key: section.key, body: section.body })),
        revision,
        reviewBy,
        updatedAtMs: nowMs,
        updatedBy: actorUid,
      };
      const changes = diffProductCharters(before, parseProductCharter(after));

      const audit = createAuditRecord({
        action: 'product_charter.save',
        actorUid,
        role,
        entity: { collection: CHARTER_COLLECTION, id: CHARTER_DOC_ID },
        reason,
        before: { revision: before.revision },
        after: { revision, reviewBy },
        rollbackReference: historyRef.id,
        requestId: idempotencyKey,
        timestamp: now,
      });

      tx.set(charterRef, after);
      // зачем хранить ПОЛНЫЙ текст версии, а не только разницу: история нужна,
      // чтобы вернуть прежний устав целиком. По одной разнице восстановить
      // текст нельзя, если промежуточная версия потерялась.
      tx.create(historyRef, {
        revision,
        timestamp: now,
        actorUid,
        reason,
        changes,
        sections: after.sections,
      });
      tx.create(auditRef, { ...audit, operationId: idempotencyKey });
      tx.create(operationRef, {
        operationId: idempotencyKey,
        actorUid,
        revision,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, revision, replayed: false, changes, reviewBy };
    });
  },
);

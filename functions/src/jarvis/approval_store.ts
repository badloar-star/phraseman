import {
  buildApprovalToken,
  hashNonce,
  verifyApprovalToken,
  type ApprovalAction,
  type ApprovalRejectReason,
  type ApprovalTokenDoc,
} from './approval_token';

/**
 * Хранилище одноразовых approval-токенов Джарвиса.
 *
 * зачем транзакция, а не read-then-write: между чтением и записью помещается
 * второе нажатие. Владелец жмёт кнопку дважды (палец дрогнул, сеть подтормозила) —
 * и действие выполнилось бы дважды. Проверка и погашение обязаны быть одной
 * неделимой операцией.
 *
 * Документ лежит под ХЕШЕМ nonce: сырой nonce нигде на сервере не появляется,
 * даже в пути документа.
 */

export const JARVIS_APPROVAL_COLLECTION = 'jarvis_approval_tokens';

export interface IssueApprovalTokenInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly decisionHash: string;
  readonly department: string;
  readonly action: ApprovalAction;
  readonly ownerTelegramUserId: string;
  readonly ownerTelegramChatId: string;
  readonly nowMs: number;
  readonly ttlMs?: number;
}

export interface IssuedApprovalToken {
  /** Уходит ТОЛЬКО в callback_data кнопки. */
  readonly nonce: string;
  readonly callbackData: string;
}

export async function issueApprovalToken(input: IssueApprovalTokenInput): Promise<IssuedApprovalToken> {
  const built = buildApprovalToken({
    decisionHash: input.decisionHash,
    department: input.department,
    action: input.action,
    ownerTelegramUserId: input.ownerTelegramUserId,
    ownerTelegramChatId: input.ownerTelegramChatId,
    nowMs: input.nowMs,
    ttlMs: input.ttlMs,
  });

  // guard-ok (limit): .doc() адресует ОДИН документ по хешу, это не запрос
  // коллекции — limit()/where() тут неприменимы.
  const ref = input.db.collection(JARVIS_APPROVAL_COLLECTION).doc(built.doc.nonceHash);
  // guard-ok (merge/await): set БЕЗ merge намеренно — токен создаётся целиком
  // и не должен наследовать поля от предыдущего документа с тем же хешем
  // (в частности usedAtMs, иначе новая кнопка родилась бы уже «нажатой»).
  // Запись дожидается через await runTransaction ниже, ошибка пробрасывается.
  await input.db.runTransaction(async (tx) => {
    tx.set(ref as FirebaseFirestore.DocumentReference, { ...built.doc });
  });

  return Object.freeze({ nonce: built.nonce, callbackData: built.callbackData });
}

export interface ConsumeApprovalTokenInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly nonce: string;
  readonly fromTelegramUserId: string;
  readonly fromTelegramChatId: string;
  readonly nowMs: number;
  /** Действие из callback_data обязано совпасть с действием запечатанного токена. */
  readonly requestedAction?: ApprovalAction;
}

export type ConsumeApprovalTokenResult =
  | { readonly ok: true; readonly doc: ApprovalTokenDoc }
  | { readonly ok: false; readonly reason: ApprovalRejectReason | 'storage_error' };

/**
 * Проверяет и ГАСИТ токен одной транзакцией.
 *
 * зачем не гасить при отказе: иначе чужой человек, получив пересланное
 * сообщение, «сжигал» бы вашу кнопку простым нажатием — отказ в обслуживании.
 * Помечается использованным только успешное нажатие владельца.
 */
export async function consumeApprovalToken(
  input: ConsumeApprovalTokenInput,
): Promise<ConsumeApprovalTokenResult> {
  const ref = input.db
    .collection(JARVIS_APPROVAL_COLLECTION)
    .doc(hashNonce(input.nonce)) as FirebaseFirestore.DocumentReference;

  try {
    return await input.db.runTransaction<ConsumeApprovalTokenResult>(async (tx) => {
      const snap = await tx.get(ref);
      const doc = snap.exists ? (snap.data() as ApprovalTokenDoc) : null;

      const verdict = verifyApprovalToken({
        doc,
        nonce: input.nonce,
        fromTelegramUserId: input.fromTelegramUserId,
        fromTelegramChatId: input.fromTelegramChatId,
        nowMs: input.nowMs,
      });
      if (!verdict.ok) return { ok: false, reason: verdict.reason };
      if (input.requestedAction && verdict.doc.action !== input.requestedAction) {
        return { ok: false, reason: 'unknown_nonce' };
      }

      tx.update(ref, { usedAtMs: input.nowMs });
      return { ok: true, doc: verdict.doc };
    });
  } catch {
    // Недоступное хранилище — это отказ, а не молчаливое одобрение.
    return { ok: false, reason: 'storage_error' };
  }
}

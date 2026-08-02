import type { ApprovalAction, ApprovalRejectReason } from './approval_token';

/**
 * Журнал подтверждений (в186 брифа: неизменяемый журнал действий).
 *
 * зачем писать и отказы тоже: отклонённое нажатие — это тоже свидетельство.
 * Если кто-то пытался нажать вашу кнопку и получил отказ, вы должны увидеть
 * это в журнале, а не в тишине.
 *
 * зачем НЕ хранить nonce: журнал живёт долго, а nonce — ключ. Журнал не
 * должен превращаться в связку ключей, даже если вызывающий по ошибке
 * принесёт лишнее поле.
 */

export const JARVIS_APPROVAL_AUDIT_COLLECTION = 'jarvis_approval_audit';

export type ApprovalOutcome = 'accepted' | ApprovalRejectReason | 'storage_error';

export interface ApprovalAuditEntry {
  readonly action: ApprovalAction;
  readonly department: string;
  readonly decisionHash: string;
  readonly outcome: ApprovalOutcome;
  readonly atMs: number;
}

export interface BuildApprovalAuditEntryInput {
  readonly action: ApprovalAction;
  readonly department: string;
  readonly decisionHash: string;
  readonly outcome: ApprovalOutcome;
  readonly nowMs: number;
}

/**
 * Поля перечислены ЯВНО, а не через spread.
 *
 * зачем: spread пропустил бы наружу всё, что принёс вызывающий, — включая
 * nonce. Явный список делает утечку невозможной и ломает сборку, если в
 * контракт добавят поле и забудут решить, писать его или нет.
 */
export function buildApprovalAuditEntry(input: BuildApprovalAuditEntryInput): ApprovalAuditEntry {
  return Object.freeze({
    action: input.action,
    department: input.department,
    decisionHash: input.decisionHash,
    outcome: input.outcome,
    atMs: input.nowMs,
  });
}

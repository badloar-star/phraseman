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

/**
 * Помимо approve/reject кнопки, журнал фиксирует и команды /stop, /start
 * (бриф в235: аудит входов — «кто и когда останавливал Джарвиса» не должен
 * жить только в перезаписываемом jarvis_control.changedBy).
 */
export type AuditAction = ApprovalAction | 'stop' | 'start';

export interface ApprovalAuditEntry {
  readonly action: AuditAction;
  /** 'jarvis' для команд /stop, /start — они не относятся к департаменту. */
  readonly department: string;
  /** '' для команд — решения департамента здесь нет. */
  readonly decisionHash: string;
  /**
   * Ключ темы отказа — по нему подавляется повтор совета.
   *
   * зачем отдельно от decisionHash: тот содержит сегодняшние числа, и завтра
   * при «126 писем» вместо «125» отказ владельца уже не находится. Поле
   * опционально: записи, сделанные до этой правки, его не имеют, и чтение
   * обязано это переживать.
   */
  readonly decisionTopicKey?: string;
  readonly outcome: ApprovalOutcome;
  readonly atMs: number;
}

export interface BuildApprovalAuditEntryInput {
  readonly action: AuditAction;
  readonly department: string;
  readonly decisionHash: string;
  readonly decisionTopicKey?: string;
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
    // зачем условно: Firestore отвергает undefined в документе, а поле
    // опционально ради записей, сделанных до появления темы.
    ...(input.decisionTopicKey ? { decisionTopicKey: input.decisionTopicKey } : {}),
    outcome: input.outcome,
    atMs: input.nowMs,
  });
}

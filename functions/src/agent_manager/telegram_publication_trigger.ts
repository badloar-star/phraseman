import { randomBytes } from 'node:crypto';
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { ADMIN_ALERT_BOT_TOKEN } from '../admin_alerts';
import { sha256 } from '../agent_office/contracts';
import { TelegramBotApiTransport } from '../agent_office/telegram_transport';
import { AGENT_OFFICE_TELEGRAM_CONFIG, AGENT_OFFICE_TELEGRAM_ENABLED } from '../agent_office/telegram_webhook';
import { parseTelegramApprovalRuntimeConfig } from '../agent_office/telegram_contracts';
import { MANAGER_TELEGRAM_TOKEN_TTL_MS, managerTelegramTokenHash } from './telegram_contracts';

const REGION = 'us-central1';
const RECEIPTS = 'agent_manager_telegram_publication_receipts';
const TOKENS = 'agent_manager_telegram_tokens';

function nonce(): string { return randomBytes(32).toString('base64url'); }
function safeTaskProjection(value: Record<string, unknown>) {
  const taskId = typeof value.taskId === 'string' && /^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value.taskId) ? value.taskId : '';
  const revision = Number(value.revision);
  const allowedScope = String(value.allowedScope || '');
  const priority = String(value.priority || '');
  if (!taskId || !Number.isSafeInteger(revision) || revision < 1 || !['analysis_only', 'support_draft', 'report_triage', 'code_prepare', 'content_prepare'].includes(allowedScope) || !['low', 'normal', 'high', 'critical'].includes(priority)) return null;
  return Object.freeze({ taskId, revision, allowedScope, priority, taskDigest: sha256(taskId).slice(0, 12) });
}

function message(projection: ReturnType<typeof safeTaskProjection>) {
  if (!projection) throw new Error('manager_task_projection_invalid');
  const approvalEffect = projection.allowedScope === 'code_prepare'
    ? 'После одобрения задачу сможет забрать только привязанный локальный Codex runner. Результат потребует ручной проверки.'
    : projection.allowedScope === 'content_prepare'
      ? 'После одобрения задача попадёт в очередь для ручной подготовки. Результат потребует ручной проверки.'
      : 'После одобрения задача попадёт в очередь соответствующего серверного обработчика. Результат потребует ручной проверки.';
  return `Phraseman: задача ожидает согласования\nКод: ${projection.taskDigest}\nОбласть: ${projection.allowedScope}\nПриоритет: ${projection.priority}\nРевизия: ${projection.revision}\n\n${approvalEffect}`;
}

/** Creates short-lived Manager approval capabilities only after a task reaches awaiting_approval. */
export const agentManagerTelegramPublishApproval = onDocumentCreated({
  document: 'agent_manager_task_events/{eventId}', region: REGION, timeoutSeconds: 30, memory: '256MiB', maxInstances: 3,
  secrets: [ADMIN_ALERT_BOT_TOKEN, AGENT_OFFICE_TELEGRAM_CONFIG],
}, async (event) => {
  if (AGENT_OFFICE_TELEGRAM_ENABLED.value() !== 'true') return;
  let config: ReturnType<typeof parseTelegramApprovalRuntimeConfig>;
  try { config = parseTelegramApprovalRuntimeConfig(AGENT_OFFICE_TELEGRAM_CONFIG.value()); } catch { return; }
  const eventData = event.data?.data() ?? {};
  if (eventData.toStatus !== 'awaiting_approval' || typeof eventData.taskId !== 'string') return;
  const db = admin.firestore();
  const taskSnapshot = await db.collection('agent_manager_tasks').doc(eventData.taskId).get();
  if (!taskSnapshot.exists) return;
  const projection = safeTaskProjection(taskSnapshot.data() ?? {});
  if (!projection || taskSnapshot.data()?.status !== 'awaiting_approval' || projection.revision !== eventData.taskRevision) return;
  const receiptId = sha256(`manager-telegram:${event.params.eventId}`);
  const receiptRef = db.collection(RECEIPTS).doc(receiptId);
  const approveNonce = nonce(); const rejectNonce = nonce();
  const approveHash = managerTelegramTokenHash(approveNonce); const rejectHash = managerTelegramTokenHash(rejectNonce);
  const nowMs = Date.now(); const validUntilMs = nowMs + MANAGER_TELEGRAM_TOKEN_TTL_MS;
  const created = await db.runTransaction(async (tx) => {
    if ((await tx.get(receiptRef)).exists) return false;
    const token = (tokenIdHash: string, permittedDecision: 'approve' | 'reject') => ({
      schemaVersion: 1, tokenIdHash, status: 'active', ownerUid: config.ownerUid,
      telegramChatId: config.ownerTelegramChatId, telegramUserId: config.ownerTelegramUserId,
      taskId: projection.taskId, expectedRevision: projection.revision, permittedDecision,
      projectionHash: sha256(JSON.stringify(projection)), issuedAtMs: nowMs, validUntilMs,
      consumedAtMs: null, consumedDecisionId: null, consumedUpdateIdHash: null,
    });
    tx.create(db.collection(TOKENS).doc(approveHash), token(approveHash, 'approve'));
    tx.create(db.collection(TOKENS).doc(rejectHash), token(rejectHash, 'reject'));
    tx.create(receiptRef, { schemaVersion: 1, receiptId, taskId: projection.taskId, taskRevision: projection.revision, state: 'issuing', createdAtMs: nowMs, updatedAtMs: nowMs, piiClass: 'none' });
    return true;
  });
  if (!created) return;
  try {
    await new TelegramBotApiTransport(ADMIN_ALERT_BOT_TOKEN.value()).sendMessage({
      chatId: config.ownerTelegramChatId, text: message(projection),
      replyMarkup: { inline_keyboard: [[
        { text: 'Approve', callback_data: `am1:a:${approveNonce}` },
        { text: 'Reject', callback_data: `am1:r:${rejectNonce}` },
      ]] },
    });
    await receiptRef.update({ state: 'sent', updatedAtMs: Date.now() });
  } catch {
    await receiptRef.update({ state: 'failed', updatedAtMs: Date.now() });
  }
});

import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

export const MANAGER_TELEGRAM_TOKEN_TTL_MS = 10 * 60 * 1000;
export type ManagerTelegramDecision = 'approve' | 'reject';

export type ManagerTelegramToken = Readonly<{
  schemaVersion: 1;
  tokenIdHash: string;
  status: 'active' | 'consumed' | 'revoked';
  ownerUid: string;
  telegramChatId: string;
  telegramUserId: string;
  taskId: string;
  expectedRevision: number;
  permittedDecision: ManagerTelegramDecision;
  projectionHash: string;
  issuedAtMs: number;
  validUntilMs: number;
  consumedAtMs: number | null;
  consumedDecisionId: string | null;
  consumedUpdateIdHash: string | null;
}>;

function fail(message: string): never { throw new HttpsError('invalid-argument', message); }
function row(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('manager Telegram token is invalid'); return value as Record<string, unknown>; }
function id(value: unknown, label: string): string { if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value)) fail(`${label} is invalid`); return value; }
function hash(value: unknown, label: string): string { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(`${label} is invalid`); return value; }
function telegramId(value: unknown, label: string, negative: boolean): string { if (typeof value !== 'string' || !(negative ? /^-?[1-9][0-9]{0,19}$/ : /^[1-9][0-9]{0,19}$/).test(value)) fail(`${label} is invalid`); return value; }
function integer(value: unknown, label: string, nullable = false): number | null { if (nullable && value === null) return null; if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) fail(`${label} is invalid`); return value; }

export function managerTelegramTokenHash(nonce: string): string { return createHash('sha256').update(nonce, 'utf8').digest('hex'); }
export function managerTelegramTokenPath(tokenIdHash: string): string { return `agent_manager_telegram_tokens/${hash(tokenIdHash, 'manager Telegram tokenIdHash')}`; }
export function managerTelegramDecisionId(tokenIdHash: string): string { return createHash('sha256').update(`decision:${tokenIdHash}`, 'utf8').digest('hex'); }

export function parseManagerTelegramToken(value: unknown): ManagerTelegramToken {
  const input = row(value); const keys = Object.keys(input);
  const expected = ['schemaVersion', 'tokenIdHash', 'status', 'ownerUid', 'telegramChatId', 'telegramUserId', 'taskId', 'expectedRevision', 'permittedDecision', 'projectionHash', 'issuedAtMs', 'validUntilMs', 'consumedAtMs', 'consumedDecisionId', 'consumedUpdateIdHash'];
  if (keys.some((key) => !expected.includes(key)) || expected.some((key) => !(key in input))) fail('manager Telegram token fields are invalid');
  const issuedAtMs = integer(input.issuedAtMs, 'issuedAtMs') as number;
  const validUntilMs = integer(input.validUntilMs, 'validUntilMs') as number;
  const expectedRevision = integer(input.expectedRevision, 'expectedRevision') as number;
  if (validUntilMs <= issuedAtMs || validUntilMs - issuedAtMs > MANAGER_TELEGRAM_TOKEN_TTL_MS) fail('manager Telegram token TTL is invalid');
  if (expectedRevision < 1) fail('expectedRevision is invalid');
  const status = input.status;
  if (input.schemaVersion !== 1 || !['active', 'consumed', 'revoked'].includes(String(status)) || !['approve', 'reject'].includes(String(input.permittedDecision))) fail('manager Telegram token is invalid');
  const consumedAtMs = integer(input.consumedAtMs, 'consumedAtMs', true);
  const consumedDecisionId = input.consumedDecisionId === null ? null : hash(input.consumedDecisionId, 'consumedDecisionId');
  const consumedUpdateIdHash = input.consumedUpdateIdHash === null ? null : hash(input.consumedUpdateIdHash, 'consumedUpdateIdHash');
  const consumed = consumedAtMs !== null && consumedDecisionId !== null && consumedUpdateIdHash !== null;
  if ((status === 'consumed') !== consumed || (status !== 'consumed' && (consumedAtMs !== null || consumedDecisionId !== null || consumedUpdateIdHash !== null))) fail('manager Telegram token consumption is invalid');
  return Object.freeze({ schemaVersion: 1, tokenIdHash: hash(input.tokenIdHash, 'tokenIdHash'), status: status as ManagerTelegramToken['status'], ownerUid: id(input.ownerUid, 'ownerUid'), telegramChatId: telegramId(input.telegramChatId, 'telegramChatId', true), telegramUserId: telegramId(input.telegramUserId, 'telegramUserId', false), taskId: id(input.taskId, 'taskId'), expectedRevision, permittedDecision: input.permittedDecision as ManagerTelegramDecision, projectionHash: hash(input.projectionHash, 'projectionHash'), issuedAtMs, validUntilMs, consumedAtMs, consumedDecisionId, consumedUpdateIdHash });
}

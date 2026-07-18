import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  assertExactKeys,
  isRecord,
  parseHash,
  parseIdentifier,
  parseNonNegativeInteger,
  parsePositiveInteger,
} from './contracts';

export const AGENT_TELEGRAM_TOKEN_SCHEMA_VERSION = 1 as const;
export const MAX_TELEGRAM_APPROVAL_TTL_MS = 10 * 60 * 1000;
export const MAX_TELEGRAM_WEBHOOK_BODY_BYTES = 16 * 1024;

export type TelegramApprovalVerb = 'authorize' | 'reject';
export type TelegramCallbackNamespace = 'ao1' | 'am1';

export interface VerifiedTelegramApprovalUpdate {
  readonly verification: 'verified';
  readonly callbackNamespace: TelegramCallbackNamespace;
  readonly updateId: string;
  readonly callbackQueryId: string;
  readonly chatId: string;
  readonly userId: string;
  readonly commandText: string;
}

export interface ParsedTelegramApprovalCommand {
  readonly verb: TelegramApprovalVerb;
  readonly nonce: string;
}

export interface AgentTelegramApprovalToken {
  readonly schemaVersion: 1;
  readonly tokenIdHash: string;
  readonly status: 'active' | 'consumed' | 'revoked';
  readonly ownerUid: string;
  readonly telegramChatId: string;
  readonly telegramUserId: string;
  readonly permittedVerb: TelegramApprovalVerb;
  readonly caseId: string;
  readonly expectedCaseRevision: number;
  readonly recommendationId: string;
  readonly recommendationRevision: number;
  readonly recommendationContentHash: string;
  readonly controlRevision: number;
  readonly issuedAtMs: number;
  readonly validUntilMs: number;
  readonly consumedAtMs: number | null;
  readonly consumedApprovalId: string | null;
  readonly consumedUpdateIdHash: string | null;
}

export interface TelegramApprovalRuntimeConfig {
  readonly webhookSecret: string;
  readonly ownerUid: string;
  readonly ownerTelegramUserId: string;
  readonly ownerTelegramChatId: string;
}

export interface AgentTelegramDecisionGuard {
  readonly token: AgentTelegramApprovalToken;
  readonly updateIdHash: string;
}

function invalid(message: string): never {
  throw new HttpsError('invalid-argument', message);
}

function row(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} must be an object`);
  return value;
}

function telegramId(value: unknown, label: string, allowNegative: boolean): string {
  const result = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof result !== 'string') invalid(`${label} is invalid`);
  const pattern = allowNegative ? /^-?[1-9][0-9]{0,19}$/ : /^[1-9][0-9]{0,19}$/;
  if (!pattern.test(result)) invalid(`${label} is invalid`);
  return result;
}

function nullableInteger(value: unknown, label: string): number | null {
  return value === null ? null : parseNonNegativeInteger(value, label);
}

function nullableHash(value: unknown, label: string): string | null {
  return value === null ? null : parseHash(value, label);
}

function nullableApprovalId(value: unknown, label: string): string | null {
  return value === null ? null : parseHash(value, label);
}

export function telegramApprovalTokenHash(nonce: string): string {
  return createHash('sha256').update(nonce, 'utf8').digest('hex');
}

export function telegramApprovalTokenPath(tokenIdHash: string): string {
  return `agent_telegram_tokens/${parseHash(tokenIdHash, 'tokenIdHash')}`;
}

export function parseTelegramApprovalCommand(value: unknown): ParsedTelegramApprovalCommand {
  if (typeof value !== 'string' || value.length > 64) invalid('Telegram approval command is invalid');
  const match = /^\/(authorize|reject) ([A-Za-z0-9_-]{32,43})$/.exec(value);
  if (!match) invalid('Telegram approval command is invalid');
  return Object.freeze({ verb: match[1] as TelegramApprovalVerb, nonce: match[2] });
}

export function parseVerifiedTelegramApprovalUpdate(value: unknown): VerifiedTelegramApprovalUpdate {
  const input = row(value, 'verified Telegram update');
  assertExactKeys(input, ['verification', 'callbackNamespace', 'updateId', 'callbackQueryId', 'chatId', 'userId', 'commandText'], 'verified Telegram update');
  if (input.verification !== 'verified') throw new HttpsError('permission-denied', 'Telegram identity is not verified');
  if (input.callbackNamespace !== 'ao1' && input.callbackNamespace !== 'am1') invalid('verified Telegram update.callbackNamespace is invalid');
  const updateId = telegramId(input.updateId, 'verified Telegram update.updateId', false);
  if (typeof input.callbackQueryId !== 'string' || !/^[A-Za-z0-9_-]{8,160}$/.test(input.callbackQueryId)) {
    invalid('verified Telegram update.callbackQueryId is invalid');
  }
  parseTelegramApprovalCommand(input.commandText);
  return Object.freeze({
    verification: 'verified',
    callbackNamespace: input.callbackNamespace,
    updateId,
    callbackQueryId: input.callbackQueryId,
    chatId: telegramId(input.chatId, 'verified Telegram update.chatId', true),
    userId: telegramId(input.userId, 'verified Telegram update.userId', false),
    commandText: input.commandText as string,
  });
}

export function parseTelegramCallbackUpdate(value: unknown): VerifiedTelegramApprovalUpdate {
  const input = row(value, 'Telegram update');
  const updateId = telegramId(input.update_id, 'Telegram update.update_id', false);
  const callback = row(input.callback_query, 'Telegram update.callback_query');
  const from = row(callback.from, 'Telegram update.callback_query.from');
  const message = row(callback.message, 'Telegram update.callback_query.message');
  const chat = row(message.chat, 'Telegram update.callback_query.message.chat');
  if (from.is_bot !== false) throw new HttpsError('permission-denied', 'Telegram bot identity is not allowed');
  if (chat.type !== 'private') throw new HttpsError('permission-denied', 'Telegram approval chat must be private');
  if (typeof callback.id !== 'string' || !/^[A-Za-z0-9_-]{8,160}$/.test(callback.id)) invalid('Telegram callback id is invalid');
  if (typeof callback.data !== 'string' || callback.data.length > 64) invalid('Telegram callback data is invalid');
  const match = /^(ao1|am1):(a|r):([A-Za-z0-9_-]{32,43})$/.exec(callback.data);
  if (!match) invalid('Telegram callback data is invalid');
  const verb: TelegramApprovalVerb = match[2] === 'a' ? 'authorize' : 'reject';
  return Object.freeze({
    verification: 'verified',
    callbackNamespace: match[1] as TelegramCallbackNamespace,
    updateId,
    callbackQueryId: callback.id,
    chatId: telegramId(chat.id, 'Telegram update.callback_query.message.chat.id', true),
    userId: telegramId(from.id, 'Telegram update.callback_query.from.id', false),
    commandText: `/${verb} ${match[3]}`,
  });
}

export function parseAgentTelegramApprovalToken(value: unknown): AgentTelegramApprovalToken {
  const input = row(value, 'AgentTelegramApprovalToken');
  assertExactKeys(input, [
    'schemaVersion', 'tokenIdHash', 'status', 'ownerUid', 'telegramChatId', 'telegramUserId',
    'permittedVerb', 'caseId', 'expectedCaseRevision', 'recommendationId', 'recommendationRevision',
    'recommendationContentHash', 'controlRevision', 'issuedAtMs', 'validUntilMs', 'consumedAtMs',
    'consumedApprovalId', 'consumedUpdateIdHash',
  ], 'AgentTelegramApprovalToken');
  if (input.schemaVersion !== AGENT_TELEGRAM_TOKEN_SCHEMA_VERSION) invalid('AgentTelegramApprovalToken schemaVersion is invalid');
  if (input.status !== 'active' && input.status !== 'consumed' && input.status !== 'revoked') invalid('AgentTelegramApprovalToken status is invalid');
  if (input.permittedVerb !== 'authorize' && input.permittedVerb !== 'reject') invalid('AgentTelegramApprovalToken permittedVerb is invalid');
  const issuedAtMs = parseNonNegativeInteger(input.issuedAtMs, 'AgentTelegramApprovalToken.issuedAtMs');
  const validUntilMs = parseNonNegativeInteger(input.validUntilMs, 'AgentTelegramApprovalToken.validUntilMs');
  if (validUntilMs <= issuedAtMs || validUntilMs - issuedAtMs > MAX_TELEGRAM_APPROVAL_TTL_MS) {
    invalid('AgentTelegramApprovalToken TTL is invalid');
  }
  const consumedAtMs = nullableInteger(input.consumedAtMs, 'AgentTelegramApprovalToken.consumedAtMs');
  const consumedApprovalId = nullableApprovalId(input.consumedApprovalId, 'AgentTelegramApprovalToken.consumedApprovalId');
  const consumedUpdateIdHash = nullableHash(input.consumedUpdateIdHash, 'AgentTelegramApprovalToken.consumedUpdateIdHash');
  const consumedFieldsPresent = consumedAtMs !== null && consumedApprovalId !== null && consumedUpdateIdHash !== null;
  if (input.status === 'consumed' ? !consumedFieldsPresent : consumedAtMs !== null || consumedApprovalId !== null || consumedUpdateIdHash !== null) {
    invalid('AgentTelegramApprovalToken consumption state is invalid');
  }
  return Object.freeze({
    schemaVersion: 1,
    tokenIdHash: parseHash(input.tokenIdHash, 'AgentTelegramApprovalToken.tokenIdHash'),
    status: input.status,
    ownerUid: parseIdentifier(input.ownerUid, 'AgentTelegramApprovalToken.ownerUid'),
    telegramChatId: telegramId(input.telegramChatId, 'AgentTelegramApprovalToken.telegramChatId', true),
    telegramUserId: telegramId(input.telegramUserId, 'AgentTelegramApprovalToken.telegramUserId', false),
    permittedVerb: input.permittedVerb,
    caseId: parseIdentifier(input.caseId, 'AgentTelegramApprovalToken.caseId'),
    expectedCaseRevision: parsePositiveInteger(input.expectedCaseRevision, 'AgentTelegramApprovalToken.expectedCaseRevision'),
    recommendationId: parseIdentifier(input.recommendationId, 'AgentTelegramApprovalToken.recommendationId'),
    recommendationRevision: parsePositiveInteger(input.recommendationRevision, 'AgentTelegramApprovalToken.recommendationRevision'),
    recommendationContentHash: parseHash(input.recommendationContentHash, 'AgentTelegramApprovalToken.recommendationContentHash'),
    controlRevision: parsePositiveInteger(input.controlRevision, 'AgentTelegramApprovalToken.controlRevision'),
    issuedAtMs,
    validUntilMs,
    consumedAtMs,
    consumedApprovalId,
    consumedUpdateIdHash,
  });
}

export function parseTelegramApprovalRuntimeConfig(value: unknown): TelegramApprovalRuntimeConfig {
  const input = row(value, 'Agent Office Telegram config');
  assertExactKeys(input, ['webhookSecret', 'ownerUid', 'ownerTelegramUserId', 'ownerTelegramChatId'], 'Agent Office Telegram config');
  if (typeof input.webhookSecret !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/.test(input.webhookSecret)) {
    invalid('Agent Office Telegram webhookSecret is invalid');
  }
  return Object.freeze({
    webhookSecret: input.webhookSecret,
    ownerUid: parseIdentifier(input.ownerUid, 'Agent Office Telegram ownerUid'),
    ownerTelegramUserId: telegramId(input.ownerTelegramUserId, 'Agent Office Telegram ownerTelegramUserId', false),
    ownerTelegramChatId: telegramId(input.ownerTelegramChatId, 'Agent Office Telegram ownerTelegramChatId', true),
  });
}

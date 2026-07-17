import { HttpsError } from 'firebase-functions/v2/https';
import { requireAgentOfficeOwner, type AgentOfficeAuth } from './auth';
import { assertExactKeys, isRecord, parseIdentifier, sha256 } from './contracts';
import { AgentOfficeLedger } from './ledger';
import {
  parseAgentTelegramApprovalToken,
  parseTelegramApprovalCommand,
  parseVerifiedTelegramApprovalUpdate,
  telegramApprovalTokenHash,
} from './telegram_contracts';

interface TelegramApprovalServerState {
  readonly ownerAuth: AgentOfficeAuth;
  readonly configuredOwnerUid: string;
  readonly configuredTelegramChatId: string;
  readonly configuredTelegramUserId: string;
  readonly token: ReturnType<typeof parseAgentTelegramApprovalToken>;
}

function invalid(message: string): never {
  throw new HttpsError('invalid-argument', message);
}

function parseConfiguredTelegramId(value: unknown, label: string, allowNegative: boolean): string {
  if (typeof value !== 'string') invalid(`${label} is invalid`);
  const pattern = allowNegative ? /^-?[1-9][0-9]{0,19}$/ : /^[1-9][0-9]{0,19}$/;
  if (!pattern.test(value)) invalid(`${label} is invalid`);
  return value;
}

function parseServerState(value: unknown): TelegramApprovalServerState {
  if (!isRecord(value)) invalid('Telegram approval server state must be an object');
  assertExactKeys(value, [
    'ownerAuth', 'configuredOwnerUid', 'configuredTelegramChatId', 'configuredTelegramUserId', 'token',
  ], 'Telegram approval server state');
  if (!isRecord(value.ownerAuth)) invalid('Telegram approval ownerAuth is invalid');
  return Object.freeze({
    ownerAuth: value.ownerAuth as AgentOfficeAuth,
    configuredOwnerUid: parseIdentifier(value.configuredOwnerUid, 'Telegram approval configuredOwnerUid'),
    configuredTelegramChatId: parseConfiguredTelegramId(value.configuredTelegramChatId, 'Telegram approval configuredTelegramChatId', true),
    configuredTelegramUserId: parseConfiguredTelegramId(value.configuredTelegramUserId, 'Telegram approval configuredTelegramUserId', false),
    token: parseAgentTelegramApprovalToken(value.token),
  });
}

export class TelegramApprovalCore {
  constructor(
    private readonly ledger: AgentOfficeLedger,
    private readonly now: () => number = Date.now,
  ) {}

  async handle(verifiedUpdateValue: unknown, serverStateValue: unknown) {
    const update = parseVerifiedTelegramApprovalUpdate(verifiedUpdateValue);
    const state = parseServerState(serverStateValue);
    const command = parseTelegramApprovalCommand(update.commandText);
    const actor = requireAgentOfficeOwner(state.ownerAuth);

    if (actor.actorUid !== state.configuredOwnerUid) throw new HttpsError('permission-denied', 'Telegram owner binding mismatch');
    if (update.chatId !== state.configuredTelegramChatId || update.userId !== state.configuredTelegramUserId) {
      throw new HttpsError('permission-denied', 'Telegram identity binding mismatch');
    }

    const token = state.token;
    const updateIdHash = sha256(update.updateId);
    if (token.tokenIdHash !== telegramApprovalTokenHash(command.nonce)) {
      throw new HttpsError('permission-denied', 'Telegram nonce binding mismatch');
    }
    if (token.ownerUid !== actor.actorUid
      || token.ownerUid !== state.configuredOwnerUid
      || token.telegramChatId !== update.chatId
      || token.telegramUserId !== update.userId) {
      throw new HttpsError('permission-denied', 'Telegram token owner binding mismatch');
    }
    if (token.permittedVerb !== command.verb) throw new HttpsError('permission-denied', 'Telegram verb is not permitted');
    const nowMs = this.now();
    if (token.issuedAtMs > nowMs || token.validUntilMs <= nowMs) throw new HttpsError('failed-precondition', 'Telegram approval token expired');
    if (token.status === 'revoked') throw new HttpsError('failed-precondition', 'Telegram approval token is revoked');
    if (token.status === 'consumed' && token.consumedUpdateIdHash !== updateIdHash) {
      throw new HttpsError('failed-precondition', 'Telegram approval token replay mismatch');
    }

    const controlResult = await this.ledger.getControl(state.ownerAuth);
    const control = controlResult.control;
    if (control.state !== 'ready' || control.killSwitchEnabled) {
      throw new HttpsError('failed-precondition', 'Agent Office kill switch is enabled or unavailable');
    }
    if (control.revision !== token.controlRevision) throw new HttpsError('failed-precondition', 'stale Telegram control revision');

    return this.ledger.decideTelegramRecommendation(state.ownerAuth, {
      caseId: token.caseId,
      expectedCaseRevision: token.expectedCaseRevision,
      recommendationId: token.recommendationId,
      recommendationRevision: token.recommendationRevision,
      recommendationContentHash: token.recommendationContentHash,
      decision: command.verb === 'authorize' ? 'approve' : 'decline',
      reason: command.verb === 'authorize'
        ? 'Verified Telegram owner authorization.'
        : 'Verified Telegram owner rejection.',
      idempotencyKey: `telegram:${command.nonce}`,
    }, {
      token,
      updateIdHash,
    });
  }
}

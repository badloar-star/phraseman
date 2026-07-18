import { HttpsError } from 'firebase-functions/v2/https';
import { requireAgentOfficeOwner, type AgentOfficeAuth } from '../agent_office/auth';
import { sha256 } from '../agent_office/contracts';
import { parseTelegramApprovalCommand, parseVerifiedTelegramApprovalUpdate } from '../agent_office/telegram_contracts';
import { AgentManagerLedger } from './ledger';
import { managerTelegramTokenHash, parseManagerTelegramToken } from './telegram_contracts';

type ServerState = Readonly<{
  ownerAuth: AgentOfficeAuth;
  configuredOwnerUid: string;
  configuredTelegramChatId: string;
  configuredTelegramUserId: string;
  token: Record<string, unknown>;
}>;

function fail(message: string): never { throw new HttpsError('permission-denied', message); }

export class AgentManagerTelegramApprovalCore {
  constructor(private readonly ledger: AgentManagerLedger, private readonly now: () => number = Date.now) {}

  async handle(verifiedUpdateValue: unknown, state: ServerState) {
    const update = parseVerifiedTelegramApprovalUpdate(verifiedUpdateValue);
    if (update.callbackNamespace !== 'am1') throw new HttpsError('invalid-argument', 'manager Telegram namespace is invalid');
    const command = parseTelegramApprovalCommand(update.commandText);
    const decision = command.verb === 'authorize' ? 'approve' as const : 'reject' as const;
    const actor = requireAgentOfficeOwner(state.ownerAuth);
    if (actor.actorUid !== state.configuredOwnerUid || update.chatId !== state.configuredTelegramChatId || update.userId !== state.configuredTelegramUserId) fail('manager Telegram owner binding mismatch');
    const token = parseManagerTelegramToken(state.token);
    if (token.tokenIdHash !== managerTelegramTokenHash(command.nonce) || token.ownerUid !== actor.actorUid || token.telegramChatId !== update.chatId || token.telegramUserId !== update.userId || token.permittedDecision !== decision) fail('manager Telegram token binding mismatch');
    const nowMs = this.now();
    if (token.issuedAtMs > nowMs || token.validUntilMs <= nowMs || token.status === 'revoked') throw new HttpsError('failed-precondition', 'manager Telegram token is unavailable');
    await this.ledger.requireGlobalControlReady(state.ownerAuth);
    return this.ledger.decideTelegramTask(state.ownerAuth, { token, decision, updateIdHash: sha256(update.updateId) });
  }
}

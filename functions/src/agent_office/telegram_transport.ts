import { createHash, timingSafeEqual } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  MAX_TELEGRAM_WEBHOOK_BODY_BYTES,
  parseTelegramApprovalCommand,
  parseTelegramApprovalRuntimeConfig,
  parseTelegramCallbackUpdate,
  telegramApprovalTokenHash,
  type TelegramCallbackNamespace,
  type VerifiedTelegramApprovalUpdate,
} from './telegram_contracts';

export { telegramApprovalTokenHash } from './telegram_contracts';

interface TelegramWebhookRequest {
  readonly method?: unknown;
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly rawBody?: Buffer;
}

interface TelegramWebhookResponse {
  status(code: number): { send(body: string): unknown };
}

interface TelegramApprovalResult {
  readonly ok: true;
  readonly idempotent: boolean;
  readonly decision: 'approve' | 'decline' | 'reject';
}

interface TelegramWebhookDependencies {
  readonly isEnabled: () => boolean;
  readonly loadConfig: () => unknown;
  readonly loadTokenByHash: (callbackNamespace: TelegramCallbackNamespace, tokenIdHash: string) => Promise<Record<string, unknown> | null>;
  readonly handleApproval: (
    update: VerifiedTelegramApprovalUpdate,
    state: Readonly<{
      ownerAuth: Readonly<{ uid: string; token: Readonly<{ admin: true; adminRole: 'owner' }> }>;
      configuredOwnerUid: string;
      configuredTelegramChatId: string;
      configuredTelegramUserId: string;
      token: Record<string, unknown>;
    }>,
  ) => Promise<TelegramApprovalResult>;
  readonly answerCallbackQuery: (callbackQueryId: string, text: string) => Promise<void>;
  readonly log?: (event: 'config_invalid' | 'callback_ignored' | 'state_unavailable' | 'reply_failed', reason: string) => void;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function header(request: TelegramWebhookRequest, name: string): string {
  const value = request.headers?.[name.toLowerCase()];
  return typeof value === 'string' ? value : '';
}

function send(response: TelegramWebhookResponse, status: number, body: string): void {
  response.status(status).send(body);
}

function deniedError(error: unknown): boolean {
  if (!(error instanceof HttpsError)) return false;
  return error.code === 'invalid-argument'
    || error.code === 'permission-denied'
    || error.code === 'failed-precondition'
    || error.code === 'not-found';
}

export function constantTimeTelegramSecretEqual(expected: string, candidate: string): boolean {
  if (!expected || !candidate || expected.length > 256 || candidate.length > 256) return false;
  const expectedHash = createHash('sha256').update(expected, 'utf8').digest();
  const candidateHash = createHash('sha256').update(candidate, 'utf8').digest();
  return timingSafeEqual(expectedHash, candidateHash);
}

export function createAgentOfficeTelegramWebhookHandler(dependencies: TelegramWebhookDependencies) {
  return async (request: TelegramWebhookRequest, response: TelegramWebhookResponse): Promise<void> => {
    if (!dependencies.isEnabled()) {
      send(response, 404, 'not_found');
      return;
    }
    if (request.method !== 'POST') {
      send(response, 405, 'method_not_allowed');
      return;
    }

    let config: ReturnType<typeof parseTelegramApprovalRuntimeConfig>;
    try {
      config = parseTelegramApprovalRuntimeConfig(dependencies.loadConfig());
    } catch {
      dependencies.log?.('config_invalid', 'invalid_config');
      send(response, 503, 'unavailable');
      return;
    }

    const suppliedSecret = header(request, 'x-telegram-bot-api-secret-token');
    if (!constantTimeTelegramSecretEqual(config.webhookSecret, suppliedSecret)) {
      send(response, 401, 'unauthorized');
      return;
    }
    if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(header(request, 'content-type'))) {
      send(response, 415, 'unsupported_media_type');
      return;
    }
    if (!Buffer.isBuffer(request.rawBody)) {
      send(response, 400, 'invalid_body');
      return;
    }
    if (request.rawBody.length > MAX_TELEGRAM_WEBHOOK_BODY_BYTES) {
      send(response, 413, 'payload_too_large');
      return;
    }

    let update: VerifiedTelegramApprovalUpdate;
    try {
      update = parseTelegramCallbackUpdate(JSON.parse(request.rawBody.toString('utf8')) as unknown);
    } catch {
      send(response, 400, 'invalid_update');
      return;
    }
    if (update.userId !== config.ownerTelegramUserId || update.chatId !== config.ownerTelegramChatId) {
      dependencies.log?.('callback_ignored', 'owner_binding');
      send(response, 200, 'ignored');
      return;
    }

    const command = parseTelegramApprovalCommand(update.commandText);
    const tokenIdHash = telegramApprovalTokenHash(command.nonce);
    let token: Record<string, unknown> | null;
    try {
      token = await dependencies.loadTokenByHash(update.callbackNamespace, tokenIdHash);
    } catch {
      dependencies.log?.('state_unavailable', 'token_read');
      send(response, 500, 'retry');
      return;
    }
    if (!token) {
      dependencies.log?.('callback_ignored', 'token_missing');
      send(response, 200, 'ignored');
      return;
    }

    let result: TelegramApprovalResult;
    try {
      result = await dependencies.handleApproval(update, Object.freeze({
        ownerAuth: Object.freeze({
          uid: config.ownerUid,
          token: Object.freeze({ admin: true as const, adminRole: 'owner' as const }),
        }),
        configuredOwnerUid: config.ownerUid,
        configuredTelegramChatId: config.ownerTelegramChatId,
        configuredTelegramUserId: config.ownerTelegramUserId,
        token,
      }));
    } catch (error) {
      if (deniedError(error)) {
        dependencies.log?.('callback_ignored', 'approval_denied');
        send(response, 200, 'ignored');
        return;
      }
      dependencies.log?.('state_unavailable', 'approval_error');
      send(response, 500, 'retry');
      return;
    }

    const acknowledgement = update.callbackNamespace === 'am1'
      ? result.idempotent
        ? 'Manager decision already processed.'
        : result.decision === 'reject'
          ? 'Manager task rejected.'
          : 'Manager task approved.'
      : result.idempotent
        ? 'Решение уже обработано.'
        : result.decision === 'decline'
          ? 'Рекомендация отклонена.'
          : 'Решение принято.';
    try {
      await dependencies.answerCallbackQuery(update.callbackQueryId, acknowledgement);
    } catch {
      dependencies.log?.('reply_failed', 'telegram_api');
    }
    send(response, 200, 'ok');
  };
}

export class TelegramBotApiTransport {
  constructor(
    private readonly botToken: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    if (!/^[0-9]{6,20}:[A-Za-z0-9_-]{30,80}$/.test(botToken)) throw new Error('telegram_bot_token_invalid');
  }

  async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{8,160}$/.test(callbackQueryId)) throw new Error('telegram_callback_id_invalid');
    if (!text || text.length > 80 || /[\u0000-\u001f\u007f]/.test(text)) throw new Error('telegram_reply_text_invalid');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await this.fetchImpl(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as { ok?: unknown } | null;
      if (!response.ok || payload?.ok !== true) throw new Error('telegram_api_failed');
    } catch (error) {
      if (error instanceof Error && error.message === 'telegram_api_failed') throw error;
      throw new Error('telegram_api_failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendMessage(input: Readonly<{
    chatId: string;
    text: string;
    replyMarkup: Readonly<{ inline_keyboard: readonly (readonly Readonly<{ text: 'Approve' | 'Reject'; callback_data: string }>[])[] }>;
  }>): Promise<void> {
    if (!/^-?[1-9][0-9]{0,19}$/.test(input.chatId) || !input.text || input.text.length > 4096 || /[\u0000\u007f]/.test(input.text)) {
      throw new Error('telegram_message_invalid');
    }
    const buttons = input.replyMarkup.inline_keyboard;
    const approve = buttons[0] && /^((?:ao1|am1)):a:[A-Za-z0-9_-]{32,43}$/.exec(buttons[0][0]?.callback_data ?? '');
    const reject = buttons[0] && /^((?:ao1|am1)):r:[A-Za-z0-9_-]{32,43}$/.exec(buttons[0][1]?.callback_data ?? '');
    if (buttons.length !== 1 || buttons[0].length !== 2 || buttons[0][0].text !== 'Approve' || buttons[0][1].text !== 'Reject'
      || !approve || !reject || approve[1] !== reject[1]) throw new Error('telegram_message_invalid');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await this.fetchImpl(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: input.chatId, text: input.text, reply_markup: input.replyMarkup }), signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as { ok?: unknown } | null;
      if (!response.ok || payload?.ok !== true) throw new Error('telegram_api_failed');
    } catch (error) {
      if (error instanceof Error && error.message === 'telegram_api_failed') throw error;
      throw new Error('telegram_api_failed');
    } finally {
      clearTimeout(timeout);
    }
  }
}

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { defineJsonSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { ADMIN_ALERT_BOT_TOKEN } from '../admin_alerts';
import { FirestoreAgentManagerRepository } from '../agent_manager/firestore_repository';
import { AgentManagerLedger } from '../agent_manager/ledger';
import { AgentManagerTelegramApprovalCore } from '../agent_manager/telegram_approvals';
import { managerTelegramTokenPath } from '../agent_manager/telegram_contracts';
import { FirestoreAgentOfficeRepository } from './firestore_repository';
import { AgentOfficeLedger } from './ledger';
import { TelegramApprovalCore } from './telegram_approvals';
import {
  telegramApprovalTokenPath,
  type TelegramApprovalRuntimeConfig,
} from './telegram_contracts';
import {
  createAgentOfficeTelegramWebhookHandler,
  TelegramBotApiTransport,
} from './telegram_transport';

const REGION = 'us-central1';

/**
 * Owner/chat binding and webhook verification material are deliberately kept
 * separate from the browser-editable admin alert configuration.
 */
export const AGENT_OFFICE_TELEGRAM_CONFIG =
  defineJsonSecret<TelegramApprovalRuntimeConfig>('AGENT_OFFICE_TELEGRAM_CONFIG');

/** A non-secret, fail-closed deployment parameter. Missing means disabled. */
export const AGENT_OFFICE_TELEGRAM_ENABLED = defineString(
  'AGENT_OFFICE_TELEGRAM_ENABLED',
  { default: 'false' },
);

const handler = createAgentOfficeTelegramWebhookHandler({
  isEnabled: () => AGENT_OFFICE_TELEGRAM_ENABLED.value() === 'true',
  loadConfig: () => AGENT_OFFICE_TELEGRAM_CONFIG.value(),
  loadTokenByHash: async (callbackNamespace, tokenIdHash) => {
    const tokenPath = callbackNamespace === 'ao1'
      ? telegramApprovalTokenPath(tokenIdHash)
      : managerTelegramTokenPath(tokenIdHash);
    const snapshot = await admin.firestore().doc(tokenPath).get();
    return snapshot.exists ? snapshot.data() ?? null : null;
  },
  handleApproval: async (update, state) => {
    if (update.callbackNamespace === 'am1') {
      const repository = new FirestoreAgentManagerRepository(admin.firestore());
      const core = new AgentManagerTelegramApprovalCore(new AgentManagerLedger(repository));
      return core.handle(update, state);
    }
    const repository = new FirestoreAgentOfficeRepository(admin.firestore());
    const core = new TelegramApprovalCore(new AgentOfficeLedger(repository));
    return core.handle(update, state);
  },
  answerCallbackQuery: async (callbackQueryId, text) => {
    const transport = new TelegramBotApiTransport(ADMIN_ALERT_BOT_TOKEN.value());
    await transport.answerCallbackQuery(callbackQueryId, text);
  },
  log: (event, reason) => logger.warn('agent_office_telegram_webhook', { event, reason }),
});

export const agentOfficeTelegramWebhook = onRequest({
  region: REGION,
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 3,
  cors: false,
  secrets: [ADMIN_ALERT_BOT_TOKEN, AGENT_OFFICE_TELEGRAM_CONFIG],
}, handler);

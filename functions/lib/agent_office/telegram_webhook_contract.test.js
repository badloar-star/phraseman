"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
describe('Agent Office Telegram production wrapper contract', () => {
    const source = (0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, 'telegram_webhook.ts'), 'utf8');
    const rootIndex = (0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, '..', 'index.ts'), 'utf8');
    test('reuses only the existing alert bot secret and keeps approval identity in a separate secret', () => {
        expect(source).toContain("import { ADMIN_ALERT_BOT_TOKEN } from '../admin_alerts'");
        expect(source).toContain("defineJsonSecret<TelegramApprovalRuntimeConfig>('AGENT_OFFICE_TELEGRAM_CONFIG')");
        expect(source).toContain('secrets: [ADMIN_ALERT_BOT_TOKEN, AGENT_OFFICE_TELEGRAM_CONFIG]');
        expect(source).not.toMatch(/admin_config\/alerts|ALERTS_DOC|chatId.*alerts/i);
    });
    test('is fail-closed by default and exports only the intended HTTP function', () => {
        expect(source).toContain("{ default: 'false' }");
        expect(source).toContain("AGENT_OFFICE_TELEGRAM_ENABLED.value() === 'true'");
        expect(source).toContain('export const agentOfficeTelegramWebhook = onRequest');
        expect(source).not.toMatch(/onCall|onSchedule|onDocument(?:Created|Written)|setInterval/);
        expect(rootIndex).toContain('agentOfficeTelegramWebhook,');
    });
    test('does not access the bot token until a verified decision needs a safe acknowledgement', () => {
        const decisionIndex = source.indexOf('handleApproval:');
        const replyIndex = source.indexOf('answerCallbackQuery:');
        const tokenValueIndex = source.indexOf('ADMIN_ALERT_BOT_TOKEN.value()');
        expect(decisionIndex).toBeGreaterThan(-1);
        expect(replyIndex).toBeGreaterThan(decisionIndex);
        expect(tokenValueIndex).toBeGreaterThan(replyIndex);
    });
    test('routes ao1 and am1 through their exact token roots, repositories, ledgers and cores', () => {
        expect(source).toContain("callbackNamespace === 'ao1'");
        expect(source).toContain('telegramApprovalTokenPath(tokenIdHash)');
        expect(source).toContain('managerTelegramTokenPath(tokenIdHash)');
        expect(source).toContain('new TelegramApprovalCore(new AgentOfficeLedger');
        expect(source).toContain('new AgentManagerTelegramApprovalCore(new AgentManagerLedger');
    });
});
//# sourceMappingURL=telegram_webhook_contract.test.js.map
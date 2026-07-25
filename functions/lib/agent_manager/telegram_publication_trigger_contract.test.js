"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
describe('Agent Manager Telegram publication trigger', () => {
    const source = (0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, 'telegram_publication_trigger.ts'), 'utf8');
    test('uses the existing bot and one server-only task-event trigger', () => {
        expect(source).toContain("document: 'agent_manager_task_events/{eventId}'");
        expect(source).toContain('onDocumentCreated');
        expect(source).toContain('secrets: [ADMIN_ALERT_BOT_TOKEN, AGENT_OFFICE_TELEGRAM_CONFIG]');
        expect(source).toContain('AGENT_OFFICE_TELEGRAM_ENABLED.value() !== \'true\'');
        expect(source).not.toMatch(/onCall|onRequest|onSchedule/);
    });
    test('publishes only manager-prefixed, short-lived approval capabilities without task content', () => {
        expect(source).toContain('am1:a:${approveNonce}');
        expect(source).toContain('am1:r:${rejectNonce}');
        expect(source).toContain('Одобрение только поставит задачу в очередь. Выполнение не запускается автоматически.');
        expect(source).toContain('MANAGER_TELEGRAM_TOKEN_TTL_MS');
        expect(source).toContain('taskDigest');
        expect(source).not.toContain('value.title');
        expect(source).not.toContain('value.brief');
        expect(source).not.toContain('sourceLinks');
    });
});
//# sourceMappingURL=telegram_publication_trigger_contract.test.js.map
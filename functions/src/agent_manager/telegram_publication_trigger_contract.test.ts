import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Agent Manager Telegram publication trigger', () => {
  const source = readFileSync(join(__dirname, 'telegram_publication_trigger.ts'), 'utf8');

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
  expect(source).toContain("projection.allowedScope === 'code_prepare'");
  expect(source).toContain("projection.allowedScope === 'content_prepare'");
  expect(source).toContain('только привязанный локальный Codex runner');
  expect(source).toContain('серверного обработчика');
  expect(source).toContain('очередь для ручной подготовки');
    expect(source).toContain('MANAGER_TELEGRAM_TOKEN_TTL_MS');
    expect(source).toContain('taskDigest');
    expect(source).not.toContain('value.title');
    expect(source).not.toContain('value.brief');
    expect(source).not.toContain('sourceLinks');
  });
});

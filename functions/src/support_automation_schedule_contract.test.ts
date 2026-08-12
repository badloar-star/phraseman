import fs from 'fs';
import path from 'path';

describe('support automation schedules', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

  test('polls Gmail once per hour as required by the owner', () => {
    const start = source.indexOf('export const gmailSupportPullCron');
    const body = source.slice(start, source.indexOf('\n);', start) + 3);
    expect(body).toContain("schedule: 'every 60 minutes'");
    expect(body).toContain("timeZone: 'UTC'");
  });

  test('schedules bounded owner-alert retries with the Telegram secret', () => {
    const start = source.indexOf('export const supportOwnerAlertRetryCron');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('\n);', start) + 3);
    expect(body).toContain("schedule: 'every 10 minutes'");
    expect(body).toContain('secrets: [ADMIN_ALERT_BOT_TOKEN]');
    expect(body).toContain('runSupportOwnerAlertRetryCron()');
  });

  test('schedules the reply dispatch sweeper without dispatching ambiguous mail', () => {
    const start = source.indexOf('export const supportReplyDispatchSweeperCron');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('\n);', start) + 3);
    expect(body).toContain("schedule: 'every 10 minutes'");
    expect(body).toContain('runSupportReplyDispatchSweeper()');
  });

  test('schedules bounded auto-reply recovery with both required secrets', () => {
    const start = source.indexOf('export const supportAutoReplyRetryCron');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('\n);', start) + 3);
    expect(body).toContain("schedule: 'every 60 minutes'");
    expect(body).toContain('GMAIL_SUPPORT_APP_PASSWORD');
    expect(body).toContain('SUPPORT_OPENAI_API_KEY');
    expect(body).toContain('runSupportAutoReplyRetryCron()');
  });

  test('checks only prepared three-hour deadlines every ten minutes without polling Gmail', () => {
    const start = source.indexOf('export const supportTelegramAutoSendDeadlineCron');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('\n);', start) + 3);
    expect(body).toContain("schedule: 'every 10 minutes'");
    expect(body).toContain('runSupportTelegramAutoSendDeadline()');
    expect(body).not.toContain('GMAIL_SUPPORT_APP_PASSWORD');
  });

  test('public Telegram webhook never mounts Gmail or OpenAI secrets', () => {
    const webhook = fs.readFileSync(path.join(__dirname, 'jarvis', 'approval_webhook.ts'), 'utf8');
    const start = webhook.indexOf('export const jarvisTelegramApprovalWebhook');
    const options = webhook.slice(start, webhook.indexOf('async (req, res)', start));
    expect(options).toContain('secrets: [JARVIS_TELEGRAM_CONFIG, ADMIN_ALERT_BOT_TOKEN]');
    expect(options).not.toContain('GMAIL_SUPPORT_APP_PASSWORD');
    expect(options).not.toContain('SUPPORT_OPENAI_API_KEY');
  });
});

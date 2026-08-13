import fs from 'fs';
import path from 'path';

describe('support automation schedules', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
  const declaration = (name: string) => {
    const start = source.indexOf(`export const ${name}`);
    expect(start).toBeGreaterThan(-1);
    const next = source.indexOf('\nexport const ', start + 1);
    return source.slice(start, next > start ? next : source.length);
  };

  test('polls Gmail once per hour as required by the owner', () => {
    const body = declaration('gmailSupportPullCron');
    expect(body).toMatch(/schedule:\s*["']every 60 minutes["']/);
    expect(body).toMatch(/timeZone:\s*["']UTC["']/);
  });

  test('schedules bounded owner-alert retries with the Telegram secret', () => {
    const body = declaration('supportOwnerAlertRetryCron');
    expect(body).toMatch(/schedule:\s*["']every 10 minutes["']/);
    expect(body).toContain('secrets: [ADMIN_ALERT_BOT_TOKEN]');
    expect(body).toContain('runSupportOwnerAlertRetryCron()');
  });

  test('schedules the reply dispatch sweeper without dispatching ambiguous mail', () => {
    const body = declaration('supportReplyDispatchSweeperCron');
    expect(body).toMatch(/schedule:\s*["']every 10 minutes["']/);
    expect(body).toContain('runSupportReplyDispatchSweeper()');
  });

  test('schedules bounded auto-reply recovery with both required secrets', () => {
    const body = declaration('supportAutoReplyRetryCron');
    expect(body).toMatch(/schedule:\s*["']every 60 minutes["']/);
    expect(body).toContain('GMAIL_SUPPORT_APP_PASSWORD');
    expect(body).toContain('SUPPORT_OPENAI_API_KEY');
    expect(body).toContain('runSupportAutoReplyRetryCron()');
  });

  test('checks only prepared three-hour deadlines every ten minutes without polling Gmail', () => {
    const body = declaration('supportTelegramAutoSendDeadlineCron');
    expect(body).toMatch(/schedule:\s*["']every 10 minutes["']/);
    expect(body).toContain('runSupportTelegramAutoSendDeadline()');
    expect(body).not.toContain('GMAIL_SUPPORT_APP_PASSWORD');
  });

  test('recovers pending and abandoned Telegram reply jobs with worker-only secrets', () => {
    const body = declaration('supportTelegramReplyJobRecoveryCron');
    expect(body).toMatch(/schedule:\s*["']every 10 minutes["']/);
    expect(body).toContain('runSupportTelegramReplyJobRecovery()');
    expect(body).toContain('GMAIL_SUPPORT_APP_PASSWORD');
    expect(body).toContain('SUPPORT_OPENAI_API_KEY');
    expect(body).toContain('JARVIS_TELEGRAM_CONFIG');
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

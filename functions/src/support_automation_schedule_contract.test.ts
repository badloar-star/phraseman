import fs from 'fs';
import path from 'path';

describe('support automation schedules', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

  test('pulls Gmail before the 06:00 UTC Jarvis morning run', () => {
    const start = source.indexOf('export const gmailSupportPullCron');
    const body = source.slice(start, source.indexOf('\n);', start) + 3);
    expect(body).toContain("schedule: '30 5 * * *'");
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
});

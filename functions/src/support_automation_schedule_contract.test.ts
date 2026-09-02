import fs from 'fs';
import path from 'path';

// зачем (владелец, 2026-09-02, аудит расходов): семь отдельных кронов поддержки
// заменены одним диспетчером supportOpsCron. Раньше каждый тест сторожил своё
// расписание в своём `export const`; теперь такт задаёт таблица задач внутри
// диспетчера, поэтому проверяем ЕЁ — гарантии остались те же:
//   • почта опрашивается раз в час (требование владельца 2026-08-11);
//   • дедлайн автоотправки в Telegram проверяется каждые 10 минут, иначе
//     обещание «3 часа ± 10 минут» превратится в «3 часа ± полчаса»;
//   • ретраи не чаще получаса — им десятиминутный такт не нужен;
//   • одна упавшая задача не отменяет остальные и логирует причину.
describe('support automation schedules', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
  const dispatcherStart = source.indexOf('export const supportOpsCron');
  const dispatcher = source.slice(
    dispatcherStart,
    source.indexOf('\nexport const ', dispatcherStart + 1),
  );

  const task = (name: string) => {
    const line = dispatcher
      .split('\n')
      .find((candidate) => candidate.includes(`name: '${name}'`));
    expect(line).toBeDefined();
    return line as string;
  };

  test('one dispatcher replaced the seven separate support crons', () => {
    expect(dispatcherStart).toBeGreaterThan(-1);
    expect(dispatcher).toMatch(/schedule:\s*["']every 10 minutes["']/);
    expect(dispatcher).toMatch(/timeZone:\s*["']UTC["']/);
    for (const retired of [
      'export const gmailSupportPullCron',
      'export const gmailSupportOwnerReplyDetectionCron',
      'export const supportOwnerAlertRetryCron',
      'export const supportReplyDispatchSweeperCron',
      'export const supportAutoReplyRetryCron',
      'export const supportTelegramAutoSendDeadlineCron',
      'export const supportTelegramReplyJobRecoveryCron',
    ]) {
      expect(source).not.toContain(retired);
    }
  });

  test('polls Gmail once per hour as required by the owner', () => {
    expect(task('gmailSupportPullCron')).toContain('due: hourly');
    expect(task('gmailSupportOwnerReplyDetectionCron')).toContain('due: hourly');
    expect(dispatcher).toContain('const hourly = minuteOfHour < 10;');
    expect(dispatcher).toContain('runSupportInboxPullCron');
  });

  test('keeps bounded owner-alert retries and the dispatch sweeper on a half-hour cadence', () => {
    expect(task('supportOwnerAlertRetryCron')).toContain('due: everyThirtyMin');
    expect(task('supportReplyDispatchSweeperCron')).toContain('due: everyThirtyMin');
    expect(dispatcher).toContain('const everyThirtyMin = minuteOfHour % 30 < 10;');
    expect(dispatcher).toContain('runSupportOwnerAlertRetryCron');
    expect(dispatcher).toContain('runSupportReplyDispatchSweeper');
  });

  test('schedules bounded auto-reply recovery once per hour', () => {
    expect(task('supportAutoReplyRetryCron')).toContain('due: hourly');
    expect(dispatcher).toContain('runSupportAutoReplyRetryCron');
  });

  test('checks prepared three-hour deadlines on every ten-minute tick', () => {
    expect(task('supportTelegramAutoSendDeadlineCron')).toContain('due: true');
    expect(dispatcher).toContain('runSupportTelegramAutoSendDeadline');
  });

  test('recovers pending and abandoned Telegram reply jobs on every tick', () => {
    expect(task('supportTelegramReplyJobRecoveryCron')).toContain('due: true');
    expect(dispatcher).toContain('runSupportTelegramReplyJobRecovery');
  });

  test('mounts every secret the merged tasks need', () => {
    for (const secret of [
      'GMAIL_SUPPORT_APP_PASSWORD',
      'SUPPORT_OPENAI_API_KEY',
      'ADMIN_ALERT_BOT_TOKEN',
      'JARVIS_TELEGRAM_CONFIG',
    ]) {
      expect(dispatcher).toContain(secret);
    }
  });

  test('one failing task never cancels the rest and always logs the reason', () => {
    expect(dispatcher).toContain('catch (error)');
    expect(dispatcher).toContain('support_ops_cron_task_failed');
    expect(dispatcher).toContain('reason:');
    expect(dispatcher).toContain('support_ops_cron_tick');
  });

  test('every task still writes its heartbeat under the original cron name', () => {
    expect(dispatcher).toContain('withCronHeartbeat<undefined>(task.name, task.run)');
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

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { ADMIN_ALERT_IDS } from './admin_alert_catalog';
import { redactAdminAlertText, renderAdminAlertMessages } from './admin_alert_privacy';

// зачем (§CORE-0159, решение координатора 11.10): в Telegram не уходят почта, телефон и uid. Оповещения
// идут через очередь с белым списком (admin_alert_privacy); прямая отправка мимо него — только у известных
// рабочих каналов (поддержка, бот оплаты, восстановление входа, Джарвис). Новый прямой отправитель
// обязан идти через enqueueAdminAlert — иначе этот сторож падает.
const SRC = __dirname;
const DIRECT_SEND = /sendTelegramAlert\(|api\.telegram\.org|deps\.sendMessage\(|sendJarvisDigest(?:Message)?\(/;
const KNOWN_DIRECT_SENDERS = new Set([
  'admin_alert_dispatcher.ts',
  'admin_alerts.ts',
  'auth_recovery.ts',
  'email_delivery_watchdog.ts',
  'jarvis/approval_webhook.ts',
  'jarvis/jarvis_crons.ts',
  'jarvis/telegram_send.ts',
  'support_inbox.ts',
  'telegram_premium_bot.ts',
  'telegram_support.ts',
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' || name === 'generated' ? [] : sourceFiles(full);
    return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [full] : [];
  });
}

describe('nothing personal reaches Telegram', () => {
  it('only the known working channels send to Telegram directly; everything else goes through the alert outbox', () => {
    const direct = sourceFiles(SRC)
      .filter((file) => DIRECT_SEND.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file).split('\\').join('/'));
    expect(direct.filter((file) => !KNOWN_DIRECT_SENDERS.has(file))).toEqual([]);
  });

  it('alert text masks email and international phone numbers but keeps stack numbers', () => {
    const text = redactAdminAlertText('Письмо от anna.k+test@mail.example.co, тел. +7 (912) 345-67-89. at App (1725000000000:42)');
    expect(text).not.toMatch(/anna\.k|mail\.example|912|345-67/);
    expect(text).toContain('[почта скрыта]');
    expect(text).toContain('[телефон скрыт]');
    expect(text).toContain('1725000000000:42');
  });

  it.each(ADMIN_ALERT_IDS.filter((id) => id !== 'ownerDailyDigest' && id !== 'customCardMilestone'))(
    '%s never prints an email or phone from any detail',
    (eventType) => {
      const details = ['Текст репорта', 'Комментарий', 'Сообщение', 'Сообщение ошибки', 'Стек ошибки', 'Отправитель', 'Текст пользователя', 'Отзыв', 'Описание']
        .map((label) => ({ label, value: `пишите на leak.person@example.com или +44 7700 900123 (${label})` }));
      const text = renderAdminAlertMessages({ eventType, occurredAtMs: 1725000000000, payload: { details } as never }).join('\n');
      expect(text).not.toContain('leak.person@example.com');
      expect(text).not.toContain('7700 900123');
    },
  );
});

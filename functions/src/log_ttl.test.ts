import * as fs from 'fs';
import * as path from 'path';
import { LOG_TTL_DAYS, LOG_TTL_MS, logExpireAt } from './log_ttl';
import { buildPaymentWebhookFailureDoc } from './payment_webhook_alert';

describe('log_ttl (журналы app_errors / app_activity живут 90 дней)', () => {
  test('срок = ровно 90 суток от момента записи', () => {
    const now = Date.UTC(2026, 9, 1, 12, 0, 0);
    expect(LOG_TTL_DAYS).toBe(90);
    expect(LOG_TTL_MS).toBe(90 * 86_400_000);
    expect(logExpireAt(now).toMillis()).toBe(now + 90 * 86_400_000);
  });

  test('платёжный сигнал в app_errors несёт expireAt', () => {
    const now = Date.UTC(2026, 9, 1);
    const doc = buildPaymentWebhookFailureDoc({ hook: 'transfer', message: 'x', nowMs: now });
    expect((doc.expireAt as { toMillis(): number }).toMillis()).toBe(now + LOG_TTL_MS);
  });

  test('firestore.indexes.json содержит TTL-политику для обоих журналов', () => {
    const file = path.resolve(__dirname, '..', '..', 'firestore.indexes.json');
    const json = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      fieldOverrides: Array<{ collectionGroup: string; fieldPath: string; ttl?: boolean }>;
    };
    for (const group of ['app_errors', 'app_activity']) {
      expect(json.fieldOverrides).toEqual(
        expect.arrayContaining([expect.objectContaining({ collectionGroup: group, fieldPath: 'expireAt', ttl: true })]),
      );
    }
  });

  test('каждый серверный писатель журналов ставит expireAt', () => {
    const src = (name: string) => fs.readFileSync(path.resolve(__dirname, name), 'utf8');
    expect(src('client_reports.ts').match(/expireAt: logExpireAt\(now\)/g)).toHaveLength(2);
    expect(src('max_voice_watchdog.ts')).toContain('expireAt: logExpireAt(nowMs)');
    expect(src('max_voice_usage_recon.ts')).toContain('expireAt: logExpireAt(nowMs)');
    expect(src('payment_webhook_alert.ts')).toContain('expireAt: logExpireAt(input.nowMs)');
  });
});

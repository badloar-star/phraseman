import { runQualityDepartment } from './quality_department';
import { buildTelegramDigest } from './telegram_digest';
import type { FetchQualitySourceResult } from './quality_firestore_fetcher';

/**
 * Бриф в167: защита от prompt injection из репортов пользователей.
 *
 * зачем этот тест отдельно от telegram_digest.test.ts: там HTML-инъекция
 * проверяется на РУЧНО собранном Decision. Здесь — на настоящем пути:
 * пользователь пишет вредоносный текст в поле category своего отчёта об
 * ошибке (это свободная строка, не enum — см. quality_source_reader.ts), она
 * попадает в finding через runQualityDepartment, и должна быть обезврежена
 * к моменту, когда buildTelegramDigest соберёт сообщение владельцу.
 */

function fetchResult(overrides: Partial<FetchQualitySourceResult> = {}): FetchQualitySourceResult {
  return {
    sourceId: 'error_reports',
    state: 'ready',
    truncated: false,
    droppedCount: 0,
    rows: [],
    observedAtMs: 10_000,
    ...overrides,
  };
}

describe('Jarvis quality department — a malicious report field cannot break the owner message', () => {
  test('an HTML payload in the free-text category field is neutralised end-to-end', () => {
    const maliciousCategory = '<script>alert(1)</script><b>внедрение</b>';
    const rows = Array.from({ length: 20 }, () => ({
      category: maliciousCategory, screen: 'lesson', createdAtMs: 5_000,
    }));

    const { decisions } = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });

    expect(decisions).toHaveLength(1);
    // На уровне Decision текст ещё сырой — это ожидаемо, обезвреживание
    // происходит на выходе (дайджест/панель), а не на входе.
    expect(decisions[0].finding).toContain(maliciousCategory);

    const text = buildTelegramDigest({ decisions, appTier: 'growth', departmentErrors: [] });
    expect(text).not.toContain('<script>');
    // зачем не "not.toContain('<b>')": дайджест САМ легитимно использует <b>
    // для заголовков («<b>Джарвис</b>», «<b>Качество</b>») — это не инъекция,
    // а разметка, которую формирует наш код. Важно, что ИМЕННО внедрённый
    // тег из данных пользователя обезврежен.
    expect(text).not.toContain('<b>внедрение</b>');
    expect(text).toContain('&lt;script&gt;');
    expect(text).toContain('&lt;b&gt;внедрение&lt;/b&gt;');
  });

  test('an oversized category field does not blow up the message length limit', () => {
    // зачем: свободная строка не ограничена по длине при чтении из Firestore
    // (quality_firestore_fetcher.ts:text() только trim, без cap) — дайджест
    // обязан резать сообщение сам, а не полагаться на входные данные.
    const hugeCategory = 'A'.repeat(10_000);
    const rows = Array.from({ length: 20 }, () => ({
      category: hugeCategory, screen: 'lesson', createdAtMs: 5_000,
    }));

    const { decisions } = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });

    const text = buildTelegramDigest({ decisions, appTier: 'growth', departmentErrors: [] });
    expect(text.length).toBeLessThan(4096);
  });
});

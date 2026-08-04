import { buildNewMailAlertText } from './support_inbox_alert';

/**
 * Текст уведомления в Telegram о новом письме поддержки: письмо + готовый
 * черновик ответа. Владелец 2026-08-04: «читать обращения пользователей»,
 * не рекламу — эта функция вызывается ТОЛЬКО для писем, прошедших спам-фильтр,
 * поэтому сама не решает спам/не спам, только форматирует то, что уже решено.
 */
describe('buildNewMailAlertText', () => {
  test('includes subject, body and the prepared draft', () => {
    const text = buildNewMailAlertText({
      fromEmail: 'user@example.com',
      subject: 'Не работает подписка',
      bodyText: 'Оплатил Plus, но доступ не появился',
      draftReply: 'Здравствуйте! Проверили — доступ уже открыт, извините за ожидание.',
    });
    expect(text).toContain('Не работает подписка');
    expect(text).toContain('Оплатил Plus');
    expect(text).toContain('Проверили — доступ уже открыт');
  });

  test('escapes HTML in subject/body/draft — Telegram uses parse_mode HTML', () => {
    const text = buildNewMailAlertText({
      fromEmail: 'a@b.c',
      subject: '<script>alert(1)</script>',
      bodyText: 'обычный текст',
      draftReply: 'ответ',
    });
    expect(text).not.toContain('<script>');
    expect(text).toContain('&lt;script&gt;');
  });

  test('missing draft is shown honestly, not silently omitted', () => {
    const text = buildNewMailAlertText({
      fromEmail: 'a@b.c',
      subject: 's',
      bodyText: 'b',
      draftReply: null,
    });
    expect(text).toMatch(/черновик не подготовлен|не удалось подготовить/i);
  });

  test('long body is truncated — Telegram message cap and readability', () => {
    const text = buildNewMailAlertText({
      fromEmail: 'a@b.c',
      subject: 's',
      bodyText: 'x'.repeat(10_000),
      draftReply: 'ответ',
    });
    expect(text.length).toBeLessThan(4096);
  });

  test('sender email is included so the owner knows who is asking', () => {
    const text = buildNewMailAlertText({
      fromEmail: 'client@phraseman-user.com',
      subject: 's',
      bodyText: 'b',
      draftReply: 'r',
    });
    expect(text).toContain('client@phraseman-user.com');
  });
});

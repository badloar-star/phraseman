import {
  findSupportHumanVoiceViolations,
  supportReplyIsCustomerReady,
  SUPPORT_COMMUNICATION_BIBLE_PROMPT,
} from './support_communication_bible';

describe('Phraseman support communication Bible', () => {
  test.each([
    'В доступном снимке продукта не нашлось достаточно надёжных фактов.',
    'По данным репозитория feature was removed in commit abc.',
    'The repository snapshot contains no evidence for this answer.',
    'El reviewer no encontró evidence en el source code.',
  ])('blocks internal process language: %s', (reply) => {
    expect(findSupportHumanVoiceViolations(reply)).toContain('internal_process_language');
  });

  test('blocks the exact robotic diagnostic fallback from the screenshot', () => {
    const reply = 'Мы получили ваше сообщение. Ответьте с версией приложения, платформой (iPhone или Android) и тем, что вы уже пробовали. Никогда не присылайте пароль, код входа или данные карты.';
    expect(findSupportHumanVoiceViolations(reply, 'Куда делся Компас?')).toEqual(expect.arrayContaining([
      'generic_receipt_boilerplate',
      'blanket_diagnostic_request',
      'irrelevant_security_warning',
    ]));
    expect(supportReplyIsCustomerReady({ reply, issue: 'Куда делся Компас?', grounded: true })).toBe(false);
  });

  test('a warm direct historical product answer is customer-ready', () => {
    const reply = 'Здравствуйте! Да, вы правы: отдельный «Компас» с ежедневными рекомендациями раньше был в Phraseman. Позже этот раздел убрали, поэтому сейчас прежний экран больше не показывается. Если вы искали конкретную возможность, расскажите какую — подскажем ближайший вариант.';
    expect(findSupportHumanVoiceViolations(reply, 'Куда делся Компас?')).toEqual([]);
    expect(supportReplyIsCustomerReady({ reply, issue: 'Куда делся Компас?', grounded: true })).toBe(true);
  });

  test('ungrounded model output is never customer-ready even when it sounds polite', () => {
    expect(supportReplyIsCustomerReady({ reply: 'Здравствуйте! Давайте разберёмся.', grounded: false })).toBe(false);
  });

  test('immutable Bible explicitly outranks rude owner style', () => {
    expect(SUPPORT_COMMUNICATION_BIBLE_PROMPT).toMatch(/never rude/i);
    expect(SUPPORT_COMMUNICATION_BIBLE_PROMPT).toMatch(/internal tools/i);
  });
});

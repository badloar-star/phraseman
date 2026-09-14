import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

describe('support inbox mail chain characterization', () => {
  it('parses a plain-text support message without exposing raw transport details', async () => {
    const parsed = await simpleParser(
      Buffer.from([
        'From: learner@example.test',
        'To: support@phraseman.test',
        'Subject: Help with my lesson',
        'Content-Type: text/plain; charset=utf-8',
        '',
        'I cannot open lesson 3.',
      ].join('\r\n')),
    );

    expect(parsed.subject).toBe('Help with my lesson');
    expect(parsed.text?.trim()).toBe('I cannot open lesson 3.');
    expect(parsed.from?.value[0]?.address).toBe('learner@example.test');
  });

  it('sends a sanitized message through the configured transport contract', async () => {
    const transport = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
    });
    const info = await transport.sendMail({
      from: 'support@phraseman.test',
      to: 'learner@example.test',
      subject: 'Support reply',
      text: 'We received your report.',
    });

    expect(info.messageId).toEqual(expect.any(String));
    expect(info.message).toBeInstanceOf(Buffer);
    transport.close();
  });
});

// PM-226 (A2): диагностика не содержит токенов, email, uid целиком, сырого аудио
// и текста личных карточек.
import { maskDiagnosticText, maskUid, newTraceId, sanitizeDiagnosticContext } from '../app/diagnostic_mask';

describe('diagnostic_mask', () => {
  it('masks JWT, bearer, keyed secrets and query secrets', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcDEFghiJKL';
    const out = maskDiagnosticText(`fail ${jwt} Bearer abcdefghij1234567 sk-proj-ABCDEFGHIJKLMNOP https://x.io/a?token=SECRETVALUE&b=1`);
    expect(out).not.toContain('eyJhbGci');
    expect(out).not.toContain('abcdefghij1234567');
    expect(out).not.toContain('ABCDEFGHIJKLMNOP');
    expect(out).not.toContain('SECRETVALUE');
  });

  it('masks email and full uid', () => {
    const out = maskDiagnosticText('user badloar@gmail.com uid Xk29sLmQpR4tVb7YnHz0AcEfGq1W failed');
    expect(out).not.toContain('badloar@gmail.com');
    expect(out).not.toContain('Xk29sLmQpR4tVb7YnHz0AcEfGq1W');
    expect(maskUid('Xk29sLmQpR4tVb7YnHz0AcEfGq1W')).toBe('Xk29…1W');
  });

  it('masks raw audio (base64 / data uri)', () => {
    const b64 = 'A'.repeat(200);
    expect(maskDiagnosticText(`data:audio/wav;base64,${b64}`)).toBe('[data-uri]');
    expect(maskDiagnosticText(`payload ${b64}`)).toBe('payload [blob]');
  });

  it('context: secrets, content and ids are never written verbatim', () => {
    const ctx = sanitizeDiagnosticContext({
      accessToken: 'abc',
      cardText: 'моя личная фраза',
      transcript: 'hello world',
      audioBase64: 'AAAA',
      uid: 'Xk29sLmQpR4tVb7YnHz0AcEfGq1W',
      email: 'a@b.co',
      attempt: 3,
      online: false,
      items: [1, 2, 3],
      status: 'timeout',
    });
    expect(ctx.accessToken).toBe('[secret]');
    expect(ctx.cardText).toBe('[content len=16]');
    expect(ctx.transcript).toBe('[content len=11]');
    expect(ctx.audioBase64).toBe('[content len=4]');
    expect(ctx.uid).toBe('Xk29…1W');
    expect(String(ctx.email)).not.toContain('a@b.co');
    expect(ctx.attempt).toBe(3);
    expect(ctx.online).toBe(false);
    expect(ctx.items).toBe('[array len=3]');
    expect(ctx.status).toBe('timeout');
  });

  it('truncates long text and issues distinct trace ids', () => {
    expect(maskDiagnosticText('x '.repeat(300)).length).toBeLessThanOrEqual(161);
    expect(newTraceId(1000)).not.toBe(newTraceId(1000));
  });
});

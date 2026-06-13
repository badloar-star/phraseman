import fs from 'fs';
import path from 'path';

// intro_ended-копи переехало в app/paywall_copy.ts (единый источник для v1/A/B/C)
// и было переписано в gain-framing (без loss-формулировок). Контракт проверяет
// сам факт выделенного контекста и его текущую мягкую формулировку.
describe('premium modal intro-ended context', () => {
  const copySrc = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_copy.ts'), 'utf8');
  const modalSrc = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

  it('has a dedicated intro_ended context', () => {
    expect(copySrc).toContain('PAYWALL_COPY.intro_ended');
    expect(modalSrc).toContain("'intro_ended'");
  });

  it('uses gentle gain-framed copy (no loss/fear wording)', () => {
    expect(copySrc).toContain('Продолжай в полном доступе');
    expect(copySrc).toContain('Premium открывает его насовсем');
  });
});

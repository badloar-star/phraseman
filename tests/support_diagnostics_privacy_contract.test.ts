import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('support diagnostics privacy and retention contract', () => {
  test('uses explicit-report attachment instead of a background uploader', () => {
    const ring = read('app/support_diagnostics.ts');
    const outbox = read('app/support_report_outbox.ts');
    expect(outbox).toContain('captureSupportDiagnosticBundle');
    expect(ring).not.toMatch(/submitClientReport|setInterval|setTimeout|background upload|daily upload/i);
    // зачем: слово «token» в регулярке ловило безобидную переменную captureAccountGeneration() (токен поколения аккаунта, не секрет) —
    // сторож краснел без утечки. Сужено до НАСТОЯЩИХ секретов: именованные токены доступа и подстановка значения (Bearer …, длинная
    // токен-подобная строка, JWT). Остальные запреты (email/receipt/stack/comment/message/uid:) не ослаблены.
    expect(ring).not.toMatch(/email|receipt|stack|comment|message|uid:/i);
    expect(ring).not.toMatch(/\b(?:id|auth|access|refresh|fcm|push|bearer|api|session)[_-]?token\b/i);
    expect(ring).not.toMatch(/bearer\s+[a-z0-9._-]{8,}/i);
    expect(ring).not.toMatch(/eyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\./i);
    expect(ring).not.toMatch(/\btoken\s*[:=]\s*['"`][^'"`]{8,}['"`]/i);
    const recordStart = ring.indexOf('export async function recordSupportDiagnostic');
    const captureContext = ring.indexOf('const context = activeContext();', recordStart);
    const enqueueMutation = ring.indexOf('await withMutationLock', recordStart);
    expect(captureContext).toBeGreaterThan(recordStart);
    expect(captureContext).toBeLessThan(enqueueMutation);
  });

  test('the narrowed secret patterns still catch a substituted token value', () => {
    const leaks = ['const idToken = 1;', "const x = { token: 'abcdefgh12345' };", 'h = "Bearer abcdefgh12345"', 'jwt eyJhbGciOiJIUzI1NiIs.eyJzdWIiOiIxMjM0.sig'];
    const patterns = [
      /\b(?:id|auth|access|refresh|fcm|push|bearer|api|session)[_-]?token\b/i,
      /bearer\s+[a-z0-9._-]{8,}/i,
      /eyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\./i,
      /\btoken\s*[:=]\s*['"`][^'"`]{8,}['"`]/i,
    ];
    for (const leak of leaks) expect(patterns.some((p) => p.test(leak))).toBe(true);
    expect(patterns.some((p) => p.test('const token = captureAccountGeneration();'))).toBe(false);
  });

  test('documents the bounded on-device history and explicit report action', () => {
    for (const file of ['app/legal/privacy_policy_en.json', 'app/legal/privacy_policy_en_ios.json']) {
      const policy = read(file);
      expect(policy).toContain('bounded technical action history');
      expect(policy).toContain('only when you explicitly submit an in-app support report');
      expect(policy).toContain('message text, passwords, payment details, authentication tokens, or purchase receipts');
    }
  });

  test('keeps the nested timeline out of Jarvis and Telegram text', () => {
    const guard = read('functions/src/jarvis/jarvis_data_contract_guard.test.ts');
    const alerts = read('functions/src/admin_alerts.ts');
    const digest = read('functions/src/admin_daily_digest.ts');
    expect(guard).toContain("'error_reports.diagnostics'");
    expect(guard).toContain('intentionally_excluded_from_jarvis_prompts');
    expect(alerts).not.toContain('report.diagnostics');
    expect(digest).not.toContain('d.diagnostics');
  });
});

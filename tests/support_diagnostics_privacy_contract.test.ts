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
    expect(ring).not.toMatch(/email|token|receipt|stack|comment|message|uid:/i);
    const recordStart = ring.indexOf('export async function recordSupportDiagnostic');
    const captureContext = ring.indexOf('const context = activeContext();', recordStart);
    const enqueueMutation = ring.indexOf('await withMutationLock', recordStart);
    expect(captureContext).toBeGreaterThan(recordStart);
    expect(captureContext).toBeLessThan(enqueueMutation);
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

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('in-app support report contract', () => {
  it('routes Settings support to the in-app form and removes the mail composer flow', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toContain("router.push('/support_report'");
    expect(settings).not.toContain('settings-support-hint');
    expect(settings).not.toContain('support.phraseman@gmail.com');
  });

  it('submits only the user description while tagging automatic support context', () => {
    const screen = read('app/support_report.tsx');
    expect(screen).toContain("screen: 'settings_support'");
    expect(screen).toContain("dataId: 'settings_support_request'");
    // зачем (PhraseMan 2.0): XP удалён — флага награды за отправку больше нет.
    expect(screen).not.toContain('awardSubmissionXp');
    // 04.10 (profile.html PRF-09, abc8be429): длинный абзац с обещанием бонуса под подзаголовком убран по макету.
    expect(screen).not.toContain('очень приятный бонус');
    expect(screen).not.toMatch(/ник|nickname|данные аккаунта|версия добавляется автоматически/i);
    expect(screen).not.toContain('Повторная отправка не создаст дубль во время обработки.');
  });

  it('confirms immediately and lets the durable delivery continue in the background', () => {
    const screen = read('app/support_report.tsx');
    expect(screen).toContain('testID="support-report-input"');
    expect(screen).toContain('testID="support-report-submit"');
    expect(screen).toContain('accessibilityState={{ disabled: !canSend }}');
    expect(screen).toContain('onPress={send}');
    const optimisticConfirmation = screen.indexOf("setState('sent');");
    const backgroundDelivery = screen.indexOf('void sendSupportReportInBackground(');
    expect(optimisticConfirmation).toBeGreaterThanOrEqual(0);
    expect(backgroundDelivery).toBeGreaterThan(optimisticConfirmation);
    expect(screen).toContain('submissionStartedRef.current = true;');
    expect(screen).not.toContain("'sending'");
    expect(screen).not.toContain('<ActivityIndicator');
    expect(screen).not.toContain('await sendSupportReportInBackground(');
    expect(screen).toContain('onPress={close}');
  });

  // зачем (координатор 12.10, Optimistic UI): «Отправлено» мгновенно, но потеря обращения не молчит — откат на форму с текстом, плашка и повтор.
  it('rolls back to the form with the text kept when both the queue and direct delivery fail', () => {
    const screen = read('app/support_report.tsx');
    const outbox = read('app/support_report_outbox.ts');
    expect(outbox).toContain("export type SupportSendOutcome = 'queued' | 'sent' | 'failed';");
    expect(outbox).toContain("return direct === 'sent' ? 'sent' : 'failed';");
    expect(outbox).toContain("return 'queued';");
    expect(outbox).toContain('[SUPPORT-SEND]');
    expect(screen).toContain("if (outcome !== 'failed') return;");
    expect(screen).toContain('submissionStartedRef.current = false;');
    expect(screen).toContain('setSendFailed(true)');
    expect(screen).toContain('testID="support-report-failed"');
    expect(screen).not.toContain("setDescription('')");
  });

  it('discloses, previews, and freezes the bounded technical timeline', () => {
    const screen = read('app/support_report.tsx');
    const outbox = read('app/support_report_outbox.ts');
    const transport = read('app/error_report.ts');
    expect(screen).toContain('captureSupportDiagnosticBundle');
    expect(screen).toContain('testID="support-diagnostics-disclosure"');
    expect(screen).toContain('testID="support-diagnostics-preview-toggle"');
    expect(screen).toContain('diagnosticsPreview.events');
    expect(screen).not.toContain('diagnosticsPreview.comment');
    expect(outbox).toContain('const frozenPayload = diagnostics');
    expect(outbox).toContain('payload: frozenPayload');
    expect(outbox).toContain('SUPPORT_DIAGNOSTIC_CAPTURE_DEADLINE_MS');
    expect(outbox).toContain('captureSupportDiagnosticsWithDeadline()');
    expect(outbox).not.toContain('await recordSupportDiagnostic({');
    expect(transport).toContain('diagnostics?: SupportDiagnosticBundle');
    expect(transport).toContain('diagnostics: payload.diagnostics');
  });

  it('retries pending support reports at bootstrap and whenever the current account returns active', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain("import('./support_report_outbox')");
    expect(layout).toContain('resumePendingSupportReports(stableId)');
    expect(layout).toContain('appIsActive');
  });

  // зачем (Q91, координатор 01.10): баннер ответа на жалобу с Главной удалён — ответ есть в колокольчике.
  it('keeps the report reply out of Home: no banner, no requested-reply plumbing', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).not.toContain('ReportReplyHomeBanner');
    expect(home).not.toContain('requestedReportReply');
    expect(home).toContain('<NotificationCenterButton');
  });

  // зачем (PhraseMan 2.0): XP удалён целиком; отправка отчёта больше ничего не начисляет.
  it('no longer awards XP for report submission', () => {
    const source = read('app/error_report.ts');
    expect(source).not.toContain('awardSubmissionXp');
  });
});

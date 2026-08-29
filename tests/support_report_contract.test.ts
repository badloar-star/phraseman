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
    expect(screen).toContain('awardSubmissionXp: false');
    expect(screen).toContain('очень приятный бонус');
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

  it('places a dismissible direct-open reply banner immediately after the last lesson', () => {
    const home = read('app/(tabs)/home.tsx');
    const banner = read('components/ReportReplyHomeBanner.tsx');
    const lesson = home.indexOf('testID="home-continue-lesson"');
    const replyBanner = home.indexOf('<ReportReplyHomeBanner');
    const followingQueue = home.indexOf('{bannersJSX}', replyBanner);
    expect(lesson).toBeGreaterThanOrEqual(0);
    expect(replyBanner).toBeGreaterThan(lesson);
    expect(followingQueue).toBeGreaterThan(replyBanner);
    expect(home).toContain('onOpen={handleReportReplyBannerOpen}');
    expect(banner).toContain('testID="home-report-reply-banner"');
    expect(banner).toContain('onPress={open}');
    expect(banner).toContain('testID="home-report-reply-banner-close"');
    expect(banner).toContain('onPress={dismiss}');
    expect(banner).toContain('persistDismissed(owner, selected.id)');
    expect(banner).toContain('onOpen(selected)');
  });

  it('keeps XP for old report callers but lets support opt out explicitly', () => {
    const source = read('app/error_report.ts');
    expect(source).toContain('awardSubmissionXp?: boolean');
    expect(source).toContain('options.awardSubmissionXp !== false');
  });
});

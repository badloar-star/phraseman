/**
 * Владелец 11.11: «не надо им знать это», «мы берём её и так и так» — переключателя «Приложить журнал диагностики» на форме больше нет,
 * журнал прикладывается к обращению всегда. Раньше (решение 12.10 (б)) тест сторожил переключатель.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('форма поддержки: журнал прикладывается всегда, без переключателя', () => {
  const screen = read('app/support_report.tsx');
  const outbox = read('app/support_report_outbox.ts');

  it('на форме нет переключателя и его состояния', () => {
    expect(screen).not.toContain('CustomSwitch');
    expect(screen).not.toContain('attachDiagnostics');
    expect(screen).not.toContain('support-diagnostics-attach-switch');
    expect(screen).not.toContain('Приложить журнал диагностики');
  });

  it('экран передаёт заранее захваченный журнал и не просит отправку его пропустить', () => {
    expect(screen).toContain('...(diagnosticsPreview ? { diagnostics: diagnosticsPreview } : {}),');
    expect(screen).toContain('}, lang).then((outcome) => {');
  });

  it('отправка без указаний прикладывает журнал: берёт переданный или захватывает сама', () => {
    expect(outbox).toContain('delivery: { attachDiagnostics?: boolean } = {},');
    const capture = outbox.slice(outbox.indexOf('const attachDiagnostics = delivery.attachDiagnostics !== false;'));
    expect(capture.indexOf('const capturedDiagnostics = !attachDiagnostics ? null : payload.diagnostics')).toBeGreaterThan(-1);
    expect(capture.indexOf('const capturedDiagnostics')).toBeLessThan(capture.indexOf('captureSupportDiagnosticsWithDeadline()'));
  });
});

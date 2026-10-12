/**
 * Переключатель «Приложить журнал диагностики» (решение владельца 12.10 (б)): по умолчанию включён; выключен — журнал не захватывается
 * и не отправляется (ни экраном, ни отправкой). Хаптик на переключателе, роль switch и подпись для диктора — у CustomSwitch.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('форма поддержки: переключатель журнала', () => {
  const screen = read('app/support_report.tsx');
  const outbox = read('app/support_report_outbox.ts');

  it('по умолчанию включён; переключение — хаптик и лог; выключение прячет «Посмотреть»', () => {
    expect(screen).toContain('const [attachDiagnostics, setAttachDiagnostics] = useState(true);');
    const toggle = screen.slice(screen.indexOf('const toggleAttachDiagnostics = useCallback('));
    expect(toggle.indexOf('hapticTap();')).toBeLessThan(toggle.indexOf('setAttachDiagnostics(next);'));
    expect(toggle).toContain('[SUPPORT-DIAG] переключатель: приложить журнал=');
    expect(screen).toContain('{attachDiagnostics && diagnosticsPreview?.events.length ? (');
  });

  it('переключатель — CustomSwitch с testID и подписью на 9 языках, только при включённом флаге журнала', () => {
    expect(screen).toContain("import CustomSwitch from '../components/CustomSwitch';");
    const sw = screen.slice(screen.indexOf('<CustomSwitch'), screen.indexOf('/>', screen.indexOf('<CustomSwitch')));
    expect(sw).toContain('testID="support-diagnostics-attach-switch"');
    expect(sw).toContain('value={attachDiagnostics}');
    expect(sw).toContain("accessibilityLabel={L('Приложить журнал диагностики'");
    expect(screen.lastIndexOf('{diagnosticsEnabled ? (', screen.indexOf('<CustomSwitch'))).toBeGreaterThan(-1);
    expect(screen).toContain("'Журнал не будет приложен к обращению.'");
  });

  it('выключен — экран не передаёт журнал, отправка его не захватывает', () => {
    expect(screen).toContain('...(attachDiagnostics && diagnosticsPreview ? { diagnostics: diagnosticsPreview } : {}),');
    expect(screen).toContain('}, lang, {}, { attachDiagnostics }).then((outcome) => {');
    expect(outbox).toContain('delivery: { attachDiagnostics?: boolean } = {},');
    const capture = outbox.slice(outbox.indexOf('const attachDiagnostics = delivery.attachDiagnostics !== false;'));
    expect(capture.indexOf('const capturedDiagnostics = !attachDiagnostics ? null : payload.diagnostics')).toBeGreaterThan(-1);
    expect(capture.indexOf('const capturedDiagnostics')).toBeLessThan(capture.indexOf('captureSupportDiagnosticsWithDeadline()'));
  });
});

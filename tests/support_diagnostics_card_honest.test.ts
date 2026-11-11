// зачем (владелец 11.11: «убери "техническая диагностика"… не надо им знать это», «мы берём её и так и так»):
// карточки диагностики на форме поддержки нет вовсе — ни заголовка, ни обещаний, ни «Посмотреть». Раньше (12.10) тест сторожил честность текста карточки.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('support report: карточки диагностики на форме нет', () => {
  it('форма не показывает ни карточку, ни её тексты, ни список записей журнала', () => {
    const screen = read('app/support_report.tsx');
    expect(screen).not.toContain('support-diagnostics-');
    expect(screen).not.toMatch(/L\(\s*'Техническая диагностика'/);
    expect(screen).not.toMatch(/Прикрепятся только недавние|Журнал технических действий сейчас выключен|Журнал не будет приложен/);
    expect(screen).not.toContain('diagnosticsPreview.events');
    expect(screen).not.toContain('[SUPPORT-DIAG]');
  });

  it('журнал включён решением владельца (п.81(14)); запись и захват по-прежнему проверяют флаг первыми', () => {
    expect(read('app/remote_flags.ts')).toContain('export const isSupportDiagnosticsEnabled = () => true;');
    const diag = read('app/support_diagnostics.ts');
    expect(diag).toMatch(/recordSupportDiagnostic[\s\S]*?if \(!isSupportDiagnosticsEnabled\(\)\) return;/);
    expect(diag).toMatch(/captureSupportDiagnosticBundle[\s\S]*?if \(!isSupportDiagnosticsEnabled\(\)\) return null;/);
  });
});

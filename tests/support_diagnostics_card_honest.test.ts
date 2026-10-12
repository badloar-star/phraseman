// зачем (координатор 12.10, R1): карточка «Техническая диагностика» не обещает того, чего не делает. Пока журнал выключен флагом (remote_flags), текст «Прикрепятся…» не показывается — только нейтральный.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('support report: карточка диагностики честная', () => {
  it('обещание «Прикрепятся…» показывается только при включённом журнале, иначе нейтральный текст', () => {
    const screen = read('app/support_report.tsx');
    expect(screen).toContain("import { isSupportDiagnosticsEnabled } from './remote_flags';");
    const promiseAt = screen.indexOf("'Прикрепятся только недавние технические действия");
    const neutralAt = screen.indexOf("'Журнал технических действий сейчас выключен");
    const branchAt = screen.indexOf('diagnosticsEnabled ? L(');
    expect(branchAt).toBeGreaterThan(0);
    expect(promiseAt).toBeGreaterThan(branchAt);
    expect(neutralAt).toBeGreaterThan(promiseAt);
    // у нейтрального текста нет слов-обещаний «прикреп» (ru) — в той же ветке нет и английского «attached»
    const neutral = screen.slice(neutralAt, screen.indexOf(')}', neutralAt));
    expect(neutral).not.toMatch(/прикреп|attached/i);
    expect(screen).toContain("diagnosticsEnabled ? 'checkmark' : 'information-circle-outline'");
    expect(screen).toContain('[SUPPORT-DIAG] карточка:');
  });

  it('пока флаг выключен, запись журнала и его захват не работают (обещать нечего)', () => {
    expect(read('app/remote_flags.ts')).toContain('export const isSupportDiagnosticsEnabled = () => false;');
    const diag = read('app/support_diagnostics.ts');
    expect(diag).toMatch(/recordSupportDiagnostic[\s\S]*?if \(!isSupportDiagnosticsEnabled\(\)\) return;/);
    expect(diag).toMatch(/captureSupportDiagnosticBundle[\s\S]*?if \(!isSupportDiagnosticsEnabled\(\)\) return null;/);
  });
});

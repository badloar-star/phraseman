// Governance-ID: TG-D9573B42F790
// зачем (владелец 05.11: «все ошибки, что приходят в админку, исправлены»): разбор app_errors за 30 дней показал, что 1183 из 1375 записей
// на актуальных сборках — это не падения, а диагностика/поведение, записанная как critical. Сторож фиксирует исправления, чтобы они не вернулись.
// Отчёт: docs/work/release/ADMIN_ERRORS_2026-11-05.md
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

describe('speak_mic: касание вместо удержания — не сбой (108 из 135 записей no_wav)', () => {
  const panel = read('components/SpeakingPanel.tsx');
  const report = panel.slice(panel.indexOf('function reportHoldNoSpeech'), panel.indexOf('function errorText'));

  it('касание короче порога не уходит в прод-журнал, а остаётся в трассе', () => {
    expect(report).toContain("isSpeakingTapHold(typeof data.holdMs === 'number' ? data.holdMs : null)");
    expect(report).toContain("micTrace('hold:no_speech_tap_not_reported'");
    expect(report.indexOf('isSpeakingTapHold')).toBeLessThan(report.indexOf('DebugLogger.error'));
  });

  it('настоящее удержание без звука/речи — warning, не critical', () => {
    const call = report.slice(report.indexOf('DebugLogger.error'));
    expect(call).toContain("'warning'");
    expect(call).not.toContain("'critical'");
  });

  it('человеку по-прежнему показывается «не расслышал» (функция возвращает kind в обоих случаях)', () => {
    expect((report.match(/return kind;/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('вход: удаляемый аккаунт — ожидаемый отказ, не critical', () => {
  const auth = read('app/auth_provider.ts');
  it('account_delete_pending понижает уровень до warning', () => {
    expect(auth).toContain("const expectedAccountDeletePending = detail.endsWith(':account_delete_pending');");
    expect(auth).toMatch(/EXPECTED_AUTH_FAILURE_STAGES\.has\(stage\) \|\| transientAuthLink \|\| expectedAccountDeletePending\s*\?\s*'warning'\s*:\s*'critical'/);
  });
});

describe('журнал ошибок: хаб ошибок — потолок это warning с паузой (542 записи critical load_ceiling)', () => {
  const hub = read('app/mistakes_hub.tsx');
  it('потолок загрузки пишет warning и не чаще раза за паузу; critical — только реальный отказ чтения', () => {
    expect(hub).toMatch(/mistakes_hub:load_ceiling'[\s\S]{0,260}'warning'\)/);
    expect(hub).toContain('CEILING_REPORT_COOLDOWN_MS');
    expect(hub).toContain("'mistakes_hub:load_failed'");
  });
});

import fs from 'node:fs';
import path from 'node:path';

/**
 * зачем: владелец 04.10 — «вычистить весь MAX». Раньше (Q2, 01.10) MAX-поверхности
 * админки прятались за пломбой; теперь они удалены совсем. Общая вкладка «Оценки»
 * (id max-feedback — исторический, на нём держатся маршрут и первая вкладка) остаётся,
 * из неё убран только вид «Звонок MAX». Данные MAX в базе не тронуты.
 */
const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

describe('admin MAX surfaces removed (owner 2026-10-04)', () => {
  it('пломбы MAX больше нет — нечего прятать', () => {
    expect(html).not.toContain('ADMIN_MAX_SEALED');
    expect(html).not.toContain('MAX_SECTION_SEALED_BY_OWNER_2026_09_04');
    expect(html).not.toContain('data-max-sealed');
  });

  it('вкладки «Здоровье MAX» и пробника по тирам нет', () => {
    expect(html).not.toContain('tab-max-ops');
    expect(html).not.toContain("'max-ops'");
    expect(html).not.toContain('maxOpsLoad');
    expect(html).not.toContain('loadMaxTrialTiers');
    expect(html).not.toContain("httpsCallable(functionsUs, 'adminGetMaxVoiceOpsDashboard')");
    expect(html).not.toContain("httpsCallable(functionsUs, 'maxVoiceConfigAdmin')");
  });

  it('«Оценки» живы, но без вида «Звонок MAX»', () => {
    expect(html).toContain("switchTab('max-feedback')");
    expect(html).toContain('data-feedback-kind="lesson" aria-pressed="true"');
    expect(html).not.toContain('data-feedback-kind="max_call"');
    expect(html).not.toContain("httpsCallable(functionsUs, 'adminListMaxVoiceFeedback')");
  });

  it('департамента MAX у Джарвиса в панели нет', () => {
    expect(html).not.toMatch(/\bmaxvoice:\s*\{/);
  });

  // зачем: D136 (владелец 2026-10-01) — выдача минут MAX удалена целиком.
  it('выдачи минут MAX в админке нет совсем (D136)', () => {
    expect(html).not.toContain('data-action="grant-voice-minutes"');
    expect(html).not.toContain('window.grantVoiceMinutes');
    expect(html).not.toContain("httpsCallable(functionsUs, 'adminGrantVoiceMinutes')");
  });
});

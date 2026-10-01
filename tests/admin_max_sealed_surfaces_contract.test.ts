import fs from 'node:fs';
import path from 'node:path';

/**
 * зачем: Q2 (координатор 01.10) — MAX законсервирован владельцем
 * (MAX_SECTION_SEALED_BY_OWNER_2026_09_04). В админке все MAX-поверхности
 * (вкладка «Здоровье MAX», чип «Звонок MAX», пробник по тирам, выдача минут)
 * скрыты за пломбой и показывают короткую заметку. Код НЕ удалён (D11).
 */
const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');
const NOTE = 'Раздел законсервирован (решение владельца 2026-09-04)';

describe('admin MAX surfaces sealed (Q2)', () => {
  it('пломба объявлена до любых скриптов и ссылается на клиентскую константу', () => {
    const seal = html.indexOf('window.ADMIN_MAX_SEALED = true;');
    expect(seal).toBeGreaterThan(-1);
    expect(seal).toBeLessThan(html.indexOf('id="pm-v9-theme-bootstrap"'));
    expect(html).toContain('MAX_SECTION_SEALED_BY_OWNER_2026_09_04');
    expect(html).toContain(`window.ADMIN_MAX_SEALED_NOTE = '${NOTE}'`);
  });

  it('вкладка «Здоровье MAX» в шапке не кликается и показывает заметку', () => {
    expect(html).not.toContain(`onclick="switchTab('max-ops')"`);
    expect(html).toContain('data-max-sealed="tab"');
  });

  it('чип «Звонок MAX» скрыт, по умолчанию открываются «Уроки»', () => {
    expect(html).toMatch(/data-feedback-kind="max_call" aria-pressed="false"[^>]*hidden>/);
    expect(html).toContain('data-feedback-kind="lesson" aria-pressed="true"');
    expect(html).toContain("kind:(window.ADMIN_MAX_SEALED ? 'lesson' : FEEDBACK_MAX_CALL_KIND)");
  });

  it('раздел MAX (с пробником по тирам) скрыт и показывает заметку', () => {
    expect(html).toContain(`data-max-sealed="section" role="status" style="margin:0 24px 24px">${NOTE}</div>`);
    expect(html).toContain('<div class="max-ops-shell" hidden>');
  });

  it('загрузчики и действия MAX выходят рано с логом, без вызова функций', () => {
    for (const name of ['loadMaxTrialTiers', 'saveMaxTrialTier', 'maxOpsLoad', 'grantVoiceMinutes']) {
      expect(html).toContain(`[ADMIN-MAX-SEAL] ${name} skipped: section sealed`);
    }
  });

  it('кнопка выдачи минут скрыта, вместо неё заметка', () => {
    expect(html).toContain('data-max-sealed="voice-minutes"');
    expect(html).toContain(`data-action="grant-voice-minutes" \${window.ADMIN_MAX_SEALED ? 'hidden' : ''}`);
  });
});

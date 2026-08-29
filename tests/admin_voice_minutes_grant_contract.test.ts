import fs from 'fs';
import path from 'path';

describe('live admin voice-minute grant panel contract', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

  it('exposes the grant only in the individual user-management drawer with clear UX states', () => {
    expect(html).toContain('data-action="grant-voice-minutes"');
    expect(html).toContain('Выдать минуты');
    expect(html).toContain('data-tooltip="Начислит выбранному пользователю голосовые минуты');
    expect(html).toContain('data-voice-minute-grant-status');
    expect(html).toContain('Начисляем минуты…');
    expect(html).toContain('Минуты не начислены:');
    expect(html).toContain('role="status"');
  });

  it('uses the protected callable, exact idempotency fields, and a final monetary confirmation', () => {
    expect(html).toContain("httpsCallable(functionsUs, 'adminGrantVoiceMinutes')");
    const start = html.indexOf('window.grantVoiceMinutes = async function');
    const end = html.indexOf('// ── ACHIEVEMENTS', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = html.slice(start, end);
    expect(body).toContain('showConfirmModal({');
    expect(body).toContain('Выдать минуты пользователю?');
    expect(body).toContain('confirmLabel: `Выдать ${minutes} мин.`');
    expect(body).toContain('reason');
    expect(body).toContain('comment');
    expect(body).toContain('idempotencyKey');
    expect(body).toContain('requestId');
    expect(body).toContain('response.data.ok !== true');
    expect(body).toContain('response.data.auditId');
    expect(body).toContain('response.data.eventId');
    expect(body).not.toMatch(/\b(?:addDoc|setDoc|updateDoc|deleteDoc|writeBatch)\s*\(/);
  });
});

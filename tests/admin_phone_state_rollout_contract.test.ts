import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.join(process.cwd(), 'admin/v2/legacy.html'), 'utf8');

describe('PhoneState rollout controls', () => {
  const start = html.indexOf('PHONE_STATE_ROLLOUT_START');
  const end = html.indexOf('PHONE_STATE_ROLLOUT_END');
  const section = start >= 0 && end > start ? html.slice(start, end) : '';

  test('live admin exposes exactly shadow, sync, percent, and emergency stop', () => {
    expect(section).not.toBe('');
    const keys = [...section.matchAll(/data-phone-state-key="([^"]+)"/g)].map((match) => match[1]);
    expect(keys).toEqual([
      'phone_state_shadow_enabled',
      'phone_state_sync_enabled',
      'phone_state_cutover_percent',
      'phone_state_emergency_stop',
    ]);
  });

  test('controls use human labels, tooltips, audit metadata, and one explicit save action', () => {
    expect(section).toContain('Сохранение на телефоне');
    expect(section).toContain('data-tooltip=');
    expect(section).toContain('Последнее изменение');
    expect(section).toContain('phone-state-rollout-save');
    expect(section.match(/id="phone-state-rollout-save"/g)).toHaveLength(1);
    expect(section).toContain('Подтвердите расширение');
  });

  test('does not enable App Check or edit a retired admin surface', () => {
    expect(section).not.toContain('enforceAppCheck');
    expect(section).not.toContain('recaptcha');
  });
});

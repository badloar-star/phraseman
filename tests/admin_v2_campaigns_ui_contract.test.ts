import fs from 'node:fs';
import path from 'node:path';

const core = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const campaignsStart = core.indexOf('function renderCampaigns()');
const campaignsEnd = core.indexOf('\nfunction dateTime(', campaignsStart);
const campaigns = core.slice(campaignsStart, campaignsEnd);

describe('Admin v2 campaigns UI contract', () => {
  test('makes the live campaign, expiry, and display kill-switch state explicit', () => {
    expect(campaigns).toContain('Статус: ${campaignStatus}');
    expect(campaigns).toContain('Срок показа: ${expiryStatus}');
    expect(campaigns).toContain('Выключатель показа: ${killSwitchStatus}');
    expect(campaigns).toContain('Показ включён');
    expect(campaigns).toContain('Показ выключен');
    expect(campaigns).toContain('Срок показа истёк');
  });

  test('separates the unpublished preview and announces one concise list state', () => {
    expect(campaigns).toContain('Предпросмотр не опубликован');
    expect((campaigns.match(/role="status"/g) || [])).toHaveLength(1);
    expect(campaigns).toContain('aria-live="polite"');
    expect(campaigns).toContain('Загружаю сообщения…');
    expect(campaigns).toContain('Не удалось загрузить сообщения.');
    expect(campaigns).toContain('Сообщений пока нет.');
  });

  test('keeps the existing protected action inventory and disabled toggle guard', () => {
    expect(campaigns).toContain('data-action="load-app-messages"');
    expect(campaigns).toContain('data-action="preview-app-message"');
    expect(campaigns).toContain('data-action="publish-app-message"');
    expect(campaigns).toContain('data-action="discard-app-message-preview"');
    expect(campaigns).toContain('data-app-message-toggle=');
    expect(campaigns).toContain("locked || expired ? ' disabled' : ''");
  });
});

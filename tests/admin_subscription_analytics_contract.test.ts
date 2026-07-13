import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Admin v2 subscription lifecycle contract', () => {
  it('mounts server-truth lifecycle analytics without a new top-level tab', () => {
    const html = read('admin/v2/scripts/admin-core.js');
    expect(html).toContain('id="subscription-analytics-panel"');
    expect(read('admin/v2/index.html')).toContain('/v2/scripts/pages/subscription-analytics.js');
    expect(html).not.toContain("'subscription-analytics','openai-budget'");
  });

  it('explains renewal cancellation, expiration, missing reasons and no screen join', () => {
    const module = read('admin/v2/scripts/pages/subscription-analytics.js');
    expect(module).toContain('следующего автоматического платежа не будет');
    expect(module).toContain('завершении права доступа');
    expect(module).toContain('Причина отключения недоступна в старых данных');
    expect(module).toContain('не связываем отмену подписки с конкретным экраном');
    expect(module).toContain('Без времени самого события');
    expect(module).toContain('Использовано время получения');
    expect(module).toContain('Исключено событий без даты');
    expect(module).toContain('события без даты исключены');
    expect(module).toContain('Причины отключения продления');
    expect(module).toContain('Причины окончания доступа');
    expect(module).toContain('только у новых серверных событий после выпуска этой детализации');
    expect(module).not.toContain('удаление приложения вызвало');
  });

  it('renders server-confirmed money, mature subscription-chain cohorts and honest unavailable states', () => {
    const module = read('admin/v2/scripts/pages/subscription-analytics.js');
    expect(module).toContain('Подтверждённая gross-выручка');
    expect(module).toContain('Оценочные поступления');
    expect(module).toContain('Финальные поступления магазина не импортированы');
    expect(module).toContain('ARPU недоступен');
    expect(module).toContain('LTV цепочки подписки');
    expect(module).toContain('Зрелые цепочки');
    expect(module).toContain('truncated_not_decision_grade');
    expect(module).toContain('revenue.leftTruncatedChains');
    expect(module).toContain('исключены из продлений и LTV');
    expect(module).not.toContain('customer LTV');
  });

  it('uses an admin callable rather than direct Firestore reads', () => {
    const module = read('admin/v2/scripts/pages/subscription-analytics.js');
    const html = read('admin/v2/scripts/admin-firebase.js');
    expect(module).toContain('window.callAdminSubscriptionAnalytics');
    expect(module).not.toContain('getDocs(');
    expect(html).toContain("httpsCallable(functionsUs, 'adminSubscriptionAnalytics')");
  });
});

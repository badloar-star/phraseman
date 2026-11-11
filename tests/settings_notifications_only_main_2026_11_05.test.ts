// Владелец 11.11: «удали кнопку "только главное" в разделе уведомления». Прежнее правило (раунд 2, Настройки п.2, 05.11) отменено:
// сторож теперь следит, чтобы кнопка и её массовое выключение не вернулись, а тумблеры категорий остались.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/settings_notifications.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Уведомления: кнопки «Только главное» нет', () => {
  it('нет ни кнопки, ни подписи, ни обработчика массового выключения', () => {
    expect(src).not.toContain('notif-only-main');
    expect(src).not.toContain("ru:'Только главное'");
    expect(src).not.toContain('applyOnlyMain');
    expect(src).not.toContain('onlyMainCategories');
  });
  it('каждая категория по-прежнему меняется своим тумблером через общий persistPrefs', () => {
    expect(src).toContain('const toggleCategory = (cat: NotifCategory) => (v: boolean) => {');
    expect(src).toContain('void persistPrefs({ ...cur, categories: { ...cur.categories, [cat]: v } }, v);');
    for (const cat of ['weekly_recap', 'monthly_recap', 'spire', 'friends', 'offers']) {
      expect(src).toContain(`switchTestID="notif-switch-${cat}"`);
    }
  });
});

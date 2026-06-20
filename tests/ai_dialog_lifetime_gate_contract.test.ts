import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

// Контракт новой модели (запрос пользователя 2026-06-20):
//  - ровно ОДИН пожизненный бесплатный диалог, общий на все режимы;
//  - списывается на ПЕРВОЙ реплике (не при открытии);
//  - дальше полный премиум-замок, без «N реплик в день»;
//  - в Диалогах две вкладки: «Уроки» (CEFR) и «Ситуации» (уровень аккаунта).
describe('ai dialog lifetime-one-free gate contract', () => {
  const scenario = read('app/ai_dialog_session.tsx');
  const companion = read('app/ai_companion_session.tsx');
  const limit = read('app/dialogs_limit_session.ts');
  const tabContent = read('components/DialogsTabContent.tsx');

  it('limit module is lifetime, not per-day', () => {
    expect(limit).toContain('hasFreeDialogLeft');
    expect(limit).toContain('FREE_DIALOG_USED_KEY');
    // Старый дневной API должен быть удалён.
    expect(limit).not.toContain('getFreeDialogsLeftToday');
    expect(limit).not.toContain('hasUsedFreeDialogToday');
    expect(limit).not.toContain('todayKey');
  });

  it('both session screens gate on the lifetime flag and spend on first reply', () => {
    for (const src of [scenario, companion]) {
      expect(src).toContain('hasFreeDialogLeft');
      expect(src).toContain('markFreeDialogUsed');
      expect(src).not.toContain('getFreeDialogsLeftToday');
      // На замке ведём на пейвол.
      expect(src).toContain("context: 'dialog_limit'");
    }
  });

  it('drops the per-day remaining-quota counter from the session UI', () => {
    for (const src of [scenario, companion]) {
      expect(src).not.toContain('Осталось сегодня');
      expect(src).not.toContain('remainingQuota');
    }
  });

  it('Dialogs has two tabs: lessons (CEFR) and situations (account level)', () => {
    expect(tabContent).toContain("useState<'lessons' | 'situations'>");
    expect(tabContent).toContain("tab === 'lessons'");
    expect(tabContent).toContain("tab === 'situations'");
    expect(tabContent).toContain('accessibilityRole="tab"');
    // Пожизненная подсказка вместо дневного счётчика реплик.
    expect(tabContent).toContain('1 диалог бесплатно');
    expect(tabContent).not.toContain('Осталось сегодня');
  });
});

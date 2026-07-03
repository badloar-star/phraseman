import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('ai dialog lifetime-two-free gate contract', () => {
  const scenario = read('app/ai_dialog_session.tsx');
  const companion = read('app/ai_companion_session.tsx');
  const limit = read('app/dialogs_limit_session.ts');
  const flags = read('app/ai_dialog_flags.ts');
  const tabContent = read('components/DialogsTabContent.tsx');

  it('uses the configured lifetime free-dialog allowance, not a daily quota or boolean-only flag', () => {
    expect(flags).toContain('FREE_DIALOGS_LIFETIME_DEFAULT = 2');
    expect(limit).toContain('getFreeDialogsLifetime');
    expect(limit).toContain('getFreeDialogsUsed');
    expect(limit).toContain('getFreeDialogsLeft');
    expect(limit).toContain('FREE_DIALOG_USED_KEY');
    expect(limit).not.toContain('getFreeDialogsLeftToday');
    expect(limit).not.toContain('hasUsedFreeDialogToday');
    expect(limit).not.toContain('todayKey');
  });

  it('both session screens gate on the lifetime counter and spend on first reply', () => {
    for (const src of [scenario, companion]) {
      expect(src).toContain('hasFreeDialogLeft');
      expect(src).toContain('markFreeDialogUsed');
      expect(src).not.toContain('getFreeDialogsLeftToday');
      expect(src).toContain("context: 'dialog_limit'");
    }
  });

  it('drops the per-day remaining-quota counter from the session UI', () => {
    for (const src of [scenario, companion]) {
      expect(src).not.toContain('Осталось сегодня');
      expect(src).not.toContain('remainingQuota');
    }
  });

  it('Dialogs has two tabs and shows the remaining lifetime free-dialog count', () => {
    expect(tabContent).toContain("useState<'lessons' | 'situations'>");
    expect(tabContent).toContain("tab === 'lessons'");
    expect(tabContent).toContain("tab === 'situations'");
    expect(tabContent).toContain('accessibilityRole="tab"');
    expect(tabContent).toContain('getFreeDialogsLeft');
    expect(tabContent).toContain('freeDialogsLeft > 0');
    expect(tabContent).not.toContain('1 диалог бесплатно');
    expect(tabContent).not.toContain('Осталось сегодня');
  });
});

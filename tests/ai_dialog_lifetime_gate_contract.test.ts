import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('ai dialog Plus-only client with bounded legacy server fallback', () => {
  const scenario = read('app/ai_dialog_session.tsx');
  const companion = read('app/ai_companion_session.tsx');
  const limit = read('app/dialogs_limit_session.ts');
  const flags = read('app/ai_dialog_flags.ts');
  const tabContent = read('components/DialogsTabContent.tsx');
  const lessons = read('app/(tabs)/lessons.tsx');
  const server = read('functions/src/premium_dialog.ts');

  it('keeps the client allowance at zero so current builds do not advertise a trial', () => {
    expect(flags).toContain('FREE_DIALOGS_LIFETIME_DEFAULT = 0');
    expect(limit).toContain('getFreeDialogsLifetime');
    expect(limit).toContain('getFreeDialogsUsed');
    expect(limit).toContain('getFreeDialogsLeft');
    expect(limit).toContain('FREE_DIALOG_USED_KEY');
    expect(limit).not.toContain('getFreeDialogsLeftToday');
    expect(limit).not.toContain('hasUsedFreeDialogToday');
    expect(limit).not.toContain('todayKey');
  });

  it('both current session screens require effective Dialogs access before the first reply', () => {
    for (const src of [scenario, companion]) {
      expect(src).toContain("const dialogAccess = useFeatureAccess('ai_dialog')");
      expect(src).toContain('if (!dialogAccess)');
      expect(src).not.toContain('hasFreeDialogLeft');
      expect(src).not.toContain('markFreeDialogUsed');
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

  it('Dialogs keeps both catalogue tabs but marks every inaccessible card as Plus', () => {
    expect(tabContent).toContain("useState<'lessons' | 'situations'>");
    expect(tabContent).toContain("tab === 'lessons'");
    expect(tabContent).toContain("tab === 'situations'");
    expect(tabContent).toContain('accessibilityRole="tab"');
    expect(tabContent).toContain("const dialogAccess = useFeatureAccess('ai_dialog')");
    expect(tabContent).toContain("const status: ScenarioStatus = !dialogAccess || !unlocked ? 'locked'");
    expect(tabContent).toContain('const plusLocked = locked && !dialogAccess');
    expect(tabContent).not.toContain('getFreeDialogsLeft');
    expect(tabContent).not.toContain('freeDialogsLeft');
    expect(tabContent).not.toContain('Бесплатных диалогов осталось');
  });

  it('shows a Plus badge instead of a free-dialog counter in the Lessons header', () => {
    expect(lessons).toContain("const dialogAccess = useFeatureAccess('ai_dialog')");
    expect(lessons).toContain('plusBadge={!dialogAccess}');
    expect(lessons).not.toContain('freeDialogsLifetime');
    expect(lessons).not.toContain(' free`');
  });

  it('keeps old installed clients bounded to two lifetime dialogs and rolls back provider failures', () => {
    expect(server).toContain('const FREE_DIALOGS_LIFETIME = 2');
    expect(server).toContain('const FREE_DIALOG_MAX_USER_TURNS = 6');
    expect(server).toContain('enforceLifetimeFreeDialog');
    expect(server).toContain('releaseLifetimeFreeDialog');
    expect(server).toContain('if (used >= FREE_DIALOGS_LIFETIME)');
    expect(server).toContain("throw new HttpsError('resource-exhausted', 'dialog_free_limit')");
    expect(server).toContain('freeTurnCharged');
  });
});

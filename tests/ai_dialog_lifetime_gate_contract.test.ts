import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('ai dialog Plus-only gate contract', () => {
  const scenario = read('app/ai_dialog_session.tsx');
  const companion = read('app/ai_companion_session.tsx');
  const limit = read('app/dialogs_limit_session.ts');
  const flags = read('app/ai_dialog_flags.ts');
  const tabContent = read('components/DialogsTabContent.tsx');
  const lessons = read('app/(tabs)/lessons.tsx');
  const server = read('functions/src/premium_dialog.ts');

  it('keeps the legacy allowance at zero so old clients cannot advertise a trial', () => {
    expect(flags).toContain('FREE_DIALOGS_LIFETIME_DEFAULT = 0');
    expect(limit).toContain('getFreeDialogsLifetime');
    expect(limit).toContain('getFreeDialogsUsed');
    expect(limit).toContain('getFreeDialogsLeft');
    expect(limit).toContain('FREE_DIALOG_USED_KEY');
    expect(limit).not.toContain('getFreeDialogsLeftToday');
    expect(limit).not.toContain('hasUsedFreeDialogToday');
    expect(limit).not.toContain('todayKey');
  });

  it('both session screens require effective Dialogs access before the first reply', () => {
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

  it('server rejects non-premium calls while the premium gate is enabled', () => {
    expect(server).toContain("throw new HttpsError('permission-denied', 'dialog_plus_required')");
    expect(server).not.toContain('enforceLifetimeFreeDialog');
    expect(server).not.toContain('releaseLifetimeFreeDialog');
  });

  it('logs privacy-safe identity fingerprints when the server cannot see Plus', () => {
    expect(server).toContain('function identityFingerprint(value: string): string');
    expect(server).toContain('authUidHash: identityFingerprint(authUid)');
    expect(server).toContain('stableUidHash: identityFingerprint(stableUid)');
    expect(server).not.toContain("authUid,\n      stableUid,");
  });
});

import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

// 2026-09-13 (владелец): диалоги = лимит обычного аккаунта, Plus без лимита.
// D111 (2026-09-30): лимит МЕСЯЧНЫЙ — 30 ответов в календарный месяц UTC.
// Свободный разговор (компаньон) — только Plus, Free-квоты у него нет.
// Пожизненный бесплатный триал остаётся отменённым — это и сторожит контракт.
describe('ai dialog daily-limit gate contract', () => {
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

  it('scenario session requires the monthly quota to be open; companion is Plus-only', () => {
    expect(scenario).toContain('const dialogSessionOpen = hasPremiumAccess || dailyQuotaGate === \'open\';');
    expect(scenario).toContain('if (!dialogSessionOpen)');
    expect(scenario).toContain('readAiDialogDailyQuota(studyTarget, accountStableId)');
    expect(companion).toContain('if (!hasPremiumAccess) {');
    for (const src of [scenario, companion]) {
      expect(src).not.toContain('hasFreeDialogLeft');
      expect(src).not.toContain('markFreeDialogUsed');
      expect(src).not.toContain('getFreeDialogsLeftToday');
      expect(src).toContain("context: 'dialog_limit'");
    }
  });

  it('shows the remaining monthly free quota in the scenario session UI', () => {
    expect(scenario).toContain('DialogQuotaBadge');
    expect(scenario).toContain('remainingQuota: fallback.remainingQuota');
    expect(scenario).toContain('recordAiDialogDailyQuotaFromServer(studyTarget, accountStableId, quotaObservation);');
    expect(companion).not.toContain('DialogQuotaBadge');
  });

  // зачем (2026-08-23): владелец заказал фулл-редизайн Диалогов и распорядился
  // «переосмыслить каталог полностью» — вкладки «Уроки/Ситуации» заменены
  // стопкой крупных карточек-миров с разворотом (эталон — раздел «Статистика»).
  // Ожидания про accessibilityRole="tab" / useState<'lessons' | 'situations'>
  // и переменную plusLocked сторожили ОТМЕНЁННУЮ форму подачи, поэтому сняты.
  // Суть гейта (Plus обязателен, закрытая карточка помечается замком) осталась
  // и проверяется ниже — её ослаблять нельзя.
  // D124 (владелец 2026-09-30): сценарий закрывает монетный ранг, а не Plus.
  // Исчерпанный месяц (D111) по-прежнему ведёт на пейвол; закрытый рангом
  // сценарий называет нужный ранг — Plus его всё равно не откроет.
  it('Dialogs catalogue marks every inaccessible scenario as locked (month or rank)', () => {
    expect(tabContent).toContain("const dialogAccess = useFeatureAccess('ai_dialog')");
    expect(tabContent).toContain("const status: ScenarioStatus = !dialogsOpenThisMonth || !unlocked ? 'locked'");
    // Замок не молчит: месяц → пейвол, ранг → окно с нужным рангом.
    expect(tabContent).toContain("context: 'dialog_limit'");
    expect(tabContent).toContain('showGlassAlert(dialogLockedLabel(scenario, lang))');
    // Пожизненная бесплатная квота остаётся отменённой.
    expect(tabContent).not.toContain('getFreeDialogsLeft');
    expect(tabContent).not.toContain('freeDialogsLeft');
    expect(tabContent).not.toContain('Бесплатных диалогов осталось');
  });

  it('shows a Plus badge instead of a free-dialog counter in the Lessons header', () => {
    expect(lessons).toMatch(/const dialogAccess = useFeatureAccess\(['"]ai_dialog['"]\)/);
    expect(lessons).toContain('plusBadge={!dialogAccess}');
    expect(lessons).not.toContain('freeDialogsLifetime');
    expect(lessons).not.toContain(' free`');
  });

  it('server keeps the Plus-required refusal only as the admin off-switch (freeMonthlyReplies=0)', () => {
    expect(server).toContain("throw new HttpsError('permission-denied', 'dialog_plus_required')");
    expect(server).toContain('if (!isPremium && aiDialogGatedByPremium && dialogQuota.freeMonthlyReplies <= 0) {');
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

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 Free / Plus access workflow', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');

  test('ports the old control-panel premium gates into a guarded native workflow', () => {
    expect(core).toContain('function renderPremiumAccessWorkflow');
    expect(core).toContain('data-action="preview-premium-access"');
    expect(core).toContain('Free / Plus доступ и уроки');
    expect(core).toContain('gate_lessons_premium');
    expect(core).toContain('gate_ai_dialog_premium');
    expect(core).toContain('gate_personal_plan_premium');
    expect(core).toContain('free_lesson_limit');
    expect(core).toContain('free_daily_quiz_limit');
    expect(core).toContain('free_trainer_sessions_per_day');
    expect(core).toContain('arena_daily_max');
    expect(core).toContain('max_energy');
    expect(core).toContain('free_lessons_extra');
    expect(core).toContain('premium_lessons_extra');
    expect(core).toContain("['partial-restore-remote-config', 'premium-access']");
  });

  test('uses preview, reason, existing server publish and stale-preview guard', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminPublishRemoteConfig')");
    expect(core).toContain('function buildPremiumAccessPreview');
    expect(core).toContain('Укажите причину изменения Free / Plus доступа.');
    expect(core).toContain("source: 'premium-access'");
    expect(core).toContain('current = buildPremiumAccessPreview()');
    expect(core).toContain('Free / Plus gates меняют монетизацию и доступ к урокам');
    expect(core).toContain('Некорректный номер урока');
    expect(core).toContain('Урок вне диапазона 1–32');
    expect(core).not.toContain('saveControlPanelPremium(');
    expect(core).not.toContain("setDoc(doc(db, 'remote_config', 'app')");
  });

  test('mirrors runtime lesson gate priority in the preview model', () => {
    expect(core).toMatch(/let isFree = !lessonsGatePremium;\s+if \(lessonsGatePremium\) \{/);
    expect(core).toMatch(/if \(premiumExtra\.includes\(lessonId\)\) isFree = false;\s+\}/);
    expect(core).toMatch(/if \(freeExtra\.includes\(lessonId\)\) isFree = true;/);
  });

  test('updates the control-panel map from legacy write module to guarded workflow', () => {
    expect(core).toContain("primaryLabel: 'Открыть v2 Free / Plus'");
    expect(core).toContain('Premium lesson locks — перенесено в guarded workflow Free / Plus доступа.');
    expect(core).not.toContain("Plus-доступ и уроки', description: 'Глобальные Plus-функции, free limits и поурочное открытие 1–32.', primary: '#premium'");
  });
});

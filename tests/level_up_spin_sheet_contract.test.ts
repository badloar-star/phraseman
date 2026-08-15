import { readFileSync } from 'fs';
import { join } from 'path';

describe('level-up spin sheet cutover', () => {
  const source = readFileSync(join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
  const modalSource = readFileSync(join(process.cwd(), 'components', 'LevelUpThresholdModal.tsx'), 'utf8');

  test('acknowledges the already-delivered spin from one ordinary Done action', () => {
    expect(modalSource).not.toContain('level-up-spin-button');
    expect(modalSource).not.toContain('level-up-spin-later');
    expect(modalSource).toContain('testID="level-up-dismiss"');
    expect(source).toContain("PENDING_LEVEL_SPIN_LEVEL_UP_QUEUE_KEY");
    expect(source).toContain('onContinue={currentIsSpin ? finalizeSpinLevelUp : dismissLevelUp}');
    expect(source).not.toContain('onSpin={() => finalizeSpinLevelUp(true)}');
  });

  test('does not repeat the redundant spin-delivery explanation or reserve empty message space', () => {
    expect(source).toContain("const levelUpMessageText = currentIsSpin\n    ? ''");
    expect(source).not.toContain('Спин уже добавлен');
    expect(source).not.toContain('Tu giro ya está listo');
    expect(modalSource).toContain('{message ? (');
  });

  test('keeps legacy gift modals while spin queue entries bypass legacy gift entitlement', () => {
    expect(source).toContain('<LevelGiftModal');
    expect(source).toContain('<LevelGiftDualModal');
    expect(source).toContain('loadPendingLevelSpinLevelUps');
    expect(source).toContain('acknowledgePendingLevelSpinLevelUp');
  });

  test('preserves the deterministic fixed +100 XP level-up bonus', () => {
    const persistAt = source.indexOf('persistLevelUpBonusIntent(level');
    const acknowledgeAt = source.indexOf('acknowledgePendingLevelSpinLevelUp(level)', persistAt);
    expect(persistAt).toBeGreaterThan(0);
    expect(acknowledgeAt).toBeGreaterThan(persistAt);
    expect(source).toContain("registerXP(100, 'level_up_bonus'");
    expect(source).toContain("'level_up',");
    expect(source).toContain("'bonus',");
  });
});

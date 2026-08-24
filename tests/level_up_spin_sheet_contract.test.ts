import { readFileSync } from 'fs';
import { join } from 'path';

describe('level-up spin sheet cutover', () => {
  const source = readFileSync(join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
  // зачем 2026-08-16: гибрид «Световод + Чекан» стал единственной реализацией
  // (project_motion_program.md) — сама разметка/testID'ы теперь в Hybrid-файле,
  // components/LevelUpThresholdModal.tsx осталась тонкой точкой входа.
  const modalSource = readFileSync(join(process.cwd(), 'components', 'LevelUpThresholdModalHybrid.tsx'), 'utf8');

  test('acknowledges the already-delivered spin from one ordinary Done action', () => {
    expect(modalSource).not.toContain('level-up-spin-button');
    expect(modalSource).not.toContain('level-up-spin-later');
    expect(modalSource).toContain('testID="level-up-dismiss-hybrid"');
    expect(source).toContain("PENDING_LEVEL_SPIN_LEVEL_UP_QUEUE_KEY");
    expect(source).toContain('onContinue={finalizeSpinLevelUp}');
    expect(source).not.toContain('onSpin={() => finalizeSpinLevelUp(true)}');
  });

  test('does not repeat the redundant spin-delivery explanation or reserve empty message space', () => {
    expect(source).toContain("message={''}");
    expect(source).not.toContain('Спин уже добавлен');
    expect(source).not.toContain('Tu giro ya está listo');
    expect(modalSource).toContain('{message ? (');
  });

  test('keeps level-up runtime Spin-only while gift inventory retains legacy application modals', () => {
    const inventory = readFileSync(join(process.cwd(), 'app', 'level_gifts_inventory.tsx'), 'utf8');
    expect(source).not.toContain("import LevelGiftModal from '../components/LevelGiftModal'");
    expect(source).not.toContain("import LevelGiftDualModal from '../components/LevelGiftDualModal'");
    expect(source).not.toContain('<LevelGiftModal');
    expect(source).not.toContain('<LevelGiftDualModal');
    expect(source).toContain('loadPendingLevelSpinLevelUps');
    expect(source).toContain('acknowledgePendingLevelSpinLevelUp');
    expect(source).not.toContain('const onGiftClose');
    expect(source).not.toContain('showGiftModal');
    expect(source).not.toContain('singleGiftsRef');
    expect(source).not.toContain('dualGiftsRef');
    expect(source).not.toContain('acquireLevelGiftDisplay');
    expect(source).not.toContain('reserveLevelGiftForDisplay');
    expect(inventory).toContain('<LevelGiftModal');
    expect(inventory).toContain('<LevelGiftDualModal');
  });

  test('keeps the level-5 after-win upsell reachable only after the final Spin completes', () => {
    expect(source).toContain('showLevelFiveUpsellAfterFinalSpin(level, accountToken)');
    expect(source).toMatch(/if \(queueRef\.current\.length > 0\)[\s\S]{0,300}else \{[\s\S]{0,300}showLevelFiveUpsellAfterFinalSpin\(level, accountToken\)/);
    expect(source).toContain('if (completedLevel !== 5 || hasPremiumAccess) return;');
    expect(source).toContain('if (introState?.expiredUnseen === true) return;');
    expect(source).toContain('if (isTournamentInterruptionProtectedPath(pathnameRef.current)) return;');
    const navigateAt = source.indexOf("source: 'afterwin_levelup'");
    const markAt = source.indexOf('await markAfterWinUpsellShown(Date.now())', navigateAt);
    expect(navigateAt).toBeGreaterThan(0);
    expect(markAt).toBeGreaterThan(navigateAt);
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

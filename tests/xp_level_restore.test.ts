import {
  old250TotalXPForLevel,
  old250LevelFromXP,
  restoredXPForOld250VisibleLevel,
} from '../app/xp_level_restore';
import { getLevelFromXP, TOTAL_XP_FOR_LEVEL } from '../constants/theme';
import { readFileSync } from 'fs';
import path from 'path';

describe('XP level restore after 250-to-400 formula change', () => {
  it('restores the reported 152549 XP case back to visible level 34', () => {
    const restored = restoredXPForOld250VisibleLevel(152549);

    expect(restored.oldLevel).toBe(34);
    expect(restored.restoredLevel).toBe(34);
    expect(restored.needsRestore).toBe(true);
    expect(restored.targetXP).toBe(244079);
    expect(getLevelFromXP(restored.targetXP)).toBe(34);
  });

  it('restores old visible level 50 when current XP fell to a lower new level', () => {
    const oldLevel50Xp = old250TotalXPForLevel(50);
    const restored = restoredXPForOld250VisibleLevel(oldLevel50Xp);

    expect(restored.oldLevel).toBe(50);
    expect(restored.currentLevel).toBeLessThan(50);
    expect(restored.targetXP).toBe(TOTAL_XP_FOR_LEVEL(50));
    expect(restored.restoredLevel).toBe(50);
    expect(restored.needsRestore).toBe(true);
  });

  it('does not inflate XP again after the old visible level is already restored', () => {
    const alreadyRestoredXp = TOTAL_XP_FOR_LEVEL(50);
    const restored = restoredXPForOld250VisibleLevel(alreadyRestoredXp);

    expect(restored.oldLevel).toBe(50);
    expect(restored.currentLevel).toBe(50);
    expect(restored.targetXP).toBe(alreadyRestoredXp);
    expect(restored.restoredLevel).toBe(50);
    expect(restored.needsRestore).toBe(false);
  });

  it('never reduces XP while preserving old visible level progress', () => {
    for (const xp of [1, 399, 1148, 10695, 152549, 476669]) {
      const restored = restoredXPForOld250VisibleLevel(xp);
      expect(restored.targetXP).toBeGreaterThanOrEqual(xp);
      expect(restored.restoredLevel).toBeGreaterThanOrEqual(old250LevelFromXP(xp));
    }
  });

  it('marks empty progress as level 1 without adding XP', () => {
    expect(restoredXPForOld250VisibleLevel(0)).toEqual({
      currentXP: 0,
      targetXP: 0,
      oldLevel: 1,
      restoredLevel: 1,
      currentLevel: 1,
      needsRestore: false,
    });
  });

  it('reads the one-shot marker first and sequences migration after cloud hydrate', () => {
    const managerSource = readFileSync(path.join(process.cwd(), 'app', 'xp_manager.ts'), 'utf8');
    const layoutSource = readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
    const migrationStart = managerSource.indexOf('export const migrateXPFormulaV2');
    const migrationSource = managerSource.slice(migrationStart, managerSource.indexOf('export const getCurrentMultiplier', migrationStart));
    expect(migrationSource.indexOf('storageGetString(XP_LEVEL_RESTORE_250_TO_400_KEY)')).toBeLessThan(
      migrationSource.indexOf("storageGetNumber('user_total_xp'"),
    );
    const hydrateThen = layoutSource.indexOf('void hydrate.then(async (');
    expect(hydrateThen).toBeGreaterThan(0);
    expect(layoutSource.indexOf('await migrateXPFormulaV2();', hydrateThen)).toBeGreaterThan(hydrateThen);
    expect(layoutSource).not.toContain('useEffect(() => {\n    migrateXPFormulaV2();');
  });
});

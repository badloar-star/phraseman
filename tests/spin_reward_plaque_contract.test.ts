import fs from 'fs';
import path from 'path';

describe('SpinRewardPlaque contract', () => {
  const sourcePath = path.join(process.cwd(), 'components', 'SpinRewardPlaque.tsx');

  // зачем (11.10): Спин удалён в 2.0 (PM-046). Табличка оставлена границей для старых квитанций, которые ещё могут
  // дойти до экрана итогов, — она обязана НИЧЕГО не показывать и не играть звук награды. Экран итогов не ждёт её
  // onComplete (только прячет слот), и ни один экран больше не передаёт spinReward.
  test('is a retired boundary that never renders or plays a spin reward', () => {
    expect(fs.existsSync(sourcePath)).toBe(true);
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain('export type SpinRewardPlaqueProps');
    expect(source).toContain('receiptId: string;');
    expect(source).toMatch(/export const SpinRewardPlaque = memo\(function SpinRewardPlaque\([^)]*\) \{\s*void props;\s*return null;\s*\}\)/);
    expect(source).not.toContain('soundDirector');
    expect(source).not.toContain('Animated');
  });
});

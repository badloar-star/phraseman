// level_up_upsell_levels_2026_11_11.test.ts — окно Plus на повышении уровня: 5-й, 10-й и 20-й уровень.
// зачем (владелец 11.11, аудит мотивации к Plus: «Уровни кроме 5-го» — делать): раньше окно открывалось один раз за всё время.
// Сторож держит список уровней и то, что защита от навязчивости (пауза, очередь окон, смена аккаунта) осталась на месте.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

describe('окно Plus на повышении уровня', () => {
  const layout = read('app/_layout.tsx');
  const gate = read('app/after_win_upsell_gate.ts');
  const handler = layout.slice(layout.indexOf("onAppEvent('home_level_up_celebrated'"), layout.indexOf("onAppEvent('home_level_up_celebrated'") + 4500);

  it('открывается на 5-м, 10-м и 20-м уровне — и только на них', () => {
    expect(layout).toContain('const LEVEL_UP_UPSELL_LEVELS: ReadonlySet<number> = new Set([5, 10, 20]);');
    expect(handler).toContain('if (!LEVEL_UP_UPSELL_LEVELS.has(level) || hasPremiumAccess) return;');
    expect(layout).not.toContain('level !== 5');
  });

  it('защита от навязчивости на месте: пауза между показами, очередь окон, смена аккаунта, подтверждённая подписка', () => {
    expect(gate).toContain('export const AFTER_WIN_UPSELL_COOLDOWN_MS = 36 * 60 * 60 * 1000;');
    expect(handler).toContain('canShowAfterWinUpsell({ isPremium: prem, nowMs: Date.now() })');
    expect(handler).toContain('waitForOverlaySlotFree(');
    expect(handler).toContain('isLevelUpAccountTokenCurrent(accountToken)');
    expect(handler).toContain('getVerifiedPremiumStatus()');
  });

  it('вход в окно прежний: тот же контекст и источник', () => {
    expect(handler).toContain("params: { context: 'level_up', source: 'afterwin_levelup' }");
  });

  it('сбой чтения хранилища не глотается молча', () => {
    expect(gate).not.toMatch(/catch\s*\{/u);
    expect(gate).toContain("DebugLogger.error('after_win_upsell_gate:canShowAfterWinUpsell'");
  });
});

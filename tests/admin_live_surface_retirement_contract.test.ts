import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const liveAdminPath = path.join(repoRoot, 'admin/v2/legacy.html');
const liveAdmin = readFileSync(liveAdminPath, 'utf8');

const retiredTabs = [
  'french-quizzes',
  'arena-ranks',
  'arena-live',
  'arena-bets',
  'arena-rooms',
] as const;

describe('live admin retired Quiz/Arena surface boundary', () => {
  test('removes retired tabs from the router and all route-bearing markup', () => {
    const keysBlock = liveAdmin.match(/const ADMIN_TAB_KEYS = \[([^\]]+)\]/)?.[1] ?? '';

    for (const tab of retiredTabs) {
      expect(keysBlock).not.toContain(`'${tab}'`);
      expect(liveAdmin).not.toContain(`id="tab-${tab}"`);
      expect(liveAdmin).not.toContain(`switchTab('${tab}')`);
      expect(liveAdmin).not.toContain(`data-admin-goto="${tab}"`);
      expect(liveAdmin).not.toContain(`#tab-${tab}`);
    }
  });

  test('removes retired tab metadata, counters, and Arena loaders', () => {
    expect(liveAdmin).not.toContain("'french-quizzes':");
    expect(liveAdmin).not.toMatch(/'(?:arena-ranks|arena-live|arena-bets|arena-rooms)'\s*:/);
    expect(liveAdmin).not.toMatch(/\bloadArena[A-Za-z0-9_$]*\b/);
    expect(liveAdmin).not.toMatch(/adminApplyTabBadge\('arena-/);
  });

  test('keeps French daily phrases separate from the removed French Quizzes tab', () => {
    expect(liveAdmin).toContain('french-daily-phrases-workflow.js');
    expect(liveAdmin).toContain('renderFrenchDailyPhrasesAdmin');
  });

  test('button audit reads the only live admin surface', () => {
    const auditPath = path.join(repoRoot, 'scripts/admin-legacy-button-audit.mjs');
    expect(existsSync(auditPath)).toBe(true);
    const auditSource = readFileSync(auditPath, 'utf8');

    expect(auditSource).toContain("path.join(root, 'admin', 'v2', 'legacy.html')");
    expect(auditSource).not.toContain("path.join(root, 'admin', 'legacy.html')");
  });
});

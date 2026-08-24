import fs from 'node:fs';
import path from 'node:path';

const rulesPath = process.env.TOURNAMENT_SEMANTIC_RULES_PATH
  ? path.resolve(process.env.TOURNAMENT_SEMANTIC_RULES_PATH)
  : path.join(process.cwd(), 'firestore.rules');
const rules = fs.readFileSync(rulesPath, 'utf8')
  .replace(/\r\n/gu, '\n');

const ROOTS = [
  'tournament_semantic_jobs',
  'tournament_semantic_review_receipts',
  'tournament_pool_v11_bundles',
] as const;
const tournamentExclusionHelper = rules.match(
  /function isBrowserAdminExcludedTournamentRoot\(collection\) \{([\s\S]*?)\n    \}/u,
)?.[1] ?? '';

function rootBlock(root: string): string {
  const escaped = root.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return rules.match(new RegExp(`match /${escaped}/\\{document=\\*\\*\\} \\{([\\s\\S]*?)\\n    \\}`))?.[1] ?? '';
}

describe('Tournament semantic v11 Firestore isolation', () => {
  test.each(ROOTS)('%s has one explicit recursive deny', (root) => {
    const header = `match /${root}/{document=**} {`;
    expect(rules.split(header)).toHaveLength(2);
    expect(rootBlock(root)).toContain('allow read, write: if false;');
    expect(rootBlock(root)).not.toMatch(/isAdmin\(\)|request\.auth/gu);
  });

  test.each(ROOTS)('%s is named by the compact tournament exclusion helper', (root) => {
    expect(tournamentExclusionHelper).toContain(root);
  });

  test('the OR-combined browser-admin catch-all excludes the exact helper', () => {
    const catchAll = rules.match(
      /match \/\{collection\}\/\{document=\*\*\} \{([\s\S]*?)\n    \}/u,
    )?.[1] ?? '';
    expect(catchAll).toContain('allow read, write: if isAdmin()');
    expect(catchAll).toContain('&& !isBrowserAdminExcludedTournamentRoot(collection)');
    for (const preserved of [
      'tournamentSchedule', 'tournamentRooms', 'tournamentTasks',
      'tournamentSeasons', 'tournamentBank', 'botProfiles',
    ]) expect(tournamentExclusionHelper).toContain(preserved);
  });
});

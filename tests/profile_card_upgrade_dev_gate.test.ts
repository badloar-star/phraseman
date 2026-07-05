import fs from 'fs';
import path from 'path';

/**
 * Profile card UI was rebuilt 2026-06 from a broken bottom-sheet (ProfileCardUpgradeModal,
 * deleted) into a full-screen route (app/profile_card_upgrade.tsx) reached from gated entry
 * points.
 *
 * DECISION 2026-07-05 (owner): the feature SHIPS. The old 2026-06-21 hold ("previews look
 * too similar") is resolved by the 5-level ladder — every level has a visually distinct
 * card. ENABLE_PROFILE_CARD is now a bare `true` (release), and the upgrade screen must
 * NOT hide behind ENABLE_DEV_TOOLS anymore. These checks lock in that every entry point
 * reads the single ENABLE_PROFILE_CARD flag (so the whole feature appears/disappears
 * together) and that the flag stays on for release.
 */
describe('profile card upgrade gate (release decision 2026-07-05)', () => {
  const avatarScreen = fs.readFileSync(
    path.join(process.cwd(), 'app', 'avatar_select.tsx'),
    'utf8',
  );
  const upgradeScreen = fs.readFileSync(
    path.join(process.cwd(), 'app', 'profile_card_upgrade.tsx'),
    'utf8',
  );

  it('gates the upgrade entry point behind the ENABLE_PROFILE_CARD flag', () => {
    expect(avatarScreen).toContain('const showProfileCardSection = ENABLE_PROFILE_CARD;');
    // The entry row that opens the full-screen upgrade flow is rendered only when the
    // kill-switch is on, and navigates to the rebuilt route.
    expect(avatarScreen).toContain("router.push('/profile_card_upgrade'");
  });

  it('routes the entry point to the rebuilt full-screen upgrade route', () => {
    expect(upgradeScreen).toContain('export default function ProfileCardUpgradeScreen');
    expect(upgradeScreen).toContain('upgradeProfileCardLevel');
  });

  it('no longer hides the profile card behind ENABLE_DEV_TOOLS', () => {
    expect(avatarScreen).not.toContain('ENABLE_DEV_TOOLS');
    expect(upgradeScreen).not.toContain('ENABLE_DEV_TOOLS');
  });

  it('keeps the feature ON for release (owner decision 2026-07-05)', () => {
    // The card ladder is a released, monetized feature now. If someone needs to pull it
    // from a build, that is an owner decision — change this test together with the flag.
    const config = fs.readFileSync(path.join(process.cwd(), 'app', 'config.ts'), 'utf8');
    expect(config).toMatch(/export const ENABLE_PROFILE_CARD = true;/);
  });
});

/**
 * The shard cost of each card level lives in TWO places: the client table
 * PROFILE_CARD_LEVEL_COSTS (app/profile_card_system.ts) drives what the user is shown, and
 * the server table PROFILE_CARD_LEVEL_COST (functions/src/profile_card_upgrade.ts) is what
 * actually gets charged. If they desync, the client promises one price and the server
 * charges another. This parity check fails loudly on the next one-sided reprice.
 */
describe('profile card cost parity (client ↔ Cloud Function)', () => {
  function parseCostTable(src: string, tableName: string): Record<number, number> {
    const start = src.indexOf(tableName);
    expect(start).toBeGreaterThanOrEqual(0);
    const block = src.slice(start, src.indexOf('}', start) + 1);
    const oneStepCost = Number(src.match(/PROFILE_CARD_UPGRADE_COST\s*=\s*(\d+)/)?.[1] ?? 0);
    const costs: Record<number, number> = {};
    const re = /(\d)\s*:\s*(\d+|PROFILE_CARD_UPGRADE_COST)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) {
      costs[Number(m[1])] = m[2] === 'PROFILE_CARD_UPGRADE_COST' ? oneStepCost : Number(m[2]);
    }
    return costs;
  }

  const clientSrc = fs.readFileSync(path.join(process.cwd(), 'app', 'profile_card_system.ts'), 'utf8');
  const serverSrc = fs.readFileSync(
    path.join(process.cwd(), 'functions', 'src', 'profile_card_upgrade.ts'),
    'utf8',
  );

  it('charges the same price on both sides for every ladder level', () => {
    const client = parseCostTable(clientSrc, 'PROFILE_CARD_LEVEL_COSTS');
    const server = parseCostTable(serverSrc, 'PROFILE_CARD_LEVEL_COST');
    expect(Object.keys(client).sort()).toEqual(['1', '2', '3', '4', '5']);
    expect(server).toEqual(client);
    expect(client).toEqual({ 1: 200, 2: 450, 3: 800, 4: 1400, 5: 2400 });
  });

  it('client and server agree on the max level', () => {
    expect(clientSrc).toMatch(/export const PROFILE_CARD_MAX_LEVEL = 5;/);
    expect(serverSrc).toMatch(/const PROFILE_CARD_MAX_LEVEL = 5;/);
  });
});

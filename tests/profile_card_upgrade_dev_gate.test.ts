import fs from 'fs';
import path from 'path';

/**
 * Profile card UI was rebuilt 2026-06 from a broken bottom-sheet (ProfileCardUpgradeModal,
 * deleted) into a full-screen route (app/profile_card_upgrade.tsx) reached from gated entry
 * points. DECISION 2026-06-21: the feature is held back from the store release and ships
 * DEV-ONLY until the level previews are polished — ENABLE_PROFILE_CARD is now derived from
 * the dev/QA signals and hard-cut by IS_STORE_RELEASE. These checks lock in that every
 * entry point reads that single flag (so the whole feature appears/disappears together) and
 * that the flag stays dev-gated, not a bare `true`.
 */
describe('profile card upgrade dev gate', () => {
  const avatarScreen = fs.readFileSync(
    path.join(process.cwd(), 'app', 'avatar_select.tsx'),
    'utf8',
  );
  const upgradeScreen = fs.readFileSync(
    path.join(process.cwd(), 'app', 'profile_card_upgrade.tsx'),
    'utf8',
  );

  it('gates the upgrade entry point behind the ENABLE_PROFILE_CARD flag', () => {
    expect(avatarScreen).toContain("import { ENABLE_PROFILE_CARD } from './config';");
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

  it('keeps the feature gated to dev and hard-off in store releases', () => {
    // 2026-06-21: the profile card is intentionally NOT in the store release yet — it ships
    // dev-only until the level previews are polished. The flag must therefore be derived from
    // the dev/QA signals AND hard-cut by IS_STORE_RELEASE, never a bare `true`.
    const config = fs.readFileSync(path.join(process.cwd(), 'app', 'config.ts'), 'utf8');
    expect(config).not.toMatch(/export const ENABLE_PROFILE_CARD = true;/);
    expect(config).toMatch(/export const ENABLE_PROFILE_CARD\s*=[\s\S]*!IS_STORE_RELEASE/);
  });
});

/**
 * The shard cost of each card level lives in TWO places: the client table
 * PROFILE_CARD_LEVELS (app/profile_card_system.ts) drives what the user is shown, and the
 * server table PROFILE_CARD_LEVEL_COST (functions/src/profile_card_upgrade.ts) is what
 * actually gets charged. If they desync, the client promises one price and the server
 * charges another. This parity check fails loudly on the next one-sided reprice.
 */
describe('profile card cost parity (client ↔ Cloud Function)', () => {
  function clientCosts(): Record<number, number> {
    const src = fs.readFileSync(path.join(process.cwd(), 'app', 'profile_card_system.ts'), 'utf8');
    const block = src.slice(src.indexOf('PROFILE_CARD_LEVELS'));
    const costs: Record<number, number> = {};
    const re = /level:\s*(\d)\s*,[\s\S]*?cost:\s*(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) {
      const level = Number(m[1]);
      if (level >= 1 && level <= 5 && costs[level] === undefined) costs[level] = Number(m[2]);
    }
    return costs;
  }

  function serverCosts(): Record<number, number> {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'functions', 'src', 'profile_card_upgrade.ts'),
      'utf8',
    );
    const block = src.slice(src.indexOf('PROFILE_CARD_LEVEL_COST'));
    const costs: Record<number, number> = {};
    const re = /(\d)\s*:\s*(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) {
      const level = Number(m[1]);
      if (level >= 1 && level <= 5 && costs[level] === undefined) costs[level] = Number(m[2]);
    }
    return costs;
  }

  it('charges the same price on both sides for every level 1–5', () => {
    const client = clientCosts();
    const server = serverCosts();
    expect(Object.keys(client).sort()).toEqual(['1', '2', '3', '4', '5']);
    expect(server).toEqual(client);
  });
});

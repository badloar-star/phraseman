import fs from 'fs';
import path from 'path';

/**
 * Profile card used to be hard-gated behind ENABLE_DEV_TOOLS, so the upgrade flow
 * never shipped to store builds and every real player was stuck at card level 0.
 * It now ships live, gated only by the ENABLE_PROFILE_CARD kill-switch. These checks
 * lock in that the feature is wired to the live flag (and not accidentally re-gated
 * behind dev tooling) while keeping the visibility/handler plumbing intact.
 */
describe('profile card upgrade live gate', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components', 'ProfileCardUpgradeModal.tsx'),
    'utf8',
  );

  it('gates the upgrade modal behind the live ENABLE_PROFILE_CARD kill-switch', () => {
    expect(source).toContain("import { ENABLE_PROFILE_CARD } from '../app/config';");
    expect(source).toContain('const effectiveVisible = ENABLE_PROFILE_CARD && visible;');
    expect(source).toContain('<Modal visible={effectiveVisible}');
    expect(source).toContain('if (!ENABLE_PROFILE_CARD || busy || !nextDef) return;');
  });

  it('no longer hides the profile card behind ENABLE_DEV_TOOLS', () => {
    expect(source).not.toContain('ENABLE_DEV_TOOLS');
  });

  it('keeps the live flag defined and on in config', () => {
    const config = fs.readFileSync(path.join(process.cwd(), 'app', 'config.ts'), 'utf8');
    expect(config).toMatch(/export const ENABLE_PROFILE_CARD = true;/);
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

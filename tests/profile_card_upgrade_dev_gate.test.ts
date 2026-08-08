import fs from 'fs';
import path from 'path';

/**
 * OWNER DECISION 2026-07-14: the standalone I-V profile-card screen is retired.
 * The personal card opens from the home header profile icon and upgrades in place inside
 * PlayerProfileModal. The route and its avatar-studio / QA entry points must not return.
 */
describe('profile card has one personal entry surface', () => {
  const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
  const avatarScreen = read('app/avatar_select.tsx');
  const homeScreen = read('app/(tabs)/home.tsx');
  const layout = read('app/_layout.tsx');
  const controls = read('components/customization/CustomizationControls.tsx');
  const profileModal = read('components/PlayerProfileModal.tsx');
  const qaSection = read('components/admin_panel/sections/RewardModalsExtraSection.tsx');

  it('does not ship or navigate to the retired standalone route', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'app', 'profile_card_upgrade.tsx'))).toBe(false);
    expect(layout).not.toContain('Stack.Screen name="profile_card_upgrade"');
    expect(avatarScreen).not.toContain("router.push('/profile_card_upgrade'");
    expect(controls).not.toContain('onOpenProfileCard');
    expect(qaSection).not.toContain('admin-extra-profile-card-upgrade');
    expect(qaSection).not.toContain("router.push('/profile_card_upgrade'");
  });

  it('opens the preserved profile modal from the home header profile icon', () => {
    expect(homeScreen).toContain("ru: 'Моя карточка профиля'");
    expect(homeScreen).toContain('onPress={openHomeProfile}');
    expect(homeScreen).toContain('setHomeProfilePlayer({');
    expect(homeScreen).toContain('<PlayerProfileModal');
  });

  it('keeps profile upgrades inside the preserved modal', () => {
    expect(profileModal).toContain('isMe && ENABLE_PROFILE_CARD && nextRealLevel !== null');
    expect(profileModal).toContain('onPress={handleUpgradeButtonTap}');
    expect(profileModal).toContain('const result = await upgradeProfileCardLevel();');
    expect(profileModal).toContain('void syncToCloud({ forceNow: true });');
    expect(profileModal).toContain('disabled={upgradeBusy}');
    expect(profileModal).toContain('<ActivityIndicator size="small" color="#1A1205" />');
  });

  it('keeps the feature ON for release (owner decision 2026-07-05)', () => {
    const config = read('app/config.ts');
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
describe('profile card cost parity (client to Cloud Function)', () => {
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

import fs from 'fs';
import path from 'path';
import { runTournamentBotSeedSingleFlight } from '../components/admin_panel/tournament_bot_seed_single_flight';

const ROOT = process.cwd();

describe('tournament DEV bot seed control', () => {
  const sectionPath = path.join(
    ROOT,
    'components',
    'admin_panel',
    'sections',
    'TournamentBotsSection.tsx',
  );
  const testersPath = path.join(ROOT, 'app', '_admin_settings_testers.tsx');
  const gatePath = path.join(ROOT, 'app', 'settings_testers.tsx');

  it('is reachable only through the existing DEV-only testers graph', () => {
    const testers = fs.readFileSync(testersPath, 'utf8');
    const gate = fs.readFileSync(gatePath, 'utf8');

    expect(gate).toContain('if (ENABLE_DEV_TOOLS)');
    expect(gate).toContain("require('./_admin_settings_testers')");
    expect(testers).toContain("import TournamentBotsSection from '../components/admin_panel/sections/TournamentBotsSection'");
    expect(testers).toContain('<TournamentBotsSection');
  });

  it('calls the protected bot seeder once with the MVP bot count', () => {
    const source = fs.readFileSync(sectionPath, 'utf8');

    expect(source).toContain("'adminSeedBotProfiles'");
    expect(source).toContain("getFunctions(getApp(), 'us-central1')");
    expect(source).toContain('count: 200');
    // Backend currently maps overwrite directly to Firestore `merge`.
    // `true` is therefore the non-destructive choice that preserves extra bot fields.
    expect(source).toContain('overwrite: true');
    expect(source).toContain('runTournamentBotSeedSingleFlight(inFlightRef');
  });

  it('blocks repeat taps and exposes clear success and admin-permission feedback', () => {
    const source = fs.readFileSync(sectionPath, 'utf8');

    expect(source).toContain('disabled={seeding}');
    expect(source).toContain('ActivityIndicator');
    expect(source).toContain('Готово: создано или обновлено');
    expect(source).toContain('Нужен аккаунт с правами администратора');
    expect(source).toContain('testID="admin-tournament-seed-bots"');
  });

  it('executes only one operation while the first seed is still pending', async () => {
    let finishFirst!: () => void;
    const operation = jest.fn(() => new Promise<void>((resolve) => {
      finishFirst = resolve;
    }));
    const lock = { current: false };

    const first = runTournamentBotSeedSingleFlight(lock, operation);
    const second = runTournamentBotSeedSingleFlight(lock, operation);

    await expect(second).resolves.toEqual({ started: false });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(lock.current).toBe(true);

    finishFirst();
    await expect(first).resolves.toEqual({ started: true, value: undefined });
    expect(lock.current).toBe(false);

    const third = runTournamentBotSeedSingleFlight(lock, operation);
    expect(operation).toHaveBeenCalledTimes(2);
    finishFirst();
    await third;
  });
});

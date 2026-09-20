import * as fs from 'fs';
import * as path from 'path';

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));
jest.mock('../app/account_generation', () => ({ isCurrentAccountGeneration: jest.fn() }));
jest.mock('../app/arena_client', () => ({ arenaV2Home: jest.fn(), arenaExpansionHome: jest.fn() }));
jest.mock('../modules/arena/home_cache', () => ({ arenaLoadHomeWarmForTarget: jest.fn(), arenaRememberHomeWarmForTarget: jest.fn() }));

import { startArenaHomePreload } from '../app/arena_home_preload';
import { isCurrentAccountGeneration, type AccountGenerationToken } from '../app/account_generation';
import { arenaV2Home, arenaExpansionHome } from '../app/arena_client';
import { arenaLoadHomeWarmForTarget, arenaRememberHomeWarmForTarget } from '../modules/arena/home_cache';

it('primes the existing cache once per active account before any arena screen mounts', async () => {
  (isCurrentAccountGeneration as jest.Mock).mockReturnValue(true);
  (arenaLoadHomeWarmForTarget as jest.Mock).mockResolvedValue(null);
  (arenaV2Home as jest.Mock).mockResolvedValue({ ok: true, profile: { stars: 10 } });
  (arenaExpansionHome as jest.Mock).mockResolvedValue({ ok: true, wallet: { walletStars: 10 } });
  const token: AccountGenerationToken = { generation: 321, stableId: 'owner', phase: 'active' };
  startArenaHomePreload(token, 'fr');
  startArenaHomePreload(token, 'fr');
  await Promise.resolve();
  expect(arenaV2Home).toHaveBeenCalledTimes(1);
  expect(arenaExpansionHome).toHaveBeenCalledTimes(1);
  expect(arenaV2Home).toHaveBeenCalledWith('fr');
  expect(arenaExpansionHome).toHaveBeenCalledWith('fr');
  expect(arenaLoadHomeWarmForTarget).toHaveBeenCalledTimes(1);
  expect(arenaRememberHomeWarmForTarget).toHaveBeenCalledWith(expect.objectContaining({ studyTarget: 'fr', home: { ok: true, profile: { stars: 10 } } }));
  expect(arenaRememberHomeWarmForTarget).toHaveBeenCalledWith(expect.objectContaining({ studyTarget: 'fr', expansion: { ok: true, wallet: { walletStars: 10 } } }));
  (isCurrentAccountGeneration as jest.Mock).mockReturnValue(false);
  startArenaHomePreload({ ...token, generation: 322 }, 'fr');
  expect(arenaV2Home).toHaveBeenCalledTimes(1);
});

it('starts from the root account effect without waiting for the arena route or first content', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/_layout.tsx'), 'utf8');
  const call = source.indexOf("void import('./arena_home_preload')");
  expect(call).toBeGreaterThan(0);
  const effect = source.slice(source.lastIndexOf('useEffect(() => {', call), source.indexOf(']);', call) + 3);
  expect(effect).toContain("accountGeneration.phase !== 'active'");
  expect(effect).toContain('startArenaHomePreload(accountGeneration, studyTarget)');
  expect(effect).not.toMatch(/firstContentReady|pathname|setTimeout/);
});

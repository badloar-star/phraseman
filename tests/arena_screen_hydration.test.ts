import {
  arenaHubRequestGate,
  arenaWarmExpansion,
  arenaWarmHome,
} from '../modules/arena/hub_hydration';
import * as fs from 'fs';
import * as path from 'path';

const validHome = {
  ok: true,
  availability: { enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true, rewardsEnabled: true, spinEnabled: true },
  profile: { rating: 900, rank: 3, spinsAvailable: 0 },
};
const validExpansion = {
  ok: true,
  availability: { today: true, lab: true, ghost: true, rival: true, mastery: true, partner: true, store: true },
  wallet: { walletStars: 20 },
  today: { completedTasks: 1, state: 'available' },
};

describe('Arena hub hydration safety', () => {
  it('rejects malformed current-schema warm data without fabricating a rank', () => {
    expect(arenaWarmHome({})).toBeNull();
    expect(arenaWarmHome({ ...validHome, profile: {} })).toBeNull();
    expect(arenaWarmHome({ ...validHome, availability: { enabled: true } })).toBeNull();
    expect(arenaWarmHome(validHome)?.profile.rank).toBe(3);
    expect(arenaWarmExpansion({})).toBeNull();
    expect(arenaWarmExpansion({ ...validExpansion, wallet: {} })).toBeNull();
    expect(arenaWarmExpansion(validExpansion)?.wallet.walletStars).toBe(20);
  });

  it('accepts only the latest mounted request generation', () => {
    const gate = arenaHubRequestGate();
    const older = gate.begin();
    const latest = gate.begin();
    expect(gate.current(older)).toBe(false);
    expect(gate.current(latest)).toBe(true);
    gate.dispose();
    expect(gate.current(latest)).toBe(false);
  });

  it('wires validated warm values and latest-only responses into the screen', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena.tsx'), 'utf8');
    expect(source).toContain('arenaWarmHome');
    expect(source).toContain('arenaHubRequestGate');
  });
});

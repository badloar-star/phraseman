// зачем (координатор 18.10, R129): журнал [MEM-MOMENTS] стоит в каждом хосте моментов и выключен в сторе; счётчик возвращается к нулю после ухода.
import fs from 'node:fs';
import path from 'node:path';
import { __resetMemMoments, memMomentsLive, memMomentsMount, MEM_MOMENTS_ENABLED } from '../components/moments/mem_moments_probe';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('[MEM-MOMENTS] живые хосты моментов', () => {
  beforeEach(() => __resetMemMoments());

  it('отметка снимается — счётчик пуст (или проба выключена и ничего не считает)', () => {
    const off = memMomentsMount('host:test');
    expect(memMomentsLive()).toEqual(MEM_MOMENTS_ENABLED ? { 'host:test': 1 } : {});
    off();
    expect(memMomentsLive()).toEqual({});
  });

  it('проба только в отладке: общий гейт dev_diag_gate (dev и не стор-релиз)', () => {
    expect(read('components/moments/mem_moments_probe.ts')).toContain('const ENABLED = DIAG_ENABLED;');
    expect(read('components/streak/moments/streak_calendar_probe.ts')).toContain('export const STREAK_PROBE = DIAG_ENABLED;');
  });

  it.each([
    ['components/spire/moments/SpireWeekMomentHost.tsx', "useMemMomentsTrack('host:spire-week'"],
    ['components/moments/WelcomeBackMoment.tsx', "useMemMomentsTrack('host:welcome-back')"],
    ['components/coin_rank_moments/CoinRankEnoughDialog.tsx', "useMemMomentsTrack('host:coin-rank-enough')"],
    ['components/streak/moments/StreakMilestoneHost.tsx', "useMemMomentsTrack('host:streak-milestone'"],
    ['components/legacy_bonus/LegacyBonusWelcomeInner.tsx', "useMemMomentsTrack('host:legacy-bonus-sheet'"],
    ['components/moments/MomentCoin.tsx', "useMemMomentsTrack('coin'"],
    ['components/spire/moments/moments_layout.tsx', 'useMemMomentsTrack(`full:'],
  ])('%s отмечает своё время жизни', (file, call) => {
    expect(read(file)).toContain(call);
  });
});

// зачем (Q94 координатора, D107): бесплатная заморозка Plus применяется сама, без кнопки.
// Пропуск 1 дня у Plus — серия цела; у Free — сброс; дважды заморозку не потратить.
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';

jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn() }));
jest.mock('../app/premium_freeze_allowance', () => ({
  PREMIUM_FREEZE_USED_FLAG_KEY: 'premium_free_freeze_used',
  applyMonthlyPremiumFreezeAllowance: jest.fn(),
}));
jest.mock('../app/economy/premium_free_freeze', () => ({ commitPremiumFreeFreeze: jest.fn() }));

import { tryAutoPremiumFreeze } from '../app/streak_auto_freeze';

function makeDeps(opts: { premium: boolean | 'hang'; used?: string | null; commitFails?: boolean }) {
  let usedFlag: string | null = opts.used ?? 'false';
  const commits: string[] = [];
  return {
    commits,
    deps: {
      isPremium: () => (opts.premium === 'hang' ? new Promise<boolean>(() => {}) : Promise.resolve(opts.premium)),
      applyAllowance: async () => {},
      readUsedFlag: async () => usedFlag,
      commit: async (day: string) => {
        if (opts.commitFails) throw new Error('boom');
        commits.push(day);
        usedFlag = 'true';
      },
    },
  };
}

describe('автозаморозка серии Plus (Q94)', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('Plus с доступной заморозкой — заморозка тратится сама', async () => {
    const { deps, commits } = makeDeps({ premium: true });
    await expect(tryAutoPremiumFreeze('2026-10-01', deps)).resolves.toEqual({ applied: true });
    expect(commits).toEqual(['2026-10-01']);
  });

  it('Free — заморозки нет, серия сбрасывается как раньше', async () => {
    const { deps, commits } = makeDeps({ premium: false });
    await expect(tryAutoPremiumFreeze('2026-10-01', deps)).resolves.toEqual({ applied: false, reason: 'not_premium' });
    expect(commits).toEqual([]);
  });

  it('дважды не применить: после траты флаг «использована» закрывает повтор', async () => {
    const { deps, commits } = makeDeps({ premium: true });
    await tryAutoPremiumFreeze('2026-10-01', deps);
    await expect(tryAutoPremiumFreeze('2026-10-01', deps)).resolves.toEqual({ applied: false, reason: 'month_limit' });
    expect(commits).toHaveLength(1);
  });

  it('месячный лимит исчерпан — не тратит', async () => {
    const { deps } = makeDeps({ premium: true, used: 'true' });
    await expect(tryAutoPremiumFreeze('2026-10-01', deps)).resolves.toEqual({ applied: false, reason: 'month_limit' });
  });

  it('зависшая проверка Plus не держит серию', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { deps } = makeDeps({ premium: 'hang' });
    const pending = tryAutoPremiumFreeze('2026-10-01', deps);
    jest.advanceTimersByTime(3_001);
    await expect(pending).resolves.toEqual({ applied: false, reason: 'premium_check_timeout' });
    jest.useRealTimers();
  });

  it('аккаунт ещё не поднят — статус Plus неизвестен (premium_unknown), проверку Plus не зовём', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { deps, commits } = makeDeps({ premium: false });
    const isPremium = jest.fn(deps.isPremium);
    await expect(tryAutoPremiumFreeze('2026-10-01', { ...deps, isPremium, accountNotReady: () => 'account_phase_transitioning' }))
      .resolves.toEqual({ applied: false, reason: 'premium_unknown' });
    expect(isPremium).not.toHaveBeenCalled();
    expect(commits).toEqual([]);
  });

  it('сбой записи — не применено, причина в логе', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { deps } = makeDeps({ premium: true, commitFails: true });
    await expect(tryAutoPremiumFreeze('2026-10-01', deps)).resolves.toEqual({ applied: false, reason: 'commit_failed' });
  });

  it('проводка: автозаморозка только при пропуске ровно одного дня и мёртвом «вчера» в журнале', () => {
    const hall = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app/hall_of_fame_utils.ts'), 'utf8'));
    expect(hall).toMatch(/const canFreeze = journalRunToYesterday < 1 && lastActive !== null && missedExactlyOneDay;/);
    expect(hall).toMatch(/canFreeze && !manualFreeze\s*\n\s*\? await \(await import\('\.\/streak_auto_freeze'\)\)\.tryAutoPremiumFreeze\(today\)/);
    // зачем (координатор 15.10, 🔴): неизвестный статус Plus — не сброс, а отложенное решение (tests/streak_freeze_pending.test.ts).
    expect(hall).toContain('const autoUndecided = isAutoFreezeUndecided(autoResult);');
    expect(hall).toMatch(/soundDirector\.request\('pm\.streak\.saved'/);
  });
});

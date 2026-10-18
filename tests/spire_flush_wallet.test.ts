// зачем (координатор 18.10, D1 — деньги внутри приложения): баланс из ответа spireReportSteps вливается в кошелёк только при более новом seq;
// поздний ответ и старый сервер (без полей) кошелёк не трогают.
jest.mock('../app/account_generation', () => ({}));

/* eslint-disable import/first */
import { mergeSpireFlushWallet, type SpireFlushWalletDeps } from '../app/spire/spire_flush_wallet';
/* eslint-enable import/first */

const token = { stableId: 'user-1' } as never;

function makeDeps(localSeq: number, balance: number) {
  const wallet = { balance, seq: localSeq };
  const merge = jest.fn(async (_t: unknown, o: { stars: number; starsSeq: number }) => {
    // как mergeLevelSpinServerStars: принимает только более новый seq
    if (o.starsSeq > wallet.seq) { wallet.balance = o.stars; wallet.seq = o.starsSeq; }
    return { balance: wallet.balance };
  });
  const deps: SpireFlushWalletDeps = { merge, readLocalSeq: async () => wallet.seq, peekBalance: () => wallet.balance };
  return { deps, merge, wallet };
}

describe('[MOMENT-REWARD] spire:flush → кошелёк Главной', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('ответ с seq новее → баланс обновлён, начисленное передано как serverCreditedDelta', async () => {
    const { deps, merge, wallet } = makeDeps(7, 100);
    const r = await mergeSpireFlushWallet(token, { ok: true, stars: 110, starsSeq: 8, coinsGranted: 10 }, deps);
    expect(r).toMatchObject({ merged: true, balanceBefore: 100, balanceAfter: 110 });
    expect(merge).toHaveBeenCalledWith(token, { stars: 110, starsSeq: 8, serverCreditedDelta: 10 });
    expect(wallet.balance).toBe(110);
  });

  it('ответ с seq старее (поздний) → баланс не тронут, слияние не вызывается', async () => {
    const { deps, merge, wallet } = makeDeps(9, 130);
    const r = await mergeSpireFlushWallet(token, { ok: true, stars: 110, starsSeq: 8, coinsGranted: 10 }, deps);
    expect(r.merged).toBe(false);
    expect(r.reason).toMatch(/^older_seq/);
    expect(merge).not.toHaveBeenCalled();
    expect(wallet.balance).toBe(130);
  });

  it('нет полей stars/starsSeq (старый сервер) → не тронут, reason=no_server_stars', async () => {
    const { deps, merge, wallet } = makeDeps(7, 100);
    const r = await mergeSpireFlushWallet(token, { ok: true, coinsGranted: 10 }, deps);
    expect(r).toMatchObject({ merged: false, reason: 'no_server_stars' });
    expect(merge).not.toHaveBeenCalled();
    expect(wallet.balance).toBe(100);
  });

  it('ответ не ok и сбой слияния → не тронут, причина в журнале, не бросает', async () => {
    const { deps } = makeDeps(7, 100);
    expect((await mergeSpireFlushWallet(token, { ok: false, reason: 'spire_not_live' }, deps)).reason).toBe('not_ok:spire_not_live');
    const failing = { ...deps, merge: async () => { throw new Error('level_spin_star_identity_changed'); } };
    const r = await mergeSpireFlushWallet(token, { ok: true, stars: 110, starsSeq: 8 }, failing);
    expect(r).toMatchObject({ merged: false, reason: 'merge_failed:level_spin_star_identity_changed' });
  });
});

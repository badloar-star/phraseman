import {
  __resetDialogFastpathCache,
  createStageTimer,
  resolveDialogGatesCached,
  resolveDialogIdentityCached,
  DIALOG_IDENTITY_CACHE_TTL_MS,
} from './premium_dialog_fastpath';

describe('dialog fastpath: identity cache', () => {
  beforeEach(() => __resetDialogFastpathCache());

  it('reads once inside TTL and marks the hit as fromCache', async () => {
    const resolve = jest.fn().mockResolvedValue({ stableUid: 's1', isPremium: true });
    const first = await resolveDialogIdentityCached('auth1', resolve, 1_000);
    const second = await resolveDialogIdentityCached('auth1', resolve, 1_000 + DIALOG_IDENTITY_CACHE_TTL_MS - 1);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ stableUid: 's1', isPremium: true, fromCache: false });
    expect(second).toEqual({ stableUid: 's1', isPremium: true, fromCache: true });
  });

  it('re-reads after TTL so an expired subscription is not kept alive', async () => {
    const resolve = jest.fn()
      .mockResolvedValueOnce({ stableUid: 's1', isPremium: true })
      .mockResolvedValueOnce({ stableUid: 's1', isPremium: false });
    await resolveDialogIdentityCached('auth1', resolve, 1_000);
    const later = await resolveDialogIdentityCached('auth1', resolve, 1_000 + DIALOG_IDENTITY_CACHE_TTL_MS);

    expect(resolve).toHaveBeenCalledTimes(2);
    expect(later.isPremium).toBe(false);
  });

  it('never caches a rejection: the next call resolves again', async () => {
    const resolve = jest.fn()
      .mockRejectedValueOnce(new Error('account_deletion_pending'))
      .mockResolvedValueOnce({ stableUid: 's1', isPremium: false });
    await expect(resolveDialogIdentityCached('auth1', resolve, 1_000)).rejects.toThrow('account_deletion_pending');
    const ok = await resolveDialogIdentityCached('auth1', resolve, 1_001);

    expect(resolve).toHaveBeenCalledTimes(2);
    expect(ok.fromCache).toBe(false);
  });

  it('keeps identities of different auth uids apart', async () => {
    const resolve = jest.fn()
      .mockResolvedValueOnce({ stableUid: 'a', isPremium: true })
      .mockResolvedValueOnce({ stableUid: 'b', isPremium: false });
    const a = await resolveDialogIdentityCached('auth-a', resolve, 1_000);
    const b = await resolveDialogIdentityCached('auth-b', resolve, 1_000);

    expect(a.stableUid).toBe('a');
    expect(b.stableUid).toBe('b');
  });
});

describe('dialog fastpath: gates cache', () => {
  beforeEach(() => __resetDialogFastpathCache());

  it('reads the gates document once inside TTL', async () => {
    const resolve = jest.fn().mockResolvedValue({ aiOff: false, gatedByPremium: true });
    await resolveDialogGatesCached(resolve, 5_000);
    const hit = await resolveDialogGatesCached(resolve, 5_000 + 10_000);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(hit).toEqual({ aiOff: false, gatedByPremium: true, fromCache: true });
  });
});

describe('dialog fastpath: stage timer', () => {
  it('records the first mark per stage and a total', () => {
    let now = 100;
    const timer = createStageTimer(() => now);
    now = 150;
    timer.mark('authMs');
    now = 400;
    timer.mark('firstTokenMs');
    now = 420;
    timer.mark('firstTokenMs'); // повтор не сдвигает первую отметку
    now = 900;

    expect(timer.summary()).toEqual({ authMs: 50, firstTokenMs: 300, totalMs: 800 });
    expect(timer.elapsedMs()).toBe(800);
  });
});

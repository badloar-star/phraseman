describe('premium store persistence lock contract', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('settles when persistence is already inside the account transition lock', async () => {
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-A');
    const token = generation.captureAccountGeneration();
    const isCurrent = () => generation.isCurrentAccountGeneration(token, 'stable-A');
    const { persistStorePremiumLocally } = await import('../app/premium_revenuecat_state');

    const persisted = generation.withAccountTransitionLock(() => (
      persistStorePremiumLocally('yearly', {}, isCurrent, false, true)
    ));

    await expect(Promise.race([
      persisted,
      new Promise<'timed_out'>((resolve) => setTimeout(() => resolve('timed_out'), 500)),
    ])).resolves.toBe(true);
  });
});

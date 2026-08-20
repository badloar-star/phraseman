import {
  arenaHubCached,
  arenaHubCurrent,
  arenaHubFailure,
  arenaHubNeutral,
} from '../modules/arena/hub_presentation';

describe('Arena hub hydration presentation', () => {
  it('starts a slot neutral', () => {
    expect(arenaHubNeutral<string>()).toEqual({ source: 'neutral', value: null });
  });

  it('installs a non-null cached value only from neutral', () => {
    const cached = arenaHubCached(arenaHubNeutral<string>(), 'warm snapshot');

    expect(cached).toEqual({ source: 'cached', value: 'warm snapshot' });
  });

  it('does not let cache overwrite current data', () => {
    const current = arenaHubCurrent({ version: 'live' });

    expect(arenaHubCached(current, { version: 'warm' })).toBe(current);
  });

  it('does not replace an installed cache with a newer cache', () => {
    const cached = arenaHubCached(arenaHubNeutral<string>(), 'first cache');

    expect(arenaHubCached(cached, 'newer cache')).toBe(cached);
  });

  it('does not install a null cache', () => {
    const neutral = arenaHubNeutral<string>();

    expect(arenaHubCached(neutral, null)).toBe(neutral);
  });

  it('marks a loaded value current', () => {
    expect(arenaHubCurrent(42)).toEqual({ source: 'current', value: 42 });
  });
});

describe('Arena hub remote failure presentation', () => {
  it.each([
    new Error('Network request failed'),
    { code: 'functions/unavailable' },
    { code: 'functions/deadline-exceeded', message: 'timeout' },
    new Error('failed to fetch'),
  ])('classifies transport failure %# as offline', (error) => {
    expect(arenaHubFailure(error).kind).toBe('offline');
  });

  it.each([
    { code: 'arena_disabled' },
    { code: 'arena_client_update_required' },
    { code: 'arena_config_incompatible:v3' },
    { code: 'account_delete_pending' },
  ])('classifies domain failure %# as server', (error) => {
    expect(arenaHubFailure(error).kind).toBe('server');
  });

  it('preserves a useful diagnostic message before a generic transport code', () => {
    expect(arenaHubFailure({
      code: 'functions/failed-precondition',
      message: 'arena_disabled',
    })).toEqual({ kind: 'server', code: 'arena_disabled' });
  });

  it('keeps primitive string transport diagnostics', () => {
    expect(arenaHubFailure('Network timeout')).toEqual({
      kind: 'offline',
      code: 'Network timeout',
    });
  });

  it('limits diagnostics to the first 80 characters', () => {
    const message = 'x'.repeat(81);
    const failure = arenaHubFailure(message);

    expect(failure.code).toBe(message.slice(0, 80));
    expect(failure.code).toHaveLength(80);
  });
});

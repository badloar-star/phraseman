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
});

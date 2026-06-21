// Контракт: санитизация состояния лиги из кэша. Битый/частичный AsyncStorage не должен
// доходить до club_screen с `group` не-массивом — иначе [...group]/.sort падают TypeError,
// и единственный глобальный ErrorBoundary роняет ВСЁ приложение в белый экран (аудит P2 #20).
import {
  sanitizeLeagueState,
  rememberLeagueStateSnapshot,
  clearCachedLeagueStateSnapshot,
  getCachedLeagueStateSync,
} from '../app/league_open_cache_policy';

describe('sanitizeLeagueState — group всегда массив', () => {
  afterEach(() => clearCachedLeagueStateSnapshot());

  it('null/undefined/не-объект → null', () => {
    expect(sanitizeLeagueState(null)).toBeNull();
    expect(sanitizeLeagueState(undefined)).toBeNull();
    expect(sanitizeLeagueState('broken')).toBeNull();
    expect(sanitizeLeagueState(42)).toBeNull();
  });

  it('group отсутствует → пустой массив (не undefined)', () => {
    const r = sanitizeLeagueState({ leagueId: 1, weekId: '2026-W01' });
    expect(Array.isArray(r?.group)).toBe(true);
    expect(r?.group).toHaveLength(0);
  });

  it('group = объект/строка/число (битый кэш) → пустой массив', () => {
    expect(sanitizeLeagueState({ group: {} })?.group).toEqual([]);
    expect(sanitizeLeagueState({ group: 'x' })?.group).toEqual([]);
    expect(sanitizeLeagueState({ group: 123 })?.group).toEqual([]);
    expect(sanitizeLeagueState({ group: null })?.group).toEqual([]);
  });

  it('валидный массив group сохраняется как есть', () => {
    const members = [{ uid: 'a', points: 10 }, { uid: 'b', points: 5 }];
    const r = sanitizeLeagueState({ leagueId: 2, weekId: '2026-W02', group: members });
    expect(r?.group).toEqual(members);
    expect(r?.leagueId).toBe(2);
  });

  it('результат всегда выдерживает [...group].sort (не падает)', () => {
    const r = sanitizeLeagueState({ group: { broken: true } });
    expect(() => [...(r!.group)].sort((a, b) => (b.points || 0) - (a.points || 0))).not.toThrow();
  });
});

describe('rememberLeagueStateSnapshot — кэш тоже санитизируется', () => {
  afterEach(() => clearCachedLeagueStateSnapshot());

  it('кладёт в кэш state с гарантированным массивом group', () => {
    rememberLeagueStateSnapshot({ group: 'broken' } as any);
    const cached = getCachedLeagueStateSync();
    expect(Array.isArray(cached?.group)).toBe(true);
  });

  it('null чистит кэш', () => {
    rememberLeagueStateSnapshot({ group: [] } as any);
    rememberLeagueStateSnapshot(null);
    expect(getCachedLeagueStateSync()).toBeNull();
  });
});

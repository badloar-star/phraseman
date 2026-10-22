import { runFriendsGetProfiles } from './friends_profiles';

// зачем (§CORE-0162, аудит стоимости Firebase, пакет D): проверка дружбы уже читает users/{друг} и метку удаления —
// сборка профиля их не перечитывает. Права доступа и форма ответа (для старых сборок 1.6.24) прежние.
type Row = Record<string, unknown>;

function makeDb(rows: Record<string, Row>) {
  const reads: string[] = [];
  const snap = (path: string) => {
    reads.push(path);
    const data = rows[path];
    return { exists: data !== undefined, data: () => data, id: path.split('/').pop() };
  };
  const ref = (path: string): any => ({
    path,
    get: async () => snap(path),
    collection: (name: string) => collection(`${path}/${name}`),
  });
  const collection = (path: string): any => ({
    doc: (id: string) => ref(`${path}/${id}`),
    where: () => ({ limit: () => ({ get: async () => { reads.push(`${path}?query`); return { docs: [] }; } }) }),
  });
  const db = {
    collection,
    getAll: async (...refs: Array<{ path: string }>) => refs.map((item) => snap(item.path)),
  };
  return { db: db as never, reads };
}

const friendRows = (caller: string, friend: string): Record<string, Row> => ({
  [`users/${caller}/friends/${friend}`]: { since: 1 },
  [`users/${friend}/friends/${caller}`]: { since: 1 },
  [`users/${friend}`]: { progress: {} },
  [`public_profiles/${friend}`]: { name: `Друг ${friend}` },
});

describe('friendsGetProfiles reads', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('builds a mutual friend profile without re-reading the friend user doc or deletion marker', async () => {
    const { db, reads } = makeDb(friendRows('caller-d1', 'friend-1'));
    const result = await runFriendsGetProfiles(db, 'caller-d1', ['friend-1']);

    expect(result.ok).toBe(true);
    expect(result.profiles['friend-1']?.displayName).toBe('Друг friend-1');
    expect(reads.filter((path) => path === 'users/friend-1')).toHaveLength(1);
    expect(reads.filter((path) => path === 'account_deletion_tombstones/friend-1')).toHaveLength(1);
    // 4 чтения проверки дружбы + 1 публичный профиль (было 4 + 3).
    expect(reads).toHaveLength(5);
  });

  it('keeps the authorization: one-sided, hidden or deleted friends get null', async () => {
    const rows: Record<string, Row> = {
      ...friendRows('caller-d2', 'one-sided'),
      ...friendRows('caller-d2', 'hidden'),
      ...friendRows('caller-d2', 'deleted'),
      'users/hidden': { identityHidden: true },
      'account_deletion_tombstones/deleted': { at: 1 },
    };
    delete rows['users/one-sided/friends/caller-d2'];
    const { db } = makeDb(rows);
    const result = await runFriendsGetProfiles(db, 'caller-d2', ['one-sided', 'hidden', 'deleted', 'stranger']);
    expect(result).toEqual({ ok: true, profiles: { 'one-sided': null, hidden: null, deleted: null, stranger: null } });
  });

  it('returns isPlus/plusUntilMs from public_profiles for the Plus ring, without extra reads', async () => {
    // зачем (координатор 22.10): клиент кольца (4 · ТЕМЫ 49677b5c4) ждёт эти поля в каждой записи batch.
    const rows: Record<string, Row> = {
      ...friendRows('caller-d4', 'plus-forever'),
      ...friendRows('caller-d4', 'plus-term'),
      ...friendRows('caller-d4', 'no-plus'),
      ...friendRows('caller-d4', 'old-profile'),
      ...friendRows('caller-d4', 'bad-term'),
    };
    rows['public_profiles/plus-forever'] = { name: 'A', isPlus: true, plusUntilMs: 0 };
    rows['public_profiles/plus-term'] = { name: 'B', isPlus: true, plusUntilMs: 1_800_000_000_000 };
    rows['public_profiles/no-plus'] = { name: 'C', isPlus: false, plusUntilMs: null, isPremium: true };
    rows['public_profiles/bad-term'] = { name: 'E', isPlus: 'yes', plusUntilMs: -5 };
    const { db, reads } = makeDb(rows);
    const result = await runFriendsGetProfiles(db, 'caller-d4', ['plus-forever', 'plus-term', 'no-plus', 'old-profile', 'bad-term']);

    expect(result.profiles['plus-forever']).toMatchObject({ isPlus: true, plusUntilMs: 0 });
    expect(result.profiles['plus-term']).toMatchObject({ isPlus: true, plusUntilMs: 1_800_000_000_000 });
    // isPremium (вводный доступ) кольца не даёт: берём только isPlus.
    expect(result.profiles['no-plus']).toMatchObject({ isPlus: false, plusUntilMs: null, isPremium: true });
    // Профиль до проекции cbdecef56 — полей нет: null, кольца нет.
    expect(result.profiles['old-profile']).toMatchObject({ isPlus: null, plusUntilMs: null });
    expect(result.profiles['bad-term']).toMatchObject({ isPlus: null, plusUntilMs: null });
    // 4 чтения проверки дружбы + 1 публичный профиль на каждого — новых чтений нет.
    expect(reads).toHaveLength(5 * 5);
  });

  it('the caller own profile still reads its user doc and deletion marker itself', async () => {
    const { db, reads } = makeDb({ 'users/caller-d3': { progress: {} }, 'public_profiles/caller-d3': { name: 'Я' } });
    const result = await runFriendsGetProfiles(db, 'caller-d3', ['caller-d3']);
    expect(result.profiles['caller-d3']?.displayName).toBe('Я');
    expect(reads).toEqual(expect.arrayContaining(['users/caller-d3', 'account_deletion_tombstones/caller-d3', 'public_profiles/caller-d3']));
  });
});

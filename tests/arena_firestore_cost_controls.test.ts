import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('arena Firestore cost controls', () => {
  it('does not run a scheduled arena top-100 snapshot when the product only uses the throne champion', () => {
    const indexSource = read('functions/src/index.ts');
    const packageSource = read('functions/package.json');
    const rulesSource = read('firestore.rules');

    expect(indexSource).not.toContain('syncArenaLeaderboardSnapshotCron');
    expect(packageSource).not.toContain('syncArenaLeaderboardSnapshotCron');
    expect(rulesSource).not.toContain('arena_public_snapshots');
    expect(fs.existsSync(path.join(ROOT, 'functions/src/arena_leaderboard_snapshot.ts'))).toBe(false);
  });

  it('keeps throne daily top as the single current throne holder', () => {
    const source = read('functions/src/arena_hill.ts');

    expect(source).toContain('const throneSnap = await db.collection(THRONES).doc(today).get();');
    expect(source).toContain('const rawRows: DailyTopEntry[] = throneSnap.exists && throne.championUid');
    expect(source).not.toContain("const DAILY_TOP = 'arena_hill_daily_top'");
    expect(source).not.toContain('function mergeDailyTopEntries');
    expect(source).not.toContain(".collection(PLAYER_WINS).where('dayKey', '==', today).get()");
    expect(read('app/services/arena_hill.ts')).toContain('data.entries.slice(0, 1)');
    expect(read('app/arena_lobby.tsx')).toContain("ru: 'Текущий чемпион за сегодня'");
  });

  it('derives throne champion level from the freshest migrated XP mirrors', () => {
    const source = read('functions/src/arena_hill.ts');

    expect(source).toContain('function readMaxInt');
    expect(source).toContain('userProgress.user_total_xp');
    expect(source).toContain("db.collection('arena_profiles').doc(row.uid)");
    expect(source).toContain("db.collection('arena_profiles').doc(row.authUid)");
    expect(source).toContain('arenaAuthMirror === row.uid');
    expect(source).not.toContain('readInt(lb.points ?? lb.totalXp ?? user.totalXp ?? user.user_total_xp, 0)');
  });

  it('uses polling for lobby aggregate docs instead of always-on snapshots', () => {
    expect(read('app/services/arena_hill.ts')).not.toContain('.onSnapshot(');
    expect(read('app/services/arena_feature_flags.ts')).not.toContain('.onSnapshot(');

    const arenaDb = read('app/services/arena_db.ts');
    expect(arenaDb).toContain('setInterval(readTotal');
    expect(arenaDb).not.toContain('return col.matchmakingMeta().onSnapshot(');
  });

  it('does not allow the old exact rank path to scan one thousand arena profiles', () => {
    const source = read('app/arena_leaderboard_fetch.ts');
    expect(source).not.toContain(".limit(1000)\n        .get()");
    expect(source).toContain('const ARENA_TOP100_REMOTE_ENABLED = false;');
    expect(source).toContain('if (!ARENA_TOP100_REMOTE_ENABLED) return cachedRows;');
    expect(source).toMatch(/export async function fetchMyArenaRank\(\): Promise<number \| null> \{\r?\n  return getCachedMyArenaRank\(\);\r?\n\}/);
  });
});

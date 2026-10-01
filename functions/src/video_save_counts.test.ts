import { normalizeVideoIds, refreshVideoSaveCountsCore, staleIds, VIDEO_SAVE_COUNTS_TTL_MS } from './video_save_counts';

const V1 = 'dQw4w9WgXcQ';
const V2 = 'abc12345678';

/**
 * Связи «как в Firestore»: Set на ролик = уникальные пользователи. count()
 * возвращает размер — один пользователь учитывается один раз.
 */
function relations() {
  const byVideo = new Map<string, Set<string>>();
  return {
    save: (uid: string, videoId: string) => {
      if (!byVideo.has(videoId)) byVideo.set(videoId, new Set());
      byVideo.get(videoId)!.add(uid);
    },
    remove: (uid: string, videoId: string) => byVideo.get(videoId)?.delete(uid),
    deleteAccount: (uid: string) => byVideo.forEach((set) => set.delete(uid)),
    count: async (videoId: string) => byVideo.get(videoId)?.size ?? 0,
  };
}

function store() {
  let counts: Record<string, { n: number; atMs: number }> = {};
  return {
    get: () => counts,
    deps: (nowMs: number, count: (id: string) => Promise<number>) => ({
      nowMs,
      readCounts: async () => counts,
      countFavorites: count,
      writeCounts: async (patch: Record<string, { n: number; atMs: number }>) => { counts = { ...counts, ...patch }; },
    }),
  };
}

describe('video save counts (PM-112/113)', () => {
  it('один пользователь учитывается один раз, повтор сохранения не удваивает', async () => {
    const rel = relations();
    rel.save('u1', V1);
    rel.save('u1', V1);
    rel.save('u2', V1);
    const s = store();
    await refreshVideoSaveCountsCore([V1], s.deps(1000, rel.count));
    expect(s.get()[V1]).toEqual({ n: 2, atMs: 1000 });
  });

  it('убрал из избранного или удалил аккаунт — агрегат уменьшается при пересчёте', async () => {
    const rel = relations();
    rel.save('u1', V1);
    rel.save('u2', V1);
    rel.save('u3', V1);
    const s = store();
    await refreshVideoSaveCountsCore([V1], s.deps(1000, rel.count));
    rel.remove('u1', V1);
    rel.deleteAccount('u2');
    // До истечения 6 ч пересчёта нет (отмеченная eventual consistency).
    await refreshVideoSaveCountsCore([V1], s.deps(2000, rel.count));
    expect(s.get()[V1].n).toBe(3);
    await refreshVideoSaveCountsCore([V1], s.deps(1000 + VIDEO_SAVE_COUNTS_TTL_MS, rel.count));
    expect(s.get()[V1].n).toBe(1);
  });

  it('пересчитываются только устаревшие ролики; сбой count() не обнуляет прежнее значение', async () => {
    const rel = relations();
    rel.save('u1', V2);
    const s = store();
    await refreshVideoSaveCountsCore([V1, V2], s.deps(1000, rel.count));
    const count = jest.fn(async (id: string) => {
      if (id === V2) throw new Error('deadline');
      return rel.count(id);
    });
    const result = await refreshVideoSaveCountsCore([V1, V2], s.deps(1000 + VIDEO_SAVE_COUNTS_TTL_MS, count));
    expect(result.recomputed).toBe(1);
    expect(s.get()[V2]).toEqual({ n: 1, atMs: 1000 });
  });

  it('вход валидируется: только id роликов, не больше 100', () => {
    expect(normalizeVideoIds([V1, V1, 'bad', 42])).toEqual([V1]);
    expect(() => normalizeVideoIds('x')).toThrow('video_ids_required');
    expect(() => normalizeVideoIds(Array.from({ length: 101 }, (_, i) => `v${String(i).padStart(10, '0')}`))).toThrow('too_many_video_ids');
    expect(staleIds({ [V1]: { atMs: 5 } }, [V1, V2], 10)).toEqual([V2]);
  });
});

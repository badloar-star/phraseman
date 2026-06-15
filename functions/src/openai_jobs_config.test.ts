import { resolveJobConfig, assertJobEnabled } from './openai_jobs_config';

// Минимальный фейковый Firestore: db.collection('admin_runtime_config').doc('openai_jobs').get()
function fakeDb(doc: Record<string, unknown> | undefined) {
  return {
    collection() {
      return {
        doc() {
          return {
            async get() {
              return { exists: !!doc, data: () => doc };
            },
          };
        },
      };
    },
  } as unknown as FirebaseFirestore.Firestore;
}

describe('openai_jobs_config — resolveJobConfig', () => {
  it('no doc → defaults per job (enabled=true)', async () => {
    const db = fakeDb(undefined);
    const stats = await resolveJobConfig(db, 'stats');
    expect(stats).toEqual({ model: 'gpt-4o-mini', globalDailyCap: 5000, enabled: true });
    const weekly = await resolveJobConfig(db, 'weekly');
    expect(weekly).toEqual({ model: 'gpt-4o-mini', globalDailyCap: 0, enabled: true });
    const explain = await resolveJobConfig(db, 'explain');
    expect(explain).toEqual({ model: 'gpt-4o-mini', globalDailyCap: 3000, enabled: true });
  });

  it('reads per-job overrides from doc', async () => {
    const db = fakeDb({ stats: { model: 'gpt-4.1-mini', globalDailyCap: 1000, enabled: true } });
    const stats = await resolveJobConfig(db, 'stats');
    expect(stats).toEqual({ model: 'gpt-4.1-mini', globalDailyCap: 1000, enabled: true });
  });

  it('enabled=false is honoured (kill-switch)', async () => {
    const db = fakeDb({ explain: { enabled: false } });
    const explain = await resolveJobConfig(db, 'explain');
    expect(explain.enabled).toBe(false);
    // другие поля падают в дефолт
    expect(explain.model).toBe('gpt-4o-mini');
    expect(explain.globalDailyCap).toBe(3000);
  });

  it('unknown model → falls back to job default', async () => {
    const db = fakeDb({ weekly: { model: 'gpt-5-imaginary' } });
    const weekly = await resolveJobConfig(db, 'weekly');
    expect(weekly.model).toBe('gpt-4o-mini');
  });

  it('cap clamps negatives to 0', async () => {
    const db = fakeDb({ stats: { globalDailyCap: -50 } });
    expect((await resolveJobConfig(db, 'stats')).globalDailyCap).toBe(0);
  });
});

describe('openai_jobs_config — assertJobEnabled', () => {
  it('throws resource-exhausted when disabled', () => {
    expect(() => assertJobEnabled({ model: 'gpt-4o-mini', globalDailyCap: 0, enabled: false }, 'weekly'))
      .toThrow(/weekly_disabled_by_admin/);
  });
  it('no-op when enabled', () => {
    expect(() => assertJobEnabled({ model: 'gpt-4o-mini', globalDailyCap: 0, enabled: true }, 'weekly'))
      .not.toThrow();
  });
});

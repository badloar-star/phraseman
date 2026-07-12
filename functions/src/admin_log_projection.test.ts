import { publicObject, collectTimestampRows } from './admin_log_projection';

function fakeCollection(rows: Array<{ id: string } & Record<string, unknown>>, failField = '') {
  const byId = new Map(rows.map((row) => [row.id, row]));
  class Query {
    private readonly field?: string;
    private readonly limitCount?: number;

    constructor(field?: string, limitCount?: number) {
      this.field = field;
      this.limitCount = limitCount;
    }

    doc(id: string) {
      return { get: async () => ({ exists: byId.has(id), id, data: () => byId.get(id) }) };
    }

    where() { return this; }

    orderBy(field: string) {
      if (field === failField) throw new Error(`boom:${field}`);
      return new Query(field, this.limitCount);
    }

    startAfter() { return this; }

    limit(count: number) { return new Query(this.field, count); }

    async get() {
      const field = this.field || 'ts';
      const docs = rows
        .filter((row) => row[field] !== undefined)
        .sort((a, b) => String(b[field]).localeCompare(String(a[field])))
        .slice(0, this.limitCount ?? rows.length)
        .map((row) => ({ id: row.id, data: () => row }));
      return { size: docs.length, docs };
    }
  }
  return new Query() as never;
}

describe('shared admin log projection helpers', () => {
  test('sanitizes nested operational data with bounded strings and no message body fields', () => {
    expect(publicObject({
      safe: 'x'.repeat(240),
      bodyText: 'secret',
      nested: { replyText: 'secret reply', kept: 'visible' },
      tags: ['a', 'b', 'c'],
    })).toEqual({
      safe: 'x'.repeat(180),
      nested: { kept: 'visible' },
      tags: { count: 3 },
    });
  });

  test('collects mixed timestamp streams with per-source saturation and partial failure health', async () => {
    const result = await collectTimestampRows(fakeCollection([
      { id: 'new-ts', ts: '2033-05-18T12:30:00.000Z' },
      { id: 'new-timestamp', timestamp: '2033-05-18T12:31:00.000Z' },
      { id: 'old-created', createdAt: '2033-05-18T12:29:00.000Z' },
    ], 'createdAt'), ['timestamp', 'ts', 'createdAt'], 1, '');

    expect(result.rows.map((row) => row.id).sort()).toEqual(['new-timestamp', 'new-ts']);
    expect(result.saturated).toBe(true);
    expect(result.health).toEqual([
      { field: 'timestamp', state: 'truncated', count: 1, error: '' },
      { field: 'ts', state: 'truncated', count: 1, error: '' },
      { field: 'createdAt', state: 'error', count: 0, error: 'boom:createdAt' },
    ]);
  });
});

import { collectAuditRawRows, mergeAuditRowsForList, parseAuditListRequest, projectAuditRow, summarizeAuditSourceHealth } from './admin_audit_log';

function cursorFor(id: string, timestampMs: number): string {
  return Buffer.from(JSON.stringify({ id, timestampMs }), 'utf8').toString('base64url');
}

function fakeAuditDb(rows: Array<{ id: string } & Record<string, unknown>>) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  class Query {
    private readonly field?: string;
    private readonly whereOp?: string;
    private readonly whereValue?: unknown;
    private readonly startAfterId?: string;
    private readonly limitCount?: number;

    constructor(field?: string, whereOp?: string, whereValue?: unknown, startAfterId?: string, limitCount?: number) {
      this.field = field;
      this.whereOp = whereOp;
      this.whereValue = whereValue;
      this.startAfterId = startAfterId;
      this.limitCount = limitCount;
    }

    doc(id: string) {
      return {
        get: async () => {
          const row = byId.get(id);
          return { exists: Boolean(row), id, data: () => row };
        },
      };
    }

    where(field: string, op: string, value: unknown) {
      return new Query(field, op, value, this.startAfterId, this.limitCount);
    }

    orderBy(field: string) {
      return new Query(field, this.whereOp, this.whereValue, this.startAfterId, this.limitCount);
    }

    startAfter(doc: { id: string }) {
      return new Query(this.field, this.whereOp, this.whereValue, doc.id, this.limitCount);
    }

    limit(count: number) {
      return new Query(this.field, this.whereOp, this.whereValue, this.startAfterId, count);
    }

    async get() {
      const field = this.field || 'ts';
      let sorted = rows
        .filter((row) => row[field] !== undefined)
        .filter((row) => {
          if (!this.whereOp) return true;
          const value = String(row[field]);
          const boundary = String(this.whereValue);
          if (this.whereOp === '<=') return value <= boundary;
          if (this.whereOp === '<') return value < boundary;
          return true;
        })
        .sort((a, b) => String(b[field]).localeCompare(String(a[field])));
      if (this.startAfterId) {
        const index = sorted.findIndex((row) => row.id === this.startAfterId);
        sorted = index >= 0 ? sorted.slice(index + 1) : sorted;
      }
      const limited = sorted.slice(0, this.limitCount ?? sorted.length);
      return { size: limited.length, docs: limited.map((row) => ({ id: row.id, data: () => row })) };
    }
  }
  return { collection: () => new Query() } as never;
}

describe('admin audit log list contract', () => {
  test('bounds filters and rejects unsafe cursor combinations', () => {
    expect(parseAuditListRequest({ limit: 9999, sinceDays: 90, action: ' report.status.update ', query: ' user@example.com ' })).toMatchObject({
      limit: 100,
      sinceDays: 90,
      action: 'report.status.update',
      query: 'user@example.com',
      cursor: '',
    });

    expect(() => parseAuditListRequest({ cursor: 'abc', action: 'x' })).toThrow('cursor cannot be combined with audit filters');
    expect(() => parseAuditListRequest({ cursor: 'abc', query: 'x' })).toThrow('cursor cannot be combined with audit filters');
    expect(parseAuditListRequest({ cursor: 'abc', sinceDays: 30 })).toMatchObject({ cursor: 'abc', sinceDays: 30 });
    expect(() => parseAuditListRequest({ cursor: '../../bad' })).toThrow('cursor is invalid');
  });

  test('projects bounded read-only rows without leaking message body fields', () => {
    expect(projectAuditRow('audit-1', {
      ts: '2033-05-18T12:30:00.000Z',
      action: 'support.reply.send',
      actorUid: 'admin-uid',
      adminEmail: 'owner@example.com',
      role: 'owner',
      entity: { collection: 'support_inbox', id: 'msg-1' },
      reason: 'handled',
      requestId: 'req-1',
      rollbackReference: 'history-1',
      before: { status: 'new', bodyText: 'secret body', longNote: 'x'.repeat(250) },
      after: { status: 'answered', finalText: 'secret reply', nested: { safe: 'kept', payload: 'secret' } },
      details: { operationId: 'op-1', replyText: 'secret draft', safe: 'kept', tags: ['a', 'b'] },
    })).toEqual({
      id: 'audit-1',
      ts: '2033-05-18T12:30:00.000Z',
      timestampMs: 2000032200000,
      action: 'support.reply.send',
      actorUid: 'admin-uid',
      adminEmail: 'owner@example.com',
      role: 'owner',
      entity: { collection: 'support_inbox', id: 'msg-1' },
      reason: 'handled',
      requestId: 'req-1',
      rollbackReference: 'history-1',
      before: { status: 'new', longNote: 'x'.repeat(180) },
      after: { status: 'answered', nested: { safe: 'kept' } },
      details: { operationId: 'op-1', safe: 'kept', tags: { count: 2 } },
    });
  });

  test('merges mixed timestamp schemas without dropping structured audit records', () => {
    const input = parseAuditListRequest({ limit: 10, sinceDays: 90 });
    const rows = mergeAuditRowsForList([
      { id: 'legacy-ts', ts: '2033-05-18T12:00:00.000Z', action: 'grant_reward', entity: { collection: 'users', id: 'u1' } },
      { id: 'structured-timestamp', timestamp: '2033-05-18T13:00:00.000Z', action: 'remote_config.publish', entity: { collection: 'remote_config', id: 'app' } },
      { id: 'created-at', createdAt: { seconds: 2000037600 }, action: 'email_campaign_send', entity: { collection: 'email_campaigns', id: 'c1' } },
      { id: 'structured-timestamp', timestamp: '2033-05-18T13:00:00.000Z', action: 'remote_config.publish', entity: { collection: 'remote_config', id: 'app' } },
    ], input, Date.parse('2033-05-01T00:00:00.000Z'), null);

    expect(rows.map((row) => row.id)).toEqual(['created-at', 'structured-timestamp', 'legacy-ts']);
    expect(rows.map((row) => row.action)).toEqual(['email_campaign_send', 'remote_config.publish', 'grant_reward']);

    const nextRows = mergeAuditRowsForList(rows, input, Date.parse('2033-05-01T00:00:00.000Z'), { id: 'structured-timestamp', timestampMs: 2000034000000 });
    expect(nextRows.map((row) => row.id)).toEqual(['legacy-ts']);
  });

  test('collects the next page through a per-stream cursor instead of rereading the first page', async () => {
    const rows = Array.from({ length: 250 }, (_, index) => {
      const sequence = String(250 - index).padStart(3, '0');
      const ts = new Date(Date.UTC(2033, 4, 18, 12, 0, 0) + (250 - index) * 60_000).toISOString();
      return { id: `ts-${sequence}`, ts, action: 'grant_reward' };
    });
    const firstPageInput = parseAuditListRequest({ limit: 100, sinceDays: 90 });
    const firstRaw = await collectAuditRawRows(fakeAuditDb(rows), firstPageInput, 101);
    expect(firstRaw.saturated).toBe(true);
    const firstPage = mergeAuditRowsForList(firstRaw.rows, firstPageInput, 0, null).slice(0, 100);
    expect(firstPage).toHaveLength(100);

    const last = firstPage[firstPage.length - 1];
    const secondPageInput = parseAuditListRequest({ limit: 100, sinceDays: 90, cursor: cursorFor(String(last.id), Number(last.timestampMs)) });
    const secondRaw = await collectAuditRawRows(fakeAuditDb(rows), secondPageInput, 101);
    const secondPage = mergeAuditRowsForList(secondRaw.rows, secondPageInput, 0, { id: String(last.id), timestampMs: Number(last.timestampMs) }).slice(0, 100);

    expect(secondPage).toHaveLength(100);
    expect(secondPage[0].id).not.toBe(firstPage[0].id);
    expect(new Set([...firstPage, ...secondPage].map((row) => row.id)).size).toBe(200);
  });

  test('keeps equal-timestamp rows from another timestamp schema after a cursor', async () => {
    const sameTimestamp = '2033-05-18T12:00:00.000Z';
    const input = parseAuditListRequest({ limit: 10, sinceDays: 90, cursor: cursorFor('ts-a', Date.parse(sameTimestamp)) });
    const raw = await collectAuditRawRows(fakeAuditDb([
      { id: 'ts-a', ts: sameTimestamp, action: 'grant_reward' },
      { id: 'zz-timestamp', timestamp: sameTimestamp, action: 'remote_config.publish' },
    ]), input, 10);
    const rows = mergeAuditRowsForList(raw.rows, input, 0, { id: 'ts-a', timestampMs: Date.parse(sameTimestamp) });

    expect(rows.map((row) => row.id)).toEqual(['zz-timestamp']);
  });

  test('audit source health reports partial timestamp-index failures instead of always ready', () => {
    expect(summarizeAuditSourceHealth({
      rows: [{ id: 'a1' }],
      scanned: 2,
      saturated: false,
      health: [
        { field: 'timestamp', state: 'ready', count: 1, error: '' },
        { field: 'ts', state: 'error', count: 0, error: 'missing index for ts' },
        { field: 'createdAt', state: 'empty', count: 0, error: '' },
      ],
    }, 1)).toEqual({
      source: 'admin_log',
      state: 'error',
      count: 1,
      scanned: 2,
      truncated: false,
      error: 'ts: missing index for ts',
    });
  });
});

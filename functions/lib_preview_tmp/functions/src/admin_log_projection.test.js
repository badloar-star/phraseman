"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_log_projection_1 = require("./admin_log_projection");
function fakeCollection(rows, failField = '') {
    const byId = new Map(rows.map((row) => [row.id, row]));
    class Query {
        constructor(field, limitCount) {
            this.field = field;
            this.limitCount = limitCount;
        }
        doc(id) {
            return { get: async () => ({ exists: byId.has(id), id, data: () => byId.get(id) }) };
        }
        where() { return this; }
        orderBy(field) {
            if (field === failField)
                throw new Error(`boom:${field}`);
            return new Query(field, this.limitCount);
        }
        startAfter() { return this; }
        limit(count) { return new Query(this.field, count); }
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
    return new Query();
}
describe('shared admin log projection helpers', () => {
    test('sanitizes nested operational data with bounded strings and no message body fields', () => {
        expect((0, admin_log_projection_1.publicObject)({
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
        const result = await (0, admin_log_projection_1.collectTimestampRows)(fakeCollection([
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
//# sourceMappingURL=admin_log_projection.test.js.map
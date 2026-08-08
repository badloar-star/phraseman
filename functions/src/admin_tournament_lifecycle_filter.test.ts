type DocData = Record<string, unknown>;

type FakeDoc = {
  readonly id: string;
  readonly data: () => DocData;
};

const tasks: Array<{ id: string; data: DocData }> = [];

function queryFor(filters: Array<readonly [string, unknown]> = [], cursor = '', limit = Number.MAX_SAFE_INTEGER) {
  return {
    where(field: string, operator: string, value: unknown) {
      if (operator !== '==') throw new Error(`Unexpected operator: ${operator}`);
      return queryFor([...filters, [field, value]], cursor, limit);
    },
    orderBy() {
      return queryFor(filters, cursor, limit);
    },
    limit(nextLimit: number) {
      return queryFor(filters, cursor, nextLimit);
    },
    startAfter(nextCursor: string) {
      return queryFor(filters, nextCursor, limit);
    },
    async get() {
      const docs: FakeDoc[] = tasks
        .filter((task) => task.id > cursor)
        .filter((task) => filters.every(([field, value]) => task.data[field] === value))
        .sort((left, right) => left.id.localeCompare(right.id))
        .slice(0, limit)
        .map((task) => ({ id: task.id, data: () => task.data }));
      return { docs, size: docs.length };
    },
  };
}

class FakeHttpsError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));

jest.mock('firebase-admin', () => {
  const firestore = () => ({ collection: () => queryFor() });
  (firestore as unknown as { FieldPath: { documentId: () => string } }).FieldPath = {
    documentId: () => '__name__',
  };
  return { firestore };
});

function adminRequest(data: DocData) {
  return { auth: { token: { admin: true, adminRole: 'owner' } }, data };
}

describe('admin tournament lifecycle list filter', () => {
  beforeEach(() => {
    jest.resetModules();
    tasks.splice(0, tasks.length,
      { id: 'approved-a', data: { lifecycle: 'awaiting_approval', verified: false } },
      { id: 'generated-b', data: { lifecycle: 'generated', verified: false } },
      { id: 'published-c', data: { lifecycle: 'published', verified: true } },
    );
  });

  it('returns only the requested lifecycle from the server query while retaining status filtering', async () => {
    const { adminListTournamentTasks } = require('./admin_tournament_tasks');

    const result = await adminListTournamentTasks(adminRequest({
      lifecycle: 'awaiting_approval',
      status: 'draft',
      limit: 1,
    }));

    expect(result.items.map((item: { taskId: string }) => item.taskId)).toEqual(['approved-a']);
    expect(result.nextCursor).toBe('approved-a');
  });

  it('accepts only the supported lifecycle value', () => {
    const { parseListRequest } = require('./admin_tournament_tasks');

    expect(parseListRequest({ lifecycle: 'awaiting_approval' }).lifecycle).toBe('awaiting_approval');
    expect(() => parseListRequest({ lifecycle: 'generated' })).toThrow('tournament_list_invalid');
  });
});

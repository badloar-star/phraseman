export {};

import fs from 'node:fs';
import path from 'node:path';

type Row = Record<string, unknown>;
type Ref = { id: string; path: string; get(): Promise<Snap> };
type Snap = { exists: boolean; data(): Row | undefined };

const mockDocs = new Map<string, Row>();
let mockAutoId = 0;

class MockHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

function mockSnap(reference: Ref): Snap {
  const data = mockDocs.get(reference.path);
  return { exists: data !== undefined, data: () => data };
}

function mockRef(pathValue: string): Ref {
  const reference = { id: pathValue.split('/').pop() || pathValue, path: pathValue } as Ref;
  reference.get = async () => mockSnap(reference);
  return reference;
}

const mockDb = {
  collection(name: string) {
    return { doc(id?: string) { return mockRef(`${name}/${id || `auto-${++mockAutoId}`}`); } };
  },
  async runTransaction<T>(work: (tx: {
    get(reference: Ref): Promise<Snap>;
    set(reference: Ref, data: Row): void;
  }) => Promise<T>): Promise<T> {
    const writes: Array<() => void> = [];
    const result = await work({
      get: async (reference) => mockSnap(reference),
      set: (reference, data) => writes.push(() => mockDocs.set(reference.path, { ...data })),
    });
    writes.forEach((write) => write());
    return result;
  },
};

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: MockHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));
jest.mock('firebase-admin', () => ({ firestore: () => mockDb }));
jest.mock('./callable_options', () => ({
  ADMIN_SENSITIVE_WRITE_OPTIONS: {},
  requireAdminAppCheck: jest.fn(),
}));
jest.mock('./admin/permissions', () => ({ hasPermission: () => true }));
jest.mock('./admin/roles', () => ({ hasAdminRole: () => true }));
jest.mock('./admin/audit_contract', () => ({ createAuditRecord: (input: Row) => input }));

const contract = require('./spire_config_contract') as {
  SPIRE_CONFIG_DEFAULTS: Row;
  spireBuildConfigDoc(input: Row): Row;
  spireConfigStatus(raw: unknown): { config: Row };
};
const callables = require('./admin_spire_config') as {
  adminSpireConfigGet(request: Row): Promise<Row>;
  adminSpireConfigSet(request: Row): Promise<Row>;
};

const adminRequest = (data: Row = {}): Row => ({
  auth: { uid: 'owner-1', token: { admin: true, adminRole: 'owner' } },
  data,
});

beforeEach(() => {
  mockDocs.clear();
  mockAutoId = 0;
});

test('floor record config is default-off and only an exact boolean true enables the remote lock', () => {
  expect(contract.SPIRE_CONFIG_DEFAULTS.floorRecordsEnabled).toBe(false);
  expect(contract.spireBuildConfigDoc({}).floorRecordsEnabled).toBe(false);
  expect(contract.spireBuildConfigDoc({ floorRecordsEnabled: 'true' }).floorRecordsEnabled).toBe(false);
  expect(contract.spireBuildConfigDoc({ floorRecordsEnabled: true }).floorRecordsEnabled).toBe(true);
  expect(contract.spireConfigStatus({ schemaVersion: 'spire-v1-config.v1', enabled: true }).config.floorRecordsEnabled).toBe(false);
});

test('admin config get/set round-trips the record lock and older callers preserve it when omitted', async () => {
  mockDocs.set('config/spire_v1', contract.spireBuildConfigDoc({ enabled: true, floorRecordsEnabled: true, rankBy: 'coins' }));

  const read = await callables.adminSpireConfigGet(adminRequest()) as { status: { config: Row } };
  expect(read.status.config.floorRecordsEnabled).toBe(true);

  const preserved = await callables.adminSpireConfigSet(adminRequest({ enabled: false, reason: 'turn peak off' })) as { status: { config: Row } };
  expect(preserved.status.config.floorRecordsEnabled).toBe(true);
  expect(mockDocs.get('config/spire_v1')?.floorRecordsEnabled).toBe(true);

  const disabled = await callables.adminSpireConfigSet(adminRequest({
    enabled: false, floorRecordsEnabled: false, reason: 'records rollout remains closed',
  })) as { status: { config: Row } };
  expect(disabled.status.config.floorRecordsEnabled).toBe(false);
  expect(mockDocs.get('config/spire_v1')?.floorRecordsEnabled).toBe(false);
  const audits = [...mockDocs.entries()].filter(([key]) => key.startsWith('admin_log/')).map(([, value]) => value);
  expect(audits.at(-1)).toMatchObject({
    before: expect.objectContaining({ floorRecordsEnabled: true }),
    after: expect.objectContaining({ floorRecordsEnabled: false }),
  });
});

test('the existing operator surface has a separate confirmed record switch with live feedback', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'admin', 'v2', 'legacy.html'), 'utf8');
  expect(html).toContain('id="spire-floor-records-toggle"');
  expect(html).toContain('id="spire-floor-records-status"');
  expect(html).toContain('window.toggleSpireFloorRecords = async function()');
  expect(html).toContain("floorRecordsEnabled: next");
  expect(html).toContain("floorRecordsEnabled: config.floorRecordsEnabled === true");
  expect(html).toContain("'records_enabled_from_admin_ui'");
  expect(html).toContain("'records_disabled_from_admin_ui'");
});

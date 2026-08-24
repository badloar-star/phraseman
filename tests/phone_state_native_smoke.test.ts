import fs from 'node:fs';
import path from 'node:path';

import * as Crypto from 'expo-crypto';

import {
  DEV_UTILITY_ROUTE_NAMES,
  DEV_UTILITY_ROUTE_PATHS,
} from '../constants/devRoutes';
import { openPhoneStateDatabase } from '../modules/phone-state/database';
import {
  preparePhoneStateNativeSmoke,
  resetPhoneStateNativeSmokeProcessGuardForTests,
  verifyPhoneStateNativeSmoke,
} from '../modules/phone-state/native_smoke';

jest.mock('../modules/phone-state/database', () => ({
  openPhoneStateDatabase: jest.fn(),
}));

const SCOPE = {
  stableUid: 'phone-state-native-smoke-v1',
  accountGeneration: 1,
};
const MARKER = 'native-smoke-marker-1234';
const CREATED_AT_MS = 1_777_777_777_777;
const SMOKE_TABLE = 'phone_state_native_smoke_v1';
const NATIVE_SECRET_MESSAGE =
  'native failure key=deadbeef path=/data/user/0/app.phraseman/databases/private.db';

type SmokeQueryRow = Record<string, unknown>;
type MockDatabase = {
  execAsync: jest.Mock<Promise<void>, [string]>;
  runAsync: jest.Mock<Promise<unknown>, [string, ...unknown[]]>;
  getFirstAsync: jest.Mock<Promise<SmokeQueryRow | null>, [string, ...unknown[]]>;
  closeAsync: jest.Mock<Promise<void>, []>;
};

function makeDatabase(events: string[] = []): MockDatabase {
  return {
    execAsync: jest.fn(async (_sql: string) => { events.push('create'); }),
    runAsync: jest.fn(async (_sql: string, ..._params: unknown[]) => {
      events.push('insert');
      return {};
    }),
    getFirstAsync: jest.fn(async (sql: string, ..._params: unknown[]) => {
      if (sql.includes('sqlite_master')) {
        events.push('schema');
        return { name: SMOKE_TABLE };
      }
      events.push('select');
      return { marker: MARKER, created_at_ms: CREATED_AT_MS };
    }),
    closeAsync: jest.fn(async () => { events.push('close'); }),
  };
}

async function expectSanitizedStageFailure(
  operation: Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  const caught = await operation.then(
    () => null,
    (error: unknown) => error,
  );

  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toBe(expectedCode);
  expect((caught as Error & { cause?: unknown }).cause).toBeUndefined();
  expect(String(caught)).not.toContain('deadbeef');
  expect(String(caught)).not.toContain('/data/user/0');
  expect(String(caught)).not.toContain('private.db');
}

beforeEach(() => {
  jest.restoreAllMocks();
  resetPhoneStateNativeSmokeProcessGuardForTests();
  (openPhoneStateDatabase as jest.Mock).mockReset();
  (Crypto.randomUUID as jest.Mock).mockReset().mockReturnValue(MARKER);
  jest.spyOn(Date, 'now').mockReturnValue(CREATED_AT_MS);
});

describe('native SQLCipher smoke lifecycle', () => {
  test('prepare uses the fixed isolated scope, parameterized marker write, and closes in order', async () => {
    const events: string[] = [];
    const db = makeDatabase(events);
    (openPhoneStateDatabase as jest.Mock).mockImplementationOnce(async (scope) => {
      events.push('open');
      expect(scope).toEqual(SCOPE);
      return db;
    });

    const result = await preparePhoneStateNativeSmoke();

    expect(events).toEqual(['open', 'create', 'insert', 'close']);
    expect(db.execAsync).toHaveBeenCalledWith(expect.stringMatching(
      /CREATE TABLE IF NOT EXISTS phone_state_native_smoke_v1[\s\S]*CHECK\s*\(id\s*=\s*1\)/,
    ));
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT OR REPLACE INTO phone_state_native_smoke_v1[\s\S]*VALUES\s*\(\?,\s*\?,\s*\?\)/),
      1,
      MARKER,
      CREATED_AT_MS,
    );
    expect(db.runAsync.mock.calls[0][0]).not.toContain(MARKER);
    expect(result).toEqual({ status: 'prepared', marker: MARKER, createdAtMs: CREATED_AT_MS });
  });

  test('verify reopens the same scope, selects the singleton row, closes, and returns it', async () => {
    const events: string[] = [];
    const db = makeDatabase(events);
    (openPhoneStateDatabase as jest.Mock).mockImplementationOnce(async (scope) => {
      events.push('open');
      expect(scope).toEqual(SCOPE);
      return db;
    });

    const result = await verifyPhoneStateNativeSmoke();

    expect(events).toEqual(['open', 'schema', 'select', 'close']);
    expect(db.getFirstAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/SELECT name FROM sqlite_master WHERE type = \? AND name = \?/),
      'table',
      SMOKE_TABLE,
    );
    expect(db.getFirstAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/SELECT marker, created_at_ms[\s\S]*FROM phone_state_native_smoke_v1[\s\S]*WHERE id = \?/),
      1,
    );
    expect(result).toEqual({ status: 'verified', marker: MARKER, createdAtMs: CREATED_AT_MS });
  });

  test.each([
    null,
    { marker: '', created_at_ms: CREATED_AT_MS },
    { marker: '   ', created_at_ms: CREATED_AT_MS },
    { marker: MARKER, created_at_ms: '1777777777777' },
    { marker: MARKER, created_at_ms: Number.NaN },
    { marker: MARKER, created_at_ms: 1.5 },
    { marker: MARKER, created_at_ms: Number.MAX_SAFE_INTEGER + 1 },
    { marker: MARKER, created_at_ms: 8_700_000_000_000_000 },
  ])('verify rejects a missing or malformed persisted marker and still closes: %p', async (row) => {
    const db = makeDatabase();
    db.getFirstAsync
      .mockResolvedValueOnce({ name: SMOKE_TABLE })
      .mockResolvedValueOnce(row);
    (openPhoneStateDatabase as jest.Mock).mockResolvedValueOnce(db);

    await expect(verifyPhoneStateNativeSmoke())
      .rejects.toThrow('phone_state_native_smoke_marker_missing');
    expect(db.closeAsync).toHaveBeenCalledTimes(1);
  });

  test('verify rejects an absent smoke table before reading a marker and still closes', async () => {
    const db = makeDatabase();
    db.getFirstAsync.mockResolvedValueOnce(null);
    (openPhoneStateDatabase as jest.Mock).mockResolvedValueOnce(db);

    await expect(verifyPhoneStateNativeSmoke())
      .rejects.toThrow('phone_state_native_smoke_marker_missing');
    expect(db.getFirstAsync).toHaveBeenCalledTimes(1);
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringMatching(/SELECT name FROM sqlite_master WHERE type = \? AND name = \?/),
      'table',
      SMOKE_TABLE,
    );
    expect(db.execAsync).not.toHaveBeenCalled();
    expect(db.closeAsync).toHaveBeenCalledTimes(1);
  });

  test('verify in the preparing process requires a restart before opening again', async () => {
    const db = makeDatabase();
    (openPhoneStateDatabase as jest.Mock).mockResolvedValueOnce(db);

    await preparePhoneStateNativeSmoke();

    await expect(verifyPhoneStateNativeSmoke())
      .rejects.toThrow('phone_state_native_smoke_restart_required');
    expect(openPhoneStateDatabase).toHaveBeenCalledTimes(1);
    expect(db.getFirstAsync).not.toHaveBeenCalled();
    expect(db.closeAsync).toHaveBeenCalledTimes(1);
  });

  test('a failed prepare operation does not arm the restart guard', async () => {
    const original = new Error(NATIVE_SECRET_MESSAGE);
    const prepareDb = makeDatabase();
    prepareDb.execAsync.mockRejectedValueOnce(original);
    const verifyDb = makeDatabase();
    (openPhoneStateDatabase as jest.Mock)
      .mockResolvedValueOnce(prepareDb)
      .mockResolvedValueOnce(verifyDb);

    await expectSanitizedStageFailure(
      preparePhoneStateNativeSmoke(),
      'phone_state_native_smoke_schema_failed',
    );
    await expect(verifyPhoneStateNativeSmoke()).resolves.toEqual({
      status: 'verified',
      marker: MARKER,
      createdAtMs: CREATED_AT_MS,
    });
    expect(openPhoneStateDatabase).toHaveBeenCalledTimes(2);
  });

  test('a prepare close failure does not arm the restart guard', async () => {
    const closeFailure = new Error(NATIVE_SECRET_MESSAGE);
    const prepareDb = makeDatabase();
    prepareDb.closeAsync.mockRejectedValueOnce(closeFailure);
    const verifyDb = makeDatabase();
    (openPhoneStateDatabase as jest.Mock)
      .mockResolvedValueOnce(prepareDb)
      .mockResolvedValueOnce(verifyDb);

    await expectSanitizedStageFailure(
      preparePhoneStateNativeSmoke(),
      'phone_state_native_smoke_close_failed',
    );
    await expect(verifyPhoneStateNativeSmoke()).resolves.toEqual({
      status: 'verified',
      marker: MARKER,
      createdAtMs: CREATED_AT_MS,
    });
    expect(openPhoneStateDatabase).toHaveBeenCalledTimes(2);
  });

  test.each([
    ['create', 'phone_state_native_smoke_schema_failed'],
    ['insert', 'phone_state_native_smoke_marker_write_failed'],
    ['schema', 'phone_state_native_smoke_schema_failed'],
    ['select', 'phone_state_native_smoke_marker_read_failed'],
  ] as const)(
    '%s failure closes once and returns only its stable stage code',
    async (failurePoint, expectedCode) => {
      const original = new Error(NATIVE_SECRET_MESSAGE);
      const db = makeDatabase();
      if (failurePoint === 'create') db.execAsync.mockRejectedValueOnce(original);
      if (failurePoint === 'insert') db.runAsync.mockRejectedValueOnce(original);
      if (failurePoint === 'schema') db.getFirstAsync.mockRejectedValueOnce(original);
      if (failurePoint === 'select') {
        db.getFirstAsync
          .mockResolvedValueOnce({ name: SMOKE_TABLE })
          .mockRejectedValueOnce(original);
      }
      (openPhoneStateDatabase as jest.Mock).mockResolvedValueOnce(db);

      const operation = failurePoint === 'schema' || failurePoint === 'select'
        ? verifyPhoneStateNativeSmoke()
        : preparePhoneStateNativeSmoke();
      await expectSanitizedStageFailure(operation, expectedCode);
      expect(db.closeAsync).toHaveBeenCalledTimes(1);
    },
  );

  test('credential or database open failure returns only its stable stage code', async () => {
    (openPhoneStateDatabase as jest.Mock).mockRejectedValueOnce(
      new Error(NATIVE_SECRET_MESSAGE),
    );

    await expectSanitizedStageFailure(
      preparePhoneStateNativeSmoke(),
      'phone_state_native_smoke_open_failed',
    );
    expect(openPhoneStateDatabase).toHaveBeenCalledTimes(1);
  });

  test.each(['prepare', 'verify'] as const)(
    '%s preserves the mapped operation stage when close also fails',
    async (operationName) => {
      const original = new Error(NATIVE_SECRET_MESSAGE);
      const db = makeDatabase();
      if (operationName === 'prepare') db.execAsync.mockRejectedValueOnce(original);
      else db.getFirstAsync.mockRejectedValueOnce(original);
      db.closeAsync.mockRejectedValueOnce(new Error('secondary close path=/data/user/0'));
      (openPhoneStateDatabase as jest.Mock).mockResolvedValueOnce(db);

      const operation = operationName === 'prepare'
        ? preparePhoneStateNativeSmoke()
        : verifyPhoneStateNativeSmoke();
      await expectSanitizedStageFailure(
        operation,
        'phone_state_native_smoke_schema_failed',
      );
      expect(db.closeAsync).toHaveBeenCalledTimes(1);
    },
  );

  test.each(['prepare', 'verify'] as const)(
    '%s returns only the stable close code after otherwise successful work',
    async (operationName) => {
      const closeFailure = new Error(NATIVE_SECRET_MESSAGE);
      const db = makeDatabase();
      db.closeAsync.mockRejectedValueOnce(closeFailure);
      (openPhoneStateDatabase as jest.Mock).mockResolvedValueOnce(db);

      const operation = operationName === 'prepare'
        ? preparePhoneStateNativeSmoke()
        : verifyPhoneStateNativeSmoke();
      await expectSanitizedStageFailure(
        operation,
        'phone_state_native_smoke_close_failed',
      );
      expect(db.closeAsync).toHaveBeenCalledTimes(1);
    },
  );

  test.each([
    ['open', 'phone_state_native_unavailable'],
    ['schema', 'phone_state_sqlcipher_unavailable'],
    ['close', 'phone_state_cipher_integrity_failed'],
  ] as const)('preserves an existing stable %s phone-state error exactly', async (stage, code) => {
    const stable = new Error(code);
    const db = makeDatabase();
    if (stage === 'open') {
      (openPhoneStateDatabase as jest.Mock).mockRejectedValueOnce(stable);
    } else {
      if (stage === 'schema') db.execAsync.mockRejectedValueOnce(stable);
      else db.closeAsync.mockRejectedValueOnce(stable);
      (openPhoneStateDatabase as jest.Mock).mockResolvedValueOnce(db);
    }

    await expect(preparePhoneStateNativeSmoke()).rejects.toBe(stable);
  });

  test('remaps a hostile token-shaped phone-state message instead of trusting its prefix', async () => {
    (openPhoneStateDatabase as jest.Mock).mockRejectedValueOnce(
      new Error('phone_state_key_deadbeef'),
    );

    await expectSanitizedStageFailure(
      preparePhoneStateNativeSmoke(),
      'phone_state_native_smoke_open_failed',
    );
  });

  test('does not log credentials or touch network/storage adapters', async () => {
    const db = makeDatabase();
    (openPhoneStateDatabase as jest.Mock).mockResolvedValueOnce(db);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await preparePhoneStateNativeSmoke();

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe('hidden native smoke screen contract', () => {
  test('registers the hidden screen as a dev utility route for native deep links', () => {
    expect(DEV_UTILITY_ROUTE_NAMES).toContain('_phone_state_sqlcipher_smoke');
    expect(DEV_UTILITY_ROUTE_PATHS).toContain('/_phone_state_sqlcipher_smoke');
  });

  test('keeps the route gated, sanitized, accessible, and automation-addressable', () => {
    const screenPath = path.join(process.cwd(), 'app', '_phone_state_sqlcipher_smoke.tsx');
    const source = fs.readFileSync(screenPath, 'utf8');

    expect(source).not.toContain('EXPO_PUBLIC_TESTFLIGHT_DEV_TOOLS');
    expect(source).toContain("import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';");
    expect(source).toMatch(/DEV_TOOLS_ENABLED\s*=\s*ENABLE_DEV_TOOLS\s*&&\s*!IS_STORE_RELEASE/);
    expect(source).toContain('<Redirect href="/" />');
    expect(source).not.toContain('phone-state-smoke-locked');
    expect(source).not.toContain('phone_state_native_smoke_locked');
    expect(source).not.toContain('SQLCipher smoke unavailable');
    expect(source).toContain('useLocalSearchParams<{ mode?: string }>()');
    expect(source).toContain('autoRunStartedRef');
    expect(source).toContain("mode === 'prepare'");
    expect(source).toContain("mode === 'verify'");
    expect(source).toContain('PressableHybrid');
    expect(source).toContain('ScreenGradient');
    expect(source).toContain('SafeAreaView');
    expect(source).toContain('accessibilityLabel=');
    expect(source).toContain('accessibilityHint=');
    expect(source).toContain('minHeight: 44');
    expect(source).toContain('phone-state-smoke-prepare');
    expect(source).toContain('phone-state-smoke-verify');
    expect(source).toContain('phone-state-smoke-status-prepared');
    expect(source).toContain('phone-state-smoke-status-verified');
    expect(source).toContain('phone-state-smoke-status-failed');
    expect(source).toContain('phone_state_native_smoke_restart_required');
    expect(source).toContain('phone_state_scope_invalid');
    expect(source).toContain('phone_state_native_smoke_open_failed');
    expect(source).toContain('phone_state_native_smoke_schema_failed');
    expect(source).toContain('phone_state_native_smoke_marker_write_failed');
    expect(source).toContain('phone_state_native_smoke_marker_read_failed');
    expect(source).toContain('phone_state_native_smoke_close_failed');
    expect(source).toContain('phraseman://_phone_state_sqlcipher_smoke?mode=prepare');
    expect(source).toContain('phraseman://_phone_state_sqlcipher_smoke?mode=verify');
    expect(source).toContain('phone-state-smoke-link-prepare');
    expect(source).toContain('phone-state-smoke-link-verify');
    expect(source).toMatch(/selectable/);
    expect(source).toMatch(/Android[\s\S]*adb[\s\S]*force-stop/i);
    expect(source).toMatch(/iOS[\s\S]*(?:tap|open)[\s\S]*terminat/i);
    expect(source).toContain('t.correctText');
    expect(source).not.toMatch(/console\.(?:log|warn|error)/);
    expect(source).not.toMatch(/AsyncStorage|fetch\(|axios|secureKey|databaseName|error\.stack/);
    expect(source).not.toMatch(/detail:\s*(?:error|candidate)|String\(error\)|JSON\.stringify\(error\)/);
    expect(source).not.toMatch(/marker\.slice|result\.marker|marker\}/);
  });
});

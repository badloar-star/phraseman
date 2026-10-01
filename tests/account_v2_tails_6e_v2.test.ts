import fs from 'fs';
import path from 'path';
import type { AccountsV2SecureStorePort } from '../modules/account-session-v2/account_deletion_credential';
import {
  ACCOUNTS_V2_DETACH_LATCH_KEY,
  ACCOUNTS_V2_TERMINAL_ERASE_KEY,
  createAccountDetachLatch,
} from '../modules/account-session-v2/account_detach_latch';
import type { ScopeStorageAdapter } from '../modules/account-session-v2/account_scope_store';
import {
  createAccountsV2ClientController,
  type AccountsV2ClientPorts,
} from '../modules/account-session-v2/account_v2_client_session';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';
import { signInEmulatorTestAccount } from '../app/firebase_emulator_dev_login';
import { createAccountSqliteLeaseBinding } from '../modules/account-session-v2/native/account_sqlite_lease_binding';

/*
 * Account V2, Пакет 6E: SecureStore вне бэкапа, восстановленное устройство
 * (latch_read_failed), хвосты 6D (атомарная защёлка, бесхозные области, потолок
 * терминальных стираний) и dev-вход по почте ТОЛЬКО в режиме эмулятора.
 */

const ROOT = path.resolve(__dirname, '..');
const A = 'uid-a';
const B = 'uid-b';
const C = 'uid-c';
const DAY = 24 * 60 * 60 * 1000;

type Secure = AccountsV2SecureStorePort & { map: Map<string, string>; sets: string[]; unreadable: Set<string>; broken: boolean };

function secureStore(): Secure {
  const map = new Map<string, string>();
  const self: Secure = {
    map,
    sets: [],
    unreadable: new Set(),
    broken: false,
    getItemAsync: async (key: string) => {
      if (self.broken || self.unreadable.has(key)) throw new Error('keystore_key_missing');
      return map.get(key) ?? null;
    },
    setItemAsync: async (key: string, value: string) => {
      if (self.broken) throw new Error('keystore_unavailable');
      self.sets.push(key);
      self.unreadable.delete(key);
      map.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      if (self.broken) throw new Error('keystore_unavailable');
      self.unreadable.delete(key);
      map.delete(key);
    },
  };
  return self;
}

async function settle(): Promise<void> {
  for (let index = 0; index < 60; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

class Adapter extends MemoryScopeStorageAdapter {
  constructor(private readonly events: string[], private readonly pending: readonly string[], private readonly failCode: string | null, private readonly orphans = 0) { super(); }

  async discoverPendingEraseUids(): Promise<readonly string[]> {
    this.events.push('discover');
    return this.pending;
  }

  lastDiscoveryUnattributed(): number { return this.orphans; }

  override async eraseClosedAccountScope(
    scope: Parameters<ScopeStorageAdapter['eraseClosedAccountScope']>[0],
  ): ReturnType<ScopeStorageAdapter['eraseClosedAccountScope']> {
    this.events.push(`erase:${scope.uid}`);
    if (this.failCode !== null) throw Object.assign(new Error(this.failCode), { code: this.failCode });
    return super.eraseClosedAccountScope(scope);
  }
}

function launch(adapter: ScopeStorageAdapter, secure: Secure, events: string[], authUid: string, clock = { now: 1_000 }) {
  const latch = createAccountDetachLatch(secure);
  const ports = {
    isEnabled: () => true,
    createStorageAdapter: () => adapter,
    latch: { ...latch, reset: async () => { events.push('reset'); return latch.reset(); } },
    callSync: jest.fn(async () => { throw Object.assign(new Error('x'), { code: 'unauthenticated', details: { final: false } }); }),
    currentAuthUid: () => authUid as string | null,
    newNonce: () => 'nonce',
    setTimer: () => 1,
    clearTimer: () => undefined,
    nowMs: () => clock.now,
    random: () => 0,
  } satisfies AccountsV2ClientPorts;
  return createAccountsV2ClientController(ports);
}

describe('account v2 tails 6E', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  const lines = () => [...log.mock.calls, ...warn.mock.calls].map((args) => args.join(' '));
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });

  describe('(1) Android backup: SecureStore.xml excluded', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const plugin = require('../plugins/withAndroidBackupRules.js') as { BACKUP_RULES_XML: string; DATA_EXTRACTION_RULES_XML: string };
    const section = (xml: string, tag: string) => {
      const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
      expect(match).not.toBeNull();
      return match![1];
    };
    test.each([
      ['full-backup-content', () => section(plugin.BACKUP_RULES_XML, 'full-backup-content')],
      ['cloud-backup', () => section(plugin.DATA_EXTRACTION_RULES_XML, 'cloud-backup')],
      ['device-transfer', () => section(plugin.DATA_EXTRACTION_RULES_XML, 'device-transfer')],
    ])('%s excludes sharedpref/SecureStore.xml and never includes the V2 database files', (_name, read) => {
      const body = read();
      expect(body).toMatch(/<exclude domain="sharedpref" path="SecureStore\.xml"\s*\/>/);
      expect(body).not.toMatch(/domain="file"/);
      expect(body).not.toMatch(/SQLite|accounts-v2/);
    });
    test('the plugin writes exactly these constants', () => {
      const source = fs.readFileSync(path.join(ROOT, 'plugins', 'withAndroidBackupRules.js'), 'utf8');
      expect(source).toContain("'backup_rules.xml'), BACKUP_RULES_XML");
      expect(source).toContain("'data_extraction_rules.xml'), DATA_EXTRACTION_RULES_XML");
    });
  });

  describe('(1) restored device: latch entry unreadable (Keystore key did not move)', () => {
    test('store healthy (probe ok) → treated as corrupt: discovery, reset, the NEXT launch opens V2', async () => {
      const events: string[] = [];
      const secure = secureStore();
      secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, 'ciphertext-from-old-phone');
      secure.unreadable.add(ACCOUNTS_V2_DETACH_LATCH_KEY);
      const adapter = new Adapter(events, [], null);
      const first = launch(adapter, secure, events, A);
      await first.setAuthUid(A);
      await settle();
      expect(events).toEqual(['discover', 'reset']);
      expect(lines()).toContain('[ACCOUNT-V2] latch read_failed_treated_as_corrupt');
      expect(secure.map.has(ACCOUNTS_V2_DETACH_LATCH_KEY)).toBe(false);
      const second = launch(adapter, secure, events, A);
      await second.setAuthUid(A);
      await settle();
      expect(second.status().uid).toBe(A);
    });

    test('whole store broken (probe fails) → stays fail-closed, nothing reset', async () => {
      const events: string[] = [];
      const secure = secureStore();
      secure.broken = true;
      const controller = launch(new Adapter(events, [], null), secure, events, A);
      await controller.setAuthUid(A);
      await settle();
      expect(events).toEqual([]);
      expect(controller.status().uid).toBeNull();
      expect(lines()).toContain('[ACCOUNT-V2] latch store_unhealthy stays_fail_closed');
    });
  });

  describe('(2) 6D tails', () => {
    test('corrupt latch with failed erases is rewritten in ONE write (replace), not a mark loop', async () => {
      const events: string[] = [];
      const secure = secureStore();
      secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{broken');
      const controller = launch(new Adapter(events, [B, C], 'io_failed'), secure, events, A);
      await controller.setAuthUid(A);
      await settle();
      expect(secure.sets.filter((key) => key === ACCOUNTS_V2_DETACH_LATCH_KEY)).toHaveLength(1);
      expect(JSON.parse(secure.map.get(ACCOUNTS_V2_DETACH_LATCH_KEY)!)).toEqual({ v: 1, uids: [B, C] });
      expect(lines().some((line) => line.includes('latch corrupt_rewritten failed=2 ok=true atomic=true'))).toBe(true);
    });

    test('reset after recovery logs areas no uid could be attributed to (orphans)', async () => {
      const events: string[] = [];
      const secure = secureStore();
      secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, '{broken');
      const controller = launch(new Adapter(events, [], null, 2), secure, events, A);
      await controller.setAuthUid(A);
      await settle();
      expect(events).toEqual(['discover', 'reset']);
      expect(lines()).toContain('[ACCOUNT-V2] latch reset_with_orphans unattributed=2');
    });

    test('terminal erase code: after 3 attempts the uid is retried at most once a day', async () => {
      const events: string[] = [];
      const secure = secureStore();
      secure.map.set(ACCOUNTS_V2_DETACH_LATCH_KEY, JSON.stringify({ v: 1, uids: [B] }));
      const adapter = new Adapter(events, [], 'account_native_scope_erase_marker_manifest_mismatch');
      const clock = { now: 10_000 };
      for (let run = 0; run < 5; run += 1) {
        const controller = launch(adapter, secure, events, A, clock);
        await controller.setAuthUid(A);
        await settle();
        expect(controller.status().uid).toBe(A);
        clock.now += 60_000;
      }
      expect(events.filter((event) => event === `erase:${B}`)).toHaveLength(3);
      expect(JSON.parse(secure.map.get(ACCOUNTS_V2_TERMINAL_ERASE_KEY)!).entries[B].count).toBe(3);
      expect(lines().filter((line) => line.includes('erase terminal_capped count=1'))).toHaveLength(2);
      clock.now += DAY;
      const later = launch(adapter, secure, events, A, clock);
      await later.setAuthUid(A);
      await settle();
      expect(events.filter((event) => event === `erase:${B}`)).toHaveLength(4);
      expect(JSON.parse(secure.map.get(ACCOUNTS_V2_DETACH_LATCH_KEY)!)).toEqual({ v: 1, uids: [B] });
    });

    test('a successful erase clears the terminal record together with the latch', async () => {
      const secure = secureStore();
      const latch = createAccountDetachLatch(secure);
      await latch.mark(B);
      await latch.noteTerminal!(B, 5);
      expect(secure.map.has(ACCOUNTS_V2_TERMINAL_ERASE_KEY)).toBe(true);
      await latch.clear(B);
      expect(secure.map.has(ACCOUNTS_V2_TERMINAL_ERASE_KEY)).toBe(false);
      expect(secure.map.has(ACCOUNTS_V2_DETACH_LATCH_KEY)).toBe(false);
    });

    test('seed guard (node:test) is wired into an npm script', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
      expect(pkg.scripts['test:accounts-v2-seed-guard']).toBe('node --test tests/accounts_v2_emulator_seed_guard.test.mjs');
    });
  });

  describe('(4) found on the phone E2E: Android native close resolves null', () => {
    // зачем: Kotlin AsyncFunction, возвращающая Unit, отдаёт в JS `null`, а не `undefined`.
    // Привязка считала это «неожиданным результатом» → каждое закрытие области на Android
    // падало → смена аккаунта: close_failed + account_scope_busy (лог эмулятора 6E).
    function nativeDb(closeResult: unknown) {
      let closes = 0;
      return {
        get closes() { return closes; },
        db: {
          revokeAccountLeaseSync: () => undefined,
          commitAccountLeaseAsync: async () => 'committed',
          closeAccountLeaseAsync: async () => { closes += 1; return closeResult; },
        },
      };
    }
    test('null from native close = closed (Android Unit)', async () => {
      const native = nativeDb(null);
      const binding = createAccountSqliteLeaseBinding(native.db);
      binding.revoke();
      await expect(binding.close()).resolves.toBeUndefined();
      await expect(binding.close()).resolves.toBeUndefined();
      expect(native.closes).toBe(1);
    });
    test('any other value from native close still fails closed', async () => {
      for (const value of [0, '', 'closed', false, {}]) {
        const binding = createAccountSqliteLeaseBinding(nativeDb(value).db);
        binding.revoke();
        await expect(binding.close()).rejects.toMatchObject({ code: 'account_native_sqlite_close_failed' });
      }
    });
  });

  describe('(3) dev email sign-in only in emulator dev mode', () => {
    const email = 'accounts-v2-e2e-a@phraseman.test';

    test.each([
      ['release with env', false, '10.0.2.2'],
      ['dev without env', true, undefined],
      ['dev with a public host', true, 'identitytoolkit.googleapis.com'],
    ])('%s: unreachable, Auth never loaded', async (_label, isDev, host) => {
      const auth = jest.fn();
      await expect(signInEmulatorTestAccount(isDev, host, email, 'pw', auth)).resolves.toEqual({ ok: false, reason: 'unavailable' });
      expect(auth).not.toHaveBeenCalled();
    });

    test('only local test accounts (@phraseman.test) are accepted', async () => {
      const auth = jest.fn();
      for (const other of ['badloar@gmail.com', 'someone@phraseman.test', 'accounts-v2-e2e-a@phraseman.test.evil.com']) {
        await expect(signInEmulatorTestAccount(true, '10.0.2.2', other, 'pw', auth)).resolves.toEqual({ ok: false, reason: 'not_test_account' });
      }
      expect(auth).not.toHaveBeenCalled();
    });

    test('emulator dev mode + test account → signInWithEmailAndPassword; nothing secret in logs', async () => {
      const signIn = jest.fn(async () => ({ user: { uid: 'x' } }));
      await expect(signInEmulatorTestAccount(true, '10.0.2.2', email, 'secret-pw-123', () => ({ signInWithEmailAndPassword: signIn })))
        .resolves.toEqual({ ok: true });
      expect(signIn).toHaveBeenCalledWith(email, 'secret-pw-123');
      for (const line of lines()) {
        expect(line).not.toContain('secret-pw-123');
        expect(line).not.toContain(email);
      }
    });

    test('route: login module is required ONLY inside the __DEV__ && emulator-host branch', () => {
      const source = fs.readFileSync(path.join(ROOT, 'app', 'dev-emulator-login.tsx'), 'utf8');
      const guard = source.indexOf('if (__DEV__ && process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST) {');
      expect(guard).toBeGreaterThan(0);
      expect(source.indexOf("require('./firebase_emulator_dev_login')")).toBeGreaterThan(guard);
      expect(source).not.toMatch(/import .*firebase_emulator_dev_login/);
      expect(source).not.toMatch(/@phraseman\.test|password=\w/);
    });
  });
});

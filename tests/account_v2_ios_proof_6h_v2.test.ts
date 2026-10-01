import fs from 'fs';
import path from 'path';
import type { SessionFence } from '../modules/account-session-v2/account_session';
import { createAccountScopeStore } from '../modules/account-session-v2/account_scope_store';
import { createAccountNativeScopeAdapter } from '../modules/account-session-v2/native/account_native_scope_adapter';
import {
  IOS_PROOF_CANARY_KEY,
  runIosAccountProofPhase,
  simulateProcessRestartForTests,
  type IosProofPorts,
} from '../runtime-probes/ios-account-sqlcipher/probe';
import { FakeDevice, ROOT } from './support/account_native_fake_device';

/*
 * Account V2, Пакет 6H (OD17) — подготовка доказательства на iPhone.
 *
 * Проверяем без телефона то, что можно проверить без телефона:
 *  - iOS-окружение открывается ТОЛЬКО в сборке пробы (EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF=1),
 *    и только если нативная блокировка умеет защищать семейство файлов;
 *  - адаптер зовёт защиту семейства до открытия и после доказательства ключа,
 *    провал защиты = база не открывается, ключ/линия не публикуются;
 *  - Android-блокировка (без protectFamily) — поведение прежнее;
 *  - логика пробы (write → «убийство» → verify → erase) на фейковом устройстве;
 *  - экран и модули пробы исключены из бандла без флага; EAS-профиль изолирован.
 * Сама нативная часть (Swift, Keychain, file protection) доказывается ТОЛЬКО квитанцией с iPhone.
 */

const A = 'uid-ios-a';
const scopeA = Object.freeze({ kind: 'account' as const, uid: A, scopeKey: `account:${A}` as const });

function fence(generation: number): SessionFence {
  return Object.freeze({ scopeKey: scopeA.scopeKey, uid: A, generation, nonce: `n-${generation}` });
}

function lines(spy: jest.SpyInstance): string[] {
  return spy.mock.calls.map((args) => args.join(' '));
}

describe('Account V2 Пакет 6H — iOS proof preparation', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    log.mockRestore();
    warn.mockRestore();
    delete process.env.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF;
    jest.resetModules();
    jest.dontMock('react-native');
    jest.dontMock('expo-sqlite');
    jest.dontMock('expo-modules-core');
    jest.dontMock('expo-secure-store');
    jest.dontMock('expo-file-system');
    jest.dontMock('expo-crypto');
  });

  describe('expo environment gate', () => {
    type NativeLock = { releaseAsync: jest.Mock; protectAccountDatabaseFamilyAsync?: jest.Mock };

    function loadEnvironment(os: 'ios' | 'android', lock: NativeLock) {
      jest.resetModules();
      jest.doMock('react-native', () => ({ Platform: { OS: os } }));
      jest.doMock('expo-sqlite', () => ({ defaultDatabaseDirectory: '/docs/SQLite', openDatabaseAsync: jest.fn() }));
      jest.doMock('expo-modules-core', () => ({
        requireNativeModule: () => ({ acquireAccountProvisionLockAsync: jest.fn(async () => lock) }),
      }));
      jest.doMock('expo-secure-store', () => ({
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when_unlocked_this_device_only',
        getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
      }));
      jest.doMock('expo-file-system', () => ({ File: jest.fn(), Directory: jest.fn() }));
      jest.doMock('expo-crypto', () => ({
        CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, CryptoEncoding: { HEX: 'hex' },
        digestStringAsync: jest.fn(), getRandomBytesAsync: jest.fn(),
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('../modules/account-session-v2/native/account_native_expo_environment') as
        typeof import('../modules/account-session-v2/native/account_native_expo_environment')).createExpoAccountNativeEnvironment();
    }

    test('iOS without the proof flag stays closed (null + platform_unproven)', () => {
      const env = loadEnvironment('ios', { releaseAsync: jest.fn(), protectAccountDatabaseFamilyAsync: jest.fn() });
      expect(env).toBeNull();
      expect(lines(warn).some((line) => line.includes('[ACCOUNT-V2] storage platform_unproven os=ios'))).toBe(true);
    });

    test('iOS proof build: lock exposes protectFamily bound to the native lock object', async () => {
      process.env.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF = '1';
      const lock: NativeLock = { releaseAsync: jest.fn(async () => undefined), protectAccountDatabaseFamilyAsync: jest.fn() };
      const seenThis: unknown[] = [];
      lock.protectAccountDatabaseFamilyAsync!.mockImplementation(async function (this: unknown) { seenThis.push(this); });
      const env = loadEnvironment('ios', lock);
      expect(env).not.toBeNull();
      const acquired = await env!.acquireProvisionLock('accounts-v2-a-' + 'a'.repeat(64) + '-1.db');
      expect(typeof acquired.protectFamily).toBe('function');
      await acquired.protectFamily!();
      expect(seenThis).toEqual([lock]);
      await acquired.release();
      expect(lock.releaseAsync).toHaveBeenCalledTimes(1);
      expect(lines(log).some((line) => line.includes('storage platform_ios_proof_build'))).toBe(true);
    });

    test('iOS proof build without the Swift protection method: acquire fails and the lock is released', async () => {
      process.env.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF = '1';
      const lock: NativeLock = { releaseAsync: jest.fn(async () => undefined) };
      const env = loadEnvironment('ios', lock);
      await expect(env!.acquireProvisionLock('x.db')).rejects.toThrow('account_native_provision_family_protection_unavailable');
      expect(lock.releaseAsync).toHaveBeenCalledTimes(1);
      expect(lines(warn).some((line) => line.includes('storage ios_family_protection_missing'))).toBe(true);
    });

    test('Android is unchanged: no protectFamily even when the native lock has one, flag irrelevant', async () => {
      process.env.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF = '1';
      const lock: NativeLock = { releaseAsync: jest.fn(async () => undefined), protectAccountDatabaseFamilyAsync: jest.fn() };
      const env = loadEnvironment('android', lock);
      const acquired = await env!.acquireProvisionLock('x.db');
      expect(acquired.protectFamily).toBeUndefined();
    });
  });

  describe('scope adapter: family protection under the lease', () => {
    test('iOS lock: protect before open (no DB yet) and after the key proof (DB present); data reopens', async () => {
      const device = new FakeDevice();
      device.iosProtect = true;
      const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
      const handle = await store.open(scopeA, fence(1));
      await handle.withTransaction(async (tx) => { await tx.putRecord({ key: 'k', value: 'v' }); });
      await store.close(fence(1));
      expect(device.events.filter((event) => event.startsWith('lock.'))).toEqual([
        'lock.acquire', 'lock.protect:db_absent', 'lock.protect:db_present', 'lock.release',
      ]);
      expect(device.protectCalls).toBe(2);
      const again = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
      expect((await (await again.open(scopeA, fence(2))).readRecord('k'))?.value).toBe('v');
      expect(device.protectCalls).toBe(4);
    });

    test('protection fails before open: no DB file, no key published as lineage, lock released', async () => {
      const device = new FakeDevice();
      device.iosProtect = true;
      device.failProtectCall = 1;
      const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
      await expect(store.open(scopeA, fence(1))).rejects.toMatchObject({ code: 'account_scope_open_failed' });
      expect(device.files.size).toBe(0);
      expect(device.lineage()).toBeNull();
      expect(device.heldLocks.size).toBe(0);
      expect(lines(warn).some((line) => line.includes('storage family_protection_failed stage=before_open'))).toBe(true);
    });

    test('protection fails after the proof: open refused, connection closed, no lineage', async () => {
      const device = new FakeDevice();
      device.iosProtect = true;
      device.failProtectCall = 2;
      const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
      await expect(store.open(scopeA, fence(1))).rejects.toMatchObject({ code: 'account_scope_open_failed' });
      expect(device.lineage()).toBeNull();
      expect(device.closes).toBe(1);
      expect(device.heldLocks.size).toBe(0);
      expect(lines(warn).some((line) => line.includes('storage proof_failed reason=family_protection'))).toBe(true);
    });

    test('Android lock (no protectFamily): no protection calls, behaviour unchanged', async () => {
      const device = new FakeDevice();
      const store = createAccountScopeStore(createAccountNativeScopeAdapter(device.env()));
      await store.open(scopeA, fence(1));
      await store.close(fence(1));
      expect(device.protectCalls).toBe(0);
      expect(device.events.filter((event) => event.startsWith('lock.'))).toEqual(['lock.acquire', 'lock.release']);
    });
  });

  describe('probe phases on the fake device', () => {
    function ports(device: FakeDevice, header: Uint8Array | null, now = 10_000): IosProofPorts {
      return Object.freeze({
        environment: device.env(),
        readDatabaseHeader: async (name: string) => (device.files.has(name) ? header : null),
        now: () => now,
        platformLabel: 'ios-test',
      });
    }
    const encrypted = Uint8Array.from({ length: 16 }, (_, index) => (index * 37 + 11) % 256);
    const plaintext = Uint8Array.from('SQLite format 3\u0000', (char) => char.charCodeAt(0));

    beforeEach(() => simulateProcessRestartForTests());

    test('write → (kill) → verify → erase: every phase passes and nothing is left behind', async () => {
      const device = new FakeDevice();
      device.iosProtect = true;
      const write = await runIosAccountProofPhase('write', ports(device, encrypted, 10_000));
      expect(write.verdict).toBe('pass');
      expect(write.text).toContain('connection_left_open=swipe_kill_app_now');
      expect(write.text).toContain('family_protection=ok=2 failed=0');

      const sameProcess = await runIosAccountProofPhase('verify', ports(device, encrypted, 20_000));
      expect(sameProcess.verdict).toBe('fail');
      expect(sameProcess.text).toContain('process_restarted=same_process_kill_app_first');

      simulateProcessRestartForTests();
      const verify = await runIosAccountProofPhase('verify', ports(device, encrypted, 20_000));
      expect(verify.verdict).toBe('pass');
      expect(verify.text).toContain('canary_after_kill=present_age_s=10');

      const erase = await runIosAccountProofPhase('erase', ports(device, encrypted));
      expect(erase.verdict).toBe('pass');
      expect(device.files.size).toBe(0);
      expect(device.keyNames()).toEqual([]);
    });

    test('plaintext SQLite header fails the receipt (SQLCipher not active)', async () => {
      const device = new FakeDevice();
      device.iosProtect = true;
      const write = await runIosAccountProofPhase('write', ports(device, plaintext));
      expect(write.verdict).toBe('fail');
      expect(write.text).toContain('FAIL db_header=plaintext');
    });

    test('no environment (non-proof build) fails honestly without throwing', async () => {
      const receipt = await runIosAccountProofPhase('write', Object.freeze({
        environment: null, readDatabaseHeader: async () => null, now: () => 1, platformLabel: 'ios-test',
      }));
      expect(receipt.verdict).toBe('fail');
      expect(receipt.text).toContain('FAIL environment=unavailable_see_ACCOUNT-V2_log');
    });

    test('protection failure on the device surfaces as a failed phase, not a crash', async () => {
      const device = new FakeDevice();
      device.iosProtect = true;
      device.failProtectCall = 1;
      const receipt = await runIosAccountProofPhase('write', ports(device, encrypted));
      expect(receipt.verdict).toBe('fail');
      expect(receipt.text).toContain('FAIL phase_error=account_scope_open_failed');
    });

    test('receipt carries no uid, key or raw scope hash', async () => {
      const device = new FakeDevice();
      device.iosProtect = true;
      const write = await runIosAccountProofPhase('write', ports(device, encrypted));
      const key = device.secure.get(device.keyNames()[0])!;
      expect(write.text).not.toContain(key);
      expect(write.text).not.toMatch(/[0-9a-f]{64}/);
      expect(write.text).not.toContain('synthetic-uid');
      expect(write.text).not.toContain(IOS_PROOF_CANARY_KEY);
    });
  });

  describe('bundle and build isolation', () => {
    test('without EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF the probe route and modules are blocked from Metro', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { spawnSync } = require('child_process') as typeof import('child_process');
      const script = [
        "const path = require('path');",
        "const config = require(path.join(process.cwd(), 'metro.config.js'));",
        "const files = ['app/dev-account-v2-ios-proof.tsx', 'runtime-probes/ios-account-sqlcipher/probe.ts',",
        "  'runtime-probes/ios-account-sqlcipher/probe_native.ts', 'modules/account-session-v2/native/account_native_scope_adapter.ts']",
        '  .map((file) => config.resolver.blockList.some((rule) => rule.test(path.join(process.cwd(), file))));',
        'process.stdout.write(JSON.stringify(files));',
      ].join('\n');
      const run = (env: NodeJS.ProcessEnv) => JSON.parse(spawnSync(process.execPath, ['-e', script], { cwd: ROOT, env, encoding: 'utf8' }).stdout) as boolean[];
      const base = { ...process.env };
      delete base.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF;
      expect(run(base)).toEqual([true, true, true, false]);
      expect(run({ ...base, EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF: '1' })).toEqual([false, false, false, false]);
    }, 60_000);

    test('EAS: the proof flag lives only in ios-account-v2-proof (internal, no channel, no V2 client flags)', () => {
      const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8')) as {
        build: Record<string, { distribution?: string; channel?: string; env?: Record<string, string> }>;
      };
      const withFlag = Object.entries(eas.build)
        .filter(([, profile]) => profile.env?.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF !== undefined)
        .map(([name]) => name);
      expect(withFlag).toEqual(['ios-account-v2-proof']);
      const profile = eas.build['ios-account-v2-proof'];
      expect(profile.distribution).toBe('internal');
      expect(profile.channel).toBeUndefined();
      expect(profile.env?.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF).toBe('1');
      // зачем: проба проверяет хранилище, не синхронизацию — клиент V2 и эмулятор в этой сборке не включаются.
      expect(Object.keys(profile.env ?? {}).filter((key) => /ACCOUNTS?_V2(?!_IOS_PROOF)|EMULATOR/.test(key))).toEqual([]);
    });

    test('probe route requires the flag at runtime too (second lock)', () => {
      const source = fs.readFileSync(path.join(ROOT, 'app', 'dev-account-v2-ios-proof.tsx'), 'utf8');
      expect(source).toContain("process.env.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF === '1'");
    });
  });
});

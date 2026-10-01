import fs from 'fs';
import path from 'path';
import {
  FIREBASE_EMULATOR_PORTS,
  connectFirebaseEmulatorsForDev,
  resolveFirebaseEmulatorHost,
  type FirebaseEmulatorModules,
} from '../app/firebase_emulator_dev';

/*
 * Account V2, Пакет 6D — dev-only подключение к Firebase Emulator Suite.
 * Сторожим: без переменной окружения и в релизе (`__DEV__ === false`)
 * подключение НЕДОСТИЖИМО; с ними — Auth/Firestore/Functions идут ровно на
 * порты firebase.json; хост — только локальный/частный.
 */

const ROOT = path.resolve(__dirname, '..');
const ENV = 'EXPO_PUBLIC_FIREBASE_EMULATOR_HOST';

function fakeModules() {
  const calls: string[] = [];
  const target = (name: string) => ({
    useEmulator: (...args: unknown[]) => { calls.push(`${name}:${args.join('|')}`); },
  });
  const modules: FirebaseEmulatorModules = {
    auth: () => target('auth'),
    firestore: () => target('firestore'),
    functions: (region?: string) => target(region === undefined ? 'functions' : `functions@${region}`),
  };
  return { calls, load: jest.fn(() => modules) };
}

describe('firebase emulator dev guard (Пакет 6D)', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  const savedEnv = process.env[ENV];
  const savedDev = (globalThis as { __DEV__?: unknown }).__DEV__;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    log.mockRestore();
    warn.mockRestore();
    if (savedEnv === undefined) delete process.env[ENV]; else process.env[ENV] = savedEnv;
    (globalThis as { __DEV__?: unknown }).__DEV__ = savedDev;
    jest.resetModules();
  });

  test('decision: release / no env / foreign host → no connection', () => {
    expect(resolveFirebaseEmulatorHost(false, '10.0.2.2')).toEqual({ connect: false, reason: 'not_dev' });
    expect(resolveFirebaseEmulatorHost(undefined, '10.0.2.2')).toEqual({ connect: false, reason: 'not_dev' });
    expect(resolveFirebaseEmulatorHost(true, undefined)).toEqual({ connect: false, reason: 'env_unset' });
    expect(resolveFirebaseEmulatorHost(true, '   ')).toEqual({ connect: false, reason: 'env_unset' });
    for (const host of ['firestore.googleapis.com', '8.8.8.8', 'evil.example', '172.32.0.1', '10.0.2.2:9099']) {
      expect(resolveFirebaseEmulatorHost(true, host)).toEqual({ connect: false, reason: 'host_not_local' });
    }
    for (const host of ['10.0.2.2', 'localhost', '127.0.0.1', '192.168.1.20', '172.16.0.5', '10.1.2.3']) {
      expect(resolveFirebaseEmulatorHost(true, host)).toEqual({ connect: true, host });
    }
  });

  test('release build (__DEV__=false) with the env set: native modules are never loaded', () => {
    const { calls, load } = fakeModules();
    expect(connectFirebaseEmulatorsForDev(false, '10.0.2.2', load)).toMatchObject({ connect: false, reason: 'not_dev' });
    expect(load).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  test('dev without the env: native modules are never loaded', () => {
    const { calls, load } = fakeModules();
    expect(connectFirebaseEmulatorsForDev(true, undefined, load)).toMatchObject({ connect: false, reason: 'env_unset' });
    expect(load).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  test('dev + env: auth/firestore/functions (default + us-central1) go to the firebase.json ports', () => {
    const { calls, load } = fakeModules();
    const result = connectFirebaseEmulatorsForDev(true, '10.0.2.2', load);
    expect(result).toMatchObject({ connect: true, host: '10.0.2.2', failed: [] });
    expect(calls).toEqual([
      'auth:http://10.0.2.2:9099',
      'firestore:10.0.2.2|8080',
      'functions:10.0.2.2|5001',
      'functions@us-central1:10.0.2.2|5001',
    ]);
    const firebaseJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase.json'), 'utf8')) as {
      emulators: Record<string, { port: number }>;
    };
    expect(firebaseJson.emulators.auth.port).toBe(FIREBASE_EMULATOR_PORTS.auth);
    expect(firebaseJson.emulators.firestore.port).toBe(FIREBASE_EMULATOR_PORTS.firestore);
    expect(firebaseJson.emulators.functions.port).toBe(FIREBASE_EMULATOR_PORTS.functions);
  });

  test.each([
    ['release, env set', false, '10.0.2.2', 0],
    ['dev, env unset', true, undefined, 0],
    ['dev, env set', true, '10.0.2.2', 1],
  ])('boot module: %s', (_label, isDev, host, expectedCalls) => {
    (globalThis as { __DEV__?: unknown }).__DEV__ = isDev;
    if (host === undefined) delete process.env[ENV]; else process.env[ENV] = host;
    const connect = jest.fn();
    jest.doMock('../app/firebase_emulator_dev', () => ({ connectFirebaseEmulatorsForDev: connect }));
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../app/firebase_emulator_dev_boot');
    });
    expect(connect).toHaveBeenCalledTimes(expectedCalls);
    if (expectedCalls > 0) expect(connect).toHaveBeenCalledWith(true, '10.0.2.2');
  });

  test('boot is imported by index.js BEFORE expo-router/entry; the require sits inside the __DEV__ && env branch', () => {
    const index = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
    const boot = index.indexOf("import './app/firebase_emulator_dev_boot';");
    expect(boot).toBeGreaterThan(0);
    expect(boot).toBeLessThan(index.indexOf("import 'expo-router/entry';"));
    const source = fs.readFileSync(path.join(ROOT, 'app', 'firebase_emulator_dev_boot.ts'), 'utf8');
    const guard = source.indexOf('if (__DEV__ && process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST) {');
    expect(guard).toBeGreaterThan(0);
    expect(source.indexOf("require('./firebase_emulator_dev')")).toBeGreaterThan(guard);
    // Никаких статических импортов модуля эмуляторов / нативного Firebase в точке входа.
    expect(source).not.toMatch(/^import /m);
  });
});

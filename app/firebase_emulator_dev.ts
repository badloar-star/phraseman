/*
 * Account V2, Пакет 6D (TG-D3DE53F2D345) — dev-only подключение приложения к
 * локальному Firebase Emulator Suite.
 *
 * зачем: проверка «на 3 аккаунтах» без паролей владельца и без прода — dev-сборка
 * на Android-эмуляторе ходит в локальные Auth/Firestore/Functions (10.0.2.2 —
 * это компьютер разработчика, видимый из эмулятора Android).
 *
 * Включается ТОЛЬКО при двух условиях одновременно:
 *   1) `__DEV__` (в релизной сборке Babel/минификатор вырезает ветку целиком);
 *   2) явная переменная `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` (подставляется при
 *      сборке бандла; не задана — ничего не меняется, приложение ходит в прод
 *      как всегда).
 * Хост — только локальный/частный адрес: опечатка не уведёт трафик наружу.
 * Порты — ровно из firebase.json → emulators (auth 9099, firestore 8080, functions 5001).
 *
 * Вызывается ПЕРВЫМ из index.js (до expo-router/entry), пока ни один модуль
 * не успел обратиться к Auth/Firestore/Functions: useEmulator после первого
 * обращения нативный SDK отвергает.
 * Логи — префикс [FIREBASE-EMU]; никаких учётных данных.
 */

const LOG = '[FIREBASE-EMU]';

export const FIREBASE_EMULATOR_PORTS = Object.freeze({ auth: 9099, firestore: 8080, functions: 5001 });
/** Регион, под которым приложение берёт Functions (getFunctions(getApp(), 'us-central1')). */
const FUNCTIONS_REGION = 'us-central1';

const LOCAL_HOSTS = new Set(['10.0.2.2', '10.0.3.2', 'localhost', '127.0.0.1']);
const PRIVATE_IPV4 = /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

export type FirebaseEmulatorHostDecision =
  | Readonly<{ connect: true; host: string }>
  | Readonly<{ connect: false; reason: 'not_dev' | 'env_unset' | 'host_not_local' }>;

/** Решение «подключать ли эмуляторы». Чистая функция — проверяется тестом. */
export function resolveFirebaseEmulatorHost(isDev: unknown, rawHost: unknown): FirebaseEmulatorHostDecision {
  if (isDev !== true) return Object.freeze({ connect: false, reason: 'not_dev' });
  const host = typeof rawHost === 'string' ? rawHost.trim() : '';
  if (host.length === 0) return Object.freeze({ connect: false, reason: 'env_unset' });
  if (!LOCAL_HOSTS.has(host) && !PRIVATE_IPV4.test(host)) {
    return Object.freeze({ connect: false, reason: 'host_not_local' });
  }
  return Object.freeze({ connect: true, host });
}

type UseEmulatorTarget = Readonly<{ useEmulator: (...args: never[]) => unknown }>;

export type FirebaseEmulatorModules = Readonly<{
  auth: () => UseEmulatorTarget;
  firestore: () => UseEmulatorTarget;
  /** region undefined — экземпляр по умолчанию. */
  functions: (region?: string) => UseEmulatorTarget;
}>;

function nativeModules(): FirebaseEmulatorModules {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const auth = require('@react-native-firebase/auth').default;
  const firestore = require('@react-native-firebase/firestore').default;
  const { getApp } = require('@react-native-firebase/app');
  // зачем: getApp().functions() без загруженного пакета functions падает ReferenceError
  // внутри RNFB (moduleWithDashes) — сначала регистрируем модуль его же getFunctions.
  const { getFunctions } = require('@react-native-firebase/functions');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return Object.freeze({
    auth: () => auth(),
    firestore: () => firestore(),
    functions: (region?: string) => (region === undefined ? getFunctions(getApp()) : getFunctions(getApp(), region)),
  });
}

function kindOf(value: unknown): string {
  return value instanceof Error ? value.name : typeof value;
}

function messageOf(value: unknown): string {
  return value instanceof Error ? value.message.replace(/\s+/g, ' ').slice(0, 160) : 'n/a';
}

/**
 * Подключить Auth/Firestore/Functions к эмуляторам, если решение «да».
 * Возвращает итог для лога/теста; никогда не бросает (сбой одного сервиса —
 * лог и продолжаем: частично подключённое приложение видно по логу сразу).
 */
export function connectFirebaseEmulatorsForDev(
  isDev: unknown,
  rawHost: unknown,
  load: () => FirebaseEmulatorModules = nativeModules,
): FirebaseEmulatorHostDecision & Readonly<{ connected?: readonly string[]; failed?: readonly string[] }> {
  const decision = resolveFirebaseEmulatorHost(isDev, rawHost);
  if (!decision.connect) {
    // зачем: «не подключили» тоже пишем (кроме релиза), чтобы было видно, почему трафик идёт в прод.
    if (decision.reason !== 'not_dev') console.log(`${LOG} skip reason=${decision.reason}`);
    return decision;
  }
  const connected: string[] = [];
  const failed: string[] = [];
  let modules: FirebaseEmulatorModules;
  try {
    modules = load();
  } catch (error) {
    console.warn(`${LOG} modules_unavailable kind=${kindOf(error)}`);
    return Object.freeze({ ...decision, connected: [], failed: ['modules'] });
  }
  const attempt = (name: string, run: () => unknown): void => {
    try {
      run();
      connected.push(name);
    } catch (error) {
      failed.push(name);
      // зачем: без текста ошибки причина сбоя подключения не видна (класс «немой catch»).
      console.warn(`${LOG} connect_failed service=${name} kind=${kindOf(error)} message=${messageOf(error)}`);
    }
  };
  const { host } = decision;
  const ports = FIREBASE_EMULATOR_PORTS;
  attempt('auth', () => (modules.auth().useEmulator as (url: string) => unknown)(`http://${host}:${ports.auth}`));
  attempt('firestore', () => (modules.firestore().useEmulator as (h: string, p: number) => unknown)(host, ports.firestore));
  attempt('functions', () => (modules.functions().useEmulator as (h: string, p: number) => unknown)(host, ports.functions));
  attempt(`functions:${FUNCTIONS_REGION}`, () => (
    modules.functions(FUNCTIONS_REGION).useEmulator as (h: string, p: number) => unknown
  )(host, ports.functions));
  console.warn(`${LOG} connected host=${host} services=${connected.join(',')} failed=${failed.join(',') || 'none'}`);
  return Object.freeze({ ...decision, connected: Object.freeze(connected), failed: Object.freeze(failed) });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }

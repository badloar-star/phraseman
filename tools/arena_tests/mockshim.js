/**
 * Заглушки внешних модулей для прогона тестов Арены.
 *
 * Логика Арены чистая и ни от чего не зависит, но по дороге к ней тесты
 * задевают модули, которым нужен настоящий Firebase (`stars_ledger`,
 * `tournament_core`). Поднимать ради этого эмулятор незачем: ни один тест
 * Арены в эти заглушки не заглядывает, они нужны только чтобы `require`
 * дошёл до конца.
 *
 * Если тест ВСЁ-ТАКИ начнёт пользоваться заглушкой, он упадёт на пустом
 * ответе — и это правильно: молча притворяться базой данных хуже.
 */
const Module = require('module');

const firebaseAdmin = {
  apps: [],
  initializeApp: () => ({}),
  firestore: () => ({ collection: () => ({ doc: () => ({}) }) }),
  credential: { applicationDefault: () => ({}) },
};
firebaseAdmin.firestore.FieldValue = { serverTimestamp: () => 0, increment: (n) => n };

class HttpsError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

const STUBS = new Map([
  ['firebase-admin', firebaseAdmin],
  ['firebase-functions/v2/https', { HttpsError, onCall: (_options, handler) => handler }],
  ['firebase-functions/v2/scheduler', { onSchedule: (_options, handler) => handler }],
  ['firebase-functions/v2/firestore', { onDocumentWritten: (_o, handler) => handler }],
  ['firebase-functions', { logger: console }],
  ['firebase-functions/params', { defineSecret: () => ({ value: () => '' }) }],
]);

/**
 * Нативные пакеты не грузятся вовсе.
 *
 * Логика Арены от них не зависит, но по дороге к строкам интерфейса `require`
 * задевает `expo-modules-core`, а тот написан на TypeScript внутри
 * node_modules — node такое не читает и падает. Ни один тест Арены в эти
 * пакеты не заглядывает.
 */
const NATIVE = /^(react-native|react-native-.*|@react-native(-community)?\/|@react-native-async-storage\/|expo|expo-.*|@expo\/|react-native-reanimated|react-native-safe-area-context|react-native-svg)/;

const nativeStub = new Proxy(function stub() {}, {
  get: (_target, key) => (key === '__esModule' ? true : nativeStub),
  apply: () => nativeStub,
  construct: () => nativeStub,
});

const original = Module._load;
Module._load = function load(request, parent, isMain) {
  if (STUBS.has(request)) return STUBS.get(request);
  if (request.startsWith('firebase-functions/')) return {};
  if (NATIVE.test(request)) return nativeStub;
  return original.call(this, request, parent, isMain);
};

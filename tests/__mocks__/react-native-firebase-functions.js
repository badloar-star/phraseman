/**
 * Jest stub: real @react-native-firebase/functions is ESM; Node test env loads this via moduleNameMapper.
 * Minimal surface — callables resolve to empty data by default. Suites that need specific
 * callable behaviour can jest.mock() this module per-test.
 */

function httpsCallable() {
  return jest.fn(() => Promise.resolve({ data: {} }));
}

function getFunctions() {
  return {
    httpsCallable,
    useEmulator: jest.fn(),
  };
}

function connectFunctionsEmulator() {}

module.exports = {
  __esModule: true,
  default: getFunctions,
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
};

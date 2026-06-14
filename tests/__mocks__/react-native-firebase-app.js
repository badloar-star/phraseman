/**
 * Jest stub: real @react-native-firebase/app is ESM; Node test env loads this via moduleNameMapper.
 * Minimal surface — just enough for modules that call getApp()/firebase.app() at import time.
 */

const fakeApp = { name: '[DEFAULT]', options: {} };

function getApp() {
  return fakeApp;
}

function getApps() {
  return [fakeApp];
}

function initializeApp() {
  return fakeApp;
}

const firebase = {
  app: getApp,
  apps: [fakeApp],
  initializeApp,
};

module.exports = {
  __esModule: true,
  default: firebase,
  firebase,
  getApp,
  getApps,
  initializeApp,
};

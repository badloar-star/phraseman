function getFunctions(app, regionOrCustomDomain) {
  return {
    app,
    regionOrCustomDomain,
    useEmulator() {},
    httpsCallable(name, options) {
      return httpsCallable(this, name, options);
    },
    httpsCallableFromUrl(url, options) {
      return httpsCallableFromUrl(this, url, options);
    },
  };
}

function makeUnavailableCallable(name) {
  return async () => {
    throw new Error(`Firebase Functions callable "${name}" is unavailable in Expo Web preview.`);
  };
}

function httpsCallable(_functionsInstance, name) {
  return makeUnavailableCallable(name);
}

function httpsCallableFromUrl(_functionsInstance, url) {
  return makeUnavailableCallable(url);
}

function connectFunctionsEmulator(functionsInstance, host, port) {
  if (functionsInstance && typeof functionsInstance.useEmulator === 'function') {
    functionsInstance.useEmulator(host, port);
  }
}

const HttpsErrorCode = {
  OK: 'ok',
  CANCELLED: 'cancelled',
  UNKNOWN: 'unknown',
  INVALID_ARGUMENT: 'invalid-argument',
  UNAVAILABLE: 'unavailable',
};

module.exports = {
  getFunctions,
  httpsCallable,
  httpsCallableFromUrl,
  connectFunctionsEmulator,
  HttpsErrorCode,
  default: getFunctions,
};

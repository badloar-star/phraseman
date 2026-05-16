const Module = require('module');

const originalLoad = Module._load;

const noop = () => {};
const removable = { remove: noop };

const platform = {
  OS: process.env.QA_PLATFORM_OS || 'android',
  Version: 'qa',
  select(map) {
    if (!map || typeof map !== 'object') return undefined;
    return map[this.OS] ?? map.native ?? map.default;
  },
};

const reactNative = {
  Platform: platform,
  DeviceEventEmitter: {
    emit: noop,
    addListener: () => removable,
    removeListener: noop,
  },
  LayoutAnimation: {
    configureNext: noop,
    Presets: {},
  },
  UIManager: {
    setLayoutAnimationEnabledExperimental: noop,
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => style,
    hairlineWidth: 1,
  },
  Dimensions: {
    get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
    addEventListener: () => removable,
  },
  PixelRatio: {
    get: () => 2,
    getFontScale: () => 1,
    roundToNearestPixel: (n) => n,
  },
  AppState: {
    currentState: 'active',
    addEventListener: () => removable,
  },
  InteractionManager: {
    runAfterInteractions: (cb) => {
      if (typeof cb === 'function') cb();
      return { cancel: noop };
    },
  },
  NativeModules: {},
  NativeEventEmitter: class {
    addListener() { return removable; }
    removeAllListeners() {}
  },
};

const asyncStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
  multiGet: async () => [],
  multiSet: async () => undefined,
  multiRemove: async () => undefined,
};

const expoConstants = {
  appOwnership: null,
  expoConfig: {},
  manifest: null,
};

function firebaseStub() {
  return {
    collection: () => firebaseStub(),
    doc: () => firebaseStub(),
    where: () => firebaseStub(),
    orderBy: () => firebaseStub(),
    limit: () => firebaseStub(),
    get: async () => ({ docs: [], empty: true }),
    set: async () => undefined,
    update: async () => undefined,
    add: async () => undefined,
  };
}

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react-native') return reactNative;
  if (request === '@react-native-async-storage/async-storage') {
    return { __esModule: true, default: asyncStorage, ...asyncStorage };
  }
  if (request === 'expo-constants') {
    return { __esModule: true, default: expoConstants, ...expoConstants };
  }
  if (request.startsWith('@react-native-firebase/')) {
    const stub = firebaseStub;
    stub.default = firebaseStub;
    stub.FieldValue = { serverTimestamp: () => new Date() };
    return stub;
  }
  if (request === 'react-native-purchases') {
    return { __esModule: true, default: {}, PurchasesPackage: {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};

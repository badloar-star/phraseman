const Purchases = {
    setLogLevel: jest.fn(),
    setLogHandler: jest.fn(),
    configure: jest.fn(),
    isConfigured: jest.fn(async () => true),
    getAppUserID: jest.fn(async () => 'test-stable-id'),
    logIn: jest.fn(async () => ({
      customerInfo: { entitlements: { active: {} }, activeSubscriptions: [] },
      created: false,
    })),
    setAttributes: jest.fn(async () => undefined),
    getOfferings: jest.fn(async () => ({ current: null, all: {} })),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
    purchasePackage: jest.fn(),
    purchaseProduct: jest.fn(),
    restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
    invalidateCustomerInfoCache: jest.fn(async () => undefined),
};

module.exports = {
  __esModule: true,
  default: Purchases,
  Purchases,
  LOG_LEVEL: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
  },
};

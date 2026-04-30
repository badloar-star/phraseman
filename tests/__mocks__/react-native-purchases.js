module.exports = {
  Purchases: {
    setLogLevel: jest.fn(),
    configure: jest.fn(),
    getOfferings: jest.fn(async () => ({ current: null, all: {} })),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
    purchasePackage: jest.fn(),
    purchaseProduct: jest.fn(),
    restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
    invalidateCustomerInfoCache: jest.fn(async () => undefined),
  },
  LOG_LEVEL: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
  },
};

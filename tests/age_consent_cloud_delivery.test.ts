type ConsentSnapshot = {
  schemaVersion: 1;
  intentId: string;
  ageBracket: 'adult' | 'unknown';
  analyticsConsent: 'granted' | 'denied' | 'unset';
  legalAccepted: boolean;
  appVersion: string;
  build: string;
  platform: 'ios' | 'android' | 'web';
};

type DeliveryFactory = (dependencies: {
  storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
  };
  createIntentId(): string;
  captureSnapshot(): Promise<Omit<ConsentSnapshot, 'schemaVersion' | 'intentId'>>;
  prepareDelivery(): Promise<boolean>;
  send(snapshot: ConsentSnapshot): Promise<{ ok: boolean; duplicate?: boolean }>;
}) => {
  recordCurrentConsent(): Promise<boolean>;
  resumePending(): Promise<boolean>;
};

type ReadinessFactory = (dependencies: {
  ensureAuthenticated(): Promise<unknown>;
  waitForCurrentAuth(): Promise<boolean>;
  hasCurrentAuth(): boolean;
  initAppCheck(): Promise<boolean>;
  ensureStableLink(): Promise<boolean>;
}) => () => Promise<boolean>;

function loadFactories(): {
  createDelivery?: DeliveryFactory;
  createReadiness?: ReadinessFactory;
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require('../app/age_consent_cloud') as {
    createAgeConsentCloudDelivery?: DeliveryFactory;
    createAgeConsentDeliveryReadiness?: ReadinessFactory;
  };
  return {
    createDelivery: module.createAgeConsentCloudDelivery,
    createReadiness: module.createAgeConsentDeliveryReadiness,
  };
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
  };
}

const CURRENT = {
  ageBracket: 'adult',
  analyticsConsent: 'granted',
  legalAccepted: true,
  appVersion: '2.4.1',
  build: '20401',
  platform: 'ios',
} as const;

describe('age consent cloud delivery', () => {
  it('persists an identifier-free snapshot before transport and replays it unchanged', async () => {
    const { createDelivery } = loadFactories();
    expect(typeof createDelivery).toBe('function');
    if (!createDelivery) return;

    const storage = memoryStorage();
    const order: string[] = [];
    let ready = false;
    storage.setItem.mockImplementation(async (key: string, value: string) => {
      storage.values.set(key, value);
      order.push(value ? 'persist' : 'ack');
    });
    const send = jest.fn(async (snapshot: ConsentSnapshot) => {
      order.push('send');
      return { ok: true, duplicate: false, snapshot };
    });
    const delivery = createDelivery({
      storage,
      createIntentId: () => '3d372222-1419-47d0-8fe8-c2c77fe22742',
      captureSnapshot: async () => CURRENT,
      prepareDelivery: async () => {
        order.push('prepare');
        return ready;
      },
      send,
    });

    await expect(delivery.recordCurrentConsent()).resolves.toBe(false);
    expect(order).toEqual(['persist', 'prepare']);
    expect(send).not.toHaveBeenCalled();

    const pending = [...storage.values.values()].find(Boolean);
    expect(JSON.parse(pending ?? '{}')).toEqual({
      schemaVersion: 1,
      intentId: '3d372222-1419-47d0-8fe8-c2c77fe22742',
      ...CURRENT,
    });
    expect(pending).not.toMatch(/stableId|authUid|userId|birthYear|deviceId/i);

    ready = true;
    await expect(delivery.resumePending()).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(JSON.parse(pending ?? '{}'));
    expect([...storage.values.values()]).toEqual(['']);
    expect(order.slice(-3)).toEqual(['prepare', 'send', 'ack']);
  });

  it('keeps pending state when the server does not acknowledge success', async () => {
    const { createDelivery } = loadFactories();
    expect(typeof createDelivery).toBe('function');
    if (!createDelivery) return;

    const storage = memoryStorage();
    const delivery = createDelivery({
      storage,
      createIntentId: () => '7477cb6c-d173-4549-bc8f-4ee88a6f5a27',
      captureSnapshot: async () => CURRENT,
      prepareDelivery: async () => true,
      send: async () => ({ ok: false }),
    });

    await expect(delivery.recordCurrentConsent()).resolves.toBe(false);
    expect([...storage.values.values()][0]).toContain('7477cb6c-d173-4549-bc8f-4ee88a6f5a27');
  });

  it('does nothing and creates no identity when no pending snapshot exists', async () => {
    const { createDelivery } = loadFactories();
    expect(typeof createDelivery).toBe('function');
    if (!createDelivery) return;

    const storage = memoryStorage();
    const createIntentId = jest.fn(() => '8f682f76-8a16-4f0a-8ee3-d6e019b7d8df');
    const captureSnapshot = jest.fn(async () => CURRENT);
    const prepareDelivery = jest.fn(async () => true);
    const send = jest.fn(async () => ({ ok: true }));
    const delivery = createDelivery({
      storage,
      createIntentId,
      captureSnapshot,
      prepareDelivery,
      send,
    });

    await expect(delivery.resumePending()).resolves.toBe(false);
    expect(createIntentId).not.toHaveBeenCalled();
    expect(captureSnapshot).not.toHaveBeenCalled();
    expect(prepareDelivery).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('requires current Auth, explicit App Check success, and a stable auth link', async () => {
    const { createReadiness } = loadFactories();
    expect(typeof createReadiness).toBe('function');
    if (!createReadiness) return;

    const appCheckWithoutAuth = jest.fn(async () => true);
    const stableLinkWithoutAuth = jest.fn(async () => true);
    const missingAuth = createReadiness({
      ensureAuthenticated: async () => {},
      waitForCurrentAuth: async () => false,
      hasCurrentAuth: () => false,
      initAppCheck: appCheckWithoutAuth,
      ensureStableLink: stableLinkWithoutAuth,
    });
    await expect(missingAuth()).resolves.toBe(false);
    expect(appCheckWithoutAuth).not.toHaveBeenCalled();
    expect(stableLinkWithoutAuth).not.toHaveBeenCalled();

    const linkAfterRejectedAppCheck = jest.fn(async () => true);
    const rejectedAppCheck = createReadiness({
      ensureAuthenticated: async () => {},
      waitForCurrentAuth: async () => true,
      hasCurrentAuth: () => true,
      initAppCheck: async () => false,
      ensureStableLink: linkAfterRejectedAppCheck,
    });
    await expect(rejectedAppCheck()).resolves.toBe(false);
    expect(linkAfterRejectedAppCheck).not.toHaveBeenCalled();

    const rejectedLink = createReadiness({
      ensureAuthenticated: async () => {},
      waitForCurrentAuth: async () => true,
      hasCurrentAuth: () => true,
      initAppCheck: async () => true,
      ensureStableLink: async () => false,
    });
    await expect(rejectedLink()).resolves.toBe(false);

    const ready = createReadiness({
      ensureAuthenticated: async () => {},
      waitForCurrentAuth: async () => true,
      hasCurrentAuth: () => true,
      initAppCheck: async () => true,
      ensureStableLink: async () => true,
    });
    await expect(ready()).resolves.toBe(true);
  });
});

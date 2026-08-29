import {
  executeVoiceMinutePurchase,
  selectVoiceMinutePackages,
  type VoiceMinutePurchaseDependencies,
} from '../modules/voice_minutes/purchase';

// зачем: VoiceMinuteWalletStatus вырос (reserved/purchased/refunded/charged/
// updatedAtMs), а моки перечисляли только три поля и переставали
// компилироваться. Хелпер задаёт полную форму и позволяет переопределить нужное.
const walletStatus = (
  patch: Partial<{ availableSeconds: number; eventCount: number; credited: boolean }>,
) => ({
  availableSeconds: 0,
  reservedSeconds: 0,
  purchasedSeconds: 0,
  refundedSeconds: 0,
  chargedSeconds: 0,
  eventCount: 0,
  credited: false,
  updatedAtMs: null,
  ...patch,
});

const pack = (productIdentifier: string, priceString: string) => ({
  identifier: `pack_${productIdentifier}`,
  product: { identifier: productIdentifier, priceString },
});

describe('voice-minute consumable purchasing', () => {
  it('selects only the exact 30/120/300 products from the voice_minutes offering', () => {
    const offerings = {
      all: {
        max: { availablePackages: [pack('phraseman_max_monthly_v1', '$22.99')] },
        voice_minutes: {
          availablePackages: [
            pack('phraseman_voice_minutes_300', '$39.99'),
            pack('unknown_voice_pack', '$1.99'),
            pack('phraseman_voice_minutes_30', '$5.99'),
            pack('phraseman_voice_minutes_120', '$17.99'),
          ],
        },
      },
    };

    expect(selectVoiceMinutePackages(offerings as any).map((item) => ({
      productId: item.productId,
      minutes: item.minutes,
      price: item.priceString,
    }))).toEqual([
      { productId: 'phraseman_voice_minutes_30', minutes: 30, price: '$5.99' },
      { productId: 'phraseman_voice_minutes_120', minutes: 120, price: '$17.99' },
      { productId: 'phraseman_voice_minutes_300', minutes: 300, price: '$39.99' },
    ]);
  });

  it('keeps store success pending until the server confirms the exact transaction credit', async () => {
    const persistPending = jest.fn(async () => true);
    const clearPending = jest.fn(async () => undefined);
    const readWallet = jest
      .fn()
      .mockResolvedValueOnce(walletStatus({ availableSeconds: 120, eventCount: 1, credited: false }))
      .mockResolvedValueOnce(walletStatus({ availableSeconds: 120, eventCount: 1, credited: false }))
      .mockResolvedValueOnce(walletStatus({ availableSeconds: 1_920, eventCount: 2, credited: true }));
    const deps: VoiceMinutePurchaseDependencies = {
      isCurrent: () => true,
      readWallet,
      purchasePackage: jest.fn(async () => ({
        productIdentifier: 'phraseman_voice_minutes_30',
        customerInfo: { entitlements: { active: {} } },
        transaction: {
          transactionIdentifier: 'store-tx-30',
          productIdentifier: 'phraseman_voice_minutes_30',
          purchaseDate: '2026-08-28T12:00:00.000Z',
        },
      })) as any,
      persistPending,
      clearPending,
      delay: async () => undefined,
      maxAttempts: 2,
    };

    const result = await executeVoiceMinutePurchase({
      stableId: 'stable-a',
      pack: selectVoiceMinutePackages({
        all: { voice_minutes: { availablePackages: [pack('phraseman_voice_minutes_30', '$5.99')] } },
      } as any)[0],
    }, deps);

    expect(result).toMatchObject({ status: 'credited', transactionId: 'store-tx-30' });
    expect(persistPending).toHaveBeenCalledWith(expect.objectContaining({
      stableId: 'stable-a',
      transactionId: 'store-tx-30',
      productId: 'phraseman_voice_minutes_30',
      baselineEventCount: 1,
    }));
    expect(readWallet).toHaveBeenLastCalledWith({
      expectedTransactionId: 'store-tx-30',
      expectedProductId: 'phraseman_voice_minutes_30',
    });
    expect(clearPending).toHaveBeenCalledWith('stable-a', 'store-tx-30');
  });

  it('never treats CustomerInfo entitlement data as a minute grant', async () => {
    const deps: VoiceMinutePurchaseDependencies = {
      isCurrent: () => true,
      readWallet: jest
        .fn()
        .mockResolvedValueOnce(walletStatus({ availableSeconds: 0, eventCount: 0, credited: false }))
        .mockResolvedValueOnce(walletStatus({ availableSeconds: 0, eventCount: 0, credited: false })),
      purchasePackage: jest.fn(async () => ({
        productIdentifier: 'phraseman_voice_minutes_30',
        customerInfo: { entitlements: { active: { max: { isActive: true } } } },
        transaction: {
          transactionIdentifier: 'store-tx-unverified',
          productIdentifier: 'phraseman_voice_minutes_30',
          purchaseDate: '2026-08-28T12:00:00.000Z',
        },
      })) as any,
      persistPending: jest.fn(async () => true),
      clearPending: jest.fn(async () => undefined),
      delay: async () => undefined,
      maxAttempts: 1,
    };
    const selected = selectVoiceMinutePackages({
      all: { voice_minutes: { availablePackages: [pack('phraseman_voice_minutes_30', '$5.99')] } },
    } as any)[0];

    await expect(executeVoiceMinutePurchase({ stableId: 'stable-a', pack: selected }, deps))
      .resolves.toMatchObject({ status: 'pending', transactionId: 'store-tx-unverified' });
    expect(deps.clearPending).not.toHaveBeenCalled();
  });

  it('returns pending when durable-marker persistence fails after native store success', async () => {
    const deps: VoiceMinutePurchaseDependencies = {
      isCurrent: () => true,
      readWallet: jest.fn(async () => (walletStatus({ availableSeconds: 0, eventCount: 0, credited: false }))),
      purchasePackage: jest.fn(async () => ({
        productIdentifier: 'phraseman_voice_minutes_30',
        transaction: {
          transactionIdentifier: 'store-tx-persist-error',
          productIdentifier: 'phraseman_voice_minutes_30',
        },
      })) as any,
      persistPending: jest.fn(async () => { throw new Error('storage unavailable'); }),
      clearPending: jest.fn(async () => undefined),
      delay: async () => undefined,
      maxAttempts: 1,
    };
    const selected = selectVoiceMinutePackages({
      all: { voice_minutes: { availablePackages: [pack('phraseman_voice_minutes_30', '$5.99')] } },
    } as any)[0];

    await expect(executeVoiceMinutePurchase({ stableId: 'stable-a', pack: selected }, deps))
      .resolves.toEqual({ status: 'pending', transactionId: 'store-tx-persist-error' });
  });

  it('returns pending when verified-wallet polling fails after native store success', async () => {
    const readWallet = jest
      .fn()
      .mockResolvedValueOnce(walletStatus({ availableSeconds: 0, eventCount: 0, credited: false }))
      .mockRejectedValueOnce(new Error('callable unavailable'));
    const deps: VoiceMinutePurchaseDependencies = {
      isCurrent: () => true,
      readWallet,
      purchasePackage: jest.fn(async () => ({
        productIdentifier: 'phraseman_voice_minutes_30',
        transaction: {
          transactionIdentifier: 'store-tx-poll-error',
          productIdentifier: 'phraseman_voice_minutes_30',
        },
      })) as any,
      persistPending: jest.fn(async () => true),
      clearPending: jest.fn(async () => undefined),
      delay: async () => undefined,
      maxAttempts: 1,
    };
    const selected = selectVoiceMinutePackages({
      all: { voice_minutes: { availablePackages: [pack('phraseman_voice_minutes_30', '$5.99')] } },
    } as any)[0];

    await expect(executeVoiceMinutePurchase({ stableId: 'stable-a', pack: selected }, deps))
      .resolves.toEqual({ status: 'pending', transactionId: 'store-tx-poll-error' });
    expect(deps.persistPending).toHaveBeenCalledTimes(1);
  });
});

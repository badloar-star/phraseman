import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export const VOICE_MINUTE_OFFERING_ID = 'voice_minutes' as const;

export const VOICE_MINUTE_PRODUCTS = Object.freeze([
  Object.freeze({ productId: 'phraseman_voice_minutes_30', minutes: 30, seconds: 1_800 }),
  Object.freeze({ productId: 'phraseman_voice_minutes_120', minutes: 120, seconds: 7_200 }),
  Object.freeze({ productId: 'phraseman_voice_minutes_300', minutes: 300, seconds: 18_000 }),
] as const);

export type VoiceMinuteProductId = typeof VOICE_MINUTE_PRODUCTS[number]['productId'];

export type VoiceMinutePack = Readonly<{
  productId: VoiceMinuteProductId;
  minutes: 30 | 120 | 300;
  seconds: 1_800 | 7_200 | 18_000;
  priceString: string;
  revenueCatPackage: PurchasesPackage;
}>;

type OfferingsLike = Readonly<{
  all?: Readonly<Record<string, Pick<PurchasesOffering, 'availablePackages'> | undefined>>;
}> | null | undefined;

export function selectVoiceMinutePackages(offerings: OfferingsLike): VoiceMinutePack[] {
  const available = offerings?.all?.[VOICE_MINUTE_OFFERING_ID]?.availablePackages ?? [];
  return VOICE_MINUTE_PRODUCTS.flatMap((definition) => {
    const revenueCatPackage = available.find(
      (candidate) => candidate?.product?.identifier === definition.productId,
    );
    if (!revenueCatPackage) return [];
    return [{
      ...definition,
      priceString: String(revenueCatPackage.product.priceString ?? '').trim(),
      revenueCatPackage,
    } satisfies VoiceMinutePack];
  });
}


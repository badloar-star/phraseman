export type ShardsPack = {
  id: 'starter' | 'popular' | 'value' | 'pro';
  /** Базовое число в SKU / описании товара в сторе (номинал пакета). */
  shards: number;
  /**
   * Дополнительные осколки при покупке (начисляются тем же IAP в приложении).
   * Подбор: ~15–18% к базе, круглые числа; верхний ярус — «500 всего» для запоминаемости.
   */
  bonusShards: number;
  productId: string;
  badge?: 'popular' | 'best_value';
};

/** Порядок и productId — из Play Console / RevenueCat; цены только со стора (priceString / price). */
export const SHARDS_PACKS: ShardsPack[] = [
  { id: 'starter', shards: 30, bonusShards: 5, productId: 'phraseman_shards_30' },
  { id: 'popular', shards: 80, bonusShards: 12, productId: 'phraseman_shards_80', badge: 'popular' },
  { id: 'value', shards: 180, bonusShards: 30, productId: 'phraseman_shards_180', badge: 'best_value' },
  { id: 'pro', shards: 420, bonusShards: 80, productId: 'phraseman_shards_420' },
];

/** Сколько осколков реально получит игрок после покупки пакета. */
export function totalShardsFromPack(p: ShardsPack): number {
  return p.shards + p.bonusShards;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

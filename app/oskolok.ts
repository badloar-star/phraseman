import type { ImageSourcePropType } from 'react-native';

/**
 * Единая точка для картинок осколков: «OSKOLOK.png» в assets и кучки для паков 80 / 180 / 420.
 * Снаружи используй только `oskolokImageForPackShards` — не импортируй сырой PNG.
 */
const OSKOLOK_SINGLE: ImageSourcePropType = require('../assets/images/levels/OSKOLOK.png');

const OSKOLOK_80: ImageSourcePropType = require('../assets/images/levels/OSKOLOK 80.png');
const OSKOLOK_180: ImageSourcePropType = require('../assets/images/levels/OSKOLOK 180.png');
const OSKOLOK_420: ImageSourcePropType = require('../assets/images/levels/OSKOLOK 420.png');

/**
 * Картинка «кучки» осколков по величине суммы (не по номиналу пакета в магазине).
 * Диапазоны: [1, 79] → арт 80, [80, 179] → арт 180, [180, ∞) → арт 420.
 * Для 0 и некорректных значений — одиночный кристалл.
 */
export function oskolokImageForPackShards(shards: number): ImageSourcePropType {
  const n = Math.floor(Number(shards));
  if (!Number.isFinite(n) || n <= 0) return OSKOLOK_SINGLE;
  if (n < 80) return OSKOLOK_80;
  if (n < 180) return OSKOLOK_180;
  return OSKOLOK_420;
}

/**
 * Иконка строки IAP «осколки» в магазине.
 * Стартовый SKU шёл через `OSKOLOK 80.png` (палитровый PNG); в связке expo-image + анимация на части Android
 * этот ассет иногда не рисуется, тогда как `OSKOLOK.png` / 180 / 420 — да. Для `starter` используем один кристалл
 * (тот же путь, что при низком балансе в шапке).
 */
export function oskolokImageForShardIapRow(pack: { id: string; shards: number }): ImageSourcePropType {
  if (pack.id === 'starter') return OSKOLOK_SINGLE;
  return oskolokImageForPackShards(pack.shards);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

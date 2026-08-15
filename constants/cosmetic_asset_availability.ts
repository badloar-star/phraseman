export type CosmeticAssetCategory = 'aura' | 'avatar' | 'achievement' | 'other';

const saleOverrides = new Map<string, boolean>();
let catalogRevision = 0;

function key(category: CosmeticAssetCategory, assetId: string): string {
  return `${category}:${assetId}`;
}

export function replaceCosmeticSaleOverrides(
  next: Readonly<Record<string, boolean>>,
  revision = 0,
): void {
  saleOverrides.clear();
  for (const [assetKey, forSale] of Object.entries(next)) {
    if (typeof forSale === 'boolean') saleOverrides.set(assetKey, forSale);
  }
  catalogRevision = Math.max(0, Math.floor(Number(revision) || 0));
}

export function isCosmeticAssetForSale(
  category: CosmeticAssetCategory,
  assetId: string,
  fallback: boolean,
): boolean {
  return saleOverrides.get(key(category, assetId)) ?? fallback;
}

export function getCosmeticAssetCatalogRevision(): number {
  return catalogRevision;
}

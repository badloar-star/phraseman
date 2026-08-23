// зачем: приложение доверяет только опубликованному манифесту 2.5D-каталога
// (assets/avatar-25d/manifest.json, попадает туда исключительно через
// check_render --accept → publish_catalog). Этот модуль — единственная точка
// разбора: кривой манифест падает здесь, а не в рендере экрана.

export type Avatar25dSlot =
  | 'base'
  | 'hair'
  | 'headwear'
  | 'outfit'
  | 'accessory'
  | 'eyes'
  | 'skin'
  | 'emotion';

export const AVATAR_25D_SLOTS: readonly Avatar25dSlot[] = [
  'base', 'hair', 'headwear', 'outfit', 'accessory', 'eyes', 'skin', 'emotion',
] as const;

export interface Avatar25dCatalogItem {
  readonly id: string;
  readonly slot: Avatar25dSlot;
  readonly file: string;
  readonly sha256: string;
  readonly base: string | null;
  readonly acceptedAt: string;
}

export interface Avatar25dCatalog {
  readonly version: number;
  readonly items: readonly Avatar25dCatalogItem[];
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ID_PATTERN = /^[a-z0-9_]+$/;

function fail(reason: string): never {
  throw new Error(`avatar25d_catalog_invalid:${reason}`);
}

export function parseAvatar25dCatalog(input: unknown): Avatar25dCatalog {
  if (typeof input !== 'object' || input === null) fail('not_object');
  const raw = input as Record<string, unknown>;
  if (raw.version !== 1) fail('unsupported_version');
  if (!Array.isArray(raw.items)) fail('items_not_array');

  const seen = new Set<string>();
  const items = raw.items.map((entry: unknown): Avatar25dCatalogItem => {
    if (typeof entry !== 'object' || entry === null) fail('item_not_object');
    const item = entry as Record<string, unknown>;
    const { id, slot, file, sha256, acceptedAt } = item;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) fail(`bad_id:${String(id)}`);
    if (typeof slot !== 'string' || !AVATAR_25D_SLOTS.includes(slot as Avatar25dSlot)) fail(`bad_slot:${String(slot)}`);
    if (file !== `catalog/${slot}/${id}.png`) fail(`bad_file:${String(file)}`);
    if (typeof sha256 !== 'string' || !SHA256_PATTERN.test(sha256)) fail(`bad_sha256:${id}`);
    if (typeof acceptedAt !== 'string' || !acceptedAt) fail(`bad_accepted_at:${id}`);
    const key = `${slot}/${id}`;
    if (seen.has(key)) fail(`duplicate:${key}`);
    seen.add(key);
    const base = typeof item.base === 'string' ? item.base : null;
    return { id, slot: slot as Avatar25dSlot, file, sha256, base, acceptedAt };
  });

  return { version: 1, items };
}

export function avatar25dItemKey(item: Pick<Avatar25dCatalogItem, 'slot' | 'id'>): string {
  return `${item.slot}/${item.id}`;
}

export function avatar25dItemsForSlot(
  catalog: Avatar25dCatalog,
  slot: Avatar25dSlot,
): readonly Avatar25dCatalogItem[] {
  return catalog.items.filter(item => item.slot === slot);
}

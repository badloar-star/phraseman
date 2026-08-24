import { legacyInventory } from './legacy_inventory';

export type PortableDomainOwner =
  | 'progress'
  | 'preferences'
  | 'cards'
  | 'practice'
  | 'economy'
  | 'learning_v2';

const OWNER_BY_DOMAIN: Readonly<Record<string, PortableDomainOwner>> = Object.freeze({
  economy: 'economy',
  cards: 'cards',
  theory: 'cards',
  practice: 'practice',
  personal: 'practice',
  prep: 'practice',
  learning_v2: 'learning_v2',
  preferences: 'preferences',
  lang: 'preferences',
  user: 'preferences',
  device: 'preferences',
  notification: 'preferences',
  notifications: 'preferences',
  notif: 'preferences',
});

export function ownerForInventoryDomain(domain: string): PortableDomainOwner {
  return OWNER_BY_DOMAIN[domain] ?? 'progress';
}

export const PORTABLE_DOMAIN_OWNERS: Readonly<Record<string, PortableDomainOwner>> = Object.freeze(
  Object.fromEntries(
    legacyInventory.rows
      .filter((row) => row.scope === 'portable')
      .map((row) => [row.key, ownerForInventoryDomain(row.domain)]),
  ),
);

export const PORTABLE_PREFIX_OWNERS: Readonly<Record<string, PortableDomainOwner>> = Object.freeze(
  Object.fromEntries(
    legacyInventory.prefixRules
      .filter((row) => row.scope === 'portable')
      .map((row) => [row.prefix, ownerForInventoryDomain(row.domain)]),
  ),
);

export function portableOwnerForKey(key: string): PortableDomainOwner | null {
  const exact = PORTABLE_DOMAIN_OWNERS[key];
  if (exact) return exact;
  const matches = Object.entries(PORTABLE_PREFIX_OWNERS)
    .filter(([prefix]) => key.startsWith(prefix));
  return matches.length === 1 ? matches[0][1] : null;
}

export function auditPortableDomainOwnership(): Readonly<{
  unownedKeys: readonly string[];
  multiplyOwnedKeys: readonly string[];
}> {
  const descriptors = [
    ...legacyInventory.rows.filter((row) => row.scope === 'portable').map((row) => `key:${row.key}`),
    ...legacyInventory.prefixRules.filter((row) => row.scope === 'portable').map((row) => `prefix:${row.prefix}`),
  ];
  const counts = new Map<string, number>();
  for (const descriptor of descriptors) counts.set(descriptor, (counts.get(descriptor) ?? 0) + 1);
  return Object.freeze({
    unownedKeys: Object.freeze(descriptors.filter((descriptor) => {
      const separator = descriptor.indexOf(':');
      const kind = descriptor.slice(0, separator);
      const value = descriptor.slice(separator + 1);
      return kind === 'key'
        ? !PORTABLE_DOMAIN_OWNERS[value]
        : !PORTABLE_PREFIX_OWNERS[value];
    })),
    multiplyOwnedKeys: Object.freeze(
      [...counts.entries()].filter(([, count]) => count !== 1).map(([key]) => key).sort(),
    ),
  });
}

export type PortableWriterViolation = Readonly<{
  key: string;
  owner: PortableDomainOwner;
  line: number;
}>;

export function scanWriterFixture(source: string): readonly PortableWriterViolation[] {
  const violations: PortableWriterViolation[] = [];
  const pattern = /(?:AsyncStorage\.setItem|storageSetString|storageSetNumber)\(\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const owner = portableOwnerForKey(match[1]);
    if (!owner) continue;
    violations.push(Object.freeze({
      key: match[1],
      owner,
      line: source.slice(0, match.index).split(/\r?\n/).length,
    }));
  }
  return Object.freeze(violations);
}
